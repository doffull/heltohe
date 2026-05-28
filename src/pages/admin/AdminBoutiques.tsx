import { useState, useRef } from 'react';
import { useBoutiques, useUpsertBoutique, useDeleteBoutique, Boutique } from '@/hooks/useBoutiques';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, MapPin, Loader2, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AICandidate {
  placeId: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  image: string | null;
}

const emptyBoutique: Partial<Boutique> = {
  name: '', address: '', city: '', postalCode: '', country: 'France',
  latitude: 48.8566, longitude: 2.3522, image: '', sortOrder: 0, isActive: true,
};

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const r = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    const j = await r.json();
    if (Array.isArray(j) && j[0]) return { lat: Number(j[0].lat), lng: Number(j[0].lon) };
  } catch { /* noop */ }
  return null;
}

export default function AdminBoutiques() {
  const { data: boutiques = [], isLoading } = useBoutiques(true);
  const upsert = useUpsertBoutique();
  const del = useDeleteBoutique();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Boutique>>(emptyBoutique);
  const [geocoding, setGeocoding] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [candidates, setCandidates] = useState<AICandidate[]>([]);
  const debounceRef = useRef<number | null>(null);

  function startNew() {
    setForm({ ...emptyBoutique });
    setCandidates([]);
    setOpen(true);
  }
  function startEdit(b: Boutique) {
    setForm({ ...b });
    setCandidates([]);
    setOpen(true);
  }

  async function aiLookup(query: string) {
    if (!query || query.trim().length < 3) {
      setCandidates([]);
      return;
    }
    setAiSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('boutique-lookup', { body: { query } });
      if (error) throw error;
      const list = (data?.candidates || []) as AICandidate[];
      setCandidates(list);
      if (list.length === 0) toast.info('Aucun résultat trouvé');
    } catch (e: any) {
      toast.error('Recherche IA échouée', { description: e.message });
    } finally {
      setAiSearching(false);
    }
  }

  function onNameChange(value: string) {
    setForm((f) => ({ ...f, name: value }));
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (value.trim().length >= 4 && !form.id) {
      debounceRef.current = window.setTimeout(() => aiLookup(value), 800);
    } else {
      setCandidates([]);
    }
  }

  function pickCandidate(c: AICandidate) {
    setForm((f) => ({
      ...f,
      name: c.name,
      address: c.address,
      postalCode: c.postalCode,
      city: c.city,
      country: c.country || 'France',
      latitude: c.lat,
      longitude: c.lng,
      image: c.image || f.image,
    }));
    setCandidates([]);
    toast.success('Boutique trouvée ✨');
  }

  async function doGeocode() {
    if (!form.address || !form.city) {
      toast.error('Renseignez adresse + ville d\'abord');
      return;
    }
    setGeocoding(true);
    const r = await geocode(`${form.address}, ${form.postalCode || ''} ${form.city}, ${form.country || 'France'}`);
    setGeocoding(false);
    if (r) {
      setForm((f) => ({ ...f, latitude: r.lat, longitude: r.lng }));
      toast.success('Coordonnées GPS trouvées');
    } else {
      toast.error('Adresse introuvable — saisissez lat/lng à la main');
    }
  }

  async function save() {
    if (!form.name || !form.address || !form.city) {
      toast.error('Nom, adresse et ville requis');
      return;
    }
    try {
      await upsert.mutateAsync(form as any);
      toast.success(form.id ? 'Boutique mise à jour' : 'Boutique créée');
      setOpen(false);
    } catch (e: any) {
      toast.error('Erreur', { description: e.message });
    }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette boutique ?')) return;
    try {
      await del.mutateAsync(id);
      toast.success('Supprimée');
    } catch (e: any) {
      toast.error('Erreur', { description: e.message });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-wider hud-text uppercase">Boutiques</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez vos magasins permanents et boutiques éphémères.</p>
        </div>
        <Button onClick={startNew} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle boutique</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : boutiques.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">Aucune boutique. Cliquez sur "Nouvelle boutique" pour commencer.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boutiques.map((b) => (
            <Card key={b.id} className={!b.isActive ? 'opacity-50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{b.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(b)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground space-y-1">
                <div className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 mt-0.5" /><span>{b.address}<br/>{b.postalCode} {b.city}</span></div>
                <div className="text-xs">GPS : {b.latitude.toFixed(5)}, {b.longitude.toFixed(5)}</div>
                {!b.isActive && <div className="text-xs text-amber-600">Inactive</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier la boutique' : 'Nouvelle boutique'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nom de la boutique ou centre commercial</Label>
              <div className="flex gap-2">
                <Input
                  value={form.name || ''}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Ex : Galeries Lafayette Haussmann"
                />
                {!form.id && (
                  <Button type="button" variant="outline" size="icon" onClick={() => aiLookup(form.name || '')} disabled={aiSearching} title="Rechercher avec l'IA">
                    {aiSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              {candidates.length > 0 && (
                <div className="mt-2 border border-border rounded-md divide-y divide-border bg-card">
                  {candidates.map((c) => (
                    <button
                      key={c.placeId}
                      type="button"
                      onClick={() => pickCandidate(c)}
                      className="w-full text-left p-2 hover:bg-accent transition-colors text-sm"
                    >
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.address}{c.address && c.postalCode ? ' — ' : ''}{c.postalCode} {c.city}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div><Label>Adresse</Label><Input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Code postal</Label><Input value={form.postalCode || ''} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></div>
              <div><Label>Ville</Label><Input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            </div>
            <div><Label>Pays</Label><Input value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <Button type="button" variant="outline" size="sm" onClick={doGeocode} disabled={geocoding} className="gap-2 w-full">
              {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Retrouver les coordonnées GPS manuellement
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Latitude</Label><Input type="number" step="0.000001" value={form.latitude ?? ''} onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })} /></div>
              <div><Label>Longitude</Label><Input type="number" step="0.000001" value={form.longitude ?? ''} onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })} /></div>
            </div>
            <div><Label>Image (URL)</Label><Input value={form.image || ''} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-2 items-end">
              <div><Label>Ordre</Label><Input type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} /></div>
              <div className="flex items-center gap-2 pb-2"><Switch checked={form.isActive ?? true} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /><Label>Active</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
