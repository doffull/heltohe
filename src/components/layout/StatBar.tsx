import { useEffect, useState } from 'react';

interface StatBarProps {
  label: string;
  value: number;
  delay?: number;
}

export function StatBar({ label, value, delay = 0 }: StatBarProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const segments = 10;
  const filledSegments = Math.round((value / 100) * segments);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/80">
          {label}
        </span>
        <span className="font-mono text-[10px] tracking-wider text-foreground/60">
          {animatedValue}%
        </span>
      </div>
      <div className="stat-bar-segmented">
        {Array.from({ length: segments }).map((_, index) => (
          <div
            key={index}
            className={`stat-segment transition-all duration-500 ${
              index < filledSegments ? 'filled' : ''
            }`}
            style={{
              transitionDelay: `${delay + index * 50}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
