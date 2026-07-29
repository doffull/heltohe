import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Trash2, Plus, GripVertical, Copy } from 'lucide-react';
import { TRUST_BADGE_ICONS, TRUST_BADGE_ICON_NAMES, DEFAULT_TRUST_BADGES } from '@/lib/productTrustBadges';
import type { ProductTrustBadge, ProductTrustBadgesConfig } from '@/types';
import { toast } from 'sonner';
import { AdminSaveBar } from '@/components/admin/AdminSaveBar';

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
  title,
  badges,
  onUpdate,
  canReset,
  onReset,
  onCopyFromDefault,
  showCopy,
}: {
  title: string;
  badges: ProductTrustBadge[];
  onUpdate: (list: ProductTrustBadge[]) => void;
  canReset?: boolean;
  onReset?: () => void;
  onCopyFromDefault?: () => void;
  showCopy?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold uppercase tracking-wider">{title}</h4>
        <div className="flex gap-2">
          {showCopy && onCopyFromDefault && (
            <Button type="button" size="sm" variant="outline" onClick={onCopyFromDefault}>
              <Copy className="h-3 w-3 mr-1" /> Copier depuis Défaut
            </Button>
          )}
          {canReset && onReset && (
            <Button type="button" size="sm" variant="outline" onClick={onReset}>Réinitialiser</Button>
          )}
        </div>
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
            Aucun badge configuré — les badges par défaut seront affichés.
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

export default function AdminProductBadges() {
  const { designSettings, updateDesignSettings } = useApp();

  const remoteCfg: ProductTrustBadgesConfig = useMemo(() => {
    return (
      designSettings.productTrustBadges || {
        enabled: true,
        default: DEFAULT_TRUST_BADGES,
        byCategory: {},
      }
    );
  }, [designSettings.productTrustBadges]);

  // Autosave draft — decouples editing from network refetches so clicks never
  // "reset" while a save is in flight.
  const [draft, setDraft] = useState<ProductTrustBadgesConfig>(remoteCfg);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const dirtyRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull remote updates only when we don't have local edits pending.
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

  const categories = designSettings.categories || [];
  // Suggested category keys even if not in categories array
  const suggested = ['homme', 'femme', 'enfant', 'sportwear'];
  const existingCatKeys = Object.keys(cfg.byCategory || {});
  const [activeCat, setActiveCat] = useState<string>(existingCatKeys[0] || suggested[0]);
  const [newCatKey, setNewCatKey] = useState('');

  useEffect(() => {
    if (existingCatKeys.length === 0) return;
    if (!existingCatKeys.includes(activeCat)) setActiveCat(existingCatKeys[0]);
  }, [activeCat, existingCatKeys]);

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
      return;
    }
    commit({
      ...cfg,
      byCategory: {
        ...(cfg.byCategory || {}),
        [key]: cfg.default && cfg.default.length ? cfg.default.map(b => ({ ...b, id: uid() })) : DEFAULT_TRUST_BADGES.map(b => ({ ...b, id: uid() })),
      },
    });
    setActiveCat(key);
    setNewCatKey('');
  };


  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold hud-text uppercase tracking-wider">
            Badges de confiance produit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personnalise les icônes (Livraison, Garantie, Retours…) affichées sur la page produit. Configure un jeu par défaut, puis surcharge pour Homme / Femme / Enfant / Sportwear ou toute autre catégorie.
          </p>
        </div>
        <div
          className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-border bg-muted/40"
          aria-live="polite"
        >
          {status === 'saving' && <span className="text-muted-foreground">Enregistrement…</span>}
          {status === 'saved' && <span className="text-primary">✓ Enregistré</span>}
          {status === 'idle' && <span className="text-muted-foreground">Autosave actif</span>}
        </div>
      </div>


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

      <Tabs defaultValue="default">
        <TabsList>
          <TabsTrigger value="default">Défaut</TabsTrigger>
          <TabsTrigger value="categories">Par catégorie</TabsTrigger>
        </TabsList>

        <TabsContent value="default" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Badges par défaut</CardTitle>
              <p className="text-xs text-muted-foreground">
                Utilisés pour tous les produits qui n'ont pas de personnalisation de catégorie.
              </p>
            </CardHeader>
            <CardContent>
              <BadgeList
                title="Badges par défaut"
                badges={cfg.default || []}
                onUpdate={setDefault}
                canReset
                onReset={() => setDefault(DEFAULT_TRUST_BADGES.map(b => ({ ...b, id: uid() })))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personnalisation par catégorie</CardTitle>
              <p className="text-xs text-muted-foreground">
                Écrase les badges par défaut lorsque la catégorie du produit correspond (correspondance insensible à la casse / accents).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Label className="text-xs">Ajouter une catégorie :</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCatKey}
                    onChange={(e) => setNewCatKey(e.target.value)}
                    placeholder="Ex: homme, femme, enfant…"
                    className="h-8 w-52"
                    list="cat-suggestions"
                  />
                  <datalist id="cat-suggestions">
                    {[...suggested, ...categories.map(c => c.title)].map(s => (
                      <option key={s} value={s.toLowerCase()} />
                    ))}
                  </datalist>
                  <Button type="button" size="sm" onClick={() => addCat(newCatKey)}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 ml-2">
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
                  <TabsList className="flex-wrap h-auto">
                    {existingCatKeys.map((k) => (
                      <TabsTrigger key={k} value={k} className="capitalize">
                        {k}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {existingCatKeys.map((k) => (
                    <TabsContent key={k} value={k} className="mt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Ces badges remplacent le défaut pour tout produit dont la catégorie contient <strong className="capitalize">{k}</strong>.
                        </span>
                        <Button type="button" size="sm" variant="destructive" onClick={() => removeCat(k)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Supprimer cette catégorie
                        </Button>
                      </div>
                      <BadgeList
                        title={`Badges pour "${k}"`}
                        badges={cfg.byCategory?.[k] || []}
                        onUpdate={(list) => setForCat(k, list)}
                        showCopy
                        onCopyFromDefault={() =>
                          setForCat(k, (cfg.default || DEFAULT_TRUST_BADGES).map(b => ({ ...b, id: uid() })))
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
  );
}
