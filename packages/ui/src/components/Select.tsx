import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';

// 📝 Select Component - Flusk Design System
// Dropdown selection with search and multi-select support

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  placeholder?: string;
  searchPlaceholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  helperText?: string;
  errorMessage?: string;
  className?: string;
  onChange?: (value: string | string[]) => void;
  onSearch?: (query: string) => void;
}

const selectSizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-5 text-lg',
};

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  defaultValue,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search options...',
  multiple = false,
  searchable = false,
  clearable = false,
  disabled = false,
  loading = false,
  error = false,
  size = 'md',
  label,
  helperText,
  errorMessage,
  className,
  onChange,
  onSearch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    if (value !== undefined) {
      return Array.isArray(value) ? value : [value];
    }
    if (defaultValue !== undefined) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [];
  });

  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Filter options based on search query
  const filteredOptions = searchQuery
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchQuery('');
      }
    }
  };

  const handleOptionClick = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      
      setSelectedValues(newValues);
      onChange?.(newValues);
    } else {
      setSelectedValues([optionValue]);
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedValues([]);
    onChange?.(multiple ? [] : '');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }

    if (multiple) {
      if (selectedValues.length === 1) {
        const option = options.find(opt => opt.value === selectedValues[0]);
        return option?.label || selectedValues[0];
      }
      return `${selectedValues.length} options selected`;
    }

    const option = options.find(opt => opt.value === selectedValues[0]);
    return option?.label || selectedValues[0];
  };

  const hasError = error || !!errorMessage;
  const displayedHelperText = hasError ? errorMessage : helperText;

  return (
    <div className={cn('relative', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Select Container */}
      <div ref={selectRef} className="relative">
        <div
          className={cn(
            'flex items-center justify-between w-full rounded-lg border bg-white cursor-pointer transition-colors duration-200',
            'focus-within:ring-1 focus-within:ring-primary-500 focus-within:border-primary-500',
            selectSizes[size],
            hasError
              ? 'border-error-500 focus-within:border-error-500 focus-within:ring-error-500'
              : 'border-gray-300 hover:border-gray-400',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            selectedValues.length === 0 && 'text-gray-400'
          )}
          onClick={handleToggle}
        >
          <span className="truncate flex-1 text-left">
            {getDisplayText()}
          </span>
          
          <div className="flex items-center gap-1">
            {clearable && selectedValues.length > 0 && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 hover:bg-gray-100 rounded"
              >
                <Icon name="close" size="sm" color="muted" />
              </button>
            )}
            
            {loading ? (
              <Icon name="spinner" size="sm" color="muted" className="animate-spin" />
            ) : (
              <Icon 
                name="chevronDown" 
                size="sm" 
                color="muted" 
                className={cn(
                  'transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            )}
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Icon 
                    name="search" 
                    size="sm" 
                    color="muted" 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        'flex items-center px-3 py-2 cursor-pointer text-sm transition-colors duration-150',
                        'hover:bg-gray-50',
                        isSelected && 'bg-primary-50 text-primary-700',
                        option.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                      onClick={() => !option.disabled && handleOptionClick(option.value)}
                    >
                      {/* Icon */}
                      {option.icon && (
                        <div className="mr-2 flex-shrink-0">
                          {option.icon}
                        </div>
                      )}
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {option.description}
                          </div>
                        )}
                      </div>
                      
                      {/* Selected Indicator */}
                      {multiple && isSelected && (
                        <Icon name="check" size="sm" color="primary" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Helper Text */}
      {displayedHelperText && (
        <p className={cn(
          'mt-1 text-sm',
          hasError ? 'text-error-600' : 'text-gray-500'
        )}>
          {displayedHelperText}
        </p>
      )}
    </div>
  );
};

// 🎯 Multi-Select Component - Specialized for multiple selections
export interface MultiSelectProps extends Omit<SelectProps, 'multiple' | 'value' | 'onChange'> {
  value?: string[];
  onChange?: (value: string[]) => void;
  maxSelections?: number;
  showSelectAll?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  maxSelections,
  showSelectAll = false,
  options,
  value = [],
  onChange,
  ...props
}) => {
  const handleSelectAll = () => {
    const allValues = options.filter(opt => !opt.disabled).map(opt => opt.value);
    onChange?.(value.length === allValues.length ? [] : allValues);
  };

  const modifiedOptions = showSelectAll ? [
    {
      value: '__select_all__',
      label: value.length === options.filter(opt => !opt.disabled).length ? 'Deselect All' : 'Select All',
      description: `${value.length}/${options.filter(opt => !opt.disabled).length} selected`,
    },
    ...options,
  ] : options;

  const handleChange = (newValue: string | string[]) => {
    const values = Array.isArray(newValue) ? newValue : [newValue];
    
    if (values.includes('__select_all__')) {
      handleSelectAll();
      return;
    }

    if (maxSelections && values.length > maxSelections) {
      return; // Don't allow more than max selections
    }

    onChange?.(values);
  };

  return (
    <Select
      {...props}
      multiple
      options={modifiedOptions}
      value={value}
      onChange={handleChange}
    />
  );
};