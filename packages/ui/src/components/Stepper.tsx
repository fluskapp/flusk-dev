import React from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';

// 📝 Stepper Component - Flusk Design System
// Step-by-step navigation for multi-step processes

export interface Step {
  id: string;
  title: string;
  description?: string;
  status?: 'pending' | 'current' | 'completed' | 'error' | 'skipped';
  optional?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pills' | 'simple' | 'dots';
  showNumbers?: boolean;
  showConnectors?: boolean;
  interactive?: boolean;
  onStepClick?: (stepIndex: number, step: Step) => void;
  className?: string;
}

const stepperSizes = {
  sm: {
    circle: 'w-8 h-8',
    icon: 'sm' as const,
    title: 'text-sm',
    description: 'text-xs',
    connector: 'h-0.5',
    spacing: 'gap-2',
  },
  md: {
    circle: 'w-10 h-10',
    icon: 'md' as const,
    title: 'text-base',
    description: 'text-sm',
    connector: 'h-1',
    spacing: 'gap-3',
  },
  lg: {
    circle: 'w-12 h-12',
    icon: 'lg' as const,
    title: 'text-lg',
    description: 'text-base',
    connector: 'h-1',
    spacing: 'gap-4',
  },
};

const getStepStatus = (index: number, currentStep: number, step: Step): Step['status'] => {
  if (step.status) return step.status;
  if (index < currentStep) return 'completed';
  if (index === currentStep) return 'current';
  return 'pending';
};

