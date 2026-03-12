import React from 'react';
import { cn } from '../utils/cn';

// 📝 Progress Component - Flusk Design System
// Progress bars and indicators

export interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  showPercentage?: boolean;
  showValue?: boolean;
  label?: string;
  description?: string;
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

const progressSizes = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
  xl: 'h-4',
};

const progressVariants = {
  default: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-info-500',
};

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showPercentage = false,
  showValue = false,
  label,
  description,
  animated = false,
  striped = false,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const displayValue = showValue ? `${value}/${max}` : `${Math.round(percentage)}%`;

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      {(label || description || showPercentage || showValue) && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            {label && (
              <div className="text-sm font-medium text-gray-900">
                {label}
              </div>
            )}
            {description && (
              <div className="text-xs text-gray-500 mt-0.5">
                {description}
              </div>
            )}
          </div>
          {(showPercentage || showValue) && (
            <div className="text-sm font-medium text-gray-900">
              {displayValue}
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className={cn(
        'w-full bg-gray-200 rounded-full overflow-hidden',
        progressSizes[size]
      )}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            progressVariants[variant],
            animated && 'animate-pulse',
            striped && 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_100%] animate-[progress-stripe_1s_linear_infinite]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// 🔄 Circular Progress - Circular/radial progress indicator
export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: ProgressProps['variant'];
  showPercentage?: boolean;
  showValue?: boolean;
  animated?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  variant = 'default',
  showPercentage = true,
  showValue = false,
  animated = false,
  className,
  children,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colors = {
    default: '#0c8ce0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className={cn('transform -rotate-90', animated && 'animate-spin')}
      >
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors[variant]}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      
      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          <div className="text-center">
            {showPercentage && (
              <div className="text-lg font-semibold text-gray-900">
                {Math.round(percentage)}%
              </div>
            )}
            {showValue && (
              <div className="text-sm text-gray-500">
                {value}/{max}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 📊 Step Progress - Multi-step progress indicator
export interface StepProgressItem {
  key: string;
  title: string;
  description?: string;
  status?: 'pending' | 'current' | 'completed' | 'error';
}

export interface StepProgressProps {
  steps: StepProgressItem[];
  currentStep?: number;
  direction?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  currentStep = 0,
  direction = 'horizontal',
  size = 'md',
  className,
}) => {
  const stepSizes = {
    sm: {
      circle: 'w-8 h-8 text-sm',
      text: 'text-sm',
      line: direction === 'horizontal' ? 'h-0.5' : 'w-0.5',
    },
    md: {
      circle: 'w-10 h-10 text-base',
      text: 'text-base',
      line: direction === 'horizontal' ? 'h-1' : 'w-1',
    },
    lg: {
      circle: 'w-12 h-12 text-lg',
      text: 'text-lg',
      line: direction === 'horizontal' ? 'h-1' : 'w-1',
    },
  };

  const sizeConfig = stepSizes[size];

  const getStepStatus = (index: number, step: StepProgressItem): StepProgressItem['status'] => {
    if (step.status) return step.status;
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'current';
    return 'pending';
  };

  const getStepStyles = (status: StepProgressItem['status']) => {
    switch (status) {
      case 'completed':
        return {
          circle: 'bg-success-500 text-white',
          text: 'text-gray-900',
          line: 'bg-success-500',
        };
      case 'current':
        return {
          circle: 'bg-primary-500 text-white',
          text: 'text-gray-900',
          line: 'bg-gray-300',
        };
      case 'error':
        return {
          circle: 'bg-error-500 text-white',
          text: 'text-gray-900',
          line: 'bg-gray-300',
        };
      default:
        return {
          circle: 'bg-gray-200 text-gray-500',
          text: 'text-gray-500',
          line: 'bg-gray-300',
        };
    }
  };

  return (
    <nav className={cn('w-full', className)}>
      <ol className={cn(
        'flex',
        direction === 'horizontal' ? 'items-center' : 'flex-col space-y-4'
      )}>
        {steps.map((step, index) => {
          const status = getStepStatus(index, step);
          const styles = getStepStyles(status);
          const isLast = index === steps.length - 1;

          return (
            <li key={step.key} className={cn(
              'flex',
              direction === 'horizontal' 
                ? 'flex-1 items-center' 
                : 'items-start'
            )}>
              <div className={cn(
                'flex items-center',
                direction === 'vertical' ? 'flex-col' : 'flex-row'
              )}>
                {/* Step Circle */}
                <div className={cn(
                  'flex items-center justify-center rounded-full font-semibold',
                  sizeConfig.circle,
                  styles.circle
                )}>
                  {status === 'completed' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : status === 'error' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Step Content */}
                <div className={cn(
                  direction === 'horizontal' ? 'ml-3' : 'mt-2 text-center'
                )}>
                  <div className={cn(
                    'font-medium',
                    sizeConfig.text,
                    styles.text
                  )}>
                    {step.title}
                  </div>
                  {step.description && (
                    <div className={cn(
                      'text-gray-500',
                      size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
                    )}>
                      {step.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className={cn(
                  'bg-gray-300',
                  direction === 'horizontal' 
                    ? cn('flex-1 mx-4', sizeConfig.line)
                    : cn('ml-4 mt-2 flex-1', sizeConfig.line, 'min-h-[2rem]')
                )} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// ⏳ Progress Ring - Minimal circular progress
export interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 40,
  strokeWidth = 4,
  color = '#0c8ce0',
  backgroundColor = '#e5e7eb',
  className,
}) => {
  const normalizedRadius = (size - strokeWidth) / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg
      height={size}
      width={size}
      className={className}
    >
      <circle
        stroke={backgroundColor}
        fill="transparent"
        strokeWidth={strokeWidth}
        r={normalizedRadius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        style={{ strokeDashoffset }}
        strokeLinecap="round"
        r={normalizedRadius}
        cx={size / 2}
        cy={size / 2}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-300 ease-out"
      />
    </svg>
  );
};