import React from 'react';
import { cn } from '../utils/cn';
import { tokens } from '../tokens';

// 🔘 Button Component - Flusk Design System
// Highly flexible button with multiple variants and sizes

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient' | 'danger' | 'success' | 'warning' | 'default';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const buttonVariants = {
  primary: [
    'bg-primary-500 hover:bg-primary-600 active:bg-primary-700',
    'text-white border-transparent',
    'shadow-md hover:shadow-lg',
    'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  ],
  secondary: [
    'bg-secondary-500 hover:bg-secondary-600 active:bg-secondary-700',
    'text-white border-transparent',
    'shadow-md hover:shadow-lg',
    'focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2',
  ],
  outline: [
    'bg-transparent hover:bg-gray-50 active:bg-gray-100',
    'text-primary-600 border-primary-300 hover:border-primary-500',
    'border-2',
    'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  ],
  ghost: [
    'bg-transparent hover:bg-gray-50 active:bg-gray-100',
    'text-gray-700 border-transparent',
    'focus:ring-2 focus:ring-gray-300 focus:ring-offset-2',
  ],
  gradient: [
    'bg-gradient-to-r from-primary-500 to-secondary-500',
    'hover:from-primary-600 hover:to-secondary-600',
    'active:from-primary-700 active:to-secondary-700',
    'text-white border-transparent',
    'shadow-lg hover:shadow-xl',
    'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  ],
  danger: [
    'bg-error-500 hover:bg-error-600 active:bg-error-700',
    'text-white border-transparent',
    'shadow-md hover:shadow-lg',
    'focus:ring-2 focus:ring-error-500 focus:ring-offset-2',
  ],
  success: [
    'bg-success-500 hover:bg-success-600 active:bg-success-700',
    'text-white border-transparent',
    'shadow-md hover:shadow-lg',
    'focus:ring-2 focus:ring-success-500 focus:ring-offset-2',
  ],
  warning: [
    'bg-warning-500 hover:bg-warning-600 active:bg-warning-700',
    'text-white border-transparent',
    'shadow-md hover:shadow-lg',
    'focus:ring-2 focus:ring-warning-500 focus:ring-offset-2',
  ],
  default: [
    'bg-gray-100 hover:bg-gray-200 active:bg-gray-300',
    'text-gray-900 border-gray-300',
    'border',
    'focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
  ],
};

const buttonSizes = {
  sm: ['h-8 px-3 text-sm', 'gap-1.5'],
  md: ['h-10 px-4 text-base', 'gap-2'],
  lg: ['h-12 px-6 text-lg', 'gap-2'],
  xl: ['h-14 px-8 text-xl', 'gap-3'],
};

const baseStyles = [
  'inline-flex items-center justify-center',
  'font-medium rounded-lg border',
  'transition-all duration-200 ease-in-out',
  'focus:outline-none',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  'select-none',
];

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          buttonVariants[variant],
          buttonSizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {isLoading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {leftIcon && !isLoading && <span className="flex-shrink-0">{leftIcon}</span>}
        <span className="truncate">{children}</span>
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

// 🎯 Button Group Component for multiple buttons
export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
}

const groupSpacing = {
  sm: 'gap-1',
  md: 'gap-2', 
  lg: 'gap-4',
};

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className,
  orientation = 'horizontal',
  spacing = 'md',
}) => {
  return (
    <div
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        groupSpacing[spacing],
        className
      )}
    >
      {children}
    </div>
  );
};

// 🔗 Link Button Component
export interface LinkButtonProps extends Omit<ButtonProps, 'type'> {
  href: string;
  external?: boolean;
}

export const LinkButton: React.FC<LinkButtonProps> = ({
  href,
  external = false,
  children,
  ...buttonProps
}) => {
  const linkProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <a href={href} {...linkProps} className="inline-block">
      <Button {...buttonProps}>{children}</Button>
    </a>
  );
};