const stepStatusStyles = {
  pending: {
    circle: 'bg-gray-200 text-gray-500 border-gray-200',
    title: 'text-gray-500',
    description: 'text-gray-400',
    connector: 'bg-gray-200',
  },
  current: {
    circle: 'bg-primary-600 text-white border-primary-600',
    title: 'text-primary-600',
    description: 'text-gray-600',
    connector: 'bg-gray-200',
  },
  completed: {
    circle: 'bg-primary-600 text-white border-primary-600',
    title: 'text-gray-900',
    description: 'text-gray-600',
    connector: 'bg-primary-600',
  },
  error: {
    circle: 'bg-error-600 text-white border-error-600',
    title: 'text-error-600',
    description: 'text-gray-600',
    connector: 'bg-gray-200',
  },
  skipped: {
    circle: 'bg-gray-400 text-white border-gray-400',
    title: 'text-gray-400',
    description: 'text-gray-400',
    connector: 'bg-gray-200',
  },
};

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  orientation = 'horizontal',
  size = 'md',
  variant = 'default',
  showNumbers = true,
  showConnectors = true,
  interactive = false,
  onStepClick,
  className,
}) => {
  const sizeConfig = stepperSizes[size];

  const handleStepClick = (stepIndex: number, step: Step) => {
    if (interactive && !step.disabled && onStepClick) {
      onStepClick(stepIndex, step);
    }
  };

  const renderStepIcon = (step: Step, stepIndex: number, status: Step['status']) => {
    const styles = stepStatusStyles[status || 'pending'];

    if (variant === 'dots') {
      return (
        <div
          className={cn(
            'w-3 h-3 rounded-full transition-colors duration-200',
            styles.circle
          )}
        />
      );
    }

    const circleContent = () => {
      if (step.icon) {
        return React.cloneElement(step.icon as React.ReactElement, {
          size: sizeConfig.icon,
        } as any);
      }

      switch (status) {
        case 'completed':
          return <Icon name="check" size={sizeConfig.icon} />;
        case 'error':
          return <Icon name="close" size={sizeConfig.icon} />;
        case 'skipped':
          return <Icon name="arrowRight" size={sizeConfig.icon} />;
        default:
          return showNumbers ? stepIndex + 1 : null;
      }
    };

    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full border-2',
          'transition-all duration-200 font-semibold',
          sizeConfig.circle,
          styles.circle,
          interactive && !step.disabled && 'cursor-pointer hover:scale-105',
          variant === 'pills' && 'rounded-lg'
        )}
      >
        {circleContent()}
      </div>
    );
  };

  const renderStepContent = (step: Step, stepIndex: number, status: Step['status']) => {
    const styles = stepStatusStyles[status || 'pending'];

    if (variant === 'simple' || variant === 'dots') {
      return (
        <div className="text-center">
          <div className={cn('font-medium', styles.title, sizeConfig.title)}>
            {step.title}
            {step.optional && (
              <span className="text-gray-400 text-sm ml-1">(optional)</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={cn(orientation === 'vertical' ? 'ml-4' : 'text-center')}>
        <div className={cn('font-medium', styles.title, sizeConfig.title)}>
          {step.title}
          {step.optional && (
            <span className="text-gray-400 text-sm ml-1">(optional)</span>
          )}
        </div>
        {step.description && (
          <div className={cn(styles.description, sizeConfig.description, 'mt-1')}>
            {step.description}
          </div>
        )}
      </div>
    );
  };

  const renderConnector = (stepIndex: number, status: Step['status']) => {
    if (!showConnectors || stepIndex === steps.length - 1) return null;

    const nextStatus = getStepStatus(stepIndex + 1, currentStep, steps[stepIndex + 1]);
    const isCompleted = status === 'completed';
    const styles = stepStatusStyles[status || 'pending'];

    if (orientation === 'vertical') {
      return (
        <div className="flex justify-center w-full">
          <div
            className={cn(
              'w-0.5 h-8 transition-colors duration-200',
              isCompleted ? styles.connector : 'bg-gray-200'
            )}
          />
        </div>
      );
    }

    if (variant === 'dots') {
      return (
        <div
          className={cn(
            'flex-1 h-0.5 transition-colors duration-200',
            isCompleted ? 'bg-primary-600' : 'bg-gray-200'
          )}
        />
      );
    }

    return (
      <div className="flex-1 flex items-center px-2">
        <div
          className={cn(
            'flex-1 transition-colors duration-200',
            sizeConfig.connector,
            isCompleted ? styles.connector : 'bg-gray-200'
          )}
        />
      </div>
    );
  };

  const containerClasses = cn(
    'flex',
    orientation === 'horizontal' ? 'items-center' : 'flex-col',
    variant === 'dots' && orientation === 'horizontal' ? 'items-center gap-2' : sizeConfig.spacing,
    className
  );

  return (
    <nav aria-label="Progress" className={containerClasses}>
      {steps.map((step, stepIndex) => {
        const status = getStepStatus(stepIndex, currentStep, step);
        const isClickable = interactive && !step.disabled;

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                'flex items-center',
                orientation === 'vertical' ? 'w-full' : 'flex-col',
                variant === 'dots' ? 'flex-row' : sizeConfig.spacing,
                isClickable && 'cursor-pointer',
                step.disabled && 'opacity-50'
              )}
              onClick={() => handleStepClick(stepIndex, step)}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={(e) => {
                if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleStepClick(stepIndex, step);
                }
              }}
            >
              {/* Step Icon */}
              <div className="flex-shrink-0">
                {renderStepIcon(step, stepIndex, status)}
              </div>

              {/* Step Content */}
              {variant !== 'dots' && (
                <div className={cn(
                  orientation === 'vertical' ? 'flex-1' : 'mt-2',
                  'min-w-0'
                )}>
                  {renderStepContent(step, stepIndex, status)}
                </div>
              )}
            </div>

            {/* Connector */}
            {renderConnector(stepIndex, status)}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// 🎯 Simple Steps - Minimal step indicator
export interface SimpleStepsProps {
  steps: string[];
  currentStep: number;
  size?: StepperProps['size'];
  className?: string;
}

export const SimpleSteps: React.FC<SimpleStepsProps> = ({
  steps,
  currentStep,
  size = 'md',
  className,
}) => {
  const stepsData: Step[] = steps.map((title, index) => ({
    id: `step-${index}`,
    title,
  }));

  return (
    <Stepper
      steps={stepsData}
      currentStep={currentStep}
      variant="simple"
      size={size}
      className={className}
    />
  );
};

// 🔢 Number Steps - Steps with only numbers
export interface NumberStepsProps {
  totalSteps: number;
  currentStep: number;
  size?: StepperProps['size'];
  onStepClick?: (step: number) => void;
  className?: string;
}

export const NumberSteps: React.FC<NumberStepsProps> = ({
  totalSteps,
  currentStep,
  size = 'md',
  onStepClick,
  className,
}) => {
  const steps: Step[] = Array.from({ length: totalSteps }, (_, index) => ({
    id: `step-${index + 1}`,
    title: `Step ${index + 1}`,
  }));

  return (
    <Stepper
      steps={steps}
      currentStep={currentStep}
      variant="dots"
      size={size}
      interactive={!!onStepClick}
      onStepClick={onStepClick ? (index) => onStepClick(index) : undefined}
      showNumbers={true}
      className={className}
    />
  );
};

// 🔘 Dot Steps - Minimal dot indicator
export interface DotStepsProps {
  totalSteps: number;
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

export const DotSteps: React.FC<DotStepsProps> = ({
  totalSteps,
  currentStep,
  onStepClick,
  className,
}) => {
  const steps: Step[] = Array.from({ length: totalSteps }, (_, index) => ({
    id: `dot-${index}`,
    title: '',
  }));

  return (
    <Stepper
      steps={steps}
      currentStep={currentStep}
      variant="dots"
      size="sm"
      interactive={!!onStepClick}
      onStepClick={onStepClick ? (index) => onStepClick(index) : undefined}
      showNumbers={false}
      className={className}
    />
  );
};

// 📋 Progress Steps - Steps with progress percentage
export interface ProgressStepsProps {
  steps: Array<{ title: string; description?: string }>;
  currentStep: number;
  showProgress?: boolean;
  className?: string;
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  steps,
  currentStep,
  showProgress = true,
  className,
}) => {
  const stepsData: Step[] = steps.map((step, index) => ({
    id: `progress-step-${index}`,
    title: step.title,
    description: step.description,
  }));

  const progress = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div className={cn('space-y-4', className)}>
      {showProgress && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>{progress}% complete</span>
        </div>
      )}
      
      {showProgress && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      <Stepper
        steps={stepsData}
        currentStep={currentStep}
        orientation="horizontal"
        variant="default"
      />
    </div>
  );
};