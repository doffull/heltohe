import { ShieldCheck, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Logos de paiement dessinés en SVG (aucune dépendance externe). */
const Logos: Record<string, { label: string; node: JSX.Element }> = {
  paypal: {
    label: 'PayPal',
    node: (
      <svg viewBox="0 0 90 24" className="h-5 w-auto" role="img" aria-label="PayPal">
        <text x="0" y="18" fontFamily="Helvetica, Arial, sans-serif" fontSize="18" fontWeight="700" fill="#003087">Pay</text>
        <text x="34" y="18" fontFamily="Helvetica, Arial, sans-serif" fontSize="18" fontWeight="700" fill="#009cde">Pal</text>
      </svg>
    ),
  },
  cb: {
    label: 'CB — Carte Bancaire',
    node: (
      <svg viewBox="0 0 40 24" className="h-5 w-auto" role="img" aria-label="Carte Bancaire">
        <rect x="0.5" y="0.5" width="39" height="23" rx="2" fill="#0a3d78" />
        <text x="20" y="17" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="14" fontWeight="700" fill="#ffffff">CB</text>
      </svg>
    ),
  },
  visa: {
    label: 'Visa',
    node: (
      <svg viewBox="0 0 52 24" className="h-5 w-auto" role="img" aria-label="Visa">
        <text x="0" y="18" fontFamily="Helvetica, Arial, sans-serif" fontSize="17" fontStyle="italic" fontWeight="700" fill="#1a1f71">VISA</text>
      </svg>
    ),
  },
  mastercard: {
    label: 'Mastercard',
    node: (
      <svg viewBox="0 0 40 24" className="h-5 w-auto" role="img" aria-label="Mastercard">
        <circle cx="15" cy="12" r="9" fill="#eb001b" />
        <circle cx="25" cy="12" r="9" fill="#f79e1b" fillOpacity="0.9" />
      </svg>
    ),
  },
  '3dsecure': {
    label: '3D Secure',
    node: (
      <span className="flex items-center gap-1.5">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span className="text-[11px] font-bold tracking-wider">3D SECURE</span>
      </span>
    ),
  },
  applepay: {
    label: 'Apple Pay',
    node: (
      <svg viewBox="0 0 60 24" className="h-5 w-auto" role="img" aria-label="Apple Pay">
        <text x="0" y="18" fontFamily="Helvetica, Arial, sans-serif" fontSize="15" fontWeight="600" fill="currentColor"> Pay</text>
      </svg>
    ),
  },
};

export const PAYMENT_BADGE_OPTIONS = Object.entries(Logos).map(([key, v]) => ({ key, label: v.label }));
export const DEFAULT_PAYMENT_BADGES = ['paypal', '3dsecure', 'cb', 'visa', 'mastercard'];

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
  title,
  note,
  centered,
  className,
  headingClassName,
  borderStyle,
}: Props) {
  const h = height && height > 0 ? height : 20;

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

  return (
    <div className={cn(centered && 'text-center', className)}>
      <h4 className={headingClassName}>
        <span className="inline-flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" />
          {title || 'Paiement sécurisé'}
        </span>
      </h4>
      <div className={cn('flex flex-wrap items-center gap-2', centered && 'justify-center')}>
        {list.map((b, i) => {
          const bh = b.height && b.height > 0 ? b.height : h;
          const label = b.label || Logos[b.key]?.label || 'Paiement';
          return (
            <span
              key={`${b.key}-${i}`}
              title={label}
              style={{ ...borderStyle, height: bh + 16 }}
              className="flex items-center gap-2 border bg-white/95 px-2.5 text-neutral-900 chamfer-hud-sm"
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
        <p className="mt-3 text-[11px] opacity-60 leading-relaxed">
          {note || 'Transactions chiffrées SSL et authentification 3D Secure sur toutes les cartes.'}
        </p>
      )}
    </div>
  );
}


