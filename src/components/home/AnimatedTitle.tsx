import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getIcon } from '@/components/admin/IconPicker';
import type { TitleAnimation } from '@/config/techwearHeroPresets';

interface AnimatedTitleProps {
  text: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  animation?: TitleAnimation;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Reusable animated title with optional Lucide icon.
 * Animations: fade-up, typewriter, glitch, neon, slide-in, none.
 */
export function AnimatedTitle({
  text,
  icon,
  iconPosition = 'left',
  animation = 'fade-up',
  className = '',
  as: Tag = 'h1',
}: AnimatedTitleProps) {
  const Icon = icon ? getIcon(icon) : null;
  const [typed, setTyped] = useState(animation === 'typewriter' ? '' : text);

  useEffect(() => {
    if (animation !== 'typewriter') { setTyped(text); return; }
    setTyped('');
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 55);
    return () => window.clearInterval(id);
  }, [animation, text]);

  const renderText = () => {
    if (animation === 'typewriter') {
      return <span>{typed}<span className="inline-block w-[2px] h-[0.8em] bg-current ml-0.5 animate-pulse align-middle" /></span>;
    }
    if (animation === 'glitch') {
      return (
        <span className="relative inline-block animated-title-glitch" data-text={text}>
          {text}
        </span>
      );
    }
    if (animation === 'neon') {
      return <span className="animated-title-neon">{text}</span>;
    }
    return <span>{text}</span>;
  };

  const motionProps =
    animation === 'fade-up'
      ? { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } }
      : animation === 'slide-in'
        ? { initial: { opacity: 0, x: -24 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.5 } }
        : { initial: false as const, animate: { opacity: 1 } };

  const InnerTag = Tag as any;

  return (
    <motion.div className={`inline-flex items-center gap-2 ${className}`} {...motionProps}>
      {Icon && iconPosition === 'left' && <Icon className="h-[1em] w-[1em] shrink-0" />}
      <InnerTag className="m-0 inline">{renderText()}</InnerTag>
      {Icon && iconPosition === 'right' && <Icon className="h-[1em] w-[1em] shrink-0" />}
    </motion.div>
  );
}
