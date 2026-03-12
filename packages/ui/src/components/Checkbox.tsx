import React from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';

// 📝 Checkbox Component - Flusk Design System
// Checkbox input for selection

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  label?: string;
  description?: string;
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
  id?: string;
  name?: string;
  value?: string;
}

const checkboxSizes = {
  sm: {
    input: 'h-4 w-4',
    text: 'text-sm',
    icon: 'sm' as const,
  },
  md: {
    input: 'h-5 w-5',
    text: 'text-base',
    icon: 'md' as const,
  },
  lg: {
    input: 'h-6 w-6',
    text: 'text-lg',
    icon: 'lg' as const,
  },
};

const checkboxVariants = {
  default: 'text-primary-600 focus:ring-primary-500',
  success: 'text-success-600 focus:ring-success-500',
  warning: 'text-warning-600 focus:ring-warning-500',
  danger: 'text-error-600 focus:ring-error-500',
};

export const Checkbox: React.FC<CheckboxProps> = ({
  checked: controlledChecked,
  defaultChecked = false,
  indeterminate = false,
  disabled = false,
  size = 'md',
  variant = 'default',
  label,
  description,
  error = false,
  errorMessage,
  required = false,
  onChange,
  className,
  id: providedId,
  name,
  value,
}) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const checked = controlledChecked ?? internalChecked;
  const checkboxRef = React.useRef<HTMLInputElement>(null);
  
  const sizeConfig = checkboxSizes[size];
  const hasError = error || !!errorMessage;
  const id = providedId || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  // Set indeterminate state
  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const newChecked = e.target.checked;
    if (controlledChecked === undefined) {
      setInternalChecked(newChecked);
    }
    onChange?.(newChecked);
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-start gap-3">
        {/* Checkbox Input */}
        <div className="flex items-center h-5">
          <input
            ref={checkboxRef}
            id={id}
            name={name}
            value={value}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            required={required}
            onChange={handleChange}
            className={cn(
              'rounded border-gray-300 transition-colors duration-200',
              'focus:ring-2 focus:ring-offset-2 focus:outline-none',
              sizeConfig.input,
              checkboxVariants[variant],
              hasError && 'border-error-500 focus:ring-error-500',
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
                  hasError ? 'text-error-700' : 'text-gray-900',
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

      {/* Error Message */}
      {errorMessage && (
        <p className="mt-1 text-sm text-error-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

// ☑️ Checkbox Group - Multiple checkboxes with consistent styling
export interface CheckboxGroupItem {
  key: string;
  label: string;
  description?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
}

export interface CheckboxGroupProps {
  items: CheckboxGroupItem[];
  value?: string[];
  defaultValue?: string[];
  size?: CheckboxProps['size'];
  variant?: CheckboxProps['variant'];
  direction?: 'vertical' | 'horizontal';
  title?: string;
  description?: string;
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
  onChange?: (values: string[]) => void;
  className?: string;
  name?: string;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  items,
  value: controlledValue,
  defaultValue = [],
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
  name,
}) => {
  const [internalValue, setInternalValue] = React.useState<string[]>(defaultValue);
  const value = controlledValue ?? internalValue;

  const handleItemChange = (itemKey: string, itemValue: string | undefined, checked: boolean) => {
    const checkValue = itemValue ?? itemKey;
    
    const newValue = checked
      ? [...value, checkValue]
      : value.filter(v => v !== checkValue);

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

      {/* Checkbox Items */}
      <fieldset className={cn(
        'space-y-3',
        direction === 'horizontal' && 'flex flex-wrap gap-6 space-y-0'
      )}>
        {items.map((item) => {
          const itemValue = item.value ?? item.key;
          const isChecked = value.includes(itemValue);
          
          return (
            <Checkbox
              key={item.key}
              name={name}
              value={itemValue}
              checked={item.checked ?? isChecked}
              disabled={item.disabled}
              size={size}
              variant={variant}
              label={item.label}
              description={item.description}
              error={hasError}
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

// ✅ Select All Checkbox - Helper for tables and lists
export interface SelectAllCheckboxProps {
  totalCount: number;
  selectedCount: number;
  onSelectAll: (selectAll: boolean) => void;
  disabled?: boolean;
  size?: CheckboxProps['size'];
  label?: string;
  className?: string;
}

export const SelectAllCheckbox: React.FC<SelectAllCheckboxProps> = ({
  totalCount,
  selectedCount,
  onSelectAll,
  disabled = false,
  size = 'md',
  label,
  className,
}) => {
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount;
  
  const handleChange = (checked: boolean) => {
    onSelectAll(checked);
  };

  const defaultLabel = isAllSelected 
    ? 'Deselect all' 
    : isIndeterminate 
      ? `Select remaining ${totalCount - selectedCount}` 
      : 'Select all';

  return (
    <Checkbox
      checked={isAllSelected}
      indeterminate={isIndeterminate}
      disabled={disabled || totalCount === 0}
      size={size}
      label={label || defaultLabel}
      onChange={handleChange}
      className={className}
    />
  );
};