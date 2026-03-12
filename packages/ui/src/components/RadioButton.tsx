import React from 'react';
import { cn } from '../utils/cn';

// 📝 RadioButton Component - Flusk Design System
// Radio button for single selection from options

export interface RadioButtonProps {
  checked?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  label?: string;
  description?: string;
  error?: boolean;
  required?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
  id?: string;
  name?: string;
  value?: string;
}

const radioSizes = {
  sm: {
    input: 'h-4 w-4',
    text: 'text-sm',
  },
  md: {
    input: 'h-5 w-5',
    text: 'text-base',
  },
  lg: {
    input: 'h-6 w-6',
    text: 'text-lg',
  },
};

const radioVariants = {
  default: 'text-primary-600 focus:ring-primary-500',
  success: 'text-success-600 focus:ring-success-500',
  warning: 'text-warning-600 focus:ring-warning-500',
  danger: 'text-error-600 focus:ring-error-500',
};

export const RadioButton: React.FC<RadioButtonProps> = ({
  checked = false,
  disabled = false,
  size = 'md',
  variant = 'default',
  label,
  description,
  error = false,
  required = false,
  onChange,
  className,
  id: providedId,
  name,
  value,
}) => {
  const sizeConfig = radioSizes[size];
  const id = providedId || `radio-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onChange?.(e.target.checked);
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-start gap-3">
        {/* Radio Input */}
        <div className="flex items-center h-5">
          <input
            id={id}
            name={name}
            value={value}
            type="radio"
            checked={checked}
            disabled={disabled}
            required={required}
            onChange={handleChange}
            className={cn(
              'border-gray-300 transition-colors duration-200',
              'focus:ring-2 focus:ring-offset-2 focus:outline-none',
              sizeConfig.input,
              radioVariants[variant],
              error && 'border-error-500 focus:ring-error-500',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>

        {/* Label and Description */}
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && (
              <label
                htmlFor={id}
                className={cn(
                  'font-medium block leading-5',
                  sizeConfig.text,
                  error ? 'text-error-700' : 'text-gray-900',
                  disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                )}
              >
                {label}
                {required && (
                  <span className="text-error-500 ml-1">*</span>
                )}
              </label>
            )}
            
            {description && (
              <p className={cn(
                'text-gray-500 mt-1',
                size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
                disabled && 'opacity-50'
              )}>
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 🔘 Radio Group - Multiple radio buttons for single selection
export interface RadioGroupItem {
  key: string;
  label: string;
  description?: string;
  value?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  items: RadioGroupItem[];
  value?: string;
  defaultValue?: string;
  size?: RadioButtonProps['size'];
  variant?: RadioButtonProps['variant'];
  direction?: 'vertical' | 'horizontal';
  title?: string;
  description?: string;
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  name?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  items,
  value: controlledValue,
  defaultValue,
  size = 'md',
  variant = 'default',
  direction = 'vertical',
  title,
  description,
  error = false,
  errorMessage,
  required = false,
  onChange,
  className,
  name: providedName,
}) => {
  const [internalValue, setInternalValue] = React.useState<string | undefined>(defaultValue);
  const value = controlledValue ?? internalValue;
  const name = providedName || `radio-group-${Math.random().toString(36).substr(2, 9)}`;

  const handleItemChange = (itemKey: string, itemValue: string | undefined, checked: boolean) => {
    if (!checked) return;
    
    const newValue = itemValue ?? itemKey;
    
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const hasError = error || !!errorMessage;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Group Header */}
      {(title || description) && (
        <div>
          {title && (
            <legend className={cn(
              'text-base font-medium block',
              hasError ? 'text-error-700' : 'text-gray-900'
            )}>
              {title}
              {required && (
                <span className="text-error-500 ml-1">*</span>
              )}
            </legend>
          )}
          {description && (
            <p className="text-sm text-gray-500 mt-1">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Radio Items */}
      <fieldset className={cn(
        'space-y-3',
        direction === 'horizontal' && 'flex flex-wrap gap-6 space-y-0'
      )}>
        {items.map((item) => {
          const itemValue = item.value ?? item.key;
          const isChecked = value === itemValue;
          
          return (
            <RadioButton
              key={item.key}
              name={name}
              value={itemValue}
              checked={isChecked}
              disabled={item.disabled}
              size={size}
              variant={variant}
              label={item.label}
              description={item.description}
              error={hasError}
              required={required}
              onChange={(checked) => handleItemChange(item.key, item.value, checked)}
              className={direction === 'horizontal' ? 'flex-shrink-0' : undefined}
            />
          );
        })}
      </fieldset>

      {/* Error Message */}
      {errorMessage && (
        <p className="text-sm text-error-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

// 🎛️ Radio Cards - Visual card-based radio selection
export interface RadioCardProps {
  checked?: boolean;
  disabled?: boolean;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  price?: string;
  recommended?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
  id?: string;
  name?: string;
  value?: string;
}

export const RadioCard: React.FC<RadioCardProps> = ({
  checked = false,
  disabled = false,
  title,
  description,
  icon,
  badge,
  price,
  recommended = false,
  onChange,
  className,
  id: providedId,
  name,
  value,
}) => {
  const id = providedId || `radio-card-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onChange?.(e.target.checked);
  };

  return (
    <div className={cn('relative', className)}>
      <input
        id={id}
        name={name}
        value={value}
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
      />
      
      <label
        htmlFor={id}
        className={cn(
          'block relative bg-white border-2 rounded-lg p-4 cursor-pointer transition-all duration-200',
          'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
          checked 
            ? 'border-primary-500 ring-1 ring-primary-500' 
            : 'border-gray-200 hover:border-gray-300',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
          'hover:bg-gray-50'
        )}
      >
        {/* Recommended Badge */}
        {recommended && (
          <div className="absolute -top-2 left-4">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
              Recommended
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                'font-medium text-gray-900',
                disabled && 'text-gray-500'
              )}>
                {title}
              </h3>
              {description && (
                <p className={cn(
                  'text-sm text-gray-500 mt-1',
                  disabled && 'text-gray-400'
                )}>
                  {description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {badge && badge}
            {price && (
              <div className="text-right">
                <div className={cn(
                  'text-lg font-semibold text-gray-900',
                  disabled && 'text-gray-500'
                )}>
                  {price}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Check indicator */}
        <div className="absolute top-4 right-4">
          <div className={cn(
            'w-5 h-5 rounded-full border-2 transition-colors duration-200',
            checked 
              ? 'border-primary-500 bg-primary-500' 
              : 'border-gray-300'
          )}>
            {checked && (
              <div className="w-full h-full rounded-full bg-white border-2 border-primary-500 scale-50" />
            )}
          </div>
        </div>
      </label>
    </div>
  );
};

// 🎴 Radio Card Group - Multiple radio cards for single selection
export interface RadioCardGroupItem extends Omit<RadioCardProps, 'checked' | 'onChange' | 'name'> {
  key: string;
  value?: string;
}

export interface RadioCardGroupProps {
  items: RadioCardGroupItem[];
  value?: string;
  defaultValue?: string;
  columns?: number;
  title?: string;
  description?: string;
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  name?: string;
}

export const RadioCardGroup: React.FC<RadioCardGroupProps> = ({
  items,
  value: controlledValue,
  defaultValue,
  columns = 1,
  title,
  description,
  error = false,
  errorMessage,
  required = false,
  onChange,
  className,
  name: providedName,
}) => {
  const [internalValue, setInternalValue] = React.useState<string | undefined>(defaultValue);
  const value = controlledValue ?? internalValue;
  const name = providedName || `radio-card-group-${Math.random().toString(36).substr(2, 9)}`;

  const handleItemChange = (itemKey: string, itemValue: string | undefined, checked: boolean) => {
    if (!checked) return;
    
    const newValue = itemValue ?? itemKey;
    
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const hasError = error || !!errorMessage;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Group Header */}
      {(title || description) && (
        <div>
          {title && (
            <legend className={cn(
              'text-base font-medium block',
              hasError ? 'text-error-700' : 'text-gray-900'
            )}>
              {title}
              {required && (
                <span className="text-error-500 ml-1">*</span>
              )}
            </legend>
          )}
          {description && (
            <p className="text-sm text-gray-500 mt-1">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Radio Card Items */}
      <fieldset className={cn(
        'grid gap-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
      )}>
        {items.map((item) => {
          const itemValue = item.value ?? item.key;
          const isChecked = value === itemValue;
          
          return (
            <RadioCard
              key={item.key}
              title={item.title}
              description={item.description}
              icon={item.icon}
              badge={item.badge}
              price={item.price}
              recommended={item.recommended}
              disabled={item.disabled}
              name={name}
              value={itemValue}
              checked={isChecked}
              onChange={(checked) => handleItemChange(item.key, item.value, checked)}
            />
          );
        })}
      </fieldset>

      {/* Error Message */}
      {errorMessage && (
        <p className="text-sm text-error-600 mt-2">
          {errorMessage}
        </p>
      )}
    </div>
  );
};