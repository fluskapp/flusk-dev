import React, { useState } from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';
import { Badge } from './Badge';

// 📝 Tabs Component - Flusk Design System
// Navigation tabs for organizing content

export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  closable?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pills' | 'underline' | 'cards';
  placement?: 'top' | 'bottom' | 'left' | 'right';
  centered?: boolean;
  fullWidth?: boolean;
  onChange?: (key: string) => void;
  onTabClose?: (key: string) => void;
  className?: string;
  tabBarClassName?: string;
  contentClassName?: string;
}

const tabSizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg',
};

const variants = {
  default: {
    tab: 'border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700',
    activeTab: 'border-primary-500 text-primary-600',
    container: 'border-b border-gray-200',
  },
  pills: {
    tab: 'rounded-lg hover:bg-gray-100',
    activeTab: 'bg-primary-100 text-primary-700',
    container: '',
  },
  underline: {
    tab: 'border-b border-transparent hover:border-gray-300',
    activeTab: 'border-primary-500 text-primary-600',
    container: 'border-b border-gray-200',
  },
  cards: {
    tab: 'border border-gray-200 border-b-0 rounded-t-lg hover:bg-gray-50',
    activeTab: 'bg-white border-gray-200 border-b-white',
    container: 'border-b border-gray-200',
  },
};

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeKey: controlledActiveKey,
  defaultActiveKey,
  size = 'md',
  variant = 'default',
  placement = 'top',
  centered = false,
  fullWidth = false,
  onChange,
  onTabClose,
  className,
  tabBarClassName,
  contentClassName,
}) => {
  const [internalActiveKey, setInternalActiveKey] = useState(
    defaultActiveKey || items[0]?.key || ''
  );

  const activeKey = controlledActiveKey ?? internalActiveKey;
  const variantStyles = variants[variant];

  const handleTabClick = (key: string, disabled?: boolean) => {
    if (disabled) return;
    
    if (controlledActiveKey === undefined) {
      setInternalActiveKey(key);
    }
    onChange?.(key);
  };

  const handleTabClose = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTabClose?.(key);
  };

  const activeItem = items.find(item => item.key === activeKey);

  const renderTabs = () => (
    <div className={cn(
      'flex',
      placement === 'top' || placement === 'bottom' ? 'flex-row' : 'flex-col',
      centered && 'justify-center',
      fullWidth && 'flex-1',
      variantStyles.container,
      tabBarClassName
    )}>
      <div className={cn(
        'flex',
        placement === 'top' || placement === 'bottom' ? 'flex-row' : 'flex-col',
        placement === 'left' || placement === 'right' ? 'min-w-[200px]' : '',
        fullWidth && 'flex-1'
      )}>
        {items.map((item) => {
          const isActive = item.key === activeKey;
          
          return (
            <button
              key={item.key}
              type="button"
              disabled={item.disabled}
              onClick={() => handleTabClick(item.key, item.disabled)}
              className={cn(
                'relative flex items-center gap-2 font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                tabSizes[size || 'md'],
                variantStyles.tab,
                isActive && variantStyles.activeTab,
                item.disabled && 'opacity-50 cursor-not-allowed',
                fullWidth && 'flex-1 justify-center',
                !isActive && 'text-gray-500'
              )}
            >
              {/* Icon */}
              {item.icon && (
                <span className="flex-shrink-0">
                  {item.icon}
                </span>
              )}
              
              {/* Label */}
              <span className={cn(
                'truncate',
                placement === 'left' || placement === 'right' ? 'text-left' : ''
              )}>
                {item.label}
              </span>
              
              {/* Badge */}
              {item.badge && (
                <Badge size="sm" variant="neutral">
                  {item.badge}
                </Badge>
              )}
              
              {/* Close Button */}
              {item.closable && onTabClose && (
                <button
                  type="button"
                  onClick={(e) => handleTabClose(item.key, e)}
                  className={cn(
                    'ml-1 p-0.5 rounded hover:bg-gray-200 transition-colors',
                    'focus:outline-none focus:ring-1 focus:ring-primary-500'
                  )}
                >
                  <Icon name="close" size="xs" />
                </button>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderContent = () => (
    <div className={cn(
      'flex-1',
      placement === 'top' && 'mt-4',
      placement === 'bottom' && 'mb-4',
      placement === 'left' && 'ml-4',
      placement === 'right' && 'mr-4',
      contentClassName
    )}>
      {activeItem?.content}
    </div>
  );

  return (
    <div className={cn(
      'flex',
      placement === 'top' || placement === 'bottom' 
        ? 'flex-col' 
        : placement === 'left' 
          ? 'flex-row' 
          : 'flex-row-reverse',
      className
    )}>
      {placement === 'bottom' || placement === 'right' ? (
        <>
          {renderContent()}
          {renderTabs()}
        </>
      ) : (
        <>
          {renderTabs()}
          {renderContent()}
        </>
      )}
    </div>
  );
};

// 🎨 Tab Panels - Alternative implementation without items array
export interface TabPanelsProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export interface TabListProps {
  size?: TabsProps['size'];
  variant?: TabsProps['variant'];
  centered?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  className?: string;
}

export interface TabProps {
  value: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  badge?: string | number;
  children: React.ReactNode;
  className?: string;
}

export interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

// Context for tab communication
const TabsContext = React.createContext<{
  activeValue: string;
  onChange: (value: string) => void;
  size: TabsProps['size'];
  variant: TabsProps['variant'];
}>({
  activeValue: '',
  onChange: () => {},
  size: 'md',
  variant: 'default',
});

export const TabPanels: React.FC<TabPanelsProps> = ({ 
  value, 
  onChange, 
  children, 
  className 
}) => (
  <TabsContext.Provider value={{ activeValue: value, onChange, size: 'md', variant: 'default' }}>
    <div className={cn('flex flex-col', className)}>
      {children}
    </div>
  </TabsContext.Provider>
);

export const TabList: React.FC<TabListProps> = ({
  size = 'md',
  variant = 'default',
  centered = false,
  fullWidth = false,
  children,
  className,
}) => {
  const variantStyles = variants[variant];
  
  return (
    <TabsContext.Provider value={{ 
      activeValue: React.useContext(TabsContext).activeValue,
      onChange: React.useContext(TabsContext).onChange,
      size,
      variant
    }}>
      <div className={cn(
        'flex',
        centered && 'justify-center',
        variantStyles.container,
        className
      )}>
        <div className={cn(
          'flex',
          fullWidth && 'flex-1'
        )}>
          {children}
        </div>
      </div>
    </TabsContext.Provider>
  );
};

export const Tab: React.FC<TabProps> = ({
  value,
  disabled = false,
  icon,
  badge,
  children,
  className,
}) => {
  const { activeValue, onChange, size, variant } = React.useContext(TabsContext);
  const isActive = value === activeValue;
  const variantStyles = variants[variant || 'default'];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(value)}
      className={cn(
        'relative flex items-center gap-2 font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        tabSizes[size || 'md'],
        variantStyles.tab,
        isActive && variantStyles.activeTab,
        disabled && 'opacity-50 cursor-not-allowed',
        !isActive && 'text-gray-500',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
      {badge && (
        <Badge size="sm" variant="neutral">
          {badge}
        </Badge>
      )}
    </button>
  );
};

export const TabPanel: React.FC<TabPanelProps> = ({
  value,
  children,
  className,
}) => {
  const { activeValue } = React.useContext(TabsContext);
  
  if (value !== activeValue) return null;

  return (
    <div className={cn('mt-4', className)}>
      {children}
    </div>
  );
};