import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useHomeFabButtons, useHomeFabMutations } from '@/hooks/useHomeFabButtons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconPicker, getIcon } from '@/components/admin/IconPicker';
import { Plus, Trash2, Copy, ChevronUp, ChevronDown, Sparkles, Save, Loader2, ExternalLink } from 'lucide-react';
import { UnifiedFabEditor } from '@/components/admin/UnifiedFabEditor';
import { HomeBlocksEditor } from '@/components/admin/HomeBlocksEditor';
import { HomeCustomSectionsEditor } from '@/components/admin/HomeCustomSectionsEditor';
import { FabLivePreview } from '@/components/admin/FabLivePreview';
import { toast } from 'sonner';
import type { HomeFabButton } from '@/types';

const VARIANTS = ['glossy','glass','neon','metal','outline','minimal'] as const;
const ACTION_TYPES = [
  { v: 'route', label: 'Page interne' },
  { v: 'external', label: 'URL externe' },
  { v: 'roulette', label: 'Ouvrir Jeu-concours' },
  { v: 'voice', label: 'Ouvrir commande vocale' },
  { v: 'chat', label: 'Ouvrir chat' },
  { v: 'newsletter', label: 'Ouvrir popup newsletter' },
];
const CORNERS = [
  { v: 'tl', label: 'Haut gauche' },
  { v: 'tr', label: 'Haut droite' },
  { v: 'bl', label: 'Bas gauche' },
  { v: 'br', label: 'Bas droite' },
];

const newButton = (sortOrder: number): Partial<HomeFabButton> => ({
  label: 'Nouveau bouton',
  icon: 'Sparkles',
  action_type: 'route',
  action_value: '/',
  variant: 'glossy',
  position_desktop: { corner: 'br', x: 24, y: 24 },
  position_mobile: { corner: 'br', x: 16, y: 16 },
  visible_desktop: true,
  visible_mobile: true,
  sort_order: sortOrder,
  is_active: true,
  badge: '',
});

