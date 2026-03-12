import React, { useState } from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';

// 📝 Accordion Component - Flusk Design System
// Collapsible content sections

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  defaultOpen?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  type?: 'single' | 'multiple';
  variant?: 'default' | 'bordered' | 'filled' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  collapsible?: boolean;
  className?: string;
  onItemToggle?: (itemId: string, isOpen: boolean) => void;
}

const accordionVariants = {
  default: {
    container: 'border-b border-gray-200 last:border-b-0',
    header: 'hover:bg-gray-50',
    content: 'border-t border-gray-100',
  },
  bordered: {
    container: 'border border-gray-200 rounded-lg mb-2 last:mb-0 overflow-hidden',
    header: 'hover:bg-gray-50',
    content: 'border-t border-gray-200',
  },
  filled: {
    container: 'bg-gray-50 rounded-lg mb-2 last:mb-0 overflow-hidden',
    header: 'hover:bg-gray-100',
    content: 'border-t border-gray-200 bg-white',
  },
  ghost: {
    container: 'mb-2 last:mb-0',
    header: 'hover:bg-gray-50 rounded-lg',
    content: '',
  },
};

const accordionSizes = {
  sm: {
    header: 'px-3 py-2 text-sm',
    content: 'px-3 py-3 text-sm',
    icon: 'sm' as const,
  },
  md: {
    header: 'px-4 py-3 text-base',
    content: 'px-4 py-4 text-sm',
    icon: 'md' as const,
  },
  lg: {
    header: 'px-6 py-4 text-lg',
    content: 'px-6 py-5 text-base',
    icon: 'lg' as const,
  },
};

