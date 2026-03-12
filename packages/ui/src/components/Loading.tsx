import React from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';

// 📝 Loading Component - Flusk Design System
// Loading states and spinners

export interface LoadingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars' | 'ring';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
  text?: string;
  overlay?: boolean;
  className?: string;
}

const loadingSizes = {
  xs: { size: 'w-3 h-3', text: 'text-xs' },
  sm: { size: 'w-4 h-4', text: 'text-sm' },
  md: { size: 'w-6 h-6', text: 'text-base' },
  lg: { size: 'w-8 h-8', text: 'text-lg' },
  xl: { size: 'w-12 h-12', text: 'text-xl' },
};

const loadingColors = {
  primary: 'text-primary-600',
  secondary: 'text-secondary-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  error: 'text-error-600',
  neutral: 'text-gray-600',
};

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  text,
  overlay = false,
  className,
}) => {
  const sizeConfig = loadingSizes[size];
  const colorClass = loadingColors[color];

  const renderSpinner = () => (
    <Icon 
      name="spinner" 
      size={size === 'xs' ? 'sm' : size === 'xl' ? 'lg' : 'md'} 
      className={cn('animate-spin', colorClass)} 
    />
  );

  const renderDots = () => (
    <div className="flex items-center space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-pulse',
            size === 'xs' ? 'w-1 h-1' : 
            size === 'sm' ? 'w-1.5 h-1.5' :
            size === 'md' ? 'w-2 h-2' :
            size === 'lg' ? 'w-3 h-3' : 'w-4 h-4',
            colorClass.replace('text-', 'bg-')
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div className={cn(
      'rounded-full animate-pulse',
      sizeConfig.size,
      colorClass.replace('text-', 'bg-')
    )} />
  );

  const renderBars = () => (
    <div className="flex items-end space-x-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse',
            size === 'xs' ? 'w-0.5' : 
            size === 'sm' ? 'w-1' :
            size === 'md' ? 'w-1.5' :
            size === 'lg' ? 'w-2' : 'w-3',
            colorClass.replace('text-', 'bg-')
          )}
          style={{
            height: `${20 + (i + 1) * 10}%`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1.2s',
          }}
        />
      ))}
    </div>
  );

  const renderRing = () => (
    <div className={cn('relative', sizeConfig.size)}>
      <div className={cn(
        'absolute inset-0 rounded-full border-2 opacity-25',
        colorClass.replace('text-', 'border-')
      )} />
      <div className={cn(
        'absolute inset-0 rounded-full border-2 border-t-transparent animate-spin',
        colorClass.replace('text-', 'border-')
      )} />
    </div>
  );

  const renderVariant = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'bars':
        return renderBars();
      case 'ring':
        return renderRing();
      default:
        return renderSpinner();
    }
  };

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-2',
      overlay && 'min-h-[200px]',
      className
    )}>
      {renderVariant()}
      {text && (
        <div className={cn('text-gray-600', sizeConfig.text)}>
          {text}
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

// 🔄 Skeleton Loader - Content placeholder
export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
  animated?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  className,
  animated = true,
}) => {
  const baseClasses = cn(
    'bg-gray-200',
    animated && 'animate-pulse',
    variant === 'text' && 'h-4 rounded',
    variant === 'circular' && 'rounded-full',
    variant === 'rectangular' && 'rounded-none',
    variant === 'rounded' && 'rounded-lg'
  );

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={baseClasses}
            style={{
              width: i === lines - 1 ? '75%' : width || '100%',
              height: height || undefined,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, className)}
      style={{
        width: width || (variant === 'text' ? '100%' : '40px'),
        height: height || (variant === 'text' ? '16px' : '40px'),
      }}
    />
  );
};

// 📄 Page Loading - Full page loading state
export interface PageLoadingProps {
  title?: string;
  description?: string;
  size?: LoadingProps['size'];
  variant?: LoadingProps['variant'];
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  title = 'Loading...',
  description,
  size = 'lg',
  variant = 'spinner',
}) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
    <Loading size={size} variant={variant} />
    <div className="text-center mt-4">
      <h3 className="text-lg font-medium text-gray-900">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 mt-1">
          {description}
        </p>
      )}
    </div>
  </div>
);

// 📦 Card Skeleton - Loading skeleton for cards
export interface CardSkeletonProps {
  showImage?: boolean;
  showAvatar?: boolean;
  lines?: number;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showImage = false,
  showAvatar = false,
  lines = 3,
  className,
}) => (
  <div className={cn('p-6 border border-gray-200 rounded-lg', className)}>
    {/* Image */}
    {showImage && (
      <Skeleton variant="rectangular" height="200px" className="mb-4" />
    )}
    
    {/* Header */}
    <div className="flex items-start gap-3 mb-4">
      {/* Avatar */}
      {showAvatar && (
        <Skeleton variant="circular" width="40px" height="40px" />
      )}
      
      {/* Title and subtitle */}
      <div className="flex-1 space-y-2">
        <Skeleton height="20px" width="60%" />
        <Skeleton height="16px" width="40%" />
      </div>
    </div>
    
    {/* Content lines */}
    <Skeleton variant="text" lines={lines} />
  </div>
);

// 📊 Table Skeleton - Loading skeleton for tables
export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}) => (
  <div className={cn('w-full', className)}>
    <div className="overflow-hidden border border-gray-200 rounded-lg">
      {/* Header */}
      {showHeader && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }, (_, i) => (
              <Skeleton key={i} height="16px" width="80%" />
            ))}
          </div>
        </div>
      )}
      
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }, (_, colIndex) => (
                <Skeleton key={colIndex} height="16px" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 📱 Button Loading - Loading state for buttons
export interface ButtonLoadingProps {
  size?: LoadingProps['size'];
  color?: 'white' | 'current';
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  size = 'sm',
  color = 'current',
}) => (
  <Loading
    size={size}
    variant="spinner"
    className={cn(
      color === 'white' ? 'text-white' : 'text-current'
    )}
  />
);

// 🔍 Search Loading - Loading state for search results
export const SearchLoading: React.FC = () => (
  <div className="space-y-4 p-4">
    {Array.from({ length: 3 }, (_, i) => (
      <div key={i} className="flex items-start gap-3">
        <Skeleton variant="circular" width="40px" height="40px" />
        <div className="flex-1 space-y-2">
          <Skeleton height="20px" width="70%" />
          <Skeleton height="16px" lines={2} />
        </div>
      </div>
    ))}
  </div>
);