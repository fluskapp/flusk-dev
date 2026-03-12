import React from 'react';
import { cn } from '../utils/cn';

// 📐 Layout Components - Flusk Design System
// Container, Grid, and Flexbox utilities for consistent layouts

// 🗃️ Container Component
export interface ContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  center?: boolean;
  className?: string;
  children: React.ReactNode;
}

const containerSizes = {
  sm: 'max-w-2xl',   // 672px
  md: 'max-w-4xl',   // 896px  
  lg: 'max-w-6xl',   // 1152px
  xl: 'max-w-7xl',   // 1280px
  full: 'max-w-full',
};

const containerPadding = {
  none: '',
  sm: 'px-4 py-4',
  md: 'px-6 py-6',
  lg: 'px-8 py-8',
  xl: 'px-12 py-12',
};

export const Container: React.FC<ContainerProps> = ({
  size = 'lg',
  padding = 'md',
  center = true,
  className,
  children,
}) => (
  <div
    className={cn(
      containerSizes[size],
      containerPadding[padding],
      center && 'mx-auto',
      className
    )}
  >
    {children}
  </div>
);

// 📱 Section Component - Full-width section with container inside
export interface SectionProps {
  background?: 'white' | 'gray' | 'primary' | 'secondary' | 'gradient' | 'dark';
  padding?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  containerSize?: ContainerProps['size'];
  className?: string;
  children: React.ReactNode;
}

const sectionBackgrounds = {
  white: 'bg-white',
  gray: 'bg-gray-50',
  primary: 'bg-primary-600',
  secondary: 'bg-secondary-600',
  gradient: 'bg-gradient-to-br from-primary-600 via-secondary-600 to-primary-800',
  dark: 'bg-gray-900',
};

const sectionPadding = {
  sm: 'py-8',
  md: 'py-12',
  lg: 'py-16',
  xl: 'py-20',
  '2xl': 'py-24',
};

export const Section: React.FC<SectionProps> = ({
  background = 'white',
  padding = 'lg',
  containerSize = 'lg',
  className,
  children,
}) => (
  <section
    className={cn(
      'w-full',
      sectionBackgrounds[background],
      sectionPadding[padding],
      className
    )}
  >
    <Container size={containerSize} padding="md">
      {children}
    </Container>
  </section>
);

// 🔲 Grid Component
export interface GridProps {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: {
    sm?: GridProps['cols'];
    md?: GridProps['cols'];
    lg?: GridProps['cols'];
    xl?: GridProps['cols'];
  };
  className?: string;
  children: React.ReactNode;
}

const gridCols = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
};

const gridGaps = {
  none: 'gap-0',
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
  xl: 'gap-12',
};

export const Grid: React.FC<GridProps> = ({
  cols = 1,
  gap = 'md',
  responsive,
  className,
  children,
}) => (
  <div
    className={cn(
      'grid',
      gridCols[cols],
      gridGaps[gap],
      responsive?.sm && `sm:grid-cols-${responsive.sm}`,
      responsive?.md && `md:grid-cols-${responsive.md}`,
      responsive?.lg && `lg:grid-cols-${responsive.lg}`,
      responsive?.xl && `xl:grid-cols-${responsive.xl}`,
      className
    )}
  >
    {children}
  </div>
);

// 📏 Flex Component
export interface FlexProps {
  direction?: 'row' | 'row-reverse' | 'col' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  children: React.ReactNode;
}

const flexDirection = {
  row: 'flex-row',
  'row-reverse': 'flex-row-reverse',
  col: 'flex-col',
  'col-reverse': 'flex-col-reverse',
};

const alignItems = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyContent = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

const flexWrap = {
  nowrap: 'flex-nowrap',
  wrap: 'flex-wrap',
  'wrap-reverse': 'flex-wrap-reverse',
};

const flexGaps = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

export const Flex: React.FC<FlexProps> = ({
  direction = 'row',
  align = 'start',
  justify = 'start',
  wrap = 'nowrap',
  gap = 'md',
  className,
  children,
}) => (
  <div
    className={cn(
      'flex',
      flexDirection[direction],
      alignItems[align],
      justifyContent[justify],
      flexWrap[wrap],
      flexGaps[gap],
      className
    )}
  >
    {children}
  </div>
);

// 📱 Stack Component - Vertical spacing utility
export interface StackProps {
  space?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end';
  className?: string;
  children: React.ReactNode;
}

const stackSpacing = {
  none: 'space-y-0',
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-6',
  xl: 'space-y-8',
};

const stackAlign = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
};

export const Stack: React.FC<StackProps> = ({
  space = 'md',
  align = 'start',
  className,
  children,
}) => (
  <div
    className={cn(
      'flex flex-col',
      stackSpacing[space],
      stackAlign[align],
      className
    )}
  >
    {children}
  </div>
);

// 🎯 Spacer Component - Flexible spacing
export interface SpacerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  axis?: 'x' | 'y' | 'both';
  className?: string;
}

const spacerSizes = {
  sm: {
    x: 'w-2',
    y: 'h-2',
    both: 'w-2 h-2',
  },
  md: {
    x: 'w-4',
    y: 'h-4', 
    both: 'w-4 h-4',
  },
  lg: {
    x: 'w-8',
    y: 'h-8',
    both: 'w-8 h-8',
  },
  xl: {
    x: 'w-16',
    y: 'h-16',
    both: 'w-16 h-16',
  },
  '2xl': {
    x: 'w-24',
    y: 'h-24',
    both: 'w-24 h-24',
  },
};

export const Spacer: React.FC<SpacerProps> = ({
  size = 'md',
  axis = 'both',
  className,
}) => (
  <div
    className={cn(
      spacerSizes[size][axis],
      'flex-shrink-0',
      className
    )}
  />
);

// 📍 Center Component - Center content both horizontally and vertically
export interface CenterProps {
  minHeight?: 'screen' | 'container' | 'none';
  className?: string;
  children: React.ReactNode;
}

const centerHeights = {
  screen: 'min-h-screen',
  container: 'min-h-96',
  none: '',
};

export const Center: React.FC<CenterProps> = ({
  minHeight = 'none',
  className,
  children,
}) => (
  <div
    className={cn(
      'flex items-center justify-center',
      centerHeights[minHeight],
      className
    )}
  >
    {children}
  </div>
);