import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDropZone } from '@/components/admin/FileDropZone';
import { PopupCanvasEditor } from '@/components/admin/popups/PopupCanvasEditor';
import { PopupLayerInspector } from '@/components/admin/popups/PopupLayerInspector';
import { InstallAppAnalytics } from '@/components/admin/popups/InstallAppAnalytics';

import {
  useAllPopupCampaigns,
  useUpsertPopupCampaign,
  useDeletePopupCampaign,
  usePopupStats,
} from '@/hooks/usePopupCampaigns';
import {
  POPUP_FORMATS,
  POPUP_TEMPLATES,
  POPUP_TRIGGERS,
  POPUP_TYPES,
  emptyCampaign,
  newLayer,
  type PopupCampaign,
  type PopupLayer,
  type PopupLayerKind,
} from '@/types/popups';
import {
  Plus, Trash2, Pencil, Copy, Monitor, Smartphone, Type, Image as ImageIcon,
  Video, MousePointerClick, Mail, Timer, Ticket, ArrowUp, ArrowDown, Eye,
} from 'lucide-react';
import { toast } from 'sonner';

const LAYER_BUTTONS: { kind: PopupLayerKind; label: string; Icon: any }[] = [
  { kind: 'text', label: 'Texte', Icon: Type },
  { kind: 'image', label: 'Image/GIF', Icon: ImageIcon },
  { kind: 'video', label: 'Vidéo', Icon: Video },
  { kind: 'button', label: 'Bouton', Icon: MousePointerClick },
  { kind: 'email', label: 'Newsletter', Icon: Mail },
  { kind: 'countdown', label: 'Compte à rebours', Icon: Timer },
  { kind: 'promo', label: 'Code promo', Icon: Ticket },
];

const PAGES = [
  { value: 'all', label: 'Toutes les pages' },
  { value: 'home', label: 'Accueil' },
  { value: 'shop', label: 'Boutique' },
  { value: 'product', label: 'Fiche produit' },
  { value: 'cart', label: 'Panier' },
  { value: 'checkout', label: 'Paiement' },
];

