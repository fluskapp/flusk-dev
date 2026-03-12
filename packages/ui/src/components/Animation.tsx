import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';

// 🎬 Animation Components - Flusk Design System
// Smooth animations and transitions for enhanced UX

// 🔄 Fade In Animation
export interface FadeInProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  triggerOnce?: boolean;
}

const fadeDirections = {
  up: 'translate-y-8 opacity-0',
  down: '-translate-y-8 opacity-0', 
  left: 'translate-x-8 opacity-0',
  right: '-translate-x-8 opacity-0',
  none: 'opacity-0',
};

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 600,
  distance = 32,
  className,
  triggerOnce = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!triggerOnce || !hasTriggered)) {
          setTimeout(() => {
            setIsVisible(true);
            if (triggerOnce) {
              setHasTriggered(true);
            }
          }, delay);
        } else if (!triggerOnce && !entry.isIntersecting) {
          setIsVisible(false);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [delay, triggerOnce, hasTriggered]);

  return (
    <div
      ref={elementRef}
      className={cn(
        'transition-all ease-out',
        isVisible ? 'translate-x-0 translate-y-0 opacity-100' : fadeDirections[direction],
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        ...(direction !== 'none' && !isVisible && {
          transform: direction === 'up' || direction === 'down' 
            ? `translateY(${direction === 'up' ? distance : -distance}px)`
            : `translateX(${direction === 'left' ? distance : -distance}px)`,
        }),
      }}
    >
      {children}
    </div>
  );
};

// 🌊 Stagger Animation - Animate children with staggered delays
export interface StaggerProps {
  children: React.ReactNode;
  delay?: number;
  staggerDelay?: number;
  className?: string;
}

export const Stagger: React.FC<StaggerProps> = ({
  children,
  delay = 0,
  staggerDelay = 100,
  className,
}) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <FadeIn 
          delay={delay + (index * staggerDelay)}
          triggerOnce={true}
        >
          {child}
        </FadeIn>
      ))}
    </div>
  );
};

// ✨ Sparkle Animation - Floating sparkles effect
export interface SparkleProps {
  children: React.ReactNode;
  count?: number;
  className?: string;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  scale: number;
  duration: number;
  delay: number;
}

export const Sparkle: React.FC<SparkleProps> = ({
  children,
  count = 3,
  className,
}) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const generateSparkles = (): Sparkle[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        scale: Math.random() * 0.5 + 0.5,
        duration: Math.random() * 2000 + 1000,
        delay: Math.random() * 2000,
      }));
    };

    setSparkles(generateSparkles());

    const interval = setInterval(() => {
      setSparkles(generateSparkles());
    }, 3000);

    return () => clearInterval(interval);
  }, [count]);

  return (
    <div className={cn('relative', className)}>
      {children}
      
      {/* Sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {sparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            className="absolute w-1 h-1 bg-gradient-to-r from-primary-400 to-secondary-400 rounded-full animate-pulse"
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
              transform: `scale(${sparkle.scale})`,
              animationDuration: `${sparkle.duration}ms`,
              animationDelay: `${sparkle.delay}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// 🔄 Rotate Animation - Continuous rotation
export interface RotateProps {
  children: React.ReactNode;
  speed?: 'slow' | 'normal' | 'fast';
  direction?: 'clockwise' | 'counterclockwise';
  pauseOnHover?: boolean;
  className?: string;
}

const rotateSpeed = {
  slow: '10s',
  normal: '5s',
  fast: '2s',
};

export const Rotate: React.FC<RotateProps> = ({
  children,
  speed = 'normal',
  direction = 'clockwise',
  pauseOnHover = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'inline-block',
        pauseOnHover && 'hover:[animation-play-state:paused]',
        className
      )}
      style={{
        animation: `spin ${rotateSpeed[speed]} linear infinite ${
          direction === 'counterclockwise' ? 'reverse' : ''
        }`,
      }}
    >
      {children}
    </div>
  );
};

// 🎪 Float Animation - Gentle floating motion
export interface FloatProps {
  children: React.ReactNode;
  speed?: 'slow' | 'normal' | 'fast';
  distance?: 'sm' | 'md' | 'lg';
  className?: string;
}

const floatSpeed = {
  slow: '4s',
  normal: '3s', 
  fast: '2s',
};

const floatDistance = {
  sm: '4px',
  md: '8px',
  lg: '12px',
};

export const Float: React.FC<FloatProps> = ({
  children,
  speed = 'normal',
  distance = 'md',
  className,
}) => {
  return (
    <div
      className={cn('inline-block', className)}
      style={{
        animation: `float-${distance} ${floatSpeed[speed]} ease-in-out infinite`,
      }}
    >
      {children}
      
      <style>{`
        @keyframes float-sm {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes float-md {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-lg {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
};

// 🌊 Wave Animation - Ripple effect
export interface WaveProps {
  children: React.ReactNode;
  color?: 'primary' | 'secondary' | 'white';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const waveColors = {
  primary: 'bg-primary-500/20',
  secondary: 'bg-secondary-500/20',
  white: 'bg-white/20',
};

const waveSizes = {
  sm: 'w-8 h-8',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

export const Wave: React.FC<WaveProps> = ({
  children,
  color = 'primary',
  size = 'md',
  className,
}) => {
  return (
    <div className={cn('relative inline-block', className)}>
      {children}
      
      {/* Wave ripples */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'absolute rounded-full animate-ping',
              waveColors[color],
              waveSizes[size]
            )}
            style={{
              animationDelay: `${i * 0.5}s`,
              animationDuration: '2s',
            }}
          />
        ))}
      </div>
    </div>
  );
};

// 📈 Count Up Animation - Animated number counter
export interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  end,
  start = 0,
  duration = 2000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}) => {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const increment = (end - start) / (duration / 16.67); // 60fps
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 16.67);

    return () => clearInterval(timer);
  }, [isVisible, start, end, duration]);

  const displayValue = decimals > 0 
    ? count.toFixed(decimals)
    : Math.floor(count).toString();

  return (
    <span ref={elementRef} className={className}>
      {prefix}{displayValue}{suffix}
    </span>
  );
};

// 🎭 Reveal Animation - Text reveal effects
export interface RevealProps {
  children: React.ReactNode;
  type?: 'fade' | 'slide' | 'scale' | 'flip';
  delay?: number;
  className?: string;
}

const revealTypes = {
  fade: 'opacity-0',
  slide: 'translate-y-full opacity-0', 
  scale: 'scale-95 opacity-0',
  flip: 'rotate-x-90 opacity-0',
};

export const Reveal: React.FC<RevealProps> = ({
  children,
  type = 'fade',
  delay = 0,
  className,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsRevealed(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={elementRef}
      className={cn(
        'transition-all duration-700 ease-out',
        isRevealed ? 'translate-y-0 scale-100 rotate-x-0 opacity-100' : revealTypes[type],
        className
      )}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  );
};