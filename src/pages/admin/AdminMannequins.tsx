import { useState } from 'react';
import { Users, Plus, Pencil, Trash2, Loader2, ImageIcon, Sparkles, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MediaLibraryDialog } from '@/components/visual-editor/MediaLibraryDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useShopProducts } from '@/hooks/useShopProducts';
import {
  useMannequins, useUpsertMannequin, useDeleteMannequin, Mannequin,
  SKIN_TONES, MORPHOLOGY_LABELS, AGE_LABELS, GENDER_LABELS,
  MannequinMorphology, MannequinAge, MannequinGender,
} from '@/hooks/useMannequins';
import { cn } from '@/lib/utils';

const EMPTY: Partial<Mannequin> = {
  name: '',
  imageUrl: '',
  gender: 'unisexe',
  ageRange: 'adulte',
  skinTone: 'medium',
  morphology: 'regular',
  heightCm: 175,
  fitNotes: '',
  sortOrder: 0,
  isActive: true,
};

export default function AdminMannequins() {
  const { data: mannequins = [], isLoading } = useMannequins(true);
  const upsert = useUpsertMannequin();
  const del = useDeleteMannequin();
  const { toast } = useToast();

  const [editing, setEditing] = useState<Partial<Mannequin> | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [testFor, setTestFor] = useState<Mannequin | null>(null);

  const save = async () => {
    if (!editing?.name || !editing.imageUrl) {
      toast({ title: 'Champs requis', description: 'Un nom et un visuel sont nécessaires.', variant: 'destructive' });
      return;
    }
    try {
      await upsert.mutateAsync(editing as any);
      toast({ title: 'Mannequin enregistré' });
      setEditing(null);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold hud-text uppercase tracking-wider flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Mannequins d'essai
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez autant de mannequins que vous voulez (morphologie, âge, carnation). Les clients choisissent
            celui qui leur ressemble pour essayer vos produits.
          </p>
        </div>
        <Button className="gap-2 chamfer-hud-sm" onClick={() => setEditing({ ...EMPTY, sortOrder: mannequins.length })}>
          <Plus className="h-4 w-4" /> Nouveau mannequin
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : mannequins.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-bold text-sm">Aucun mannequin</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ajoutez un premier mannequin pour activer l'essai sur mannequin sur vos fiches produit.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mannequins.map((m) => (
            <div key={m.id} className={cn('border border-border bg-card/40 overflow-hidden', !m.isActive && 'opacity-60')}>
              <div className="aspect-[3/4] bg-muted/30 overflow-hidden">
                <img src={m.imageUrl} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm uppercase tracking-wider truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {GENDER_LABELS[m.gender]} · {AGE_LABELS[m.ageRange]} · {MORPHOLOGY_LABELS[m.morphology]}
                      {m.heightCm ? ` · ${m.heightCm}cm` : ''}
                    </p>
                  </div>
                  <span
                    className="h-5 w-5 rounded-full border border-border shrink-0"
                    style={{ backgroundColor: SKIN_TONES.find((t) => t.id === m.skinTone)?.hex }}
                    title={SKIN_TONES.find((t) => t.id === m.skinTone)?.label}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => setEditing(m)}>
                    <Pencil className="h-3 w-3" /> Modifier
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => setTestFor(m)}>
                    <Sparkles className="h-3 w-3" /> Tester
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-7 gap-1 text-[11px]"
                    onClick={() => upsert.mutate({ id: m.id, isActive: !m.isActive })}
                  >
                    {m.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {m.isActive ? 'Masquer' : 'Activer'}
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="h-7 gap-1 text-[11px] text-destructive"
                    onClick={() => { if (confirm(`Supprimer « ${m.name} » ?`)) del.mutate(m.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="hud-text uppercase tracking-wider text-base">
              {editing?.id ? 'Modifier le mannequin' : 'Nouveau mannequin'}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="hud-text text-xs">Visuel du mannequin</Label>
                {editing.imageUrl ? (
                  <div className="relative aspect-[3/4] max-h-56 mx-auto overflow-hidden border border-border">
                    <img src={editing.imageUrl} alt="" className="w-full h-full object-cover" />
                    <Button
                      size="sm" variant="secondary" className="absolute bottom-2 left-1/2 -translate-x-1/2 h-7 text-[11px]"
                      onClick={() => setMediaOpen(true)}
                    >
                      Changer
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full gap-2" onClick={() => setMediaOpen(true)}>
                    <ImageIcon className="h-4 w-4" /> Choisir / uploader une photo
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Photo en pied, fond neutre, pose droite : meilleur rendu d'ajustement.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="hud-text text-xs">Nom</Label>
                <Input
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Léa — standard 170cm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="hud-text text-xs">Genre</Label>
                  <select
                    value={editing.gender}
                    onChange={(e) => setEditing({ ...editing, gender: e.target.value as MannequinGender })}
                    className="w-full h-9 bg-secondary/50 border border-border/30 px-2 text-sm"
                  >
                    {(Object.keys(GENDER_LABELS) as MannequinGender[]).map((g) => (
                      <option key={g} value={g}>{GENDER_LABELS[g]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="hud-text text-xs">Âge</Label>
                  <select
                    value={editing.ageRange}
                    onChange={(e) => setEditing({ ...editing, ageRange: e.target.value as MannequinAge })}
                    className="w-full h-9 bg-secondary/50 border border-border/30 px-2 text-sm"
                  >
                    {(Object.keys(AGE_LABELS) as MannequinAge[]).map((a) => (
                      <option key={a} value={a}>{AGE_LABELS[a]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="hud-text text-xs">Morphologie</Label>
                  <select
                    value={editing.morphology}
                    onChange={(e) => setEditing({ ...editing, morphology: e.target.value as MannequinMorphology })}
                    className="w-full h-9 bg-secondary/50 border border-border/30 px-2 text-sm"
                  >
                    {(Object.keys(MORPHOLOGY_LABELS) as MannequinMorphology[]).map((m) => (
                      <option key={m} value={m}>{MORPHOLOGY_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="hud-text text-xs">Taille (cm)</Label>
                  <Input
                    type="number"
                    value={editing.heightCm ?? ''}
                    onChange={(e) => setEditing({ ...editing, heightCm: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="hud-text text-xs">Couleur de peau</Label>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TONES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      title={t.label}
                      onClick={() => setEditing({ ...editing, skinTone: t.id })}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition-transform',
                        editing.skinTone === t.id ? 'border-primary scale-110' : 'border-border',
                      )}
                      style={{ backgroundColor: t.hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="hud-text text-xs">Notes d'ajustement IA</Label>
                <Textarea
                  rows={3}
                  value={editing.fitNotes || ''}
                  onChange={(e) => setEditing({ ...editing, fitNotes: e.target.value })}
                  placeholder="Ex. : veste portée ouverte, manches légèrement retroussées, ne pas modifier le fond."
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="hud-text text-xs">Ordre d'affichage</Label>
                  <Input
                    type="number"
                    value={editing.sortOrder ?? 0}
                    onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer h-9">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={editing.isActive ?? true}
                    onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                  />
                  Visible par les clients
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
                <Button onClick={save} disabled={upsert.isPending} className="gap-2">
                  {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MediaLibraryDialog
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        onSelect={(url) => setEditing((prev) => (prev ? { ...prev, imageUrl: url } : prev))}
        title="Visuel du mannequin"
      />

      <MannequinTestDialog mannequin={testFor} onClose={() => setTestFor(null)} />
    </div>
  );
}

/** Aperçu admin : vérifier l'ajustement d'un produit sur un mannequin avant publication. */
function MannequinTestDialog({ mannequin, onClose }: { mannequin: Mannequin | null; onClose: () => void }) {
  const { data: products = [] } = useShopProducts();
  const { toast } = useToast();
  const [productId, setProductId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    const p = products.find((x) => x.id === productId);
    if (!mannequin || !p) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('virtual-tryon', {
        body: {
          mode: 'mannequin',
          mannequinImage: mannequin.imageUrl,
          mannequinProfile: {
            gender: mannequin.gender,
            ageRange: mannequin.ageRange,
            skinTone: mannequin.skinTone,
            morphology: mannequin.morphology,
            heightCm: mannequin.heightCm || undefined,
            fitNotes: mannequin.fitNotes || undefined,
          },
          garments: [{ image: p.image, name: p.name, category: p.category }],
          framing: 'full',
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult((data as any).image);
    } catch (e: any) {
      toast({ title: 'Test impossible', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!mannequin} onOpenChange={(o) => { if (!o) { onClose(); setResult(null); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="hud-text uppercase tracking-wider text-base">Tester l'ajustement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full h-9 bg-secondary/50 border border-border/30 px-2 text-sm"
          >
            <option value="">Choisir un produit…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button className="w-full gap-2" onClick={run} disabled={!productId || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Générer l'aperçu
          </Button>
          <div className="aspect-[3/4] max-h-80 bg-muted/30 border border-border overflow-hidden">
            <img
              src={result || mannequin?.imageUrl}
              alt="Aperçu"
              className={cn('w-full h-full object-contain', loading && 'opacity-40')}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
