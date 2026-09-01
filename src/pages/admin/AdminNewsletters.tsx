import { useMemo, useState } from 'react';
import { Mail, Send, Trash2, Download, Plus, Users, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useNewsletters,
  useDeleteNewsletter,
  useToggleNewsletterSubscription,
  useNewsletterCampaigns,
  useSaveNewsletterCampaign,
  useDeleteNewsletterCampaign,
  useSendNewsletterCampaign,
  subscriberStatus,
  NewsletterCampaign,
} from '@/hooks/useNewsletters';

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  confirmed: { label: 'Confirmé', icon: CheckCircle2, className: 'bg-green-500/15 text-green-600' },
  pending: { label: 'En attente', icon: Clock, className: 'bg-amber-500/15 text-amber-600' },
  unsubscribed: { label: 'Désabonné', icon: XCircle, className: 'bg-destructive/15 text-destructive' },
};

/** Admin → Newsletters : abonnés (double opt-in) et campagnes e-mail. */
export default function AdminNewsletters() {
  const { data: subs = [], isLoading } = useNewsletters();
  const { data: campaigns = [] } = useNewsletterCampaigns();
  const del = useDeleteNewsletter();
  const toggle = useToggleNewsletterSubscription();
  const saveCampaign = useSaveNewsletterCampaign();
  const delCampaign = useDeleteNewsletterCampaign();
  const send = useSendNewsletterCampaign();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'unsubscribed'>('all');
  const [draft, setDraft] = useState<Partial<NewsletterCampaign>>({ subject: '', content: '' });
  const [testEmail, setTestEmail] = useState('');

  const stats = useMemo(() => {
    const s = { total: subs.length, confirmed: 0, pending: 0, unsubscribed: 0 };
    subs.forEach(x => { s[subscriberStatus(x)]++; });
    return s;
  }, [subs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subs.filter(s => {
      if (filter !== 'all' && subscriberStatus(s) !== filter) return false;
      if (q && !s.email.toLowerCase().includes(q) && !(s.firstName || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [subs, search, filter]);

  const exportCsv = () => {
    const rows = [['email', 'prenom', 'statut', 'source', 'inscrit_le']].concat(
      filtered.map(s => [s.email, s.firstName || '', subscriberStatus(s), s.source || '', s.createdAt]),
    );
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `abonnes-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!draft.subject?.trim()) return toast.error('Ajoutez un objet à la campagne.');
    const id = await saveCampaign.mutateAsync(draft);
    setDraft({ id, ...draft });
    toast.success('Campagne enregistrée.');
  };

  const handleTest = async () => {
    if (!testEmail.trim()) return toast.error('Indiquez une adresse de test.');
    const id = draft.id ?? (await saveCampaign.mutateAsync(draft));
    setDraft(d => ({ ...d, id }));
    try {
      await send.mutateAsync({ campaignId: id, testEmail: testEmail.trim() });
      toast.success(`E-mail de test envoyé à ${testEmail}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'envoi de test.");
    }
  };

  const handleSend = async (campaignId: string) => {
    if (!confirm(`Envoyer cette campagne à ${stats.confirmed} abonné(s) confirmé(s) ?`)) return;
    try {
      const res = await send.mutateAsync({ campaignId });
      toast.success(`Campagne envoyée : ${res.sent ?? 0} envoi(s), ${res.failed ?? 0} échec(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'envoi.");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold hud-text flex items-center gap-2">
          <Mail className="h-5 w-5" /> NEWSLETTERS
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Abonnés avec confirmation par e-mail (double opt-in) et campagnes envoyées depuis votre serveur.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Contacts', value: stats.total, icon: Users },
          { label: 'Confirmés', value: stats.confirmed, icon: CheckCircle2 },
          { label: 'En attente', value: stats.pending, icon: Clock },
          { label: 'Désabonnés', value: stats.unsubscribed, icon: XCircle },
        ].map(s => (
          <div key={s.label} className="chamfer-hud bg-card/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
              <s.icon className="h-3.5 w-3.5" /> {s.label}
            </div>
            <p className="text-2xl font-bold mt-1 font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="subscribers">
        <TabsList>
          <TabsTrigger value="subscribers">Abonnés</TabsTrigger>
          <TabsTrigger value="campaigns">Campagnes</TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Rechercher un e-mail…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs h-9"
            />
            {(['all', 'confirmed', 'pending', 'unsubscribed'] as const).map(f => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                className="text-xs"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Tous' : STATUS_META[f].label}
              </Button>
            ))}
            <Button size="sm" variant="outline" className="text-xs ml-auto" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5 mr-1" /> Exporter CSV
            </Button>
          </div>

          <div className="chamfer-hud bg-card/50 divide-y divide-border">
            {isLoading && <p className="p-4 text-sm text-muted-foreground">Chargement…</p>}
            {!isLoading && !filtered.length && (
              <p className="p-4 text-sm text-muted-foreground">Aucun abonné pour ce filtre.</p>
            )}
            {filtered.map(s => {
              const st = subscriberStatus(s);
              const meta = STATUS_META[st];
              return (
                <div key={s.id} className="p-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.firstName ? `${s.firstName} · ` : ''}
                      {s.source || 'site'} · {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Badge className={meta.className} variant="secondary">
                    <meta.icon className="h-3 w-3 mr-1" /> {meta.label}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => toggle.mutate({ id: s.id, subscribe: st !== 'confirmed' })}
                  >
                    {st === 'confirmed' ? 'Désabonner' : 'Confirmer'}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => del.mutate(s.id)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6 pt-4">
          <section className="chamfer-hud bg-card/50 p-4 sm:p-6 space-y-4">
            <h2 className="font-bold hud-text text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> {draft.id ? 'MODIFIER LA CAMPAGNE' : 'NOUVELLE CAMPAGNE'}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="text-xs">Objet</Label>
                <Input value={draft.subject || ''} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Pré-en-tête (aperçu dans la boîte de réception)</Label>
                <Input value={draft.preheader || ''} onChange={e => setDraft(d => ({ ...d, preheader: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Message</Label>
                <Textarea
                  rows={8}
                  value={draft.content || ''}
                  onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
                  placeholder="Séparez vos paragraphes par une ligne vide."
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Image (URL, optionnel)</Label>
                <Input value={draft.imageUrl || ''} onChange={e => setDraft(d => ({ ...d, imageUrl: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Libellé du bouton</Label>
                <Input value={draft.ctaLabel || ''} onChange={e => setDraft(d => ({ ...d, ctaLabel: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Lien du bouton</Label>
                <Input value={draft.ctaUrl || ''} onChange={e => setDraft(d => ({ ...d, ctaUrl: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <Button onClick={handleSave} disabled={saveCampaign.isPending}>Enregistrer</Button>
              <div>
                <Label className="text-xs">Envoyer un test à</Label>
                <Input
                  className="h-9 w-56"
                  placeholder="moi@exemple.com"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={handleTest} disabled={send.isPending}>
                {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Test
              </Button>
              {draft.id && (
                <Button variant="ghost" onClick={() => setDraft({ subject: '', content: '' })}>
                  Nouvelle campagne
                </Button>
              )}
            </div>
          </section>

          <div className="chamfer-hud bg-card/50 divide-y divide-border">
            {!campaigns.length && <p className="p-4 text-sm text-muted-foreground">Aucune campagne.</p>}
            {campaigns.map(c => (
              <div key={c.id} className="p-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.status === 'sent'
                      ? `Envoyée le ${new Date(c.sentAt!).toLocaleString('fr-FR')} · ${c.sentCount} envoi(s), ${c.failedCount} échec(s)`
                      : c.status === 'sending'
                        ? 'Envoi en cours…'
                        : 'Brouillon'}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setDraft(c)}>
                  Modifier
                </Button>
                <Button
                  size="sm"
                  className="text-xs"
                  disabled={send.isPending || c.status === 'sending'}
                  onClick={() => handleSend(c.id)}
                >
                  <Send className="h-3.5 w-3.5 mr-1" /> Envoyer
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => delCampaign.mutate(c.id)}
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
