import React from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';

// 📝 Breadcrumb Component - Flusk Design System
// Navigation breadcrumbs for hierarchical navigation

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  size?: 'sm' | 'md' | 'lg';
  showHome?: boolean;
  homeIcon?: React.ReactNode;
  onHomeClick?: () => void;
  className?: string;
}

const breadcrumbSizes = {
  sm: {
    text: 'text-xs',
    icon: 'sm' as const,
    padding: 'px-2 py-1',
    gap: 'gap-1',
  },
  md: {
    text: 'text-sm',
    icon: 'md' as const,
    padding: 'px-3 py-1.5',
    gap: 'gap-2',
  },
  lg: {
    text: 'text-base',
    icon: 'lg' as const,
    padding: 'px-4 py-2',
    gap: 'gap-3',
  },
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator,
  maxItems,
  size = 'md',
  showHome = false,
  homeIcon,
  onHomeClick,
  className,
}) => {
  const sizeConfig = breadcrumbSizes[size];

  // Handle item overflow
  const processedItems = React.useMemo(() => {
    if (!maxItems || items.length <= maxItems) {
      return items;
    }

    const start = items.slice(0, 1);
    const end = items.slice(-(maxItems - 2));
    const collapsed = { label: '...', disabled: true };

    return [...start, collapsed, ...end];
  }, [items, maxItems]);

  const defaultSeparator = (
    <Icon 
      name="chevronRight" 
      size={sizeConfig.icon} 
      className="text-gray-400" 
    />
  );

  const renderItem = (item: BreadcrumbItem, index: number, isLast: boolean) => {
    const isClickable = !item.disabled && (item.href || item.onClick);
    
    const content = (
      <span className={cn(
        'flex items-center transition-colors duration-150',
        sizeConfig.gap,
        sizeConfig.text,
        isLast 
          ? 'text-gray-900 font-medium' 
          : isClickable 
            ? 'text-gray-600 hover:text-gray-900' 
            : 'text-gray-400',
        item.disabled && 'cursor-not-allowed',
        isClickable && !item.disabled && 'cursor-pointer'
      )}>
        {item.icon && (
          <span className="flex-shrink-0">
            {item.icon}
          </span>
        )}
        {item.label}
      </span>
    );

    if (item.href && !item.disabled) {
      return (
        <a
          key={index}
          href={item.href}
          className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-sm"
        >
          {content}
        </a>
      );
    }

    if (item.onClick && !item.disabled) {
      return (
        <button
          key={index}
          type="button"
          onClick={item.onClick}
          className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-sm"
        >
          {content}
        </button>
      );
    }

    return (
      <span key={index}>
        {content}
      </span>
    );
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center', sizeConfig.gap, className)}
    >
      <ol className={cn('flex items-center', sizeConfig.gap)}>
        {/* Home Item */}
        {showHome && (
          <>
            <li>
              {onHomeClick ? (
                <button
                  type="button"
                  onClick={onHomeClick}
                  className={cn(
                    'flex items-center text-gray-600 hover:text-gray-900',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-sm',
                    'transition-colors duration-150'
                  )}
                  aria-label="Home"
                >
                  {homeIcon || <Icon name="home" size={sizeConfig.icon} />}
                </button>
              ) : (
                <span className="flex items-center text-gray-600">
                  {homeIcon || <Icon name="home" size={sizeConfig.icon} />}
                </span>
              )}
            </li>
            {items.length > 0 && (
              <li aria-hidden="true">
                {separator || defaultSeparator}
              </li>
            )}
          </>
        )}

        {/* Breadcrumb Items */}
        {processedItems.map((item, index) => {
          const isLast = index === processedItems.length - 1;
          
          return (
            <React.Fragment key={index}>
              <li>
                {renderItem(item, index, isLast)}
              </li>
              {!isLast && (
                <li aria-hidden="true">
                  {separator || defaultSeparator}
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

// 🏠 Simple Breadcrumb - Quick breadcrumb for common use cases
export interface SimpleBreadcrumbProps {
  path: string[];
  onNavigate?: (index: number, segment: string) => void;
  separator?: string;
  size?: BreadcrumbProps['size'];
  className?: string;
}

export const SimpleBreadcrumb: React.FC<SimpleBreadcrumbProps> = ({
  path,
  onNavigate,
  separator = '/',
  size = 'md',
  className,
}) => {
  const items: BreadcrumbItem[] = path.map((segment, index) => ({
    label: segment,
    onClick: onNavigate ? () => onNavigate(index, segment) : undefined,
  }));

  const customSeparator = (
    <span className="text-gray-400 select-none">
      {separator}
    </span>
  );

  return (
    <Breadcrumb
      items={items}
      separator={customSeparator}
      size={size}
      className={className}
    />
  );
};

// 📁 File Path Breadcrumb - Breadcrumb for file system paths
export interface FilePathBreadcrumbProps {
  path: string;
  onNavigate?: (path: string) => void;
  showRoot?: boolean;
  rootLabel?: string;
  rootIcon?: React.ReactNode;
  size?: BreadcrumbProps['size'];
  className?: string;
}

export const FilePathBreadcrumb: React.FC<FilePathBreadcrumbProps> = ({
  path,
  onNavigate,
  showRoot = true,
  rootLabel = 'Root',
  rootIcon,
  size = 'md',
  className,
}) => {
  const pathParts = path.split('/').filter(Boolean);
  
  const items: BreadcrumbItem[] = pathParts.map((part, index) => {
    const partPath = '/' + pathParts.slice(0, index + 1).join('/');
    
    return {
      label: part,
      onClick: onNavigate ? () => onNavigate(partPath) : undefined,
      icon: index === pathParts.length - 1 ? <Icon name="folder" size="sm" /> : undefined,
    };
  });

  return (
    <Breadcrumb
      items={items}
      size={size}
      showHome={showRoot}
      homeIcon={rootIcon || <Icon name="folder" size={size === 'sm' ? 'sm' : 'md'} />}
      onHomeClick={onNavigate ? () => onNavigate('/') : undefined}
      className={className}
    />
  );
};

// 🗂️ Page Breadcrumb - Breadcrumb for page navigation
export interface PageBreadcrumbProps {
  pages: Array<{
    name: string;
    href?: string;
    current?: boolean;
  }>;
  homeHref?: string;
  size?: BreadcrumbProps['size'];
  className?: string;
}

export const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({
  pages,
  homeHref = '/',
  size = 'md',
  className,
}) => {
  const items: BreadcrumbItem[] = pages.map((page) => ({
    label: page.name,
    href: page.current ? undefined : page.href,
  }));

  return (
    <Breadcrumb
      items={items}
      size={size}
      showHome={true}
      onHomeClick={homeHref ? () => window.location.href = homeHref : undefined}
      className={className}
    />
  );
};

// 🎯 Compact Breadcrumb - Space-efficient breadcrumb
export interface CompactBreadcrumbProps {
  items: BreadcrumbItem[];
  maxVisible?: number;
  className?: string;
}

export const CompactBreadcrumb: React.FC<CompactBreadcrumbProps> = ({
  items,
  maxVisible = 3,
  className,
}) => {
  if (items.length <= maxVisible) {
    return <Breadcrumb items={items} size="sm" className={className} />;
  }

  const visibleItems = [
    items[0], // First item
    { label: '...', disabled: true }, // Ellipsis
    ...items.slice(-(maxVisible - 2)) // Last items
  ];

  return (
    <Breadcrumb
      items={visibleItems}
      size="sm"
      className={className}
    />
  );
};