import React from 'react';
import { cn } from '../utils/cn';
import { Icon, IconProps } from './Icon';

// 🏷️ Badge Component - Flusk Design System
// Small status indicators, labels, and tags

export interface BadgeProps {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' | 'neutral' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  icon?: IconProps['name'];
  iconPosition?: 'left' | 'right';
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
  children: React.ReactNode;
}

const badgeVariants = {
  default: 'bg-gray-100 text-gray-800 border-gray-200',
  primary: 'bg-primary-100 text-primary-800 border-primary-200',
  secondary: 'bg-secondary-100 text-secondary-800 border-secondary-200',
  success: 'bg-success-100 text-success-800 border-success-200',
  warning: 'bg-warning-100 text-warning-800 border-warning-200',
  error: 'bg-error-100 text-error-800 border-error-200',
  outline: 'bg-transparent text-gray-600 border-gray-300 hover:bg-gray-50',
  neutral: 'bg-gray-100 text-gray-800 border-gray-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
};

const badgeSizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base',
};

const iconSizes: Record<BadgeProps['size']extends infer K ? K extends keyof typeof badgeSizes ? K : never : never, IconProps['size']> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  rounded = false,
  icon,
  iconPosition = 'left',
  removable = false,
  onRemove,
  className,
  children,
}) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove?.();
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border',
        'transition-colors duration-200',
        badgeVariants[variant],
        badgeSizes[size],
        rounded ? 'rounded-full' : 'rounded-md',
        className
      )}
    >
      {/* Left Icon */}
      {icon && iconPosition === 'left' && (
        <Icon 
          name={icon} 
          size={iconSizes[size]} 
          className={cn(
            removable || iconPosition === 'left' ? 'mr-1' : ''
          )} 
        />
      )}
      
      {/* Content */}
      <span className="truncate">
        {children}
      </span>
      
      {/* Right Icon */}
      {icon && iconPosition === 'right' && (
        <Icon 
          name={icon} 
          size={iconSizes[size]} 
          className="ml-1" 
        />
      )}
      
      {/* Remove Button */}
      {removable && (
        <button
          type="button"
          onClick={handleRemove}
          className={cn(
            'ml-1 inline-flex items-center p-0.5 rounded-full',
            'hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current',
            'transition-colors duration-200'
          )}
          aria-label="Remove"
        >
          <Icon name="close" size={iconSizes[size]} />
        </button>
      )}
    </span>
  );
};

// 🎯 Status Badge - Pre-configured for common statuses
export interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'success' | 'failed' | 'warning';
  size?: BadgeProps['size'];
  showIcon?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const statusConfig = {
  active: {
    variant: 'success' as const,
    icon: 'checkCircle' as const,
    defaultText: 'Active',
  },
  inactive: {
    variant: 'default' as const,
    icon: 'info' as const,
    defaultText: 'Inactive',
  },
  pending: {
    variant: 'warning' as const,
    icon: 'warning' as const,
    defaultText: 'Pending',
  },
  success: {
    variant: 'success' as const,
    icon: 'check' as const,
    defaultText: 'Success',
  },
  failed: {
    variant: 'error' as const,
    icon: 'error' as const,
    defaultText: 'Failed',
  },
  warning: {
    variant: 'warning' as const,
    icon: 'warning' as const,
    defaultText: 'Warning',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className,
  children,
}) => {
  const config = statusConfig[status];
  
  return (
    <Badge
      variant={config.variant}
      size={size}
      icon={showIcon ? config.icon : undefined}
      className={className}
    >
      {children || config.defaultText}
    </Badge>
  );
};

// 🏷️ Tag Badge - For categories and filters
export interface TagBadgeProps {
  tag: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'gray';
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

const tagColors = {
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  pink: 'bg-pink-100 text-pink-800 border-pink-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  color = 'gray',
  removable = false,
  onRemove,
  onClick,
  className,
}) => {
  const handleClick = () => {
    onClick?.();
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-sm font-medium border rounded-full',
        'transition-colors duration-200',
        tagColors[color],
        onClick && 'cursor-pointer hover:opacity-75',
        className
      )}
      onClick={handleClick}
    >
      <span className="truncate">
        {tag}
      </span>
      
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className={cn(
            'ml-1 inline-flex items-center p-0.5 rounded-full',
            'hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current',
            'transition-colors duration-200'
          )}
          aria-label={`Remove ${tag}`}
        >
          <Icon name="close" size="xs" />
        </button>
      )}
    </span>
  );
};

// 📊 Metric Badge - For displaying numbers and metrics
export interface MetricBadgeProps {
  value: string | number;
  label?: string;
  trend?: 'up' | 'down' | 'neutral';
  variant?: BadgeProps['variant'];
  size?: BadgeProps['size'];
  className?: string;
}

const trendIcons = {
  up: 'trending' as const,
  down: 'arrowDown' as const,
  neutral: 'info' as const,
};

const trendColors = {
  up: 'text-success-600',
  down: 'text-error-600', 
  neutral: 'text-gray-500',
};

export const MetricBadge: React.FC<MetricBadgeProps> = ({
  value,
  label,
  trend,
  variant = 'default',
  size = 'md',
  className,
}) => {
  return (
    <Badge
      variant={variant}
      size={size}
      className={className}
    >
      <div className="flex items-center gap-1">
        <span className="font-semibold">
          {value}
        </span>
        
        {label && (
          <span className="opacity-75">
            {label}
          </span>
        )}
        
        {trend && (
          <Icon 
            name={trendIcons[trend]} 
            size="xs" 
            className={trendColors[trend]} 
          />
        )}
      </div>
    </Badge>
  );
};

// 🎨 Dot Badge - Small indicator dot
export interface DotBadgeProps {
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

const dotColors = {
  primary: 'bg-primary-500',
  secondary: 'bg-secondary-500', 
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  gray: 'bg-gray-400',
};

const dotSizes = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export const DotBadge: React.FC<DotBadgeProps> = ({
  color = 'primary',
  size = 'md',
  className,
  'aria-label': ariaLabel,
}) => (
  <span
    className={cn(
      'inline-block rounded-full',
      dotColors[color],
      dotSizes[size],
      className
    )}
    aria-label={ariaLabel}
  />
);