import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import { Icon } from './Icon';
import { Button } from './Button';

// 📝 Dropdown Component - Flusk Design System
// Contextual menus and action dropdowns

export interface DropdownItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  danger?: boolean;
  href?: string;
  onClick?: () => void;
  type?: 'item' | 'divider' | 'header';
}

export interface DropdownProps {
  items: DropdownItem[];
  children: React.ReactElement;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  disabled?: boolean;
  closeOnClick?: boolean;
  offset?: number;
  className?: string;
  menuClassName?: string;
  onOpenChange?: (open: boolean) => void;
}

interface Position {
  top: number;
  left: number;
}

const placementOffsets = {
  'bottom-start': { x: 0, y: 8 },
  'bottom-end': { x: 0, y: 8 },
  'top-start': { x: 0, y: -8 },
  'top-end': { x: 0, y: -8 },
  left: { x: -8, y: 0 },
  right: { x: 8, y: 0 },
};

export const Dropdown: React.FC<DropdownProps> = ({
  items,
  children,
  placement = 'bottom-start',
  trigger = 'click',
  disabled = false,
  closeOnClick = true,
  offset = 0,
  className,
  menuClassName,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  // Calculate dropdown position
  const calculatePosition = (): Position => {
    if (!triggerRef.current || !menuRef.current) {
      return { top: 0, left: 0 };
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const placementOffset = placementOffsets[placement];

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'bottom-start':
        top = triggerRect.bottom + placementOffset.y + offset;
        left = triggerRect.left;
        break;
      case 'bottom-end':
        top = triggerRect.bottom + placementOffset.y + offset;
        left = triggerRect.right - menuRect.width;
        break;
      case 'top-start':
        top = triggerRect.top - menuRect.height + placementOffset.y - offset;
        left = triggerRect.left;
        break;
      case 'top-end':
        top = triggerRect.top - menuRect.height + placementOffset.y - offset;
        left = triggerRect.right - menuRect.width;
        break;
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - menuRect.height / 2;
        left = triggerRect.left - menuRect.width + placementOffset.x - offset;
        break;
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - menuRect.height / 2;
        left = triggerRect.right + placementOffset.x + offset;
        break;
    }

    // Viewport boundaries adjustment
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Horizontal boundary checks
    if (left < 8) left = 8;
    if (left + menuRect.width > viewport.width - 8) {
      left = viewport.width - menuRect.width - 8;
    }

    // Vertical boundary checks
    if (top < 8) top = 8;
    if (top + menuRect.height > viewport.height - 8) {
      top = viewport.height - menuRect.height - 8;
    }

    return { top: top + window.scrollY, left: left + window.scrollX };
  };

  // Update position when open
  useEffect(() => {
    if (isOpen) {
      const updatePosition = () => {
        setPosition(calculatePosition());
      };
      
      updatePosition();
      
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, placement]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onOpenChange]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onOpenChange]);

  const show = () => {
    if (disabled) return;
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const hide = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const toggle = () => {
    if (isOpen) {
      hide();
    } else {
      show();
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
      show();
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      timeoutRef.current = window.setTimeout(hide, 150);
    }
  };

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;

    if (item.href) {
      window.location.href = item.href;
    } else {
      item.onClick?.();
    }

    if (closeOnClick && item.type !== 'header' && item.type !== 'divider') {
      hide();
    }
  };

  // Event handlers
  const handlers = {
    onClick: trigger === 'click' ? toggle : undefined,
    onFocus: trigger === 'focus' ? show : undefined,
    onBlur: trigger === 'focus' ? hide : undefined,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };

  // Clone child with event handlers
  const triggerElement = React.cloneElement(children, {
    ...handlers,
    ref: (ref: HTMLElement) => {
      triggerRef.current = ref;
      // Preserve original ref if it exists
      const originalRef = (children as any).ref;
      if (typeof originalRef === 'function') {
        originalRef(ref);
      } else if (originalRef && 'current' in originalRef) {
        originalRef.current = ref;
      }
    },
  } as any);

  const renderItem = (item: DropdownItem) => {
    if (item.type === 'divider') {
      return (
        <div key={item.key} className="my-1 border-t border-gray-200" />
      );
    }

    if (item.type === 'header') {
      return (
        <div key={item.key} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {item.label}
        </div>
      );
    }

    const ItemComponent = item.href ? 'a' : 'button';

    return (
      <ItemComponent
        key={item.key}
        href={item.href}
        type={item.href ? undefined : 'button'}
        disabled={item.disabled}
        onClick={() => handleItemClick(item)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors duration-150',
          'hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
          item.danger ? 'text-error-700 hover:bg-error-50 focus:bg-error-50' : 'text-gray-700',
          item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        {/* Icon */}
        {item.icon && (
          <span className="flex-shrink-0">
            {item.icon}
          </span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {item.label}
          </div>
          {item.description && (
            <div className="text-xs text-gray-500 truncate">
              {item.description}
            </div>
          )}
        </div>
      </ItemComponent>
    );
  };

  return (
    <div className={className}>
      {triggerElement}
      {isOpen && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className={cn(
            'absolute z-50 min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            'py-1 max-h-[300px] overflow-y-auto',
            menuClassName
          )}
          style={{
            top: position.top,
            left: position.left,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {items.map(renderItem)}
        </div>,
        document.body
      )}
    </div>
  );
};

// 📋 Menu Button - Pre-styled dropdown trigger
export interface MenuButtonProps extends Omit<DropdownProps, 'children'> {
  label?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const MenuButton: React.FC<MenuButtonProps> = ({
  label = 'Menu',
  icon,
  variant = 'outline',
  size = 'md',
  loading = false,
  ...dropdownProps
}) => {
  return (
    <Dropdown {...dropdownProps}>
      <Button
        variant={variant}
        size={size}
        isLoading={loading}
        className="flex items-center gap-2"
      >
        {icon && <span>{icon}</span>}
        {label}
        <Icon name="chevronDown" size="sm" />
      </Button>
    </Dropdown>
  );
};

// ⚙️ Actions Dropdown - Pre-configured actions menu
export interface ActionsDropdownProps extends Omit<DropdownProps, 'children' | 'items'> {
  actions: DropdownItem[];
  variant?: 'default' | 'dots';
  size?: 'sm' | 'md' | 'lg';
}

export const ActionsDropdown: React.FC<ActionsDropdownProps> = ({
  actions,
  variant = 'dots',
  size = 'md',
  ...dropdownProps
}) => {
  const trigger = variant === 'dots' ? (
    <Button variant="ghost" size={size} className="p-1">
      <Icon name="dotsVertical" size="sm" />
    </Button>
  ) : (
    <Button variant="outline" size={size} className="flex items-center gap-2">
      Actions
      <Icon name="chevronDown" size="sm" />
    </Button>
  );

  return (
    <Dropdown
      {...dropdownProps}
      items={actions}
      placement="bottom-end"
    >
      {trigger}
    </Dropdown>
  );
};

// 👤 User Dropdown - User profile dropdown
export interface UserDropdownProps extends Omit<DropdownProps, 'children' | 'items'> {
  user: {
    name: string;
    email?: string;
    avatar?: string;
    initials?: string;
  };
  menuItems: DropdownItem[];
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  user,
  menuItems,
  ...dropdownProps
}) => {
  const trigger = (
    <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-medium overflow-hidden">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          user.initials || user.name.charAt(0).toUpperCase()
        )}
      </div>
      
      {/* User Info */}
      <div className="hidden sm:block text-left">
        <div className="text-sm font-medium text-gray-900 truncate">
          {user.name}
        </div>
        {user.email && (
          <div className="text-xs text-gray-500 truncate">
            {user.email}
          </div>
        )}
      </div>
      
      {/* Chevron */}
      <Icon name="chevronDown" size="sm" className="text-gray-400" />
    </button>
  );

  return (
    <Dropdown
      {...dropdownProps}
      items={menuItems}
      placement="bottom-end"
    >
      {trigger}
    </Dropdown>
  );
};