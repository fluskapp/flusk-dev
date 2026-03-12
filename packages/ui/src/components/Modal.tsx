import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import { Icon } from './Icon';
import { Button } from './Button';

// 📝 Modal Component - Flusk Design System
// Overlay dialogs for confirmations, forms, and content display

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  showOverlay?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md', 
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  showOverlay = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  footer,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const previousActiveElement = document.activeElement;
      modalRef.current?.focus();

      return () => {
        if (previousActiveElement instanceof HTMLElement) {
          previousActiveElement.focus();
        }
      };
    }
  }, [isOpen]);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      {showOverlay && (
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        tabIndex={-1}
        className={cn(
          'relative bg-white rounded-lg shadow-xl',
          'max-h-[90vh] flex flex-col',
          'transform transition-all duration-200',
          'animate-in fade-in-0 zoom-in-95',
          modalSizes[size],
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-gray-900 truncate">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-sm text-gray-500">
                  {description}
                </p>
              )}
            </div>
            
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-4 flex-shrink-0"
                aria-label="Close modal"
              >
                <Icon name="close" size="sm" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// 🚨 Confirmation Modal - Specialized for confirmations
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false,
}) => {
  const variantStyles = {
    danger: {
      icon: 'warning' as const,
      iconColor: 'text-red-500',
      confirmVariant: 'danger' as const,
    },
    warning: {
      icon: 'warning' as const,
      iconColor: 'text-yellow-500',
      confirmVariant: 'warning' as const,
    },
    info: {
      icon: 'info' as const,
      iconColor: 'text-blue-500',
      confirmVariant: 'primary' as const,
    },
  };

  const style = variantStyles[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="text-center">
        <div className={cn('mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full', 
          variant === 'danger' ? 'bg-red-100' : 
          variant === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
        )}>
          <Icon name={style.icon} size="lg" className={style.iconColor} />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-gray-500 mb-6">
          {message}
        </p>
      </div>
      
      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={loading}
          className="flex-1"
        >
          {cancelText}
        </Button>
        <Button
          variant={style.confirmVariant}
          onClick={onConfirm}
          isLoading={loading}
          className="flex-1"
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

// 📋 Form Modal - Specialized for forms
export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  disabled?: boolean;
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitText = 'Save',
  cancelText = 'Cancel',
  loading = false,
  disabled = false,
}) => {
  const footer = onSubmit ? (
    <>
      <Button
        variant="ghost"
        onClick={onClose}
        disabled={loading}
      >
        {cancelText}
      </Button>
      <Button
        variant="primary"
        onClick={onSubmit}
        isLoading={loading}
        disabled={disabled}
      >
        {submitText}
      </Button>
    </>
  ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="md"
      footer={footer}
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      {children}
    </Modal>
  );
};