export default function AdminPopups() {
  const { data: campaigns = [], isLoading } = useAllPopupCampaigns();
  const { data: stats = {} } = usePopupStats();
  const upsert = useUpsertPopupCampaign();
  const del = useDeletePopupCampaign();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<PopupCampaign>>(emptyCampaign());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  const selected = useMemo(
    () => (form.layers || []).find((l) => l.id === selectedId) || null,
    [form.layers, selectedId],
  );

  const patch = (p: Partial<PopupCampaign>) => setForm((f) => ({ ...f, ...p }));
  const setLayers = (layers: PopupLayer[]) => patch({ layers });

  const addLayer = (kind: PopupLayerKind) => {
    const l = newLayer(kind);
    setLayers([...(form.layers || []), { ...l, z: (form.layers?.length || 0) + 1 }]);
    setSelectedId(l.id);
  };

  const updateLayer = (id: string, p: Partial<PopupLayer>) =>
    setLayers((form.layers || []).map((l) => (l.id === id ? { ...l, ...p } : l)));

  const removeLayer = (id: string) => {
    setLayers((form.layers || []).filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateLayer = (l: PopupLayer) => {
    const copy = { ...l, id: Math.random().toString(36).slice(2, 9), y: Math.min(92, l.y + 5) };
    setLayers([...(form.layers || []), copy]);
    setSelectedId(copy.id);
  };

  const moveLayer = (index: number, dir: -1 | 1) => {
    const arr = [...(form.layers || [])];
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    setLayers(arr.map((l, i) => ({ ...l, z: i + 1 })));
  };

  const startCreate = (templateKey?: string) => {
    const tpl = POPUP_TEMPLATES.find((t) => t.key === templateKey);
    setForm({ ...emptyCampaign(), ...(tpl?.build() || {}), name: tpl ? `${tpl.label}` : '' });
    setSelectedId(null);
    setOpen(true);
  };

  const startEdit = (c: PopupCampaign) => {
    setForm(c);
    setSelectedId(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) {
      toast.error('Donnez un nom à la campagne');
      return;
    }
    try {
      await upsert.mutateAsync(form);
      toast.success('Campagne enregistrée');
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    }
  };

  const targeting = form.targeting || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider">Studio Pop-ups</h1>
          <p className="text-xs text-muted-foreground">
            Promos, nouveautés, newsletter, chatbot, commande vocale, installation de l’app.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {POPUP_TEMPLATES.map((t) => (
            <Button key={t.key} size="sm" variant="outline" onClick={() => startCreate(t.key)}>
              {t.label}
            </Button>
          ))}
          <Button size="sm" onClick={() => startCreate()}>
            <Plus className="mr-2 h-4 w-4" />Vierge
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Chargement…</div>
      ) : campaigns.length === 0 ? (
        <div className="chamfer-hud bg-card/50 p-12 text-center text-sm text-muted-foreground">
          Aucune campagne. Choisissez un modèle ci-dessus pour commencer.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => {
            const s = (stats as any)[c.id] || { view: 0, click: 0, convert: 0 };
            return (
              <div key={c.id} className="chamfer-hud space-y-3 bg-card/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold uppercase tracking-wide">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {POPUP_TYPES.find((t) => t.value === c.type)?.label} ·{' '}
                      {POPUP_TRIGGERS.find((t) => t.value === c.display_trigger)?.label}
                    </p>
                  </div>
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={async (v) => {
                      await upsert.mutateAsync({ id: c.id, is_active: v });
                    }}
                  />
                </div>
                <div className="pointer-events-none max-h-40 overflow-hidden border border-border/50">
                  <PopupCanvasEditor
                    campaign={c}
                    selectedId={null}
                    onSelect={() => {}}
                    onUpdateLayer={() => {}}
                    device="mobile"
                  />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{s.view}</span>
                  <span>clics {s.click}</span>
                  <span>conv. {s.convert}</span>
                  <span className="ml-auto">P{c.priority}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(c)}>
                    <Pencil className="mr-1 h-3 w-3" />Éditer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const { id, ...rest } = c as any;
                      await upsert.mutateAsync({ ...rest, name: `${c.name} (copie)`, is_active: false });
                      toast.success('Dupliquée');
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={async () => {
                      if (confirm('Supprimer cette campagne ?')) {
                        await del.mutateAsync(c.id);
                        toast.success('Supprimée');
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[95vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wider">Éditeur de pop-up</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Canvas + calques */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {LAYER_BUTTONS.map(({ kind, label, Icon }) => (
                  <Button key={kind} size="sm" variant="outline" onClick={() => addLayer(kind)}>
                    <Icon className="mr-1 h-3 w-3" />{label}
                  </Button>
                ))}
                <div className="ml-auto flex gap-1">
                  <Button size="icon" variant={device === 'desktop' ? 'default' : 'outline'} onClick={() => setDevice('desktop')}>
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant={device === 'mobile' ? 'default' : 'outline'} onClick={() => setDevice('mobile')}>
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <PopupCanvasEditor
                campaign={form}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onUpdateLayer={updateLayer}
                device={device}
              />

              <div className="space-y-1">
                {(form.layers || []).map((l, i) => (
                  <div
                    key={l.id}
                    className={`flex items-center gap-2 border px-2 py-1.5 text-xs ${
                      selectedId === l.id ? 'border-primary bg-primary/5' : 'border-border/50'
                    }`}
                  >
                    <button className="flex-1 truncate text-left" onClick={() => setSelectedId(l.id)}>
                      <span className="font-bold uppercase">{l.kind}</span>{' '}
                      <span className="text-muted-foreground">{l.text || l.code || l.src || ''}</span>
                    </button>
                    <button onClick={() => moveLayer(i, -1)} aria-label="Monter"><ArrowUp className="h-3 w-3" /></button>
                    <button onClick={() => moveLayer(i, 1)} aria-label="Descendre"><ArrowDown className="h-3 w-3" /></button>
                    <button onClick={() => duplicateLayer(l)} aria-label="Dupliquer"><Copy className="h-3 w-3" /></button>
                    <button onClick={() => removeLayer(l.id)} aria-label="Supprimer" className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Panneaux */}
            <Tabs defaultValue="layer">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="layer">Calque</TabsTrigger>
                <TabsTrigger value="style">Fond</TabsTrigger>
                <TabsTrigger value="rules">Règles</TabsTrigger>
              </TabsList>

              <TabsContent value="layer" className="mt-4">
                {selected ? (
                  <PopupLayerInspector layer={selected} onChange={(p) => updateLayer(selected.id, p)} />
                ) : (
                  <p className="p-6 text-center text-xs text-muted-foreground">
                    Sélectionnez un calque sur le canvas.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="style" className="mt-4 space-y-4">
                <div>
                  <Label className="text-xs">Nom de la campagne</Label>
                  <Input value={form.name || ''} onChange={(e) => patch({ name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={form.type || 'promo'} onValueChange={(v) => patch({ type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {POPUP_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Format</Label>
                    <Select value={form.format || 'square'} onValueChange={(v) => patch({ format: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {POPUP_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Couleur de fond</Label>
                    <Input
                      type="color"
                      value={form.background?.color || '#000000'}
                      onChange={(e) => patch({ background: { ...form.background, color: e.target.value } })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Dégradé (CSS)</Label>
                    <Input
                      placeholder="linear-gradient(...)"
                      value={form.background?.gradient || ''}
                      onChange={(e) => patch({ background: { ...form.background, gradient: e.target.value } })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Image de fond</Label>
                  <FileDropZone
                    currentFile={form.background?.image || ''}
                    onUpload={(url) => patch({ background: { ...form.background, image: url } })}
                    accept={['image']}
                    folder="popups"
                  />
                </div>
                <div>
                  <Label className="text-xs">Vidéo de fond</Label>
                  <FileDropZone
                    currentFile={form.background?.video || ''}
                    onUpload={(url) => patch({ background: { ...form.background, video: url } })}
                    accept={['video']}
                    folder="popups"
                  />
                </div>
                <div>
                  <Label className="text-xs">Voile noir : {Math.round((form.background?.overlay || 0) * 100)}%</Label>
                  <Slider
                    value={[form.background?.overlay || 0]}
                    min={0}
                    max={0.9}
                    step={0.05}
                    onValueChange={([v]) => patch({ background: { ...form.background, overlay: v } })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Flou du fond : {form.background?.blur || 0}px</Label>
                  <Slider
                    value={[form.background?.blur || 0]}
                    min={0}
                    max={20}
                    step={1}
                    onValueChange={([v]) => patch({ background: { ...form.background, blur: v } })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="rules" className="mt-4 space-y-4">
                <div>
                  <Label className="text-xs">Déclencheur</Label>
                  <Select value={form.display_trigger || 'delay'} onValueChange={(v) => patch({ display_trigger: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POPUP_TRIGGERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Délai (s)</Label>
                    <Input type="number" value={form.delay_seconds ?? 5} onChange={(e) => patch({ delay_seconds: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Scroll (%)</Label>
                    <Input type="number" value={form.scroll_percent ?? 50} onChange={(e) => patch({ scroll_percent: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Inactivité (s)</Label>
                    <Input type="number" value={form.idle_seconds ?? 30} onChange={(e) => patch({ idle_seconds: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Nième visite</Label>
                    <Input type="number" value={form.visit_count ?? 1} onChange={(e) => patch({ visit_count: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Fréquence (jours)</Label>
                    <Input type="number" value={form.frequency_days ?? 7} onChange={(e) => patch({ frequency_days: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Vues max (0 = ∞)</Label>
                    <Input type="number" value={form.max_views ?? 0} onChange={(e) => patch({ max_views: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Priorité</Label>
                    <Input type="number" value={form.priority ?? 0} onChange={(e) => patch({ priority: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Public</Label>
                    <Select
                      value={targeting.audience || 'all'}
                      onValueChange={(v) => patch({ targeting: { ...targeting, audience: v as any } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tout le monde</SelectItem>
                        <SelectItem value="guests">Visiteurs non connectés</SelectItem>
                        <SelectItem value="logged-in">Clients connectés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Pages ciblées</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {PAGES.map((p) => {
                      const list = targeting.pages || ['all'];
                      const on = list.includes(p.value);
                      return (
                        <button
                          key={p.value}
                          onClick={() => {
                            let next = on ? list.filter((x) => x !== p.value) : [...list.filter((x) => x !== 'all'), p.value];
                            if (p.value === 'all') next = ['all'];
                            if (next.length === 0) next = ['all'];
                            patch({ targeting: { ...targeting, pages: next } });
                          }}
                          className={`border px-2 py-1 text-[10px] uppercase ${on ? 'border-primary bg-primary/10' : 'border-border'}`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Appareils</Label>
                  <div className="mt-1 flex gap-1">
                    {(['mobile', 'desktop'] as const).map((d) => {
                      const list = targeting.devices || ['mobile', 'desktop'];
                      const on = list.includes(d);
                      return (
                        <button
                          key={d}
                          onClick={() => {
                            const next = on ? list.filter((x) => x !== d) : [...list, d];
                            patch({ targeting: { ...targeting, devices: next.length ? next : ['mobile', 'desktop'] } });
                          }}
                          className={`border px-2 py-1 text-[10px] uppercase ${on ? 'border-primary bg-primary/10' : 'border-border'}`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Début</Label>
                    <Input
                      type="datetime-local"
                      value={form.starts_at ? form.starts_at.slice(0, 16) : ''}
                      onChange={(e) => patch({ starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Fin</Label>
                    <Input
                      type="datetime-local"
                      value={form.ends_at ? form.ends_at.slice(0, 16) : ''}
                      onChange={(e) => patch({ ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Campagne active</Label>
                  <Switch checked={!!form.is_active} onCheckedChange={(v) => patch({ is_active: v })} />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={upsert.isPending}>
              {upsert.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
