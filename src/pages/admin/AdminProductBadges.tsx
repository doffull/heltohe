import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Trash2, Plus, GripVertical, Copy, ExternalLink, Eye } from 'lucide-react';
import {
  TRUST_BADGE_ICONS,
  TRUST_BADGE_ICON_NAMES,
  DEFAULT_TRUST_BADGES,
  getProductTrustBadges,
  normalizeCategoryKey,
} from '@/lib/productTrustBadges';
import type { ProductTrustBadge, ProductTrustBadgesConfig } from '@/types';
import { toast } from 'sonner';

const uid = () => `b_${Math.random().toString(36).slice(2, 9)}`;

function BadgeRow({
  badge,
  onChange,
  onRemove,
}: {
  badge: ProductTrustBadge;
  onChange: (b: ProductTrustBadge) => void;
  onRemove: () => void;
}) {
  const Icon = TRUST_BADGE_ICONS[badge.icon] || TRUST_BADGE_ICONS.Truck;
  return (
    <div className="flex flex-wrap items-center gap-2 border border-border rounded-md p-3 bg-card">
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex items-center gap-2 min-w-[180px]">
        <Icon className="h-5 w-5 text-primary" />
        <Select value={badge.icon} onValueChange={(v) => onChange({ ...badge, icon: v })}>
          <SelectTrigger className="w-[150px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRUST_BADGE_ICON_NAMES.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        className="flex-1 min-w-[220px] h-8"
        value={badge.label}
        onChange={(e) => onChange({ ...badge, label: e.target.value })}
        placeholder="Texte du badge"
      />
      <div className="flex items-center gap-2">
        <Switch checked={badge.enabled} onCheckedChange={(v) => onChange({ ...badge, enabled: v })} />
        <span className="text-xs text-muted-foreground">{badge.enabled ? 'Actif' : 'Masqué'}</span>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function BadgeList({
  badges,
  onUpdate,
  canReset,
  onReset,
  onCopyFromDefault,
  showCopy,
}: {
  badges: ProductTrustBadge[];
  onUpdate: (list: ProductTrustBadge[]) => void;
  canReset?: boolean;
  onReset?: () => void;
  onCopyFromDefault?: () => void;
  showCopy?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        {showCopy && onCopyFromDefault && (
          <Button type="button" size="sm" variant="outline" onClick={onCopyFromDefault}>
            <Copy className="h-3 w-3 mr-1" /> Copier depuis Défaut
          </Button>
        )}
        {canReset && onReset && (
          <Button type="button" size="sm" variant="outline" onClick={onReset}>Réinitialiser</Button>
        )}
      </div>
      <div className="space-y-2">
        {badges.map((b, i) => (
          <BadgeRow
            key={b.id}
            badge={b}
            onChange={(nb) => {
              const next = [...badges];
              next[i] = nb;
              onUpdate(next);
            }}
            onRemove={() => onUpdate(badges.filter((_, idx) => idx !== i))}
          />
        ))}
        {badges.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-4 text-center border border-dashed border-border rounded-md">
            Aucun badge configuré — les badges par défaut seront affichés (à moins d'être sur "Défaut" vidé volontairement).
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onUpdate([
            ...badges,
            { id: uid(), icon: 'Sparkles', label: 'Nouveau badge', enabled: true },
          ])
        }
      >
        <Plus className="h-4 w-4 mr-1" /> Ajouter un badge
      </Button>
    </div>
  );
}

/** Miroir exact de la barre de badges affichée dans ProductInfo.tsx. */
function BadgePreview({
  settings,
  simulateCategory,
}: {
  settings: { productTrustBadges?: ProductTrustBadgesConfig };
  simulateCategory: string;
}) {
  const { enabled, badges } = getProductTrustBadges(settings as any, simulateCategory);
  if (!enabled) {
    return (
      <div className="text-xs italic text-muted-foreground border border-dashed border-border rounded-md py-6 text-center">
        Badges globalement désactivés — aucune barre ne sera affichée.
      </div>
    );
  }
  if (badges.length === 0) {
    return (
      <div className="text-xs italic text-muted-foreground border border-dashed border-border rounded-md py-6 text-center">
        Aucun badge actif à afficher pour cette catégorie.
      </div>
    );
  }
  return (
    <div
      className="grid gap-2 py-4 border-y border-border bg-background rounded-md px-3"
      style={{ gridTemplateColumns: `repeat(${Math.min(badges.length, 4)}, minmax(0, 1fr))` }}
    >
      {badges.map((badge) => {
        const Icon = TRUST_BADGE_ICONS[badge.icon] || TRUST_BADGE_ICONS.Truck;
        return (
          <div key={badge.id} className="text-center">
            <Icon className="h-5 w-5 sm:h-7 sm:w-7 mx-auto mb-1 sm:mb-2 text-primary" />
            <p className="text-[9px] sm:text-xs text-muted-foreground leading-tight">{badge.label}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminProductBadges() {
  const { designSettings, updateDesignSettings, products } = useApp();
  const statusBadgesOn = (designSettings as any).showProductStatusBadges === true;

  const remoteCfg: ProductTrustBadgesConfig = useMemo(() => {
    return (
      designSettings.productTrustBadges || {
        enabled: true,
        default: DEFAULT_TRUST_BADGES,
        byCategory: {},
      }
    );
  }, [designSettings.productTrustBadges]);

  const [draft, setDraft] = useState<ProductTrustBadgesConfig>(remoteCfg);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const dirtyRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dirtyRef.current) return;
    setDraft(remoteCfg);
  }, [remoteCfg]);

  const cfg = draft;

  const commit = (next: ProductTrustBadgesConfig) => {
    dirtyRef.current = true;
    setDraft(next);
    setStatus('saving');
    updateDesignSettings({ productTrustBadges: next });
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      dirtyRef.current = false;
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    }, 1000);
  };

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  // Real categories present in products (source of truth for matching)
  const productCategories = useMemo(() => {
    const set = new Map<string, string>(); // normalizedKey -> display
    for (const p of products) {
      if (!p.category) continue;
      const nk = normalizeCategoryKey(p.category);
      if (nk && !set.has(nk)) set.set(nk, p.category);
    }
    return Array.from(set.entries()).map(([key, label]) => ({ key, label }));
  }, [products]);

  const suggested = ['homme', 'femme', 'enfant', 'sportwear'];
  const existingCatKeys = Object.keys(cfg.byCategory || {});

  const countForCatKey = (k: string) => {
    const nk = normalizeCategoryKey(k);
    return products.filter((p) => normalizeCategoryKey(p.category || '') === nk).length;
  };

  const firstProductForCat = (k: string) => {
    const nk = normalizeCategoryKey(k);
    return products.find((p) => normalizeCategoryKey(p.category || '') === nk);
  };

  const [activeTab, setActiveTab] = useState<'default' | 'categories'>('default');
  const [activeCat, setActiveCat] = useState<string>(existingCatKeys[0] || suggested[0]);
  const [newCatKey, setNewCatKey] = useState('');
  const [previewCat, setPreviewCat] = useState<string>('');

  useEffect(() => {
    if (existingCatKeys.length === 0) return;
    if (!existingCatKeys.includes(activeCat)) setActiveCat(existingCatKeys[0]);
  }, [activeCat, existingCatKeys]);

  const previewSimulatedCat =
    previewCat ||
    (activeTab === 'categories' && activeCat ? activeCat : '__default__');

  const setDefault = (list: ProductTrustBadge[]) => commit({ ...cfg, default: list });
  const setForCat = (cat: string, list: ProductTrustBadge[]) =>
    commit({ ...cfg, byCategory: { ...(cfg.byCategory || {}), [cat]: list } });
  const removeCat = (cat: string) => {
    const nb = { ...(cfg.byCategory || {}) };
    delete nb[cat];
    commit({ ...cfg, byCategory: nb });
    toast.success(`Personnalisation supprimée pour "${cat}"`);
  };
  const addCat = (raw: string) => {
    const key = raw.trim().toLowerCase();
    if (!key) return;
    if (cfg.byCategory?.[key]) {
      toast.info('Cette catégorie existe déjà');
      setActiveCat(key);
      setActiveTab('categories');
      return;
    }
    commit({
      ...cfg,
      byCategory: {
        ...(cfg.byCategory || {}),
        [key]: (cfg.default && cfg.default.length ? cfg.default : DEFAULT_TRUST_BADGES).map((b) => ({ ...b, id: uid() })),
      },
    });
    setActiveCat(key);
    setActiveTab('categories');
    setNewCatKey('');
  };

  const openSampleProduct = (catKey: string) => {
    const p = firstProductForCat(catKey);
    if (!p) {
      toast.info('Aucun produit trouvé dans cette catégorie pour tester.');
      return;
    }
    window.open(`/product/${p.id}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold hud-text uppercase tracking-wider">
            Badges de confiance produit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personnalise les icônes (Livraison, Garantie, Retours…) affichées sur la page produit.
            Toute modification est appliquée <strong>en direct</strong> sur les pages produit et l'aperçu ci-contre.
          </p>
        </div>
        <div className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/40">
          {status === 'saving' && '⏳ Enregistrement…'}
          {status === 'saved' && '✓ Enregistré'}
          {status === 'idle' && '↺ Autosave actif'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        {/* Colonne édition */}
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Affichage global</CardTitle>
              <div className="flex items-center gap-2">
                <Switch
                  checked={cfg.enabled !== false}
                  onCheckedChange={(v) => commit({ ...cfg, enabled: v })}
                />
                <Label className="text-sm">
                  {cfg.enabled !== false ? 'Badges visibles sur les pages produit' : 'Badges masqués partout'}
                </Label>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Badges d'état produit</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Pastilles « Tendance », « Promo », « Nouveau », « Top vente », « Stock limité », « Exclusivité »
                  affichées sur les vignettes et les fiches produit.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={statusBadgesOn}
                  onCheckedChange={(v) => updateDesignSettings({ showProductStatusBadges: v } as any)}
                />
                <Label className="text-sm">{statusBadgesOn ? 'Affichés' : 'Masqués partout'}</Label>
              </div>
            </CardHeader>
          </Card>


          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="admin-tabs-scroll w-full h-auto">
              <TabsTrigger value="default">Défaut</TabsTrigger>
              <TabsTrigger value="categories">
                Par catégorie
                {existingCatKeys.length > 0 && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                    {existingCatKeys.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="default" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Badges par défaut</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Appliqués à tous les produits qui n'ont pas de personnalisation de catégorie
                    ({products.length - productCategories.reduce((a, c) => a + (existingCatKeys.some((k) => normalizeCategoryKey(k) === c.key) ? countForCatKey(c.key) : 0), 0)} produits concernés).
                  </p>
                </CardHeader>
                <CardContent>
                  <BadgeList
                    badges={cfg.default || []}
                    onUpdate={setDefault}
                    canReset
                    onReset={() => setDefault(DEFAULT_TRUST_BADGES.map((b) => ({ ...b, id: uid() })))}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personnalisation par catégorie</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Écrase les badges par défaut lorsque la catégorie du produit correspond (insensible à la casse et aux accents).
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Label className="text-xs">Ajouter :</Label>
                    <Select
                      value={newCatKey}
                      onValueChange={(v) => {
                        setNewCatKey(v);
                        addCat(v);
                      }}
                    >
                      <SelectTrigger className="w-56 h-8">
                        <SelectValue placeholder="Choisir une catégorie existante…" />
                      </SelectTrigger>
                      <SelectContent>
                        {productCategories.map((c) => (
                          <SelectItem key={c.key} value={c.key}>
                            {c.label} ({countForCatKey(c.key)} produits)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">ou raccourci :</span>
                    <div className="flex flex-wrap gap-1">
                      {suggested.map((s) => (
                        <Button
                          key={s}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => addCat(s)}
                        >
                          + {s}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {existingCatKeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-6 text-center border border-dashed border-border rounded-md">
                      Aucune personnalisation. Ajoute une catégorie ci-dessus pour lui donner ses propres badges.
                    </p>
                  ) : (
                    <Tabs value={activeCat} onValueChange={setActiveCat}>
                      <TabsList className="flex-wrap h-auto admin-tabs-scroll w-full h-auto">
                        {existingCatKeys.map((k) => {
                          const count = countForCatKey(k);
                          return (
                            <TabsTrigger key={k} value={k} className="capitalize gap-1.5">
                              {k}
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  count > 0 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                                }`}
                                title={count > 0 ? `${count} produit(s)` : 'Aucun produit ne correspond'}
                              >
                                {count}
                              </span>
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>
                      {existingCatKeys.map((k) => (
                        <TabsContent key={k} value={k} className="mt-4 space-y-3">
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Ces badges remplacent le défaut pour tout produit dont la catégorie correspond à{' '}
                              <strong className="capitalize">{k}</strong>.
                              {countForCatKey(k) === 0 && (
                                <span className="ml-2 text-destructive">⚠ Aucun produit ne correspond actuellement.</span>
                              )}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openSampleProduct(k)}
                                disabled={countForCatKey(k) === 0}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" /> Voir un produit
                              </Button>
                              <Button type="button" size="sm" variant="destructive" onClick={() => removeCat(k)}>
                                <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                              </Button>
                            </div>
                          </div>
                          <BadgeList
                            badges={cfg.byCategory?.[k] || []}
                            onUpdate={(list) => setForCat(k, list)}
                            showCopy
                            onCopyFromDefault={() =>
                              setForCat(k, (cfg.default || DEFAULT_TRUST_BADGES).map((b) => ({ ...b, id: uid() })))
                            }
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Colonne aperçu en direct */}
        <div className="lg:sticky lg:top-4 h-fit space-y-3">
          <Card className="border-primary/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Aperçu en direct
                </CardTitle>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Rendu identique à la page produit. Se met à jour instantanément.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Prévisualiser comme</Label>
                <Select value={previewSimulatedCat} onValueChange={(v) => setPreviewCat(v === '__default__' ? '' : v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Produit sans catégorie surchargée (Défaut)</SelectItem>
                    {productCategories.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label} ({countForCatKey(c.key)} produits)
                      </SelectItem>
                    ))}
                    {existingCatKeys
                      .filter((k) => !productCategories.some((c) => c.key === normalizeCategoryKey(k)))
                      .map((k) => (
                        <SelectItem key={`custom-${k}`} value={k}>
                          {k} (personnalisée)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <BadgePreview
                settings={{ productTrustBadges: cfg }}
                simulateCategory={previewSimulatedCat === '__default__' ? '' : previewSimulatedCat}
              />
              <p className="text-[10px] text-muted-foreground text-center">
                {status === 'saving' ? '⏳ Sauvegarde en cours…' : '✓ Toute modification est déjà en ligne'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
