import React, { useState, useEffect } from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';
import { Button } from './Button';

// 📝 Alert Component - Flusk Design System
// Alert messages and notifications

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode | boolean;
  closable?: boolean;
  onClose?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

const alertVariants = {
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: 'text-blue-400',
    title: 'text-blue-900',
    iconName: 'info' as const,
  },
  success: {
    container: 'bg-success-50 border-success-200 text-success-800',
    icon: 'text-success-400',
    title: 'text-success-900',
    iconName: 'checkCircle' as const,
  },
  warning: {
    container: 'bg-warning-50 border-warning-200 text-warning-800',
    icon: 'text-warning-400',
    title: 'text-warning-900',
    iconName: 'warning' as const,
  },
  error: {
    container: 'bg-error-50 border-error-200 text-error-800',
    icon: 'text-error-400',
    title: 'text-error-900',
    iconName: 'error' as const,
  },
};

const alertSizes = {
  sm: {
    container: 'p-3',
    icon: 'sm' as const,
    title: 'text-sm',
    content: 'text-sm',
    gap: 'gap-2',
  },
  md: {
    container: 'p-4',
    icon: 'md' as const,
    title: 'text-base',
    content: 'text-sm',
    gap: 'gap-3',
  },
  lg: {
    container: 'p-5',
    icon: 'lg' as const,
    title: 'text-lg',
    content: 'text-base',
    gap: 'gap-4',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  size = 'md',
  title,
  children,
  icon = true,
  closable = false,
  onClose,
  actions,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const variantConfig = alertVariants[variant];
  const sizeConfig = alertSizes[size];

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      className={cn(
        'border rounded-lg',
        variantConfig.container,
        sizeConfig.container,
        className
      )}
    >
      <div className={cn('flex', sizeConfig.gap)}>
        {/* Icon */}
        {icon && (
          <div className="flex-shrink-0">
            {React.isValidElement(icon) ? (
              icon
            ) : (
              <Icon
                name={variantConfig.iconName}
                size={sizeConfig.icon}
                className={variantConfig.icon}
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          {title && (
            <h3 className={cn(
              'font-medium mb-1',
              variantConfig.title,
              sizeConfig.title
            )}>
              {title}
            </h3>
          )}
          
          {/* Message */}
          <div className={cn(sizeConfig.content)}>
            {children}
          </div>

          {/* Actions */}
          {actions && (
            <div className="mt-3">
              {actions}
            </div>
          )}
        </div>

        {/* Close Button */}
        {closable && (
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className={cn(
                'p-1.5 -m-1.5',
                variantConfig.icon
              )}
              aria-label="Close alert"
            >
              <Icon name="close" size="sm" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// 🔔 Toast Notification - Temporary notification
export interface ToastProps extends Omit<AlertProps, 'closable'> {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const Toast: React.FC<ToastProps> = ({
  duration = 5000,
  position = 'top-right',
  onClose,
  ...alertProps
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => window.clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50',
    'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
  };

  return (
    <div className={cn(
      positionClasses[position],
      'animate-in slide-in-from-right-full duration-300',
      'max-w-sm w-full shadow-lg'
    )}>
      <Alert
        {...alertProps}
        closable={true}
        onClose={handleClose}
      />
    </div>
  );
};

// 📢 Banner Alert - Full width alert for important announcements
export interface BannerProps extends Omit<AlertProps, 'size'> {
  centered?: boolean;
}

export const Banner: React.FC<BannerProps> = ({
  centered = false,
  className,
  ...alertProps
}) => (
  <Alert
    {...alertProps}
    size="md"
    className={cn(
      'rounded-none border-x-0',
      centered && 'text-center',
      className
    )}
  />
);

// 🎯 Inline Alert - Compact alert for forms
export interface InlineAlertProps {
  variant?: AlertProps['variant'];
  message: string;
  className?: string;
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  variant = 'error',
  message,
  className,
}) => {
  const variantConfig = alertVariants[variant];

  return (
    <div className={cn(
      'flex items-center gap-2 text-sm',
      variantConfig.container.split(' ').filter(cls => cls.startsWith('text-')),
      className
    )}>
      <Icon
        name={variantConfig.iconName}
        size="sm"
        className={variantConfig.icon}
      />
      <span>{message}</span>
    </div>
  );
};

// 🔄 Loading Alert - Alert with loading state
export interface LoadingAlertProps {
  message?: string;
  className?: string;
}

export const LoadingAlert: React.FC<LoadingAlertProps> = ({
  message = 'Loading...',
  className,
}) => (
  <Alert
    variant="info"
    icon={<Icon name="spinner" size="md" className="animate-spin text-blue-400" />}
    className={className}
  >
    {message}
  </Alert>
);

// 📋 Alert Actions - Common action patterns
export const AlertActions = {
  // Simple action buttons
  Simple: ({ 
    primaryLabel = 'Confirm', 
    secondaryLabel = 'Cancel',
    onPrimary,
    onSecondary,
    variant = 'primary'
  }: {
    primaryLabel?: string;
    secondaryLabel?: string;
    onPrimary?: () => void;
    onSecondary?: () => void;
    variant?: 'primary' | 'success' | 'warning' | 'danger';
  }) => (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={variant}
        onClick={onPrimary}
      >
        {primaryLabel}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onSecondary}
      >
        {secondaryLabel}
      </Button>
    </div>
  ),

  // Learn more pattern
  LearnMore: ({ href, onClick }: { href?: string; onClick?: () => void }) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      className="p-0 h-auto font-medium underline"
    >
      Learn more
    </Button>
  ),

  // Undo action
  Undo: ({ onUndo }: { onUndo?: () => void }) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={onUndo}
      className="p-0 h-auto font-medium"
    >
      Undo
    </Button>
  ),
};

// 🌟 Alert Provider - Context for managing alerts
interface AlertContextType {
  alerts: Array<{
    id: string;
    type: AlertProps['variant'];
    title?: string;
    message: string;
    duration?: number;
  }>;
  addAlert: (alert: Omit<AlertContextType['alerts'][0], 'id'>) => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
}

const AlertContext = React.createContext<AlertContextType | undefined>(undefined);

export const useAlerts = () => {
  const context = React.useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within AlertProvider');
  }
  return context;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertContextType['alerts']>([]);

  const addAlert = (alert: Omit<AlertContextType['alerts'][0], 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setAlerts(prev => [...prev, { ...alert, id }]);

    // Auto remove after duration
    if (alert.duration !== 0) {
      setTimeout(() => {
        removeAlert(id);
      }, alert.duration || 5000);
    }
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert, clearAlerts }}>
      {children}
      
      {/* Alert Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {alerts.map(alert => (
          <Toast
            key={alert.id}
            variant={alert.type}
            title={alert.title}
            onClose={() => removeAlert(alert.id)}
            duration={alert.duration}
          >
            {alert.message}
          </Toast>
        ))}
      </div>
    </AlertContext.Provider>
  );
};