import React from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';
import { Button } from './Button';

// 📝 Empty Component - Flusk Design System
// Empty states for when there's no content to display

export interface EmptyProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  image?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const emptySizes = {
  sm: {
    container: 'py-8 px-4',
    icon: 'w-12 h-12',
    title: 'text-lg',
    description: 'text-sm',
    spacing: 'space-y-3',
  },
  md: {
    container: 'py-12 px-6',
    icon: 'w-16 h-16',
    title: 'text-xl',
    description: 'text-base',
    spacing: 'space-y-4',
  },
  lg: {
    container: 'py-16 px-8',
    icon: 'w-20 h-20',
    title: 'text-2xl',
    description: 'text-lg',
    spacing: 'space-y-6',
  },
};

export const Empty: React.FC<EmptyProps> = ({
  title,
  description,
  icon,
  image,
  action,
  secondaryAction,
  size = 'md',
  className,
}) => {
  const sizeConfig = emptySizes[size];

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      sizeConfig.container,
      sizeConfig.spacing,
      className
    )}>
      {/* Image or Icon */}
      {image ? (
        <img 
          src={image} 
          alt="" 
          className={cn('object-contain', sizeConfig.icon)}
        />
      ) : icon ? (
        <div className={cn('text-gray-400', sizeConfig.icon)}>
          {icon}
        </div>
      ) : (
        <Icon 
          name="folder" 
          className={cn('text-gray-400', sizeConfig.icon)} 
        />
      )}

      {/* Content */}
      <div className="max-w-sm">
        <h3 className={cn('font-semibold text-gray-900', sizeConfig.title)}>
          {title}
        </h3>
        {description && (
          <p className={cn('text-gray-500 mt-2', sizeConfig.description)}>
            {description}
          </p>
        )}
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action && (
            <Button
              variant={action.variant || 'primary'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// 📊 No Data - Empty state for data tables/lists
export interface NoDataProps {
  message?: string;
  onRefresh?: () => void;
  onClear?: () => void;
  showRefresh?: boolean;
  showClear?: boolean;
  className?: string;
}

export const NoData: React.FC<NoDataProps> = ({
  message = 'No data available',
  onRefresh,
  onClear,
  showRefresh = true,
  showClear = false,
  className,
}) => (
  <Empty
    title={message}
    description="Try adjusting your filters or refreshing the data."
    icon={<Icon name="database" />}
    action={showRefresh && onRefresh ? {
      label: 'Refresh',
      onClick: onRefresh,
      variant: 'outline'
    } : undefined}
    secondaryAction={showClear && onClear ? {
      label: 'Clear filters',
      onClick: onClear,
    } : undefined}
    size="sm"
    className={className}
  />
);

// 🔍 No Search Results - Empty state for search
export interface NoSearchResultsProps {
  query?: string;
  onClear?: () => void;
  suggestions?: string[];
  className?: string;
}

export const NoSearchResults: React.FC<NoSearchResultsProps> = ({
  query,
  onClear,
  suggestions = [],
  className,
}) => (
  <div className={cn('py-8 px-4', className)}>
    <div className="text-center space-y-4">
      <Icon name="search" className="w-12 h-12 text-gray-400 mx-auto" />
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          No results found
        </h3>
        {query && (
          <p className="text-sm text-gray-500 mt-1">
            No results for "<span className="font-medium">{query}</span>"
          </p>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="text-left max-w-sm mx-auto">
          <p className="text-sm text-gray-600 mb-2">Try searching for:</p>
          <ul className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm">
                <button 
                  className="text-primary-600 hover:text-primary-700"
                  onClick={() => {/* Handle suggestion click */}}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onClear && (
        <Button variant="ghost" onClick={onClear}>
          Clear search
        </Button>
      )}
    </div>
  </div>
);

// 📁 Empty Folder - Empty state for file/folder views
export interface EmptyFolderProps {
  folderName?: string;
  canUpload?: boolean;
  onUpload?: () => void;
  onCreate?: () => void;
  className?: string;
}

export const EmptyFolder: React.FC<EmptyFolderProps> = ({
  folderName,
  canUpload = false,
  onUpload,
  onCreate,
  className,
}) => (
  <Empty
    title={folderName ? `${folderName} is empty` : 'This folder is empty'}
    description="Get started by adding some files or creating new content."
    icon={<Icon name="folder" />}
    action={canUpload && onUpload ? {
      label: 'Upload files',
      onClick: onUpload,
    } : onCreate ? {
      label: 'Create new',
      onClick: onCreate,
    } : undefined}
    className={className}
  />
);

// 🛠️ No Items Created - Empty state for user-created content
export interface NoItemsCreatedProps {
  itemType: string;
  description?: string;
  onCreate?: () => void;
  createLabel?: string;
  className?: string;
}

export const NoItemsCreated: React.FC<NoItemsCreatedProps> = ({
  itemType,
  description,
  onCreate,
  createLabel,
  className,
}) => (
  <Empty
    title={`No ${itemType} yet`}
    description={description || `You haven't created any ${itemType} yet. Get started by creating your first one.`}
    icon={<Icon name="plus" />}
    action={onCreate ? {
      label: createLabel || `Create ${itemType}`,
      onClick: onCreate,
    } : undefined}
    className={className}
  />
);

// 🚫 Access Denied - Empty state for permission errors
export interface AccessDeniedProps {
  title?: string;
  description?: string;
  onRequestAccess?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = 'Access denied',
  description = 'You don\'t have permission to view this content.',
  onRequestAccess,
  onGoBack,
  className,
}) => (
  <Empty
    title={title}
    description={description}
    icon={<Icon name="lock" />}
    action={onRequestAccess ? {
      label: 'Request access',
      onClick: onRequestAccess,
      variant: 'outline'
    } : undefined}
    secondaryAction={onGoBack ? {
      label: 'Go back',
      onClick: onGoBack,
    } : undefined}
    className={className}
  />
);

// ⚠️ Error State - Empty state for errors
export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onReport?: () => void;
  errorCode?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'We encountered an error while loading this content.',
  onRetry,
  onReport,
  errorCode,
  className,
}) => (
  <div className={cn('py-12 px-6 text-center space-y-4', className)}>
    <Icon name="warning" className="w-16 h-16 text-error-400 mx-auto" />
    
    <div>
      <h3 className="text-xl font-semibold text-gray-900">
        {title}
      </h3>
      <p className="text-base text-gray-500 mt-2 max-w-sm mx-auto">
        {description}
      </p>
      {errorCode && (
        <p className="text-sm text-gray-400 mt-1">
          Error code: {errorCode}
        </p>
      )}
    </div>

    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          Try again
        </Button>
      )}
      {onReport && (
        <Button variant="ghost" onClick={onReport}>
          Report issue
        </Button>
      )}
    </div>
  </div>
);

// 🔌 Connection Error - Empty state for network errors
export interface ConnectionErrorProps {
  onRetry?: () => void;
  className?: string;
}

export const ConnectionError: React.FC<ConnectionErrorProps> = ({
  onRetry,
  className,
}) => (
  <ErrorState
    title="Connection problem"
    description="Please check your internet connection and try again."
    onRetry={onRetry}
    errorCode="NETWORK_ERROR"
    className={className}
  />
);

// 📱 Coming Soon - Empty state for future features
export interface ComingSoonProps {
  feature?: string;
  description?: string;
  onNotifyMe?: () => void;
  className?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  feature = 'This feature',
  description,
  onNotifyMe,
  className,
}) => (
  <Empty
    title={`${feature} is coming soon`}
    description={description || 'We\'re working hard to bring you this feature. Stay tuned!'}
    icon={<Icon name="clock" />}
    action={onNotifyMe ? {
      label: 'Notify me when ready',
      onClick: onNotifyMe,
      variant: 'outline'
    } : undefined}
    className={className}
  />
);