export const Accordion: React.FC<AccordionProps> = ({
  items,
  type = 'multiple',
  variant = 'default',
  size = 'md',
  collapsible = true,
  className,
  onItemToggle,
}) => {
  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    const defaultOpenItems = items
      .filter(item => item.defaultOpen)
      .map(item => item.id);
    return new Set(defaultOpenItems);
  });

  const variantStyles = accordionVariants[variant];
  const sizeStyles = accordionSizes[size];

  const toggleItem = (itemId: string) => {
    const isCurrentlyOpen = openItems.has(itemId);
    
    setOpenItems(prev => {
      const newOpenItems = new Set(prev);
      
      if (type === 'single') {
        // Close all items first
        newOpenItems.clear();
        
        // Open the clicked item if it wasn't open (or if collapsible is false)
        if (!isCurrentlyOpen || !collapsible) {
          newOpenItems.add(itemId);
        }
      } else {
        // Multiple mode
        if (isCurrentlyOpen) {
          newOpenItems.delete(itemId);
        } else {
          newOpenItems.add(itemId);
        }
      }
      
      return newOpenItems;
    });

    onItemToggle?.(itemId, !isCurrentlyOpen);
  };

  const renderAccordionItem = (item: AccordionItem) => {
    const isOpen = openItems.has(item.id);
    const isDisabled = item.disabled;

    return (
      <div
        key={item.id}
        className={cn(variantStyles.container)}
      >
        {/* Header */}
        <button
          type="button"
          onClick={() => !isDisabled && toggleItem(item.id)}
          disabled={isDisabled}
          className={cn(
            'w-full flex items-center justify-between text-left',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
            sizeStyles.header,
            !isDisabled && variantStyles.header,
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-expanded={isOpen}
          aria-controls={`accordion-content-${item.id}`}
          id={`accordion-header-${item.id}`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            {item.icon && (
              <div className="flex-shrink-0">
                {item.icon}
              </div>
            )}
            
            {/* Title */}
            <span className="font-medium text-gray-900 truncate">
              {item.title}
            </span>
          </div>

          {/* Chevron */}
          <div className="flex-shrink-0 ml-3">
            <Icon
              name="chevronDown"
              size={sizeStyles.icon}
              className={cn(
                'text-gray-400 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </button>

        {/* Content */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-in-out',
            isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div
            id={`accordion-content-${item.id}`}
            role="region"
            aria-labelledby={`accordion-header-${item.id}`}
            className={cn(
              sizeStyles.content,
              variantStyles.content,
              'text-gray-700'
            )}
          >
            {item.content}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)} role="region" aria-label="Accordion">
      {items.map(renderAccordionItem)}
    </div>
  );
};

// ❓ FAQ Accordion - Specialized for FAQ sections
export interface FAQItem {
  question: string;
  answer: React.ReactNode;
  category?: string;
}

export interface FAQAccordionProps {
  items: FAQItem[];
  searchable?: boolean;
  categorized?: boolean;
  className?: string;
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({
  items,
  searchable = false,
  categorized = false,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on search
  const filteredItems = items.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (typeof item.answer === 'string' && 
     item.answer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group by category if needed
  const groupedItems = categorized
    ? filteredItems.reduce((acc, item) => {
        const category = item.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
      }, {} as Record<string, FAQItem[]>)
    : { '': filteredItems };

  const accordionItems: AccordionItem[] = [];

  Object.entries(groupedItems).forEach(([category, categoryItems]) => {
    // Add category header if categorized
    if (categorized && category) {
      accordionItems.push({
        id: `category-${category}`,
        title: category,
        content: (
          <div className="space-y-2">
            {categoryItems.map((item, index) => (
              <div key={index} className="border-b border-gray-100 last:border-b-0 pb-3 last:pb-0">
                <h4 className="font-medium text-gray-900 mb-2">{item.question}</h4>
                <div className="text-gray-700">{item.answer}</div>
              </div>
            ))}
          </div>
        ),
        icon: <Icon name="folder" size="sm" className="text-gray-400" />,
      });
    } else {
      // Add individual items
      categoryItems.forEach((item, index) => {
        accordionItems.push({
          id: `faq-${index}`,
          title: item.question,
          content: item.answer,
          icon: <Icon name="info" size="sm" className="text-blue-500" />,
        });
      });
    }
  });

  return (
    <div className={className}>
      {/* Search */}
      {searchable && (
        <div className="mb-6">
          <div className="relative">
            <Icon
              name="search"
              size="md"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      )}

      {/* Results */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Icon name="search" size="lg" className="mx-auto mb-2" />
          <p>No questions found matching your search.</p>
        </div>
      ) : (
        <Accordion
          items={accordionItems}
          variant="bordered"
          type="multiple"
        />
      )}
    </div>
  );
};

// 🔧 Settings Accordion - Specialized for settings sections
export interface SettingsSection {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
}

export interface SettingsAccordionProps {
  sections: SettingsSection[];
  defaultOpenSections?: string[];
  className?: string;
}

export const SettingsAccordion: React.FC<SettingsAccordionProps> = ({
  sections,
  defaultOpenSections = [],
  className,
}) => {
  const accordionItems: AccordionItem[] = sections.map((section, index) => ({
    id: `settings-${index}`,
    title: section.title,
    content: (
      <div>
        {section.description && (
          <p className="text-gray-600 mb-4">{section.description}</p>
        )}
        {section.children}
      </div>
    ),
    icon: section.icon,
    defaultOpen: defaultOpenSections.includes(section.title),
  }));

  return (
    <Accordion
      items={accordionItems}
      variant="filled"
      type="multiple"
      size="lg"
      className={className}
    />
  );
};

// 🎯 Simple Collapsible - Basic collapsible content
export interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  variant?: AccordionProps['variant'];
  size?: AccordionProps['size'];
  className?: string;
  onToggle?: (isOpen: boolean) => void;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  children,
  defaultOpen = false,
  icon,
  variant = 'default',
  size = 'md',
  className,
  onToggle,
}) => {
  const item: AccordionItem = {
    id: 'collapsible',
    title,
    content: children,
    icon,
    defaultOpen,
  };

  return (
    <Accordion
      items={[item]}
      variant={variant}
      size={size}
      type="single"
      collapsible={true}
      onItemToggle={(_, isOpen) => onToggle?.(isOpen)}
      className={className}
    />
  );
};