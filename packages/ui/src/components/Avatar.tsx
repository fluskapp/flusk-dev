import React from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';

// 📝 Avatar Component - Flusk Design System
// User avatars with fallbacks and status indicators

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  initials?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'square' | 'rounded';
  status?: 'online' | 'offline' | 'busy' | 'away';
  badge?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const avatarSizes = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-xs',
    status: 'w-2 h-2',
    badge: 'w-3 h-3 text-xs',
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-sm',
    status: 'w-2.5 h-2.5',
    badge: 'w-4 h-4 text-xs',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-base',
    status: 'w-3 h-3',
    badge: 'w-5 h-5 text-sm',
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-lg',
    status: 'w-3.5 h-3.5',
    badge: 'w-6 h-6 text-sm',
  },
  xl: {
    container: 'w-16 h-16',
    text: 'text-xl',
    status: 'w-4 h-4',
    badge: 'w-7 h-7 text-base',
  },
  '2xl': {
    container: 'w-20 h-20',
    text: 'text-2xl',
    status: 'w-5 h-5',
    badge: 'w-8 h-8 text-lg',
  },
};

const avatarShapes = {
  circle: 'rounded-full',
  square: 'rounded-none',
  rounded: 'rounded-lg',
};

const statusColors = {
  online: 'bg-success-500',
  offline: 'bg-gray-400',
  busy: 'bg-error-500',
  away: 'bg-warning-500',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  initials,
  size = 'md',
  shape = 'circle',
  status,
  badge,
  className,
  onClick,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  const sizeConfig = avatarSizes[size];
  const displayInitials = initials || getInitials(name || '');
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const showImage = src && !imageError;
  const isClickable = !!onClick;

  return (
    <div className={cn('relative inline-flex', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden',
          'bg-gradient-to-br from-primary-500 to-secondary-500',
          'text-white font-medium',
          sizeConfig.container,
          sizeConfig.text,
          avatarShapes[shape],
          isClickable && 'cursor-pointer hover:opacity-80 transition-opacity',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
        )}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
      >
        {/* Image */}
        {showImage && (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            onError={handleImageError}
            onLoad={handleImageLoad}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-200',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}
        
        {/* Fallback: Initials or Icon */}
        {!showImage && (
          <>
            {displayInitials ? (
              <span className="select-none">
                {displayInitials}
              </span>
            ) : (
              <Icon 
                name="user" 
                size={size === 'xs' ? 'sm' : size === '2xl' ? 'xl' : 'md'} 
                className="text-white/80" 
              />
            )}
          </>
        )}
        
        {/* Loading State */}
        {showImage && !imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <Icon 
              name="spinner" 
              size="sm" 
              className="animate-spin text-gray-400" 
            />
          </div>
        )}
      </div>

      {/* Status Indicator */}
      {status && (
        <div
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            sizeConfig.status,
            statusColors[status]
          )}
          title={`Status: ${status}`}
        />
      )}

      {/* Badge */}
      {badge && (
        <div
          className={cn(
            'absolute -top-1 -right-1 flex items-center justify-center',
            'bg-error-500 text-white rounded-full font-medium',
            sizeConfig.badge
          )}
        >
          {badge}
        </div>
      )}
    </div>
  );
};

// Helper function to generate initials from name
function getInitials(name: string): string {
  if (!name) return '';
  
  const names = name.trim().split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

// 👥 Avatar Group - Multiple avatars with overflow
export interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    name?: string;
    alt?: string;
  }>;
  max?: number;
  size?: AvatarProps['size'];
  shape?: AvatarProps['shape'];
  className?: string;
  onMoreClick?: () => void;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 5,
  size = 'md',
  shape = 'circle',
  className,
  onMoreClick,
}) => {
  const displayAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;
  const sizeConfig = avatarSizes[size];

  return (
    <div className={cn('flex items-center', className)}>
      {displayAvatars.map((avatar, index) => (
        <div
          key={index}
          className={cn(
            'relative',
            index > 0 && '-ml-2',
            'ring-2 ring-white'
          )}
          style={{ zIndex: displayAvatars.length - index }}
        >
          <Avatar
            src={avatar.src}
            name={avatar.name}
            alt={avatar.alt}
            size={size}
            shape={shape}
          />
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div
          className={cn(
            'relative -ml-2 flex items-center justify-center',
            'bg-gray-100 text-gray-600 font-medium ring-2 ring-white',
            sizeConfig.container,
            sizeConfig.text,
            avatarShapes[shape],
            onMoreClick && 'cursor-pointer hover:bg-gray-200 transition-colors'
          )}
          onClick={onMoreClick}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

// 🏷️ Avatar with Label - Avatar with name and description
export interface AvatarWithLabelProps extends AvatarProps {
  label: string;
  description?: string;
  labelSize?: 'sm' | 'md' | 'lg';
  direction?: 'horizontal' | 'vertical';
}

export const AvatarWithLabel: React.FC<AvatarWithLabelProps> = ({
  label,
  description,
  labelSize = 'md',
  direction = 'horizontal',
  className,
  ...avatarProps
}) => {
  const labelSizes = {
    sm: {
      label: 'text-sm',
      description: 'text-xs',
    },
    md: {
      label: 'text-base',
      description: 'text-sm',
    },
    lg: {
      label: 'text-lg',
      description: 'text-base',
    },
  };

  const labelConfig = labelSizes[labelSize];

  return (
    <div className={cn(
      'flex items-center',
      direction === 'vertical' ? 'flex-col text-center' : 'flex-row',
      direction === 'horizontal' ? 'gap-3' : 'gap-2',
      className
    )}>
      <Avatar {...avatarProps} />
      
      <div className={cn(
        'min-w-0 flex-1',
        direction === 'vertical' && 'text-center'
      )}>
        <div className={cn(
          'font-medium text-gray-900 truncate',
          labelConfig.label
        )}>
          {label}
        </div>
        {description && (
          <div className={cn(
            'text-gray-500 truncate',
            labelConfig.description
          )}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
};

// 🔄 Avatar Placeholder - Loading or empty state
export interface AvatarPlaceholderProps {
  size?: AvatarProps['size'];
  shape?: AvatarProps['shape'];
  animated?: boolean;
  className?: string;
}

export const AvatarPlaceholder: React.FC<AvatarPlaceholderProps> = ({
  size = 'md',
  shape = 'circle',
  animated = true,
  className,
}) => {
  const sizeConfig = avatarSizes[size];

  return (
    <div
      className={cn(
        'bg-gray-200 flex items-center justify-center',
        sizeConfig.container,
        avatarShapes[shape],
        animated && 'animate-pulse',
        className
      )}
    >
      <Icon 
        name="user" 
        size={size === 'xs' ? 'sm' : size === '2xl' ? 'xl' : 'md'} 
        className="text-gray-400" 
      />
    </div>
  );
};