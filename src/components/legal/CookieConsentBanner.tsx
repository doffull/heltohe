import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Cookie, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useCookieConsent, type ConsentState } from '@/context/CookieConsentContext';

const CLIP = 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)';

const CATEGORIES: { key: keyof ConsentState; label: string; description: string }[] = [
  {
    key: 'statistics',
    label: 'Mesure d’audience',
    description: 'Statistiques de visite anonymisées pour améliorer le site.',
  },
  {
    key: 'personalization',
    label: 'Personnalisation',
    description: 'Mémorise vos préférences et adapte le contenu affiché.',
  },
  {
    key: 'thirdParty',
    label: 'Services tiers',
    description: 'Cartes, vidéos, avis clients et réseaux sociaux intégrés.',
  },
];

export function CookieConsentBanner() {
  const { designSettings } = useApp();
  const ds = (designSettings as any) || {};
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { consent, decided, preferencesOpen, openPreferences, closePreferences, acceptAll, rejectAll, save } =
    useCookieConsent();
  const [draft, setDraft] = useState<ConsentState>(consent);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preferencesOpen) setDraft(consent);
  }, [preferencesOpen, consent]);

  // Fermeture au clavier lorsque le choix a déjà été fait.
  useEffect(() => {
    if (!preferencesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && decided) closePreferences();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preferencesOpen, decided, closePreferences]);

  // Focus sur le panneau à l'ouverture (accessibilité).
  useEffect(() => {
    if (preferencesOpen) panelRef.current?.focus();
  }, [preferencesOpen]);

  const enabled = ds.cookieBannerEnabled !== false;
  const isAdminRoute = location.pathname.startsWith('/admin');
  if (!enabled || isAdminRoute) return null;

  const title = ds.cookieBannerTitle || 'Vos données, votre choix';
  const text =
    ds.cookieBannerText ||
    'Nous utilisons des cookies essentiels au fonctionnement du site et, avec votre accord, des cookies de mesure d’audience, de personnalisation et de services tiers.';
  const centered = ds.cookieBannerPosition === 'center';

  const showBanner = !decided && !preferencesOpen;
  const transition = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 26 };

  return (
    <>
      {/* ── Bandeau initial ── */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 }}
            transition={transition}
            role="dialog"
            aria-modal="false"
            aria-label="Consentement aux cookies"
            className={cn(
              'fixed z-[140] p-4',
              centered ? 'inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm' : 'inset-x-0 bottom-0',
            )}
          >
            <div
              className="mx-auto w-full max-w-3xl border border-border bg-card text-card-foreground shadow-2xl"
              style={{ clipPath: CLIP }}
            >
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Cookie className="h-4 w-4 shrink-0" />
                    <h2 className="text-sm font-bold uppercase tracking-[0.18em]">{title}</h2>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] underline-offset-2">
                    <Link to="/cookies" className="underline hover:no-underline">
                      Politique cookies
                    </Link>
                    <Link to="/confidentialite" className="underline hover:no-underline">
                      Confidentialité
                    </Link>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:w-56">
                  <Button className="w-full text-xs font-bold uppercase tracking-widest" onClick={acceptAll}>
                    Tout accepter
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-xs font-bold uppercase tracking-widest"
                    onClick={rejectAll}
                  >
                    Tout refuser
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full gap-2 text-xs uppercase tracking-widest"
                    onClick={openPreferences}
                  >
                    <Settings2 className="h-3.5 w-3.5" /> Personnaliser
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Panneau de préférences ── */}
      <AnimatePresence>
        {preferencesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : undefined}
            className="fixed inset-0 z-[145] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
            onClick={() => decided && closePreferences()}
          >
            <motion.div
              ref={panelRef}
              tabIndex={-1}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
              transition={transition}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Préférences cookies"
              className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto border border-border bg-card text-card-foreground shadow-2xl outline-none"
              style={{ clipPath: CLIP }}
            >
              {decided && (
                <button
                  type="button"
                  onClick={closePreferences}
                  aria-label="Fermer"
                  className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="space-y-5 p-6">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.18em]">Préférences cookies</h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Choisissez les finalités que vous autorisez. Vous pouvez modifier ces réglages à tout moment.
                  </p>
                </div>

                <div className="flex items-start justify-between gap-4 border border-border p-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest">Cookies essentiels</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Nécessaires au panier, à la connexion et à la sécurité. Toujours actifs.
                    </p>
                  </div>
                  <Switch checked disabled aria-label="Cookies essentiels (obligatoires)" />
                </div>

                {CATEGORIES.map((cat) => (
                  <div key={cat.key} className="flex items-start justify-between gap-4 border border-border p-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest">{cat.label}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{cat.description}</p>
                    </div>
                    <Switch
                      checked={draft[cat.key]}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, [cat.key]: v }))}
                      aria-label={cat.label}
                    />
                  </div>
                ))}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs font-bold uppercase tracking-widest"
                    onClick={rejectAll}
                  >
                    Tout refuser
                  </Button>
                  <Button className="flex-1 text-xs font-bold uppercase tracking-widest" onClick={() => save(draft)}>
                    Enregistrer mes choix
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs font-bold uppercase tracking-widest"
                    onClick={acceptAll}
                  >
                    Tout accepter
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default CookieConsentBanner;
