import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Language } from '@/types';
import { normalizeLocaleSettings, resolveLanguages } from '@/lib/locales';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LocaleSwitcherProps {
  className?: string;
  /** Variante compacte (barre du bas du footer). */
  compact?: boolean;
  showLanguage?: boolean;
  showCurrency?: boolean;
}

/** Sélecteur combiné langue + devise. */
export default function LocaleSwitcher({
  className,
  compact,
  showLanguage = true,
  showCurrency = true,
}: LocaleSwitcherProps) {
  const { language, setLanguage, designSettings } = useApp();
  const { currency, currencies, setCurrency } = useCurrency();
  const locales = normalizeLocaleSettings((designSettings as any)?.locales);
  const languages = resolveLanguages(locales);
  const activeLang = languages.find(l => l.code === language) ?? languages[0];

  if (!showLanguage && !showCurrency) return null;
  if (!locales.showSwitcher) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Langue et devise"
          title="Langue et devise"
          className={cn(
            'flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground hover:text-foreground transition-colors',
            className,
          )}
        >
          {!compact && <Globe className="h-3.5 w-3.5" aria-hidden="true" />}
          {showLanguage && <span>{compact ? `${activeLang.flag} ${activeLang.code}` : activeLang.code}</span>}
          {showLanguage && showCurrency && <span className="opacity-40">·</span>}
          {showCurrency && <span className="font-mono">{currency}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[80]">
        {showLanguage && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Langue
            </DropdownMenuLabel>
            {languages.map(l => (
              <DropdownMenuItem
                key={l.code}
                onClick={() => setLanguage(l.code as Language)}
                className={cn('gap-2 text-sm', l.code === language && 'font-bold')}
              >
                <span aria-hidden="true">{l.flag}</span>
                <span className="flex-1">{l.label}</span>
                {l.code === language && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {showLanguage && showCurrency && <DropdownMenuSeparator />}

        {showCurrency && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Devise
            </DropdownMenuLabel>
            {currencies.map(c => (
              <DropdownMenuItem
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className={cn('gap-2 text-sm', c.code === currency && 'font-bold')}
              >
                <span className="font-mono w-10">{c.code}</span>
                <span className="flex-1">{c.label}</span>
                {c.code === currency && <span className="text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
            <p className="px-2 py-1.5 text-[10px] leading-tight text-muted-foreground">
              Prix indicatifs — facturation finale en EUR.
            </p>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
