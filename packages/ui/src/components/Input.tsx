import React from 'react';
import { cn } from '../utils/cn';
import { Icon, IconProps } from './Icon';

// 📝 Input Component - Flusk Design System
// Form inputs with validation and styling

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'outline' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  state?: 'default' | 'error' | 'success';
  fullWidth?: boolean;
  leftIcon?: IconProps['name'];
  rightIcon?: IconProps['name'];
  onRightIconClick?: () => void;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  className?: string;
}

const inputVariants = {
  default: [
    'bg-white border-gray-300 text-gray-900',
    'focus:border-primary-500 focus:ring-primary-500',
    'placeholder:text-gray-400',
  ],
  outline: [
    'bg-transparent border-2 border-gray-300 text-gray-900',
    'focus:border-primary-500 focus:ring-primary-500',
    'placeholder:text-gray-400',
  ],
  filled: [
    'bg-gray-50 border-gray-200 text-gray-900',
    'focus:bg-white focus:border-primary-500 focus:ring-primary-500',
    'placeholder:text-gray-500',
  ],
};

const inputSizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-5 text-lg',
};

const inputStates = {
  default: '',
  error: 'border-error-500 focus:border-error-500 focus:ring-error-500',
  success: 'border-success-500 focus:border-success-500 focus:ring-success-500',
};

const iconSizes: Record<InputProps['size']extends infer K ? K extends keyof typeof inputSizes ? K : never : never, IconProps['size']> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

const paddingWithIcon = {
  sm: {
    left: 'pl-9',
    right: 'pr-9',
  },
  md: {
    left: 'pl-10',
    right: 'pr-10',
  },
  lg: {
    left: 'pl-12',
    right: 'pr-12',
  },
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      state = 'default',
      fullWidth = false,
      leftIcon,
      rightIcon,
      onRightIconClick,
      label,
      helperText,
      errorMessage,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = state === 'error' || !!errorMessage;
    const hasSuccess = state === 'success';
    const displayedHelperText = hasError ? errorMessage : helperText;

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Icon
                name={leftIcon}
                size={iconSizes[size]}
                color="muted"
              />
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base styles
              'block w-full rounded-lg border transition-colors duration-200',
              'focus:ring-1 focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
              
              // Variant styles
              inputVariants[variant],
              
              // Size styles
              inputSizes[size],
              
              // State styles
              hasError && inputStates.error,
              hasSuccess && inputStates.success,
              !hasError && !hasSuccess && inputStates.default,
              
              // Icon padding
              leftIcon && paddingWithIcon[size].left,
              rightIcon && paddingWithIcon[size].right,
              
              // Full width
              fullWidth && 'w-full',
              
              className
            )}
            {...props}
          />

          {/* Right Icon */}
          {rightIcon && (
            <div
              className={cn(
                'absolute inset-y-0 right-0 flex items-center pr-3',
                onRightIconClick ? 'cursor-pointer' : 'pointer-events-none'
              )}
              onClick={onRightIconClick}
            >
              <Icon
                name={rightIcon}
                size={iconSizes[size]}
                color="muted"
              />
            </div>
          )}
        </div>

        {/* Helper Text / Error Message */}
        {displayedHelperText && (
          <p
            className={cn(
              'mt-1 text-sm',
              hasError ? 'text-error-600' : 'text-gray-500'
            )}
          >
            {displayedHelperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// 🔍 Search Input - Specialized input for search
export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rightIcon' | 'onRightIconClick'> {
  onClear?: () => void;
  isLoading?: boolean;
  showClearButton?: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      onClear,
      isLoading = false,
      showClearButton = true,
      value,
      placeholder = 'Search...',
      ...props
    },
    ref
  ) => {
    const hasValue = value && String(value).length > 0;

    return (
      <Input
        ref={ref}
        leftIcon="search"
        rightIcon={
          isLoading
            ? 'spinner'
            : hasValue && showClearButton
            ? 'close'
            : undefined
        }
        onRightIconClick={hasValue && showClearButton ? onClear : undefined}
        value={value}
        placeholder={placeholder}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// 🔐 Password Input - Input with toggle visibility
export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon' | 'onRightIconClick'> {
  showPasswordToggle?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      showPasswordToggle = true,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(false);

    const toggleVisibility = () => {
      setIsVisible(!isVisible);
    };

    return (
      <Input
        ref={ref}
        type={isVisible ? 'text' : 'password'}
        rightIcon={showPasswordToggle ? (isVisible ? 'eye' : 'eye') : undefined}
        onRightIconClick={showPasswordToggle ? toggleVisibility : undefined}
        {...props}
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

// 📧 Email Input - Specialized input for email addresses
export const EmailInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'leftIcon'>>(
  (props, ref) => (
    <Input
      ref={ref}
      type="email"
      leftIcon="mail"
      placeholder="Enter your email"
      {...props}
    />
  )
);

EmailInput.displayName = 'EmailInput';

// 📱 Phone Input - Specialized input for phone numbers
export const PhoneInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'leftIcon'>>(
  (props, ref) => (
    <Input
      ref={ref}
      type="tel"
      leftIcon="phone"
      placeholder="Enter your phone number"
      {...props}
    />
  )
);

PhoneInput.displayName = 'PhoneInput';

// 📝 Textarea Component
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: InputProps['variant'];
  size?: InputProps['size'];
  state?: InputProps['state'];
  fullWidth?: boolean;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  className?: string;
}

const textareaSizes = {
  sm: 'p-3 text-sm min-h-[80px]',
  md: 'p-4 text-base min-h-[100px]',
  lg: 'p-5 text-lg min-h-[120px]',
};

const resizeOptions = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      variant = 'default',
      size = 'md',
      state = 'default',
      fullWidth = false,
      label,
      helperText,
      errorMessage,
      resize = 'vertical',
      className,
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = state === 'error' || !!errorMessage;
    const hasSuccess = state === 'success';
    const displayedHelperText = hasError ? errorMessage : helperText;

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            // Base styles
            'block w-full rounded-lg border transition-colors duration-200',
            'focus:ring-1 focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
            
            // Variant styles
            inputVariants[variant],
            
            // Size styles
            textareaSizes[size],
            
            // State styles
            hasError && inputStates.error,
            hasSuccess && inputStates.success,
            !hasError && !hasSuccess && inputStates.default,
            
            // Resize
            resizeOptions[resize],
            
            // Full width
            fullWidth && 'w-full',
            
            className
          )}
          {...props}
        />

        {/* Helper Text / Error Message */}
        {displayedHelperText && (
          <p
            className={cn(
              'mt-1 text-sm',
              hasError ? 'text-error-600' : 'text-gray-500'
            )}
          >
            {displayedHelperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';