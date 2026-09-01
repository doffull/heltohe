import { useMemo } from 'react';
import { Globe, Coins, Languages, Info } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LANGUAGES, Language } from '@/types';
import { CURRENCIES, CurrencyCode } from '@/lib/currency';
import { DEFAULT_LOCALE_SETTINGS, LocaleSettings, normalizeLocaleSettings } from '@/lib/locales';

/** Admin → Devises & Langues : devises actives, taux, langues du sélecteur. */
export default function AdminLocales() {
  const { designSettings, updateDesignSettings } = useApp();
  const settings = useMemo<LocaleSettings>(
    () => normalizeLocaleSettings((designSettings as any)?.locales),
    [designSettings],
  );

  const patch = (p: Partial<LocaleSettings>) => {
    updateDesignSettings({ locales: normalizeLocaleSettings({ ...settings, ...p }) } as any);
  };

  const toggleCurrency = (code: CurrencyCode, on: boolean) => {
    if (code === 'EUR') return; // devise de facturation, toujours active
    const next = on
      ? [...settings.enabledCurrencies, code]
      : settings.enabledCurrencies.filter(c => c !== code);
    patch({ enabledCurrencies: next });
  };

  const toggleLanguage = (code: Language, on: boolean) => {
    const next = on
      ? [...settings.enabledLanguages, code]
      : settings.enabledLanguages.filter(l => l !== code);
    if (!next.length) return;
    patch({ enabledLanguages: next });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold hud-text flex items-center gap-2">
          <Globe className="h-5 w-5" /> DEVISES &amp; LANGUES
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Choisissez ce que vos visiteurs peuvent sélectionner sur le site.
        </p>
      </header>

      <div className="chamfer-hud bg-card/50 p-4 flex items-start gap-3 text-sm">
        <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <p className="text-muted-foreground">
          L'encaissement se fait toujours en <strong className="text-foreground">EUR</strong>. Les autres devises sont
          un affichage converti, à titre indicatif, avec les taux définis ci-dessous.
        </p>
      </div>

      <section className="chamfer-hud bg-card/50 p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-bold hud-text text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" /> SÉLECTEUR SUR LE SITE
          </h2>
          <Switch checked={settings.showSwitcher} onCheckedChange={v => patch({ showSwitcher: v })} />
        </div>
        <p className="text-xs text-muted-foreground">
          Affiche ou masque le sélecteur langue/devise dans l'en-tête et le bas de page.
        </p>
      </section>

      <section className="chamfer-hud bg-card/50 p-4 sm:p-6 space-y-4">
        <h2 className="font-bold hud-text text-sm flex items-center gap-2">
          <Coins className="h-4 w-4" /> DEVISES
        </h2>
        <div className="space-y-3">
          {CURRENCIES.map(c => {
            const enabled = settings.enabledCurrencies.includes(c.code);
            const rate = settings.rates[c.code];
            return (
              <div
                key={c.code}
                className="flex flex-wrap items-center gap-3 border border-border p-3 bg-background/40"
              >
                <Switch
                  checked={enabled}
                  disabled={c.code === 'EUR'}
                  onCheckedChange={v => toggleCurrency(c.code, v)}
                />
                <div className="min-w-[130px]">
                  <p className="text-sm font-bold font-mono">{c.code}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">1 EUR =</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    className="w-28 h-8"
                    disabled={c.code === 'EUR'}
                    value={c.code === 'EUR' ? 1 : (rate ?? c.rate)}
                    onChange={e =>
                      patch({ rates: { ...settings.rates, [c.code]: Number(e.target.value) } })
                    }
                  />
                  <span className="text-xs font-mono">{c.symbol}</span>
                </div>
                <Button
                  variant={settings.defaultCurrency === c.code ? 'default' : 'outline'}
                  size="sm"
                  className="ml-auto text-xs"
                  disabled={!enabled}
                  onClick={() => patch({ defaultCurrency: c.code })}
                >
                  {settings.defaultCurrency === c.code ? 'Par défaut' : 'Définir par défaut'}
                </Button>
              </div>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => patch({ rates: {}, enabledCurrencies: DEFAULT_LOCALE_SETTINGS.enabledCurrencies })}
        >
          Réinitialiser les taux
        </Button>
      </section>

      <section className="chamfer-hud bg-card/50 p-4 sm:p-6 space-y-4">
        <h2 className="font-bold hud-text text-sm flex items-center gap-2">
          <Languages className="h-4 w-4" /> LANGUES
        </h2>
        <div className="space-y-3">
          {LANGUAGES.map(l => {
            const enabled = settings.enabledLanguages.includes(l.code);
            return (
              <div
                key={l.code}
                className="flex flex-wrap items-center gap-3 border border-border p-3 bg-background/40"
              >
                <Switch checked={enabled} onCheckedChange={v => toggleLanguage(l.code, v)} />
                <span aria-hidden="true" className="text-lg">{l.flag}</span>
                <div className="min-w-[130px]">
                  <p className="text-sm font-bold">{l.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{l.code}</p>
                </div>
                <Button
                  variant={settings.defaultLanguage === l.code ? 'default' : 'outline'}
                  size="sm"
                  className="ml-auto text-xs"
                  disabled={!enabled}
                  onClick={() => patch({ defaultLanguage: l.code })}
                >
                  {settings.defaultLanguage === l.code ? 'Par défaut' : 'Définir par défaut'}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Le contenu du site est rédigé en français ; ce réglage pilote les langues proposées dans le sélecteur.
        </p>
      </section>
    </div>
  );
}
