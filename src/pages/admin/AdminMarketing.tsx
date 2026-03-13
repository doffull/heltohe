import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBanners, useCreateBanner, useUpdateBanner, useDeleteBanner, BannerRecord } from '@/hooks/useBanners';
import { usePromoCodes, useCreatePromoCode, useUpdatePromoCode, useDeletePromoCode, PromoCode } from '@/hooks/usePromoCodes';
import { useNewsletters, useDeleteNewsletter } from '@/hooks/useNewsletters';
import { useProductStyles, useCreateProductStyle, useUpdateProductStyle, useDeleteProductStyle, ProductStyle } from '@/hooks/useProductStyles';
import { useProducts } from '@/hooks/useProducts';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FileDropZone } from '@/components/admin/FileDropZone';
import { 
  Plus, Trash2, Pencil, Image, Tag, Mail, 
  MoreHorizontal, Megaphone, Palette, Check
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── BANNER FORM ──
function BannerForm({ banner, onSubmit, onCancel }: {
  banner?: BannerRecord;
  onSubmit: (data: Omit<BannerRecord, 'id'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    description: banner?.description || '',
    image: banner?.image || '',
    link: banner?.link || '',
    buttonText: banner?.buttonText || '',
    type: banner?.type || 'hero',
    isActive: banner?.isActive ?? true,
    position: banner?.position || 0,
    startsAt: banner?.startsAt?.slice(0, 16) || '',
    endsAt: banner?.endsAt?.slice(0, 16) || '',
    displayDelay: banner?.displayDelay ?? 2000,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="hud-text text-xs">Titre</Label>
          <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label className="hud-text text-xs">Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hero">Hero</SelectItem>
              <SelectItem value="promo">Promo</SelectItem>
              <SelectItem value="popup">Popup</SelectItem>
              <SelectItem value="sidebar">Sidebar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="hud-text text-xs">Sous-titre</Label>
        <Input value={form.subtitle} onChange={(e) => setForm(p => ({ ...p, subtitle: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label className="hud-text text-xs">Image URL</Label>
        <Input value={form.image} onChange={(e) => setForm(p => ({ ...p, image: e.target.value }))} />
        {form.image && <img src={form.image} alt="Preview" className="h-20 object-cover border border-border" />}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="hud-text text-xs">Lien</Label>
          <Input value={form.link} onChange={(e) => setForm(p => ({ ...p, link: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label className="hud-text text-xs">Texte du bouton</Label>
          <Input value={form.buttonText} onChange={(e) => setForm(p => ({ ...p, buttonText: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="hud-text text-xs">Position</Label>
          <Input type="number" value={form.position} onChange={(e) => setForm(p => ({ ...p, position: Number(e.target.value) }))} />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={form.isActive} onCheckedChange={(v) => setForm(p => ({ ...p, isActive: v }))} />
          <Label className="text-sm">Active</Label>
        </div>
      </div>
      {form.type === 'popup' && (
        <div className="space-y-2">
          <Label className="hud-text text-xs">Délai d'affichage ({(form.displayDelay / 1000).toFixed(1)}s)</Label>
          <Input
            type="number"
            min={0}
            step={500}
            value={form.displayDelay}
            onChange={(e) => setForm(p => ({ ...p, displayDelay: Number(e.target.value) }))}
          />
          <p className="text-xs text-muted-foreground">En millisecondes (2000 = 2 secondes)</p>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit">Enregistrer</Button>
      </div>
    </form>
  );
}

// ── PROMO FORM ──
function PromoForm({ promo, onSubmit, onCancel }: {
  promo?: PromoCode;
  onSubmit: (data: Omit<PromoCode, 'id' | 'usageCount'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    code: promo?.code || '',
    description: promo?.description || '',
    type: promo?.type || 'percentage',
    value: promo?.value || 0,
    minPurchase: promo?.minPurchase || 0,
    maxDiscount: promo?.maxDiscount || undefined as number | undefined,
    usageLimit: promo?.usageLimit || undefined as number | undefined,
    isActive: promo?.isActive ?? true,
    startsAt: promo?.startsAt || undefined as string | undefined,
    expiresAt: promo?.expiresAt || undefined as string | undefined,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="hud-text text-xs">Code *</Label>
          <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} required />
        </div>
        <div className="space-y-2">
          <Label className="hud-text text-xs">Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Pourcentage (%)</SelectItem>
              <SelectItem value="fixed_amount">Montant fixe (€)</SelectItem>
              <SelectItem value="free_shipping">Livraison gratuite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="hud-text text-xs">Description</Label>
        <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="hud-text text-xs">Valeur *</Label>
          <Input type="number" value={form.value} onChange={(e) => setForm(p => ({ ...p, value: Number(e.target.value) }))} required />
        </div>
        <div className="space-y-2">
          <Label className="hud-text text-xs">Achat min. (€)</Label>
          <Input type="number" value={form.minPurchase} onChange={(e) => setForm(p => ({ ...p, minPurchase: Number(e.target.value) }))} />
        </div>
        <div className="space-y-2">
          <Label className="hud-text text-xs">Limite d'usage</Label>
          <Input type="number" value={form.usageLimit || ''} onChange={(e) => setForm(p => ({ ...p, usageLimit: e.target.value ? Number(e.target.value) : undefined }))} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.isActive} onCheckedChange={(v) => setForm(p => ({ ...p, isActive: v }))} />
        <Label className="text-sm">Actif</Label>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit">Enregistrer</Button>
      </div>
    </form>
  );
}

// ── MAIN COMPONENT ──
export default function AdminMarketing() {
  const { toast } = useToast();
  const { data: products = [] } = useProducts();

  // Banners
  const { data: banners = [], isLoading: loadingBanners } = useBanners();
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerRecord | null>(null);

  // Promos
  const { data: promos = [], isLoading: loadingPromos } = usePromoCodes();
  const createPromo = useCreatePromoCode();
  const updatePromo = useUpdatePromoCode();
  const deletePromo = useDeletePromoCode();
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

  // Newsletter
  const { data: subs = [], isLoading: loadingSubs } = useNewsletters();
  const deleteNewsletter = useDeleteNewsletter();

  // Styles
  const { data: styles = [], isLoading: loadingStyles } = useProductStyles();
  const createStyle = useCreateProductStyle();
  const updateStyle = useUpdateProductStyle();
  const deleteStyle = useDeleteProductStyle();
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<ProductStyle | null>(null);
  const [styleForm, setStyleForm] = useState({ name: '', description: '', image: '', productIds: [] as string[], isActive: true });

  // Banner handlers
  const handleBannerSubmit = async (data: Omit<BannerRecord, 'id'>) => {
    try {
      if (editingBanner) {
        await updateBanner.mutateAsync({ ...data, id: editingBanner.id });
      } else {
        await createBanner.mutateAsync(data);
      }
      toast({ title: editingBanner ? 'Bannière mise à jour' : 'Bannière créée' });
      setBannerDialogOpen(false);
      setEditingBanner(null);
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  // Promo handlers
  const handlePromoSubmit = async (data: Omit<PromoCode, 'id' | 'usageCount'>) => {
    try {
      if (editingPromo) {
        await updatePromo.mutateAsync({ ...data, id: editingPromo.id, usageCount: editingPromo.usageCount });
      } else {
        await createPromo.mutateAsync(data);
      }
      toast({ title: editingPromo ? 'Code promo mis à jour' : 'Code promo créé' });
      setPromoDialogOpen(false);
      setEditingPromo(null);
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold hud-text">MARKETING</h1>
        <p className="text-muted-foreground mt-1">Bannières, codes promo et newsletter</p>
      </div>

      <Tabs defaultValue="banners">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="banners" className="gap-2"><Image className="h-4 w-4" />Bannières</TabsTrigger>
          <TabsTrigger value="promos" className="gap-2"><Tag className="h-4 w-4" />Codes Promo</TabsTrigger>
          <TabsTrigger value="newsletter" className="gap-2"><Mail className="h-4 w-4" />Newsletter</TabsTrigger>
        </TabsList>

        {/* ── BANNERS TAB ── */}
        <TabsContent value="banners" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingBanner(null); setBannerDialogOpen(true); }} className="chamfer-hud-sm">
              <Plus className="h-4 w-4 mr-2" />Nouvelle bannière
            </Button>
          </div>
          <div className="chamfer-hud bg-card/50 overflow-hidden">
            {loadingBanners ? (
              <div className="p-12 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
            ) : banners.length === 0 ? (
              <div className="p-12 text-center">
                <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune bannière</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left p-4 text-xs font-bold hud-text">BANNIÈRE</th>
                      <th className="text-left p-4 text-xs font-bold hud-text">TYPE</th>
                      <th className="text-left p-4 text-xs font-bold hud-text">POSITION</th>
                      <th className="text-left p-4 text-xs font-bold hud-text">STATUT</th>
                      <th className="text-right p-4 text-xs font-bold hud-text">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banners.map((b) => (
                      <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {b.image && <img src={b.image} alt="" className="w-16 h-10 object-cover border border-border" />}
                            <div>
                              <p className="font-medium text-sm">{b.title || 'Sans titre'}</p>
                              {b.subtitle && <p className="text-xs text-muted-foreground">{b.subtitle}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4"><span className="text-xs uppercase bg-muted px-2 py-1">{b.type}</span></td>
                        <td className="p-4 text-sm">{b.position}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded ${b.isActive ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                            {b.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingBanner(b); setBannerDialogOpen(true); }}>
                                <Pencil className="h-4 w-4 mr-2" />Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={async () => {
                                if (confirm('Supprimer cette bannière ?')) {
                                  await deleteBanner.mutateAsync(b.id);
                                  toast({ title: 'Bannière supprimée' });
                                }
                              }}>
                                <Trash2 className="h-4 w-4 mr-2" />Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── PROMOS TAB ── */}
        <TabsContent value="promos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingPromo(null); setPromoDialogOpen(true); }} className="chamfer-hud-sm">
              <Plus className="h-4 w-4 mr-2" />Nouveau code promo
            </Button>
          </div>
          <div className="chamfer-hud bg-card/50 overflow-hidden">
            {loadingPromos ? (
              <div className="p-12 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
            ) : promos.length === 0 ? (
              <div className="p-12 text-center">
                <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun code promo</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left p-4 text-xs font-bold hud-text">CODE</th>
                      <th className="text-left p-4 text-xs font-bold hud-text">TYPE</th>
                      <th className="text-right p-4 text-xs font-bold hud-text">VALEUR</th>
                      <th className="text-right p-4 text-xs font-bold hud-text">UTILISATIONS</th>
                      <th className="text-left p-4 text-xs font-bold hud-text">STATUT</th>
                      <th className="text-right p-4 text-xs font-bold hud-text">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promos.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-4"><code className="text-sm font-bold bg-muted px-2 py-1">{p.code}</code></td>
                        <td className="p-4 text-sm capitalize">
                          {p.type === 'percentage' ? 'Pourcentage' : p.type === 'fixed_amount' ? 'Montant fixe' : 'Livraison gratuite'}
                        </td>
                        <td className="p-4 text-right font-bold text-sm">
                          {p.type === 'percentage' ? `${p.value}%` : p.type === 'fixed_amount' ? `${p.value}€` : '—'}
                        </td>
                        <td className="p-4 text-right text-sm">
                          {p.usageCount}{p.usageLimit ? ` / ${p.usageLimit}` : ''}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded ${p.isActive ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                            {p.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingPromo(p); setPromoDialogOpen(true); }}>
                                <Pencil className="h-4 w-4 mr-2" />Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={async () => {
                                if (confirm('Supprimer ce code promo ?')) {
                                  await deletePromo.mutateAsync(p.id);
                                  toast({ title: 'Code promo supprimé' });
                                }
                              }}>
                                <Trash2 className="h-4 w-4 mr-2" />Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── NEWSLETTER TAB ── */}
        <TabsContent value="newsletter" className="space-y-4">
          <div className="chamfer-hud bg-card/50 p-4">
            <div className="flex items-center gap-4">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-bold">{subs.filter(s => s.isSubscribed).length}</p>
                <p className="text-xs text-muted-foreground">Abonnés actifs</p>
              </div>
            </div>
          </div>
          <div className="chamfer-hud bg-card/50 overflow-hidden">
            {loadingSubs ? (
              <div className="p-12 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
            ) : subs.length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun abonné</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left p-4 text-xs font-bold hud-text">EMAIL</th>
                      <th className="text-left p-4 text-xs font-bold hud-text">PRÉNOM</th>
                      <th className="text-left p-4 text-xs font-bold hud-text">INSCRIT LE</th>
                      <th className="text-left p-4 text-xs font-bold hud-text">STATUT</th>
                      <th className="text-right p-4 text-xs font-bold hud-text">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subs.map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-4 text-sm">{s.email}</td>
                        <td className="p-4 text-sm">{s.firstName || '—'}</td>
                        <td className="p-4 text-sm text-muted-foreground">{new Date(s.subscribedAt).toLocaleDateString('fr-FR')}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded ${s.isSubscribed ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                            {s.isSubscribed ? 'Abonné' : 'Désabonné'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                            if (confirm('Supprimer cet abonné ?')) {
                              await deleteNewsletter.mutateAsync(s.id);
                              toast({ title: 'Abonné supprimé' });
                            }
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Banner Dialog */}
      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="hud-text">{editingBanner ? 'MODIFIER LA BANNIÈRE' : 'NOUVELLE BANNIÈRE'}</DialogTitle>
          </DialogHeader>
          <BannerForm banner={editingBanner || undefined} onSubmit={handleBannerSubmit} onCancel={() => setBannerDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Promo Dialog */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="hud-text">{editingPromo ? 'MODIFIER LE CODE PROMO' : 'NOUVEAU CODE PROMO'}</DialogTitle>
          </DialogHeader>
          <PromoForm promo={editingPromo || undefined} onSubmit={handlePromoSubmit} onCancel={() => setPromoDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
