import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Sparkles, Users, Heart, ShoppingBag, Download, RefreshCw, Plus, X, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useShopProducts } from '@/hooks/useShopProducts';
import { useSaveTryOnLook, LookItem } from '@/hooks/useTryOnLooks';
import {
  useMannequins, Mannequin, SKIN_TONES, MORPHOLOGY_LABELS, AGE_LABELS,
  MannequinMorphology, MannequinAge,
} from '@/hooks/useMannequins';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { edgeErrorMessage } from '@/lib/edgeFunctionError';

interface Props {
  product: Product;
  selectedColor?: string | null;
  selectedSize?: string | null;
}

/** Familles d'accessoires / pièces complémentaires proposées pour compléter le look. */
const FAMILIES: { id: string; label: string; keywords: string[] }[] = [
  { id: 'pantalon', label: 'Pantalons', keywords: ['pantalon', 'jean', 'short', 'jogging', 'cargo'] },
  { id: 'chaussures', label: 'Chaussures', keywords: ['chaussure', 'basket', 'sneaker', 'boot', 'botte', 'shoes'] },
  { id: 'bonnet', label: 'Bonnets', keywords: ['bonnet', 'beanie'] },
  { id: 'casquette', label: 'Casquettes', keywords: ['casquette', 'cap', 'chapeau'] },
  { id: 'gants', label: 'Gants', keywords: ['gant', 'glove', 'mitaine'] },
  { id: 'sac', label: 'Sacs', keywords: ['sac', 'bag', 'sacoche', 'backpack'] },
  { id: 'echarpe', label: 'Écharpes', keywords: ['echarpe', 'écharpe', 'snood', 'scarf'] },
];

