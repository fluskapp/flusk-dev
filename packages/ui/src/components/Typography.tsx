import React from 'react';
import { cn } from '../utils/cn';

// 📝 Typography Component - Flusk Design System
// Consistent text styling with semantic meaning

export interface TypographyProps {
  variant?:
    | 'display-large'   // 8xl - Hero titles
    | 'display-medium'  // 7xl - Section titles
    | 'display-small'   // 6xl - Large headings
    | 'headline-large'  // 5xl - Page titles
    | 'headline-medium' // 4xl - Component titles
    | 'headline-small'  // 3xl - Card titles
    | 'title-large'     // 2xl - Subsection titles
    | 'title-medium'    // xl - Form labels
    | 'title-small'     // lg - Table headers
    | 'body-large'      // lg - Lead text
    | 'body-medium'     // base - Body text
    | 'body-small'      // sm - Secondary text
    | 'label-large'     // sm - Button text
    | 'label-medium'    // xs - Input labels
    | 'label-small';    // xs - Captions

  color?: 
    | 'primary'     // Main brand color
    | 'secondary'   // Secondary brand color
    | 'text'        // Primary text color
    | 'text-muted'  // Secondary text color
    | 'text-subtle' // Tertiary text color
    | 'success'     // Success green
    | 'warning'     // Warning orange
    | 'error'       // Error red
    | 'white';      // White text

  weight?: 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
  
  align?: 'left' | 'center' | 'right' | 'justify';
  
  transform?: 'uppercase' | 'lowercase' | 'capitalize';
  
  decoration?: 'underline' | 'line-through';
  
  truncate?: boolean;
  
  gradient?: boolean; // Apply gradient effect to text
  
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'label';
  
  className?: string;
  
  children: React.ReactNode;
}

const variantStyles = {
  'display-large': 'text-8xl leading-none tracking-tight',
  'display-medium': 'text-7xl leading-none tracking-tight',
  'display-small': 'text-6xl leading-none tracking-tight',
  'headline-large': 'text-5xl leading-tight tracking-tight',
  'headline-medium': 'text-4xl leading-tight tracking-tight',
  'headline-small': 'text-3xl leading-tight tracking-tight',
  'title-large': 'text-2xl leading-tight tracking-tight',
  'title-medium': 'text-xl leading-tight tracking-normal',
  'title-small': 'text-lg leading-normal tracking-normal',
  'body-large': 'text-lg leading-relaxed tracking-normal',
  'body-medium': 'text-base leading-relaxed tracking-normal',
  'body-small': 'text-sm leading-normal tracking-normal',
  'label-large': 'text-sm leading-normal tracking-wide',
  'label-medium': 'text-xs leading-normal tracking-wide',
  'label-small': 'text-xs leading-tight tracking-wider',
};

const colorStyles = {
  primary: 'text-primary-600',
  secondary: 'text-secondary-600',
  text: 'text-gray-900',
  'text-muted': 'text-gray-600',
  'text-subtle': 'text-gray-400',
  success: 'text-success-600',
  warning: 'text-warning-600',
  error: 'text-error-600',
  white: 'text-white',
};

const weightStyles = {
  thin: 'font-thin',
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
  black: 'font-black',
};

const alignStyles = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

const transformStyles = {
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
};

const decorationStyles = {
  underline: 'underline',
  'line-through': 'line-through',
};

// Default weight for each variant
const defaultWeights = {
  'display-large': 'bold',
  'display-medium': 'bold',
  'display-small': 'bold',
  'headline-large': 'semibold',
  'headline-medium': 'semibold', 
  'headline-small': 'semibold',
  'title-large': 'medium',
  'title-medium': 'medium',
  'title-small': 'medium',
  'body-large': 'normal',
  'body-medium': 'normal',
  'body-small': 'normal',
  'label-large': 'medium',
  'label-medium': 'medium',
  'label-small': 'medium',
} as const;

// Default HTML elements for each variant
const defaultElements = {
  'display-large': 'h1',
  'display-medium': 'h1',
  'display-small': 'h1',
  'headline-large': 'h1',
  'headline-medium': 'h2',
  'headline-small': 'h3',
  'title-large': 'h2',
  'title-medium': 'h3',
  'title-small': 'h4',
  'body-large': 'p',
  'body-medium': 'p',
  'body-small': 'p',
  'label-large': 'span',
  'label-medium': 'label',
  'label-small': 'span',
} as const;

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body-medium',
  color = 'text',
  weight,
  align = 'left',
  transform,
  decoration,
  truncate = false,
  gradient = false,
  as,
  className,
  children,
}) => {
  // Determine the HTML element to use
  const Element = as || defaultElements[variant];
  
  // Use default weight for variant if not specified
  const resolvedWeight = weight || defaultWeights[variant];

  const classes = cn(
    // Base styles
    'font-sans antialiased',
    
    // Variant styles (size, line-height, tracking)
    variantStyles[variant],
    
    // Color (with gradient override)
    !gradient && colorStyles[color],
    gradient && 'bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent',
    
    // Font weight
    weightStyles[resolvedWeight],
    
    // Text alignment
    alignStyles[align],
    
    // Text transform
    transform && transformStyles[transform],
    
    // Text decoration
    decoration && decorationStyles[decoration],
    
    // Truncate
    truncate && 'truncate',
    
    // Custom className
    className
  );

  return (
    <Element className={classes}>
      {children}
    </Element>
  );
};

// 🎯 Pre-configured typography components for common use cases

export const Heading: React.FC<Omit<TypographyProps, 'variant'> & { level: 1 | 2 | 3 | 4 | 5 | 6 }> = ({
  level,
  ...props
}) => {
  const variantMap = {
    1: 'headline-large',
    2: 'headline-medium',
    3: 'headline-small',
    4: 'title-large',
    5: 'title-medium',
    6: 'title-small',
  } as const;

  return <Typography variant={variantMap[level]} {...props} />;
};

export const Text: React.FC<Omit<TypographyProps, 'variant'> & { size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md',
  ...props
}) => {
  const sizeMap = {
    sm: 'body-small',
    md: 'body-medium', 
    lg: 'body-large',
  } as const;

  return <Typography variant={sizeMap[size]} {...props} />;
};

export const Label: React.FC<Omit<TypographyProps, 'variant'> & { size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md',
  ...props
}) => {
  const sizeMap = {
    sm: 'label-small',
    md: 'label-medium',
    lg: 'label-large',
  } as const;

  return <Typography variant={sizeMap[size]} {...props} />;
};

// 🎨 Display components for hero sections
export const HeroTitle: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="display-large" weight="black" {...props} />
);

export const HeroSubtitle: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="title-large" color="text-muted" {...props} />
);