export default function AdminHomeIcons() {
  const { flushDesignSettings } = useApp();
  const { data: buttons = [], isLoading } = useHomeFabButtons({ adminAll: true });
  const { upsert, remove } = useHomeFabMutations();
  const [editing, setEditing] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  const editingBtn = buttons.find((b) => b.id === editing) || null;

  const handleAdd = async () => {
    const res = await upsert.mutateAsync(newButton(buttons.length));
    setEditing(res.id);
    toast.success('Bouton créé');
  };

  const handleSaveAll = async () => {
    try {
      setSavingAll(true);
      // 1. Demander à tous les éditeurs (UnifiedFab, HomeBlocks, HomeCustomSections) de pousser leur state local
      window.dispatchEvent(new CustomEvent('homeicons:collect'));
      // 2. Laisser React appliquer les setState avant le flush
      await new Promise(r => setTimeout(r, 50));
      // 3. Un seul aller-retour DB
      await flushDesignSettings();
      toast.success('Tous les changements ont été enregistrés');
    } catch (e: any) {
      toast.error("Erreur lors de l'enregistrement global", { description: e?.message });
    } finally {
      setSavingAll(false);
    }
  };

  const handleSave = async (patch: Partial<HomeFabButton>) => {
    if (!editingBtn) return;
    await upsert.mutateAsync({ ...editingBtn, ...patch });
  };

  const move = async (b: HomeFabButton, dir: -1 | 1) => {
    const sorted = [...buttons].sort((a, b) => a.sort_order - b.sort_order);
    const i = sorted.findIndex((x) => x.id === b.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    await upsert.mutateAsync({ ...sorted[i], sort_order: sorted[j].sort_order });
    await upsert.mutateAsync({ ...sorted[j], sort_order: sorted[i].sort_order });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Barre globale sticky : enregistre EN UNE SEULE FOIS toutes les modifs de la page */}
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/95 backdrop-blur border-b flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          💡 Astuce : <strong>« Tout enregistrer »</strong> sauvegarde en une fois les sections, le bouton flottant unifié et l'ordre de la home.
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href="/" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Tester sur la home</a>
          </Button>
          <Button onClick={handleSaveAll} disabled={savingAll} size="sm" className="gap-1.5">
            {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Tout enregistrer
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Icônes flottantes (Page d'accueil)</h1>
          <p className="text-sm text-muted-foreground">Gérez les boutons fixes affichés sur la home (Jeu-concours, Voix, Chat, etc.)</p>
        </div>
        <Button onClick={handleAdd} className="gap-1.5"><Plus className="h-4 w-4" /> Ajouter un bouton</Button>
      </div>

      <section id="sections" style={{ scrollMarginTop: 80 }}><HomeBlocksEditor /></section>
      <section id="custom-sections" style={{ scrollMarginTop: 80 }}><HomeCustomSectionsEditor /></section>
      <section id="unified-fab" style={{ scrollMarginTop: 80 }}><UnifiedFabEditor /></section>
      <FabLivePreview />

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && buttons.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Aucun bouton personnalisé. Les FABs par défaut (Voix · Jeu · Chat) restent affichés. Cliquez « Ajouter » pour personnaliser.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List */}
        <div className="space-y-2">
          {buttons.map((b, i) => {
            const I = getIcon(b.icon);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setEditing(b.id)}
                className={`w-full text-left rounded-lg border p-3 flex items-center gap-3 transition ${editing === b.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
              >
                <div className={`hw-cta-btn hw-cta-v-${b.variant} hw-cta-sz-sm hw-cta-rd-md w-9 h-9 p-0`}>
                  <I className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{b.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{b.action_type} · {b.action_value}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span title="Monter" onClick={(e) => { e.stopPropagation(); move(b, -1); }} className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </span>
                  <span title="Descendre" onClick={(e) => { e.stopPropagation(); move(b, 1); }} className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                  <span title="Dupliquer" onClick={async (e) => { e.stopPropagation(); const { id, ...rest } = b as any; await upsert.mutateAsync({ ...rest, sort_order: buttons.length, label: `${b.label} (copie)` }); }} className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted">
                    <Copy className="h-3.5 w-3.5" />
                  </span>
                  <span title="Supprimer" onClick={async (e) => { e.stopPropagation(); if (confirm('Supprimer ce bouton ?')) { await remove.mutateAsync(b.id); if (editing === b.id) setEditing(null); } }} className="h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {!editingBtn && (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Sélectionnez un bouton à éditer.</CardContent></Card>
          )}
          {editingBtn && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  Édition · {editingBtn.label}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Actif</Label>
                    <Switch checked={editingBtn.is_active} onCheckedChange={(v) => handleSave({ is_active: v })} />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Libellé / aria-label</Label>
                    <Input value={editingBtn.label} onChange={(e) => handleSave({ label: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Badge (optionnel)</Label>
                    <Input value={editingBtn.badge || ''} onChange={(e) => handleSave({ badge: e.target.value })} placeholder="Ex: Jeu, NEW" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Icône</Label>
                    <IconPicker value={editingBtn.icon} onChange={(v) => handleSave({ icon: v })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Variant visuel</Label>
                    <Select value={editingBtn.variant} onValueChange={(v) => handleSave({ variant: v as any })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VARIANTS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Action</Label>
                    <Select value={editingBtn.action_type} onValueChange={(v) => handleSave({ action_type: v as any })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((a) => <SelectItem key={a.v} value={a.v}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valeur (URL / route)</Label>
                    <Input value={editingBtn.action_value} onChange={(e) => handleSave({ action_value: e.target.value })} placeholder="/boutique" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {(['desktop','mobile'] as const).map((dev) => {
                    const key = `position_${dev}` as 'position_desktop' | 'position_mobile';
                    const visKey = `visible_${dev}` as 'visible_desktop' | 'visible_mobile';
                    const p = (editingBtn as any)[key] as { corner: string; x: number; y: number };
                    const setP = (patch: any) => handleSave({ [key]: { ...p, ...patch } } as any);
                    return (
                      <div key={dev} className="rounded-lg border p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase">{dev === 'desktop' ? '🖥️ Desktop' : '📱 Mobile'}</p>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Visible</Label>
                            <Switch checked={(editingBtn as any)[visKey]} onCheckedChange={(v) => handleSave({ [visKey]: v } as any)} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Coin d'ancrage</Label>
                          <Select value={p.corner} onValueChange={(v) => setP({ corner: v })}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CORNERS.map((c) => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] flex justify-between"><span>Décalage X (px)</span><span className="font-mono">{p.x}</span></Label>
                          <Slider value={[p.x]} min={0} max={120} step={1} onValueChange={([v]) => setP({ x: v })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] flex justify-between"><span>Décalage Y (px)</span><span className="font-mono">{p.y}</span></Label>
                          <Slider value={[p.y]} min={0} max={200} step={1} onValueChange={([v]) => setP({ y: v })} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded border bg-muted/30 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  Astuce : un coin d'ancrage <code>br</code> avec X=24 / Y=24 colle le bouton dans le coin bas-droit, à 24 px du bord.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
