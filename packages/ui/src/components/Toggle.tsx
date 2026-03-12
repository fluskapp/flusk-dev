import React from 'react';
import { cn } from '../utils/cn';

// 📝 Toggle Component - Flusk Design System
// Switch toggle for boolean states

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  label?: string;
  description?: string;
  labelPosition?: 'left' | 'right';
  onChange?: (checked: boolean) => void;
  onLabel?: string;
  offLabel?: string;
  className?: string;
  id?: string;
}

const toggleSizes = {
  sm: {
    track: 'h-5 w-9',
    thumb: 'h-4 w-4',
    translate: 'translate-x-4',
    text: 'text-sm',
  },
  md: {
    track: 'h-6 w-11',
    thumb: 'h-5 w-5',
    translate: 'translate-x-5',
    text: 'text-base',
  },
  lg: {
    track: 'h-7 w-14',
    thumb: 'h-6 w-6',
    translate: 'translate-x-7',
    text: 'text-lg',
  },
};

const toggleVariants = {
  default: {
    on: 'bg-primary-600',
    off: 'bg-gray-200',
  },
  success: {
    on: 'bg-success-600',
    off: 'bg-gray-200',
  },
  warning: {
    on: 'bg-warning-600',
    off: 'bg-gray-200',
  },
  danger: {
    on: 'bg-error-600',
    off: 'bg-gray-200',
  },
};

export const Toggle: React.FC<ToggleProps> = ({
  checked: controlledChecked,
  defaultChecked = false,
  disabled = false,
  size = 'md',
  variant = 'default',
  label,
  description,
  labelPosition = 'right',
  onChange,
  onLabel,
  offLabel,
  className,
  id: providedId,
}) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const checked = controlledChecked ?? internalChecked;
  
  const sizeConfig = toggleSizes[size];
  const variantConfig = toggleVariants[variant];
  
  const id = providedId || `toggle-${Math.random().toString(36).substr(2, 9)}`;

  const handleToggle = () => {
    if (disabled) return;
    
    const newChecked = !checked;
    if (controlledChecked === undefined) {
      setInternalChecked(newChecked);
    }
    onChange?.(newChecked);
  };

  const renderToggleSwitch = () => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={label ? `${id}-label` : undefined}
      aria-describedby={description ? `${id}-description` : undefined}
      disabled={disabled}
      onClick={handleToggle}
      className={cn(
        'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        sizeConfig.track,
        checked ? variantConfig.on : variantConfig.off,
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Labels on track */}
      {(onLabel || offLabel) && (
        <>
          {onLabel && (
            <span className={cn(
              'absolute left-1 top-1/2 -translate-y-1/2 text-xs font-medium text-white',
              'transition-opacity duration-200',
              checked ? 'opacity-100' : 'opacity-0'
            )}>
              {onLabel}
            </span>
          )}
          {offLabel && (
            <span className={cn(
              'absolute right-1 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-600',
              'transition-opacity duration-200',
              checked ? 'opacity-0' : 'opacity-100'
            )}>
              {offLabel}
            </span>
          )}
        </>
      )}
      
      {/* Thumb */}
      <span
        className={cn(
          'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0',
          'transition duration-200 ease-in-out',
          sizeConfig.thumb,
          checked ? sizeConfig.translate : 'translate-x-0'
        )}
      />
    </button>
  );

  const renderLabel = () => label && (
    <div className="flex-1 min-w-0">
      <label 
        id={`${id}-label`}
        htmlFor={id}
        className={cn(
          'font-medium text-gray-900 cursor-pointer',
          sizeConfig.text,
          disabled && 'cursor-not-allowed'
        )}
      >
        {label}
      </label>
      {description && (
        <p 
          id={`${id}-description`}
          className={cn(
            'text-gray-500',
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
          )}
        >
          {description}
        </p>
      )}
    </div>
  );

  if (!label) {
    return renderToggleSwitch();
  }

  return (
    <div className={cn(
      'flex items-center gap-3',
      labelPosition === 'left' && 'flex-row-reverse justify-between',
      className
    )}>
      {renderToggleSwitch()}
      {renderLabel()}
    </div>
  );
};

// 🎛️ Toggle Group - Multiple toggles with consistent styling
export interface ToggleGroupItem {
  key: string;
  label: string;
  description?: string;
  checked?: boolean;
  disabled?: boolean;
}

export interface ToggleGroupProps {
  items: ToggleGroupItem[];
  size?: ToggleProps['size'];
  variant?: ToggleProps['variant'];
  onChange?: (key: string, checked: boolean) => void;
  className?: string;
  title?: string;
  description?: string;
}

export const ToggleGroup: React.FC<ToggleGroupProps> = ({
  items,
  size = 'md',
  variant = 'default',
  onChange,
  className,
  title,
  description,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Group Header */}
      {(title || description) && (
        <div>
          {title && (
            <h3 className="text-base font-medium text-gray-900 mb-1">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
      )}
      
      {/* Toggle Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <Toggle
            key={item.key}
            checked={item.checked}
            disabled={item.disabled}
            size={size}
            variant={variant}
            label={item.label}
            description={item.description}
            onChange={(checked) => onChange?.(item.key, checked)}
          />
        ))}
      </div>
    </div>
  );
};