import { useEffect, useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';

interface StatBarProps {
  label: string;
  value: number;
  delay?: number;
}

export function StatBar({ label, value, delay = 0 }: StatBarProps) {
  const { designSettings } = useApp();
  const [animatedValue, setAnimatedValue] = useState(0);
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(value);
  const segments = 10;
  const filledSegments = Math.round((animatedValue / 100) * segments);

  // Initial animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  // Animate value changes smoothly
  useEffect(() => {
    if (prevValueRef.current !== value) {
      setAnimatedValue(value);
      prevValueRef.current = value;
    }
  }, [value]);

  // Animate the display number
  useEffect(() => {
    const duration = 500;
    const startValue = displayValue;
    const endValue = animatedValue;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [animatedValue]);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/80">
          {label}
        </span>
        <span className="font-mono text-[10px] tracking-wider text-foreground/60">
          {displayValue}%
        </span>
      </div>
      <div className="stat-bar-segmented">
        {Array.from({ length: segments }).map((_, index) => (
          <div
            key={index}
            className="stat-segment transition-all duration-300 ease-out"
            style={{
              backgroundColor: index < filledSegments
                ? (designSettings.statBarFilledColor || undefined)
                : (designSettings.statBarEmptyColor || undefined),
            }}
          />
        ))}
      </div>
    </div>
  );
}
