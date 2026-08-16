import { ShieldCheck, Lock, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Logos de paiement / livraison dessinés en SVG (aucune dépendance externe). */
const Logos: Record<string, { label: string; node: JSX.Element }> = {
  paypal: {
    label: 'PayPal',
    node: (
      <svg viewBox="0 0 92 24" className="h-full w-auto" role="img" aria-label="PayPal">
        <path d="M9 3h7.6c4 0 6.3 2 5.7 5.6-.6 3.7-3.4 5.6-7.4 5.6h-3l-.9 5.8H6.4L9 3Z" fill="#003087" />
        <path d="M13.6 6.2h4.2c2 0 3 .9 2.7 2.7-.3 1.9-1.7 2.8-3.8 2.8h-2l.9-5.5Z" fill="#fff" opacity=".95" />
        <path d="M20.5 6.5h7.2c4 0 6.3 2 5.7 5.6-.6 3.7-3.4 5.7-7.4 5.7h-3L22 23.5h-4.2l2.7-17Z" fill="#009cde" />
        <text x="37" y="18" fontFamily="Helvetica, Arial, sans-serif" fontSize="15" fontWeight="700" fill="#003087">Pay</text>
        <text x="65" y="18" fontFamily="Helvetica, Arial, sans-serif" fontSize="15" fontWeight="700" fill="#009cde">Pal</text>
      </svg>
    ),
  },
  paypal3x: {
    label: 'PayPal — Paiement en 3x',
    node: (
      <svg viewBox="0 0 96 24" className="h-full w-auto" role="img" aria-label="PayPal Paiement en 3 fois">
        <text x="0" y="17" fontFamily="Helvetica, Arial, sans-serif" fontSize="13" fontWeight="700" fill="#003087">Pay</text>
        <text x="24" y="17" fontFamily="Helvetica, Arial, sans-serif" fontSize="13" fontWeight="700" fill="#009cde">Pal</text>
        <rect x="49" y="3" width="45" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.3" opacity=".7" />
        <text x="71.5" y="16.5" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="11" fontWeight="700" fill="currentColor">en 3x</text>
      </svg>
    ),
  },
  cb: {
    label: 'CB — Carte Bancaire',
    node: (
      <svg viewBox="0 0 40 24" className="h-full w-auto" role="img" aria-label="Carte Bancaire">
        <rect x="0.5" y="0.5" width="39" height="23" rx="3" fill="#0a3d78" />
        <path d="M4 15h32" stroke="#5b9bd5" strokeWidth="1" opacity=".5" />
        <text x="20" y="14" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="11" fontWeight="700" fill="#ffffff">CB</text>
      </svg>
    ),
  },
  visa: {
    label: 'Visa',
    node: (
      <svg viewBox="0 0 52 24" className="h-full w-auto" role="img" aria-label="Visa">
        <text x="1" y="18" fontFamily="Helvetica, Arial, sans-serif" fontSize="17" fontStyle="italic" fontWeight="700" fill="#1a1f71">VISA</text>
        <path d="M1 20h50" stroke="#f7b600" strokeWidth="2" />
      </svg>
    ),
  },
  mastercard: {
    label: 'Mastercard',
    node: (
      <svg viewBox="0 0 44 24" className="h-full w-auto" role="img" aria-label="Mastercard">
        <circle cx="16" cy="12" r="9.5" fill="#eb001b" />
        <circle cx="28" cy="12" r="9.5" fill="#f79e1b" />
        <path d="M22 4.4a9.5 9.5 0 0 0 0 15.2 9.5 9.5 0 0 0 0-15.2Z" fill="#ff5f00" />
      </svg>
    ),
  },
  '3dsecure': {
    label: '3D Secure',
    node: (
      <span className="flex h-full items-center gap-1.5">
        <ShieldCheck className="h-[80%] w-auto text-emerald-500" />
        <span className="text-[11px] font-bold tracking-wider">3D SECURE</span>
      </span>
    ),
  },
  applepay: {
    label: 'Apple Pay',
    node: (
      <svg viewBox="0 0 62 24" className="h-full w-auto" role="img" aria-label="Apple Pay">
        <path d="M11.6 6.6c.7-.9 1.2-2.1 1-3.3-1.1.05-2.4.75-3.1 1.65-.66.8-1.2 2.05-1.02 3.2 1.2.1 2.4-.6 3.12-1.55ZM12.6 8.4c-1.75-.1-3.2 1-4 1-.85 0-2.1-.95-3.45-.93-1.78.03-3.4 1.03-4.3 2.63-1.85 3.2-.48 7.94 1.33 10.55.88 1.28 1.93 2.7 3.32 2.65 1.32-.05 1.84-.86 3.45-.86 1.6 0 2.07.86 3.47.83 1.44-.03 2.35-1.3 3.23-2.6.6-.9.86-1.36 1.34-2.4-2.86-1.1-3.32-5.1-.48-6.68-.86-1.1-2.07-1.72-2.9-1.79Z" fill="currentColor" />
        <text x="21" y="18" fontFamily="Helvetica, Arial, sans-serif" fontSize="15" fontWeight="600" fill="currentColor">Pay</text>
      </svg>
    ),
  },
  googlepay: {
    label: 'Google Pay',
    node: (
      <svg viewBox="0 0 74 24" className="h-full w-auto" role="img" aria-label="Google Pay">
        <path d="M11.6 11.1v3.1h4.4c-.18 1.05-1.3 3.1-4.4 3.1a4.9 4.9 0 0 1 0-9.8c1.4 0 2.35.6 2.9 1.12l2.2-2.12A7.9 7.9 0 0 0 11.6 4.4a8 8 0 1 0 0 16c4.6 0 7.65-3.24 7.65-7.8 0-.53-.06-.94-.14-1.5H11.6Z" fill="#4285F4" />
        <path d="M11.6 20.4c2.16 0 3.98-.72 5.3-1.95l-2.5-1.94c-.7.48-1.62.8-2.8.8-2.2 0-4.06-1.42-4.73-3.4l-2.6 2A8 8 0 0 0 11.6 20.4Z" fill="#34A853" />
        <path d="M6.87 13.9a4.9 4.9 0 0 1 0-3.1l-2.6-2a8 8 0 0 0 0 7.1l2.6-2Z" fill="#FBBC05" />
        <path d="M11.6 7.5c1.24 0 2.35.43 3.23 1.26l2.28-2.28A7.9 7.9 0 0 0 11.6 4.4a8 8 0 0 0-7.33 4.4l2.6 2c.67-1.98 2.53-3.3 4.73-3.3Z" fill="#EA4335" />
        <text x="24" y="18" fontFamily="Helvetica, Arial, sans-serif" fontSize="15" fontWeight="600" fill="currentColor">Pay</text>
      </svg>
    ),
  },
  colissimo: {
    label: 'Colissimo',
    node: (
      <svg viewBox="0 0 94 24" className="h-full w-auto" role="img" aria-label="Colissimo">
        <rect x="0.5" y="3.5" width="17" height="17" rx="2.5" fill="#003a70" />
        <path d="M4.5 12.5h9M9 8v9" stroke="#ffd400" strokeWidth="1.6" />
        <text x="22" y="17" fontFamily="Helvetica, Arial, sans-serif" fontSize="13" fontWeight="700" fill="currentColor">Colissimo</text>
      </svg>
    ),
  },
  chronopost: {
    label: 'Chronopost',
    node: (
      <svg viewBox="0 0 96 24" className="h-full w-auto" role="img" aria-label="Chronopost">
        <circle cx="10" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <text x="22" y="17" fontFamily="Helvetica, Arial, sans-serif" fontSize="12" fontWeight="700" fill="currentColor">Chronopost</text>
      </svg>
    ),
  },
};

export const PAYMENT_BADGE_OPTIONS = Object.entries(Logos).map(([key, v]) => ({ key, label: v.label }));
export const DEFAULT_PAYMENT_BADGES = [
  'paypal', 'paypal3x', 'cb', 'visa', 'mastercard', 'applepay', 'googlepay', '3dsecure', 'colissimo',
];

export type PaymentBadgeStyle = 'transparent' | 'light' | 'dark';

export interface PaymentBadgeItem {
  key: string;
  label?: string;
  iconUrl?: string;
  height?: number;
  visible?: boolean;
}

interface Props {
  badges?: string[];
  /** Logos personnalisés (images) affichés après les logos intégrés */
  customBadges?: { url: string; label?: string }[];
  /** Liste unifiée et réglable individuellement (remplace badges/customBadges) */
  items?: PaymentBadgeItem[];
  /** Hauteur des logos en px */
  height?: number;
  /** Rendu du fond : transparent (défaut), pastille claire ou pastille sombre */
  badgeStyle?: PaymentBadgeStyle;
  /** Force les logos en monochrome (hérite de la couleur du texte) */
  monochrome?: boolean;
  title?: string;
  note?: string;
  centered?: boolean;
  className?: string;
  headingClassName?: string;
  borderStyle?: React.CSSProperties;
}

export default function FooterPaymentBadges({
  badges,
  customBadges,
  items,
  height,
  badgeStyle = 'transparent',
  monochrome,
  title,
  note,
  centered,
  className,
  headingClassName,
  borderStyle,
}: Props) {
  const h = height && height > 0 ? height : 24;

  const list: PaymentBadgeItem[] = items?.length
    ? items.filter((b) => b.visible !== false && (b.iconUrl || Logos[b.key]))
    : [
        ...(badges ?? DEFAULT_PAYMENT_BADGES)
          .filter((k) => Logos[k])
          .map((k) => ({ key: k, label: Logos[k].label })),
        ...(customBadges || [])
          .filter((b) => b?.url)
          .map((b) => ({ key: 'custom', label: b.label, iconUrl: b.url })),
      ];

  if (!list.length) return null;

  const transparent = badgeStyle === 'transparent';

  return (
    <div className={cn(centered && 'text-center', className)}>
      <h4 className={headingClassName}>
        <span className="inline-flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" />
          {title || 'Paiement sécurisé'}
        </span>
      </h4>
      <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-3', centered && 'justify-center')}>
        {list.map((b, i) => {
          const bh = b.height && b.height > 0 ? b.height : h;
          const label = b.label || Logos[b.key]?.label || 'Paiement';
          return (
            <span
              key={`${b.key}-${i}`}
              title={label}
              aria-label={label}
              style={{
                ...(transparent ? undefined : borderStyle),
                height: transparent ? bh : bh + 14,
              }}
              className={cn(
                'flex items-center',
                transparent
                  ? cn('opacity-85 transition-opacity hover:opacity-100', monochrome && 'grayscale')
                  : cn(
                      'border px-2.5 chamfer-hud-sm',
                      badgeStyle === 'dark'
                        ? 'bg-foreground/90 text-background'
                        : 'bg-white/95 text-neutral-900',
                    ),
              )}
            >
              {b.iconUrl ? (
                <img
                  src={b.iconUrl}
                  alt={label}
                  style={{ height: bh }}
                  className="w-auto object-contain"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="flex items-center [&_svg]:h-full [&_svg]:w-auto" style={{ height: bh }}>
                  {Logos[b.key].node}
                </span>
              )}
            </span>
          );
        })}
      </div>
      {note !== '' && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] opacity-60 leading-relaxed">
          <Truck className="h-3.5 w-3.5 shrink-0" />
          {note || 'Transactions chiffrées SSL, 3D Secure et livraison suivie Colissimo.'}
        </p>
      )}
    </div>
  );
}
