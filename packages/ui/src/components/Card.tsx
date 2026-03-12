import React from 'react';
import { cn } from '../utils/cn';

// 🃏 Card Component - Flusk Design System
// Flexible container with consistent spacing and shadows

export interface CardProps {
  variant?: 'default' | 'elevated' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: boolean;
  hover?: boolean; // Enable hover effects
  interactive?: boolean; // Enable cursor pointer and focus styles
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const cardVariants = {
  default: [
    'bg-white border border-gray-200',
    'shadow-sm',
  ],
  elevated: [
    'bg-white border border-gray-200',
    'shadow-lg',
  ],
  outline: [
    'bg-transparent border-2 border-gray-300',
    'shadow-none',
  ],
  ghost: [
    'bg-gray-50 border border-transparent',
    'shadow-none',
  ],
  gradient: [
    'bg-gradient-to-br from-white to-gray-50 border border-gray-200',
    'shadow-md',
  ],
};

const cardSizes = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
};

const cardRounded = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

const hoverEffects = {
  default: 'hover:shadow-md',
  elevated: 'hover:shadow-xl hover:-translate-y-1',
  outline: 'hover:border-primary-300 hover:shadow-sm',
  ghost: 'hover:bg-gray-100',
  gradient: 'hover:shadow-lg hover:-translate-y-0.5',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  size = 'md',
  rounded = 'lg',
  padding = true,
  hover = false,
  interactive = false,
  className,
  children,
  onClick,
}) => {
  const Component = onClick ? 'button' : 'div';
  const isInteractive = interactive || !!onClick;

  return (
    <Component
      className={cn(
        // Base styles
        'relative transition-all duration-200 ease-in-out',
        
        // Variant styles
        cardVariants[variant],
        
        // Size (padding)
        padding && cardSizes[size],
        
        // Rounded corners
        cardRounded[rounded],
        
        // Hover effects
        hover && hoverEffects[variant],
        
        // Interactive states
        isInteractive && [
          'cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'active:scale-[0.98]',
        ],
        
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
};

// 🎯 Card composition components

export interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ className, children }) => (
  <div className={cn('mb-4', className)}>
    {children}
  </div>
);

export interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ className, children }) => (
  <div className={cn('flex-1', className)}>
    {children}
  </div>
);

export interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({ className, children }) => (
  <div className={cn('mt-4 pt-4 border-t border-gray-200', className)}>
    {children}
  </div>
);

// 🏷️ Feature Card - Specialized card for feature highlights
export interface FeatureCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  iconColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  hover?: boolean;
}

const iconColors = {
  primary: 'text-primary-600 bg-primary-100',
  secondary: 'text-secondary-600 bg-secondary-100',
  success: 'text-success-600 bg-success-100',
  warning: 'text-warning-600 bg-warning-100',
  error: 'text-error-600 bg-error-100',
};

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  action,
  className,
  iconColor = 'primary',
  hover = true,
}) => (
  <Card variant="default" hover={hover} className={className}>
    {icon && (
      <div className={cn(
        'inline-flex p-3 rounded-lg mb-4',
        iconColors[iconColor]
      )}>
        {icon}
      </div>
    )}
    <CardContent>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 mb-4">
        {description}
      </p>
      {action && (
        <div className="mt-auto">
          {action}
        </div>
      )}
    </CardContent>
  </Card>
);

// 📊 Stat Card - For displaying metrics and numbers
export interface StatCardProps {
  label: string;
  value: string | number | React.ReactNode;
  change?: {
    value: string | number;
    type: 'increase' | 'decrease' | 'neutral';
    period?: string;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon,
  className,
}) => (
  <Card className={cn('p-6', className)}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">
          {label}
        </p>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {value}
        </p>
        {change && (
          <div className="flex items-center mt-2">
            <span
              className={cn(
                'text-sm font-medium',
                change.type === 'increase' && 'text-success-600',
                change.type === 'decrease' && 'text-error-600',
                change.type === 'neutral' && 'text-gray-600'
              )}
            >
              {change.type === 'increase' && '+'}
              {change.value}
            </span>
            {change.period && (
              <span className="text-sm text-gray-500 ml-1">
                {change.period}
              </span>
            )}
          </div>
        )}
      </div>
      {icon && (
        <div className="text-gray-400">
          {icon}
        </div>
      )}
    </div>
  </Card>
);

// 🖼️ Image Card - Card with image header
export interface ImageCardProps {
  image: {
    src: string;
    alt: string;
  };
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  imageHeight?: 'sm' | 'md' | 'lg';
}

const imageHeights = {
  sm: 'h-32',
  md: 'h-48',
  lg: 'h-64',
};

export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  title,
  description,
  action,
  className,
  imageHeight = 'md',
}) => (
  <Card padding={false} className={cn('overflow-hidden', className)}>
    <div className={cn('w-full bg-gray-200', imageHeights[imageHeight])}>
      <img
        src={image.src}
        alt={image.alt}
        className="w-full h-full object-cover"
      />
    </div>
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 mb-4">
          {description}
        </p>
      )}
      {action && action}
    </div>
  </Card>
);