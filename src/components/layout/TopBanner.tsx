import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { getBannerIcon, resolveTopBanner, type TopBannerConfig, type TopBannerItem } from '@/lib/bannerIcons';

interface Props {
  /** Raw value from designSettings.topBanner */
  raw: unknown;
  className?: string;
  /** Forced preview config (admin) */
  config?: TopBannerConfig;
}

function Message({
  item,
  fontSize,
  tracking,
  uppercase,
  color,
}: {
  item: TopBannerItem;
  fontSize: number;
  tracking: number;
  uppercase: boolean;
  color: string;
}) {
  const Icon = getBannerIcon(item.icon);
  const content = (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap max-w-full"
      style={{ fontSize: `${fontSize}px`, letterSpacing: `${tracking}em`, color }}
    >
      {Icon && <Icon className="shrink-0" style={{ width: fontSize + 4, height: fontSize + 4 }} aria-hidden />}
      <span className={cn('truncate', uppercase && 'uppercase')}>{item.text}</span>
    </span>
  );
  if (item.link) {
    return (
      <Link to={item.link} className="hover:underline max-w-full">
        {content}
      </Link>
    );
  }
  return content;
}

/**
 * Top banner above the header: a list of messages with optional icons.
 * Mobile rotates one message at a time on a single line (no more wrapping),
 * desktop can display them side by side.
 */
export function TopBanner({ raw, className, config }: Props) {
  const cfg = useMemo(() => config ?? resolveTopBanner(raw), [config, raw]);
  const isMobile = useIsMobile();
  const [index, setIndex] = useState(0);

  const items = cfg.items.filter((i) => i.text?.trim());
  const rotating = isMobile || !cfg.desktopShowAll;
  const shouldRotate = rotating && items.length > 1 && cfg.rotateMs > 0;

  useEffect(() => {
    if (!shouldRotate) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), Math.max(1500, cfg.rotateMs));
    return () => clearInterval(t);
  }, [shouldRotate, items.length, cfg.rotateMs]);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [index, items.length]);

  if (!cfg.enabled || items.length === 0) return null;

  const fontSize = isMobile ? cfg.mobileFontSize : cfg.desktopFontSize;
  const tracking = isMobile ? cfg.mobileTracking : cfg.desktopTracking;
  const height = isMobile ? cfg.mobileHeight : cfg.desktopHeight;

  return (
    <div
      className={cn('w-full overflow-hidden flex items-center justify-center px-3 font-medium', className)}
      style={{ backgroundColor: cfg.bgColor || '#000', color: cfg.textColor || '#fff', height: `${height}px` }}
    >
      {rotating ? (
        <div key={items[index]?.id ?? index} className="animate-fade-in flex items-center justify-center max-w-full">
          <Message
            item={items[index] ?? items[0]}
            fontSize={fontSize}
            tracking={tracking}
            uppercase={cfg.uppercase}
            color={cfg.textColor || '#fff'}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-6 lg:gap-10 max-w-full overflow-hidden">
          {items.map((item) => (
            <Message
              key={item.id}
              item={item}
              fontSize={fontSize}
              tracking={tracking}
              uppercase={cfg.uppercase}
              color={cfg.textColor || '#fff'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
