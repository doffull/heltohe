import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileDropZone } from '@/components/admin/FileDropZone';
import { Plus, Pencil, Trash2, Bell } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAllNewsletterPopups,
  useUpsertNewsletterPopup,
  useDeleteNewsletterPopup,
  type NewsletterPopup,
} from '@/hooks/useNewsletterPopups';
import { useApp } from '@/context/AppContext';

const TRIGGERS = [
  { value: 'on_load', label: 'Au chargement' },
  { value: 'delay', label: 'Après délai' },
  { value: 'scroll_50', label: 'Scroll 50%' },
  { value: 'exit_intent', label: 'Intention de sortie' },
];

function emptyForm(): Partial<NewsletterPopup> {
  return {
    name: '', title: 'Rejoignez-nous', subtitle: '-10% sur votre première commande',
    cta_label: "Je m'inscris", image_url: '', display_trigger: 'delay',
    delay_seconds: 5, frequency_days: 7, is_active: true,
    bg_color: '#000000', text_color: '#ffffff', sort_order: 0,
  };
}

export function NewsletterPopupsManager() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp() as any;
  const { data: popups = [], isLoading } = useAllNewsletterPopups();
  const upsert = useUpsertNewsletterPopup();
  const del = useDeleteNewsletterPopup();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<NewsletterPopup>>(emptyForm());

  const startCreate = () => { setForm(emptyForm()); setOpen(true); };
  const startEdit = (p: NewsletterPopup) => { setForm(p); setOpen(true); };

  const save = async () => {
    if (!form.name || !form.title) { toast.error('Nom et titre requis'); return; }
    try {
      await upsert.mutateAsync(form);
      toast.success('Pop-up enregistrée');
      setOpen(false);
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
  };

  return (
    <div className="space-y-6">
      {/* Sidebar newsletter toggle */}
      <div className="chamfer-hud bg-card/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-sm uppercase tracking-wider">Newsletter dans la sidebar</p>
            <p className="text-xs text-muted-foreground">Affiche un mini-formulaire en bas du panneau latéral</p>
          </div>
          <Switch
            checked={!!designSettings.showSidebarNewsletter}
            onCheckedChange={(v) => updateDesignSettings({ showSidebarNewsletter: v })}
          />
        </div>
        {designSettings.showSidebarNewsletter && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Titre</Label>
              <Input value={designSettings.sidebarNewsletterTitle || ''}
                onChange={(e) => updateDesignSettings({ sidebarNewsletterTitle: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Bouton</Label>
              <Input value={designSettings.sidebarNewsletterCta || ''}
                onChange={(e) => updateDesignSettings({ sidebarNewsletterCta: e.target.value })} />
            </div>
            <Button size="sm" variant="outline" className="md:col-span-2" onClick={() => flushDesignSettings?.()}>
              Enregistrer
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-sm uppercase tracking-wider">Pop-ups Newsletter</p>
          <p className="text-xs text-muted-foreground">Modales déclenchées au chargement, scroll, délai…</p>
        </div>
        <Button onClick={startCreate} size="sm"><Plus className="h-4 w-4 mr-2" />Nouvelle</Button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Chargement…</div>
      ) : popups.length === 0 ? (
        <div className="chamfer-hud bg-card/50 p-12 text-center">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Aucune pop-up</p>
        </div>
      ) : (
        <div className="space-y-2">
          {popups.map((p) => (
            <div key={p.id} className="chamfer-hud bg-card/50 p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {p.title} · {p.display_trigger} · {p.is_active ? 'Actif' : 'Inactif'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                if (confirm('Supprimer ?')) { await del.mutateAsync(p.id); toast.success('Supprimée'); }
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pop-up Newsletter</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nom interne</Label>
              <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Titre</Label>
              <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Sous-titre</Label>
              <Textarea value={form.subtitle || ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div>
              <Label>Texte du bouton</Label>
              <Input value={form.cta_label || ''} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
            </div>
            <div>
              <Label>Image (optionnel)</Label>
              <FileDropZone currentFile={form.image_url || ''} onUpload={(url) => setForm({ ...form, image_url: url })} accept={['image']} folder="newsletter-popups" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Déclencheur</Label>
                <Select value={form.display_trigger || 'delay'} onValueChange={(v) => setForm({ ...form, display_trigger: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Délai (s)</Label>
                <Input type="number" value={form.delay_seconds ?? 5} onChange={(e) => setForm({ ...form, delay_seconds: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Fréquence (jours)</Label>
                <Input type="number" value={form.frequency_days ?? 7} onChange={(e) => setForm({ ...form, frequency_days: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Ordre</Label>
                <Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Couleur fond</Label>
                <Input type="color" value={form.bg_color || '#000000'} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} />
              </div>
              <div>
                <Label>Couleur texte</Label>
                <Input type="color" value={form.text_color || '#ffffff'} onChange={(e) => setForm({ ...form, text_color: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Actif</Label>
              <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={save}>Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