const norm = (s?: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function familyOf(p: Product): string | null {
  const hay = `${norm(p.category)} ${norm(p.name)} ${norm(p.subtitle)}`;
  for (const f of FAMILIES) {
    if (f.keywords.some((k) => hay.includes(norm(k)))) return f.id;
  }
  return null;
}

interface AppliedItem extends LookItem {}

export default function MannequinTryOn({ product, selectedColor, selectedSize }: Props) {
  const { toast } = useToast();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { data: mannequins = [], isLoading } = useMannequins();
  const { data: catalog = [] } = useShopProducts();
  const saveLook = useSaveTryOnLook();

  const [morphology, setMorphology] = useState<MannequinMorphology | 'all'>('all');
  const [age, setAge] = useState<MannequinAge | 'all'>('all');
  const [skin, setSkin] = useState<string | 'all'>('all');
  const [selected, setSelected] = useState<Mannequin | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedItem[]>([]);
  const [openFamily, setOpenFamily] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      mannequins.filter(
        (m) =>
          (morphology === 'all' || m.morphology === morphology) &&
          (age === 'all' || m.ageRange === age) &&
          (skin === 'all' || m.skinTone === skin),
      ),
    [mannequins, morphology, age, skin],
  );

  const baseItem: AppliedItem = {
    productId: product.id,
    name: product.name,
    price: product.price,
    salePrice: product.salePrice ?? null,
    image: product.image,
    size: selectedSize || null,
    color: selectedColor || null,
    family: familyOf(product),
  };

  const baseFamily = baseItem.family;

  /** Familles disponibles = uniquement celles qui ont au moins un produit en ligne. */
  const suggestions = useMemo(() => {
    const out: { id: string; label: string; products: Product[] }[] = [];
    for (const f of FAMILIES) {
      if (f.id === baseFamily) continue;
      const items = catalog.filter(
        (p) => p.isActive !== false && p.id !== product.id && familyOf(p) === f.id,
      );
      if (items.length) out.push({ id: f.id, label: f.label, products: items.slice(0, 24) });
    }
    return out;
  }, [catalog, baseFamily, product.id]);

  const runGeneration = async (mannequin: Mannequin, layers: AppliedItem[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('virtual-tryon', {
        body: {
          mode: 'mannequin',
          mannequinImage: mannequin.imageUrl,
          mannequinProfile: {
            name: mannequin.name,
            gender: mannequin.gender,
            ageRange: mannequin.ageRange,
            skinTone: mannequin.skinTone,
            morphology: mannequin.morphology,
            heightCm: mannequin.heightCm || undefined,
            fitNotes: mannequin.fitNotes || undefined,
          },
          garments: layers.map((l) => ({
            image: l.image,
            name: l.name,
            category: l.family || undefined,
            color: l.color || undefined,
            size: (l as any).size || undefined,
          })),
          framing: 'full',
          highFidelity: true,
        },
      });
      if (error) throw new Error(await edgeErrorMessage(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      setResultImage((data as any).image);
    } catch (e: any) {
      console.error('[mannequin-tryon] failed:', e);
      toast({
        title: 'Essai impossible',
        description: e?.message || 'Erreur inconnue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const pickMannequin = (m: Mannequin) => {
    setSelected(m);
    setApplied([baseItem]);
    setResultImage(null);
    runGeneration(m, [baseItem]);
  };

  const addLayer = (p: Product) => {
    if (!selected) return;
    const item: AppliedItem = {
      productId: p.id,
      name: p.name,
      price: p.price,
      salePrice: p.salePrice ?? null,
      image: p.image,
      size: p.sizes?.length ? p.sizes[0] : null,
      color: null,
      family: familyOf(p),
    };
    const next = [...applied.filter((a) => a.family !== item.family || a.productId === product.id), item];
    setApplied(next);
    setOpenFamily(null);
    runGeneration(selected, next);
  };

  const removeLayer = (productId: string) => {
    if (!selected || productId === product.id) return;
    const next = applied.filter((a) => a.productId !== productId);
    setApplied(next);
    runGeneration(selected, next);
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: 'Connexion requise', description: 'Connectez-vous pour enregistrer vos essais.' });
      return;
    }
    try {
      await saveLook.mutateAsync({
        title: `${product.name} — ${selected?.name || 'mannequin'}`,
        mannequinId: selected?.id || null,
        baseProductId: product.id,
        items: applied,
        resultImage,
      });
      toast({ title: 'Essai enregistré', description: 'Retrouvez-le dans « Mes essais » de votre compte.' });
    } catch (e: any) {
      toast({ title: 'Enregistrement impossible', description: e?.message, variant: 'destructive' });
    }
  };

  const addLookToCart = async () => {
    for (const it of applied) {
      await addItem({
        productId: it.productId,
        name: it.name,
        price: it.price,
        salePrice: it.salePrice ?? undefined,
        image: it.image,
        size: it.size || undefined,
        color: it.color || undefined,
        quantity: 1,
      });
    }
    toast({ title: 'Look ajouté au panier', description: `${applied.length} article(s) ajouté(s).` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!mannequins.length) {
    return (
      <div className="text-center py-12">
        <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-bold">Aucun mannequin disponible</p>
        <p className="text-xs text-muted-foreground mt-1">Cette option sera bientôt activée.</p>
      </div>
    );
  }

  return (
    <div>
      {!selected && (
        <>
          <h3 className="text-lg font-bold mb-1">Choisissez un mannequin</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Sélectionnez la silhouette la plus proche de la vôtre pour voir le rendu du produit.
          </p>

          {/* Filtres */}
          <div className="space-y-2 mb-4">
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={morphology === 'all'} onClick={() => setMorphology('all')}>Toutes morphologies</FilterChip>
              {(Object.keys(MORPHOLOGY_LABELS) as MannequinMorphology[]).map((m) => (
                <FilterChip key={m} active={morphology === m} onClick={() => setMorphology(m)}>
                  {MORPHOLOGY_LABELS[m]}
                </FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={age === 'all'} onClick={() => setAge('all')}>Tous âges</FilterChip>
              {(Object.keys(AGE_LABELS) as MannequinAge[]).map((a) => (
                <FilterChip key={a} active={age === a} onClick={() => setAge(a)}>{AGE_LABELS[a]}</FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterChip active={skin === 'all'} onClick={() => setSkin('all')}>Toutes carnations</FilterChip>
              {SKIN_TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.label}
                  onClick={() => setSkin(t.id)}
                  className={cn(
                    'h-6 w-6 rounded-full border-2 transition-transform',
                    skin === t.id ? 'border-primary scale-110' : 'border-border',
                  )}
                  style={{ backgroundColor: t.hex }}
                />
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Aucun mannequin ne correspond à ces critères.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickMannequin(m)}
                  className="group chamfer-hud overflow-hidden border border-border bg-card/30 text-left hover:border-primary transition-colors"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-muted/30">
                    <img
                      src={m.imageUrl}
                      alt={m.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-bold uppercase tracking-wider truncate">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {MORPHOLOGY_LABELS[m.morphology]} · {AGE_LABELS[m.ageRange]}
                      {m.heightCm ? ` · ${m.heightCm}cm` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img src={selected.imageUrl} alt={selected.name} className="h-9 w-9 object-cover chamfer-hud-sm" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider truncate">{selected.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {MORPHOLOGY_LABELS[selected.morphology]} · {AGE_LABELS[selected.ageRange]}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => { setSelected(null); setResultImage(null); setApplied([]); }}>
              <RefreshCw className="h-3.5 w-3.5" /> Changer
            </Button>
          </div>

          {/* Rendu */}
          <div className="relative chamfer-hud overflow-hidden bg-card/30 aspect-[3/4] max-h-[420px] mx-auto">
            <img
              src={resultImage || selected.imageUrl}
              alt="Rendu essai"
              className={cn('w-full h-full object-contain transition-opacity', loading && 'opacity-30')}
            />
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/40 backdrop-blur-sm"
                >
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest">Composition du look…</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pièces du look */}
          <div className="flex flex-wrap gap-2">
            {applied.map((it) => (
              <span key={it.productId} className="inline-flex items-center gap-1.5 chamfer-hud-sm border border-border bg-card/40 pl-1 pr-2 py-1">
                <img src={it.image} alt={it.name} className="h-6 w-6 object-cover" />
                <span className="text-[10px] font-bold uppercase tracking-wider max-w-[110px] truncate">{it.name}</span>
                {it.productId !== product.id && (
                  <button type="button" onClick={() => removeLayer(it.productId)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>

          {/* Compléter le look */}
          {suggestions.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-bold uppercase tracking-widest mb-2">Compléter le look</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((f) => (
                  <FilterChip key={f.id} active={openFamily === f.id} onClick={() => setOpenFamily(openFamily === f.id ? null : f.id)}>
                    <Plus className="h-3 w-3 mr-1 inline" />{f.label}
                  </FilterChip>
                ))}
              </div>

              {openFamily && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                  {suggestions.find((f) => f.id === openFamily)?.products.map((p) => {
                    const isOn = applied.some((a) => a.productId === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={loading}
                        onClick={() => addLayer(p)}
                        className={cn(
                          'chamfer-hud-sm border overflow-hidden text-left bg-card/30 hover:border-primary transition-colors disabled:opacity-50',
                          isOn ? 'border-primary' : 'border-border',
                        )}
                      >
                        <div className="aspect-square overflow-hidden relative">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                          {isOn && (
                            <span className="absolute top-1 right-1 bg-primary text-primary-foreground p-0.5">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] p-1 uppercase tracking-wider truncate font-bold">{p.name}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="grid gap-2 sm:grid-cols-3 border-t border-border pt-3">
            <Button variant="outline" className="chamfer-hud-sm gap-2 text-xs" onClick={handleSave} disabled={!resultImage || saveLook.isPending}>
              <Heart className="h-4 w-4" /> Enregistrer
            </Button>
            <Button variant="outline" className="chamfer-hud-sm gap-2 text-xs" asChild disabled={!resultImage}>
              <a href={resultImage || '#'} download="essai-mannequin.png">
                <Download className="h-4 w-4" /> Télécharger
              </a>
            </Button>
            <Button className="chamfer-hud-sm gap-2 text-xs" onClick={addLookToCart} disabled={loading}>
              <ShoppingBag className="h-4 w-4" /> Ajouter le look
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" /> Rendu généré par IA — l'ajustement réel peut varier.
          </p>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'chamfer-hud-sm border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors',
        active ? 'bg-foreground text-background border-foreground' : 'bg-card/30 border-border hover:border-primary',
      )}
    >
      {children}
    </button>
  );
}
