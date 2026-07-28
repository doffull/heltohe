import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check, X, Trash2, MessageSquare, Star, BadgeCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useDesignSettings, useSaveDesignSettings } from '@/hooks/useDesignSettings';

type Row = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  is_verified_purchase: boolean;
  admin_reply: string | null;
  helpful_count: number;
  created_at: string;
  size_purchased?: string | null;
  product_name?: string;
  customer_email?: string;
};

export default function AdminReviews() {
  const { toast } = useToast();
  const { data: settings } = useDesignSettings();
  const saveSettings = useSaveDesignSettings();
  const updateSettings = (patch: any) => {
    if (!settings) return;
    saveSettings.mutate({ ...settings, ...patch } as any);
  };
  const saving = saveSettings.isPending;
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected' | 'config'>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

  const trustpilot = (settings as any)?.trustpilot ?? { enabled: false, businessUnitId: '', domain: '', locale: 'fr-FR', showInFooter: true };
  const reviewsSettings = (settings as any)?.reviewsSettings ?? { autoApprove: false, requireVerifiedPurchase: true, showOnProductCards: true };

  const load = async (status: Row['status']) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Row[];
    const productIds = Array.from(new Set(list.map((r) => r.product_id)));
    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    const [{ data: prods }, { data: custs }] = await Promise.all([
      productIds.length ? supabase.from('products').select('id,name').in('id', productIds) : Promise.resolve({ data: [] as any[] }),
      userIds.length ? supabase.from('customers').select('user_id,email').in('user_id', userIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const pMap = new Map((prods ?? []).map((p: any) => [p.id, p.name]));
    const cMap = new Map((custs ?? []).map((c: any) => [c.user_id, c.email]));
    setRows(list.map((r) => ({ ...r, product_name: pMap.get(r.product_id), customer_email: cMap.get(r.user_id) })));
    setLoading(false);
  };

  useEffect(() => {
    if (tab !== 'config') load(tab);
  }, [tab]);

  const setStatus = async (id: string, status: Row['status']) => {
    const { error } = await supabase.from('product_reviews').update({ status }).eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast({ title: 'Mis à jour', description: `Avis ${status === 'approved' ? 'approuvé' : status === 'rejected' ? 'refusé' : 'en attente'}` });
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cet avis ?')) return;
    const { error } = await supabase.from('product_reviews').delete().eq('id', id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const saveReply = async (id: string) => {
    const reply = (replyDraft[id] ?? '').trim();
    const { error } = await supabase
      .from('product_reviews')
      .update({ admin_reply: reply || null, admin_reply_at: reply ? new Date().toISOString() : null })
      .eq('id', id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: 'Réponse enregistrée' });
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, admin_reply: reply || null } : r)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold hud-text uppercase">Avis clients</h1>
        <p className="text-muted-foreground text-sm mt-1">Modération des avis et intégration Trustpilot.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">En attente</TabsTrigger>
          <TabsTrigger value="approved">Publiés</TabsTrigger>
          <TabsTrigger value="rejected">Refusés</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <TabsContent key={s} value={s} className="mt-4">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground text-center py-16">Aucun avis.</p>
            ) : (
              <div className="space-y-4">
                {rows.map((r) => (
                  <Card key={r.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap justify-between gap-2 items-start">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                              ))}
                            </div>
                            {r.title && <span>{r.title}</span>}
                            {r.is_verified_purchase && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                <BadgeCheck className="h-3 w-3" />Vérifié
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            <span className="font-medium">{r.product_name ?? r.product_id}</span> ·{' '}
                            <span>{r.customer_email ?? r.user_id.slice(0, 8)}</span> ·{' '}
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                            {r.size_purchased && <> · Taille {r.size_purchased}</>}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {s !== 'approved' && (
                            <Button size="sm" onClick={() => setStatus(r.id, 'approved')}><Check className="h-4 w-4 mr-1" />Approuver</Button>
                          )}
                          {s !== 'rejected' && (
                            <Button size="sm" variant="outline" onClick={() => setStatus(r.id, 'rejected')}><X className="h-4 w-4 mr-1" />Refuser</Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm whitespace-pre-wrap">{r.comment}</p>
                      <div className="pt-3 border-t">
                        <Label className="text-xs uppercase tracking-wider flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />Réponse de la boutique
                        </Label>
                        <Textarea
                          rows={2}
                          className="mt-2"
                          defaultValue={r.admin_reply ?? ''}
                          onChange={(e) => setReplyDraft((p) => ({ ...p, [r.id]: e.target.value }))}
                        />
                        <Button size="sm" variant="secondary" className="mt-2" onClick={() => saveReply(r.id)}>
                          Enregistrer la réponse
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}

        <TabsContent value="config" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Avis internes</CardTitle>
              <CardDescription>Paramètres de modération et d'affichage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Approbation automatique</Label>
                  <p className="text-xs text-muted-foreground">Publier les avis sans modération manuelle.</p>
                </div>
                <Switch
                  checked={!!reviewsSettings.autoApprove}
                  onCheckedChange={(v) => updateSettings({ reviewsSettings: { ...reviewsSettings, autoApprove: v } })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Achat vérifié requis</Label>
                  <p className="text-xs text-muted-foreground">Seuls les clients ayant reçu le produit peuvent noter.</p>
                </div>
                <Switch
                  checked={reviewsSettings.requireVerifiedPurchase !== false}
                  onCheckedChange={(v) => updateSettings({ reviewsSettings: { ...reviewsSettings, requireVerifiedPurchase: v } })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Note visible sur les fiches produit</Label>
                  <p className="text-xs text-muted-foreground">Afficher la moyenne et le nombre d'avis sur les cartes.</p>
                </div>
                <Switch
                  checked={reviewsSettings.showOnProductCards !== false}
                  onCheckedChange={(v) => updateSettings({ reviewsSettings: { ...reviewsSettings, showOnProductCards: v } })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trustpilot</CardTitle>
              <CardDescription>Renseignez votre Business Unit ID pour afficher vos avis Trustpilot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Activer Trustpilot</Label>
                <Switch
                  checked={!!trustpilot.enabled}
                  onCheckedChange={(v) => updateSettings({ trustpilot: { ...trustpilot, enabled: v } })}
                />
              </div>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="tp-bu">Business Unit ID</Label>
                  <Input
                    id="tp-bu"
                    value={trustpilot.businessUnitId ?? ''}
                    onChange={(e) => updateSettings({ trustpilot: { ...trustpilot, businessUnitId: e.target.value } })}
                    placeholder="ex. 5d1234abcd1234ef56789012"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Dans Trustpilot Business : Intégrations → TrustBoxes → paramètre <code>data-businessunit-id</code>.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tp-domain">Domaine</Label>
                    <Input
                      id="tp-domain"
                      value={trustpilot.domain ?? ''}
                      onChange={(e) => updateSettings({ trustpilot: { ...trustpilot, domain: e.target.value } })}
                      placeholder="mondomaine.fr"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tp-locale">Locale</Label>
                    <Input
                      id="tp-locale"
                      value={trustpilot.locale ?? 'fr-FR'}
                      onChange={(e) => updateSettings({ trustpilot: { ...trustpilot, locale: e.target.value } })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Afficher le mini-widget dans le footer</Label>
                  <Switch
                    checked={trustpilot.showInFooter !== false}
                    onCheckedChange={(v) => updateSettings({ trustpilot: { ...trustpilot, showInFooter: v } })}
                  />
                </div>
              </div>
              {saving && <p className="text-xs text-muted-foreground">Sauvegarde…</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
