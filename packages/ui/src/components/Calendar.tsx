import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';
import { Button } from './Button';

// 📝 Calendar Component - Flusk Design System
// Date picker and calendar functionality

export interface CalendarProps {
  value?: Date;
  defaultValue?: Date;
  onChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  disabledDaysOfWeek?: number[]; // 0-6, where 0 is Sunday
  showWeekNumbers?: boolean;
  showToday?: boolean;
  firstDayOfWeek?: number; // 0-6, where 0 is Sunday
  locale?: string;
  className?: string;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const Calendar: React.FC<CalendarProps> = ({
  value,
  defaultValue,
  onChange,
  minDate,
  maxDate,
  disabledDates = [],
  disabledDaysOfWeek = [],
  showWeekNumbers = false,
  showToday = true,
  firstDayOfWeek = 0,
  locale = 'en-US',
  className,
}) => {
  const [selectedDate, setSelectedDate] = useState(value || defaultValue || new Date());
  const [viewDate, setViewDate] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  // Update selected date when value prop changes
  useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setViewDate(new Date(value.getFullYear(), value.getMonth(), 1));
    }
  }, [value]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateDisabled = (date: Date): boolean => {
    // Check min/max dates
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;

    // Check disabled days of week
    if (disabledDaysOfWeek.includes(date.getDay())) return true;

    // Check specific disabled dates
    return disabledDates.some(disabledDate => 
      date.getTime() === disabledDate.getTime()
    );
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    
    const newDate = new Date(date);
    setSelectedDate(newDate);
    onChange?.(newDate);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setFullYear(prev.getFullYear() - 1);
      } else {
        newDate.setFullYear(prev.getFullYear() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    handleDateClick(today);
  };

  const generateCalendarDays = (): Date[] => {
    const firstDay = new Date(viewDate);
    const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    
    // Adjust for first day of week
    const startDate = new Date(firstDay);
    const daysToSubtract = (firstDay.getDay() - firstDayOfWeek + 7) % 7;
    startDate.setDate(startDate.getDate() - daysToSubtract);

    const days: Date[] = [];
    const currentDate = new Date(startDate);

    // Generate 6 weeks (42 days) to ensure consistent layout
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg shadow-lg p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateYear('prev')}
            className="p-1"
          >
            <Icon name="chevronLeft" size="sm" className="rotate-180" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="p-1"
          >
            <Icon name="chevronLeft" size="sm" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="p-1"
          >
            <Icon name="chevronRight" size="sm" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateYear('next')}
            className="p-1"
          >
            <Icon name="chevronRight" size="sm" className="rotate-180" />
          </Button>
        </div>
      </div>

      {/* Today Button */}
      {showToday && (
        <div className="flex justify-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs"
          >
            Today
          </Button>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {dayNames.map((day, index) => {
          const adjustedIndex = (index + firstDayOfWeek) % 7;
          return (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-xs font-medium text-gray-500"
            >
              {dayNames[adjustedIndex]}
            </div>
          );
        })}

        {/* Calendar Days */}
        {calendarDays.map((day, index) => {
          const isCurrentMonth = day.getMonth() === viewDate.getMonth();
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const isDisabled = isDateDisabled(day);

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
              className={cn(
                'h-8 w-8 flex items-center justify-center text-sm rounded-md',
                'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500',
                
                // Base styles
                isCurrentMonth ? 'text-gray-900' : 'text-gray-400',
                
                // Today highlight
                isToday && !isSelected && 'bg-gray-100 font-semibold',
                
                // Selected state
                isSelected && 'bg-primary-600 text-white font-semibold',
                
                // Hover state
                !isSelected && !isDisabled && 'hover:bg-gray-100',
                
                // Disabled state
                isDisabled && 'opacity-25 cursor-not-allowed hover:bg-transparent'
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 📅 DatePicker - Input with calendar popup
export interface DatePickerProps {
  value?: Date;
  defaultValue?: Date;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  format?: string;
  disabled?: boolean;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  clearable?: boolean;
  className?: string;
  calendarProps?: Omit<CalendarProps, 'value' | 'onChange'>;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  defaultValue,
  onChange,
  placeholder = 'Select date',
  format = 'MM/dd/yyyy',
  disabled = false,
  error = false,
  size = 'md',
  clearable = true,
  className,
  calendarProps,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value || defaultValue || null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedDate(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onChange?.(date);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange?.(null);
  };

  const inputSizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center cursor-pointer border rounded-lg bg-white',
          'transition-colors duration-200 focus-within:ring-2 focus-within:ring-primary-500',
          inputSizes[size],
          error ? 'border-error-500' : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <Icon name="calendar" size="md" className="text-gray-400 mr-3" />
        
        <span className={cn(
          'flex-1',
          selectedDate ? 'text-gray-900' : 'text-gray-500'
        )}>
          {selectedDate ? formatDate(selectedDate) : placeholder}
        </span>

        <div className="flex items-center gap-1">
          {clearable && selectedDate && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <Icon name="close" size="sm" className="text-gray-400" />
            </button>
          )}
          
          <Icon
            name="chevronDown"
            size="sm"
            className={cn(
              'text-gray-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* Calendar Popup */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <Calendar
            {...calendarProps}
            value={selectedDate || undefined}
            onChange={handleDateSelect}
          />
        </div>
      )}
    </div>
  );
};

// 📅 DateRangePicker - Select date range
export interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onChange?: (startDate: Date | null, endDate: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  size?: DatePickerProps['size'];
  className?: string;
  calendarProps?: Omit<CalendarProps, 'value' | 'onChange'>;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  placeholder = 'Select date range',
  disabled = false,
  error = false,
  size = 'md',
  className,
  calendarProps,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate || null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate || null);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempStartDate(startDate || null);
    setTempEndDate(endDate || null);
  }, [startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectingEnd(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateRange = (): string => {
    if (tempStartDate && tempEndDate) {
      return `${tempStartDate.toLocaleDateString()} - ${tempEndDate.toLocaleDateString()}`;
    }
    if (tempStartDate) {
      return `${tempStartDate.toLocaleDateString()} - ...`;
    }
    return placeholder;
  };

  const handleDateSelect = (date: Date) => {
    if (!selectingEnd && !tempStartDate) {
      // First selection
      setTempStartDate(date);
      setSelectingEnd(true);
    } else if (selectingEnd) {
      // Second selection
      if (tempStartDate && date < tempStartDate) {
        // If end date is before start date, swap them
        setTempEndDate(tempStartDate);
        setTempStartDate(date);
      } else {
        setTempEndDate(date);
      }
      setSelectingEnd(false);
      setIsOpen(false);
      onChange?.(tempStartDate, date);
    } else {
      // Reset and start over
      setTempStartDate(date);
      setTempEndDate(null);
      setSelectingEnd(true);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempStartDate(null);
    setTempEndDate(null);
    setSelectingEnd(false);
    onChange?.(null, null);
  };

  const inputSizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-3 text-lg',
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex items-center cursor-pointer border rounded-lg bg-white',
          'transition-colors duration-200 focus-within:ring-2 focus-within:ring-primary-500',
          inputSizes[size],
          error ? 'border-error-500' : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <Icon name="calendar" size="md" className="text-gray-400 mr-3" />
        
        <span className={cn(
          'flex-1',
          (tempStartDate || tempEndDate) ? 'text-gray-900' : 'text-gray-500'
        )}>
          {formatDateRange()}
        </span>

        <div className="flex items-center gap-1">
          {(tempStartDate || tempEndDate) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <Icon name="close" size="sm" className="text-gray-400" />
            </button>
          )}
          
          <Icon
            name="chevronDown"
            size="sm"
            className={cn(
              'text-gray-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* Calendar Popup */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <Calendar
            {...calendarProps}
            value={selectingEnd ? tempEndDate || undefined : tempStartDate || undefined}
            onChange={handleDateSelect}
            className="border-2 border-primary-200"
          />
          <div className="p-2 bg-gray-50 border-t text-xs text-gray-600 text-center">
            {selectingEnd ? 'Select end date' : 'Select start date'}
          </div>
        </div>
      )}
    </div>
  );
};