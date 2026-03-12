import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';

// 📝 Tooltip Component - Flusk Design System
// Contextual information on hover/focus

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  trigger?: 'hover' | 'click' | 'focus' | 'manual';
  delay?: {
    show?: number;
    hide?: number;
  };
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  arrow?: boolean;
  maxWidth?: string;
}

interface Position {
  top: number;
  left: number;
}

const placementOffsets = {
  top: { x: 0, y: -8 },
  bottom: { x: 0, y: 8 },
  left: { x: -8, y: 0 },
  right: { x: 8, y: 0 },
  'top-start': { x: 0, y: -8 },
  'top-end': { x: 0, y: -8 },
  'bottom-start': { x: 0, y: 8 },
  'bottom-end': { x: 0, y: 8 },
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  trigger = 'hover',
  delay = { show: 200, hide: 0 },
  disabled = false,
  className,
  contentClassName,
  arrow = true,
  maxWidth = '200px',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<number | undefined>(undefined);
  const hideTimeoutRef = useRef<number | undefined>(undefined);

  // Calculate tooltip position
  const calculatePosition = (): Position => {
    if (!triggerRef.current || !tooltipRef.current) {
      return { top: 0, left: 0 };
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const offset = placementOffsets[placement];

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height + offset.y;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'top-start':
        top = triggerRect.top - tooltipRect.height + offset.y;
        left = triggerRect.left;
        break;
      case 'top-end':
        top = triggerRect.top - tooltipRect.height + offset.y;
        left = triggerRect.right - tooltipRect.width;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset.y;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom-start':
        top = triggerRect.bottom + offset.y;
        left = triggerRect.left;
        break;
      case 'bottom-end':
        top = triggerRect.bottom + offset.y;
        left = triggerRect.right - tooltipRect.width;
        break;
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width + offset.x;
        break;
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right + offset.x;
        break;
    }

    // Viewport boundaries adjustment
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Horizontal boundary checks
    if (left < 8) left = 8;
    if (left + tooltipRect.width > viewport.width - 8) {
      left = viewport.width - tooltipRect.width - 8;
    }

    // Vertical boundary checks
    if (top < 8) top = 8;
    if (top + tooltipRect.height > viewport.height - 8) {
      top = viewport.height - tooltipRect.height - 8;
    }

    return { top: top + window.scrollY, left: left + window.scrollX };
  };

  // Update position when visible
  useEffect(() => {
    if (isVisible) {
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
  }, [isVisible, placement]);

  const show = () => {
    if (disabled) return;
    
    if (hideTimeoutRef.current !== undefined) window.clearTimeout(hideTimeoutRef.current);
    
    if (delay.show) {
      showTimeoutRef.current = window.setTimeout(() => {
        setIsVisible(true);
      }, delay.show);
    } else {
      setIsVisible(true);
    }
  };

  const hide = () => {
    if (showTimeoutRef.current !== undefined) window.clearTimeout(showTimeoutRef.current);
    
    if (delay.hide) {
      hideTimeoutRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, delay.hide);
    } else {
      setIsVisible(false);
    }
  };

  const toggle = () => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  };

  // Event handlers
  const handlers = {
    onMouseEnter: trigger === 'hover' ? show : undefined,
    onMouseLeave: trigger === 'hover' ? hide : undefined,
    onFocus: trigger === 'focus' ? show : undefined,
    onBlur: trigger === 'focus' ? hide : undefined,
    onClick: trigger === 'click' ? toggle : undefined,
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

  const getArrowStyles = () => {
    const base = 'absolute w-2 h-2 bg-gray-900 transform rotate-45';
    
    switch (placement) {
      case 'top':
      case 'top-start':
      case 'top-end':
        return cn(base, '-bottom-1 left-1/2 -translate-x-1/2');
      case 'bottom':
      case 'bottom-start':
      case 'bottom-end':
        return cn(base, '-top-1 left-1/2 -translate-x-1/2');
      case 'left':
        return cn(base, '-right-1 top-1/2 -translate-y-1/2');
      case 'right':
        return cn(base, '-left-1 top-1/2 -translate-y-1/2');
      default:
        return base;
    }
  };

  return (
    <>
      {triggerElement}
      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            className
          )}
          style={{
            top: position.top,
            left: position.left,
            maxWidth,
          }}
        >
          <div className={cn('relative', contentClassName)}>
            {content}
            {arrow && (
              <div className={getArrowStyles()} />
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// 💡 Info Tooltip - Specialized tooltip for help/info
export interface InfoTooltipProps extends Omit<TooltipProps, 'children'> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'info' | 'help' | 'warning' | 'error';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  size = 'md',
  variant = 'info',
  className,
  ...props
}) => {
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const iconColors = {
    info: 'text-gray-400 hover:text-gray-600',
    help: 'text-blue-400 hover:text-blue-600',
    warning: 'text-yellow-400 hover:text-yellow-600',
    error: 'text-red-400 hover:text-red-600',
  };

  const iconPaths = {
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    help: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    error: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  return (
    <Tooltip
      {...props}
      className={className}
    >
      <button
        type="button"
        className={cn(
          'inline-flex items-center justify-center transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full',
          iconColors[variant]
        )}
      >
        <svg
          className={iconSizes[size]}
          fill="none"
          strokeWidth="2"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[variant]} />
        </svg>
      </button>
    </Tooltip>
  );
};

// 🏷️ Rich Tooltip - Tooltip with rich content support
export interface RichTooltipProps extends Omit<TooltipProps, 'content'> {
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'error';
}

export const RichTooltip: React.FC<RichTooltipProps> = ({
  title,
  description,
  footer,
  icon,
  variant = 'default',
  contentClassName,
  maxWidth = '300px',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-gray-900 text-white',
    info: 'bg-blue-600 text-white',
    success: 'bg-success-600 text-white',
    warning: 'bg-warning-600 text-white',
    error: 'bg-error-600 text-white',
  };

  const content = (
    <div className="space-y-2">
      {/* Header */}
      {(icon || title) && (
        <div className="flex items-start gap-2">
          {icon && (
            <div className="flex-shrink-0 mt-0.5">
              {icon}
            </div>
          )}
          {title && (
            <div className="font-medium">
              {title}
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="text-sm opacity-90">
          {description}
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div className="pt-2 border-t border-white/20">
          {footer}
        </div>
      )}
    </div>
  );

  return (
    <Tooltip
      {...props}
      content={content}
      maxWidth={maxWidth}
      className={cn(variantStyles[variant])}
      contentClassName={contentClassName}
    />
  );
};