import { useMemo, useState } from 'react';
import {
  Inbox, Send, Users, Settings as SettingsIcon, Plus, Search, Mail, Phone,
  Pencil, Trash2, MessageSquare, Package, ArrowLeft, Eye, FileText, AlertTriangle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  useCrmContacts, useSaveCrmContact, useDeleteCrmContact,
  useCrmConversations, useCrmMessages, useCreateConversation, useUpdateConversation,
  useSendCrmMessage, useMessagingConfig, useSaveMessagingConfig, useCrmMessageTemplates,
  type CrmContact, type CrmConversation, type MessagingConfig,
} from '@/hooks/useCrm';
import { CrmTemplatesManager } from '@/components/admin/CrmTemplatesManager';
import { renderTemplate, missingVars, TEMPLATE_VARS, type TemplateContext } from '@/lib/crmTemplateVars';


type View = 'inbox' | 'sent' | 'contacts' | 'settings';

const STATUS_LABEL: Record<string, string> = {
  open: 'Ouverte',
  pending: 'En attente',
  closed: 'Fermée',
};

const STATUS_CLASS: Record<string, string> = {
  open: 'bg-primary/10 text-primary border-primary/30',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  closed: 'bg-muted text-muted-foreground border-border',
};

function fmt(date: string) {
  return new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/* -------------------- Contact dialog -------------------- */

function ContactDialog({
  open, onOpenChange, contact,
}: { open: boolean; onOpenChange: (v: boolean) => void; contact?: CrmContact | null }) {
  const save = useSaveCrmContact();
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });

  // Reset form when dialog opens
  const key = `${open}-${contact?.id ?? 'new'}`;
  const [lastKey, setLastKey] = useState('');
  if (key !== lastKey) {
    setLastKey(key);
    setForm({
      name: contact?.name || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      notes: contact?.notes || '',
    });
  }

  const submit = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      toast({ title: 'Email invalide', variant: 'destructive' });
      return;
    }
    try {
      await save.mutateAsync({ id: contact?.id, ...form });
      toast({ title: contact ? 'Contact mis à jour' : 'Contact créé' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? 'Modifier le contact' : 'Nouveau contact'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jean Dupont" />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jean@exemple.fr" />
          </div>
          <div className="space-y-1.5">
            <Label>Téléphone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+33 6 12 34 56 78" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={save.isPending}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- New conversation dialog -------------------- */

function NewConversationDialog({
  open, onOpenChange, contacts, onCreated,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  contacts: CrmContact[]; onCreated: (id: string) => void;
}) {
  const create = useCreateConversation();
  const [contactId, setContactId] = useState('');
  const [subject, setSubject] = useState('');

  const submit = async () => {
    if (!contactId) {
      toast({ title: 'Sélectionnez un contact', variant: 'destructive' });
      return;
    }
    const id = await create.mutateAsync({ contact_id: contactId, subject });
    onCreated(id);
    setSubject('');
    setContactId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nouvelle conversation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Contact</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger><SelectValue placeholder="Choisir un contact" /></SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name || c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Objet</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Question sur ma commande" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={create.isPending}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Order side panel -------------------- */

function OrderPanel({ email, orderId }: { email?: string; orderId?: string | null }) {
  const { data: orders } = useQuery({
    queryKey: ['crm-order-context', email, orderId],
    enabled: !!email || !!orderId,
    queryFn: async () => {
      let q = (supabase as any)
        .from('orders')
        .select('id, order_number, status, payment_status, total, tracking_number, shipping_carrier, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      q = orderId ? q.eq('id', orderId) : q.eq('customer_email', email);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  if (!orders?.length) {
    return <p className="text-xs text-muted-foreground">Aucune commande associée à ce contact.</p>;
  }

  return (
    <div className="space-y-2">
      {orders.map((o: any) => (
        <div key={o.id} className="rounded-lg border border-border p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold">#{o.order_number}</span>
            <span className="text-muted-foreground">{fmt(o.created_at)}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{o.status}</Badge>
            <Badge variant="outline">{o.payment_status}</Badge>
            <Badge variant="secondary">{Number(o.total).toFixed(2)} €</Badge>
          </div>
          {o.tracking_number && (
            <p className="text-muted-foreground">
              Suivi {o.shipping_carrier || 'Colissimo'} : <span className="font-mono">{o.tracking_number}</span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* -------------------- Main page -------------------- */

export default function AdminMessagerie() {
  const [view, setView] = useState<View>('inbox');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [contactDialog, setContactDialog] = useState<{ open: boolean; contact: CrmContact | null }>({ open: false, contact: null });
  const [convDialog, setConvDialog] = useState(false);

  const { data: contacts = [] } = useCrmContacts();
  const { data: conversations = [] } = useCrmConversations();
  const deleteContact = useDeleteCrmContact();
  const updateConv = useUpdateConversation();
  const sendMessage = useSendCrmMessage();
  const { data: config } = useMessagingConfig();
  const saveConfig = useSaveMessagingConfig();

  const contactById = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c])) as Record<string, CrmContact>,
    [contacts],
  );

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (!q) return true;
      const contact = contactById[c.contact_id];
      return (
        c.subject.toLowerCase().includes(q) ||
        (contact?.name || '').toLowerCase().includes(q) ||
        (contact?.email || '').toLowerCase().includes(q)
      );
    });
  }, [conversations, search, contactById]);

  const selected = conversations.find((c) => c.id === selectedId) || null;
  const selectedContact = selected ? contactById[selected.contact_id] : null;
  const { data: messages = [] } = useCrmMessages(selected?.id);

  const visibleMessages = view === 'sent' ? messages.filter((m) => m.direction === 'outbound') : messages;

  const doSend = async () => {
    if (!selected || !selectedContact || !reply.trim()) return;
    try {
      const res = await sendMessage.mutateAsync({
        conversationId: selected.id,
        content: reply.trim(),
        to: selectedContact.email,
        subject: selected.subject,
      });
      setReply('');
      toast({
        title: res?.sent ? 'Message envoyé' : 'Message enregistré',
        description: res?.warning,
      });
    } catch (e: any) {
      toast({ title: 'Envoi impossible', description: e.message, variant: 'destructive' });
    }
  };

  const navItems: { key: View; label: string; icon: typeof Inbox; count?: number }[] = [
    { key: 'inbox', label: 'Boîte de réception', icon: Inbox, count: conversations.filter((c) => c.status !== 'closed').length },
    { key: 'sent', label: 'Messages envoyés', icon: Send },
    { key: 'contacts', label: 'Contacts', icon: Users, count: contacts.length },
    { key: 'settings', label: 'Paramètres', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Messagerie & CRM</h1>
        <p className="text-sm text-muted-foreground">Centralisez vos échanges clients et votre carnet de contacts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_320px_1fr] gap-4 min-h-[70vh]">
        {/* Column 1 — navigation */}
        <Card className="p-3 h-fit space-y-3">
          <Button className="w-full" size="sm" onClick={() => setContactDialog({ open: true, contact: null })}>
            <Plus className="h-4 w-4 mr-1.5" /> Nouveau contact
          </Button>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  view === item.key
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.count !== undefined && (
                  <span className="ml-auto text-xs opacity-80">{item.count}</span>
                )}
              </button>
            ))}
          </nav>
          <Button variant="outline" size="sm" className="w-full" onClick={() => setConvDialog(true)}>
            <MessageSquare className="h-4 w-4 mr-1.5" /> Nouvelle conversation
          </Button>
        </Card>

        {/* Contacts view */}
        {view === 'contacts' && (
          <Card className="p-4 lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher un contact…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="divide-y divide-border">
              {contacts
                .filter((c) => {
                  const q = search.trim().toLowerCase();
                  return !q || (c.name || '').toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
                })
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                      {(c.name || c.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-2">
                        <Mail className="h-3 w-3" />{c.email}
                        {c.phone && (<><Phone className="h-3 w-3 ml-2" />{c.phone}</>)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setContactDialog({ open: true, contact: c })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={async () => {
                        if (!confirm(`Supprimer ${c.name || c.email} ?`)) return;
                        await deleteContact.mutateAsync(c.id);
                        toast({ title: 'Contact supprimé' });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              {!contacts.length && <p className="text-sm text-muted-foreground py-6 text-center">Aucun contact pour le moment.</p>}
            </div>
          </Card>
        )}

        {/* Settings view */}
        {view === 'settings' && (
          <Card className="p-4 lg:col-span-2 space-y-4 max-w-2xl">
            <h2 className="font-semibold">Paramètres d'envoi</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Adresse d'expédition par défaut</Label>
                <Input
                  type="email"
                  defaultValue={config?.default_from_email || ''}
                  onBlur={(e) => saveConfig.mutate({ ...(config as MessagingConfig), default_from_email: e.target.value })}
                  placeholder="support@mondomaine.fr"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nom d'expéditeur</Label>
                <Input
                  defaultValue={config?.default_from_name || ''}
                  onBlur={(e) => saveConfig.mutate({ ...(config as MessagingConfig), default_from_name: e.target.value })}
                  placeholder="Service client LVTK6"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fournisseur d'envoi</Label>
              <Select
                value={config?.provider || 'resend'}
                onValueChange={(v) => saveConfig.mutate({ ...(config as MessagingConfig), provider: v })}
              >
                <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="brevo">Brevo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Signature</Label>
              <Textarea
                rows={4}
                defaultValue={config?.signature || ''}
                onBlur={(e) => saveConfig.mutate({ ...(config as MessagingConfig), signature: e.target.value })}
                placeholder={'—\nService client LVTK6'}
              />
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Clés API (Resend / Brevo)</p>
              <p>
                Les clés ne sont jamais stockées en base : elles sont conservées comme secrets chiffrés côté serveur
                et utilisées uniquement par la fonction d'envoi. Demandez-moi « configurer ma clé Resend » ou
                « configurer ma clé Brevo » dans le chat pour ouvrir le formulaire sécurisé.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Les modifications sont enregistrées automatiquement.</p>
          </Card>
        )}

        {/* Column 2 — conversations */}
        {(view === 'inbox' || view === 'sent') && (
          <Card className="p-0 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="flex-1 max-h-[60vh]">
              {filteredConversations.map((c: CrmConversation) => {
                const contact = contactById[c.contact_id];
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'w-full text-left px-3 py-3 border-b border-border transition-colors',
                      selectedId === c.id ? 'bg-muted' : 'hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{contact?.name || contact?.email || 'Contact'}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{fmt(c.last_message_at)}</span>
                    </div>
                    <p className="text-xs truncate mt-0.5">{c.subject}</p>
                    <Badge variant="outline" className={cn('mt-1.5 text-[10px]', STATUS_CLASS[c.status])}>
                      {STATUS_LABEL[c.status] || c.status}
                    </Badge>
                  </button>
                );
              })}
              {!filteredConversations.length && (
                <p className="text-sm text-muted-foreground p-6 text-center">Aucune conversation.</p>
              )}
            </ScrollArea>
          </Card>
        )}

        {/* Column 3 — reading & composing */}
        {(view === 'inbox' || view === 'sent') && (
          <Card className="p-0 flex flex-col overflow-hidden">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Sélectionnez une conversation pour lire les échanges.</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedId(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{selected.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedContact?.name ? `${selectedContact.name} · ` : ''}{selectedContact?.email}
                    </p>
                  </div>
                  <Select value={selected.status} onValueChange={(v) => updateConv.mutate({ id: selected.id, status: v })}>
                    <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Ouverte</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="closed">Fermée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid xl:grid-cols-[1fr_260px] flex-1 min-h-0">
                  <div className="flex flex-col min-h-0 border-r border-border">
                    <ScrollArea className="flex-1 max-h-[45vh] p-4">
                      <div className="space-y-3">
                        {visibleMessages.map((m) => (
                          <div
                            key={m.id}
                            className={cn(
                              'max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap',
                              m.direction === 'outbound'
                                ? 'ml-auto bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground',
                            )}
                          >
                            <p>{m.content}</p>
                            <p className={cn('text-[10px] mt-1', m.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                              {m.direction === 'outbound' ? 'Envoyé' : 'Reçu'} · {fmt(m.created_at)}
                            </p>
                          </div>
                        ))}
                        {!visibleMessages.length && (
                          <p className="text-sm text-muted-foreground text-center py-6">Aucun message dans ce fil.</p>
                        )}
                      </div>
                    </ScrollArea>

                    <div className="p-3 border-t border-border space-y-2">
                      <Textarea
                        rows={3}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder={`Répondre à ${selectedContact?.email || 'ce contact'}…`}
                      />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={doSend} disabled={!reply.trim() || sendMessage.isPending}>
                          <Send className="h-4 w-4 mr-1.5" /> Envoyer
                        </Button>
                      </div>
                    </div>
                  </div>

                  <aside className="p-4 space-y-3 hidden xl:block">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" /> Informations rattachées
                    </p>
                    {selectedContact?.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {selectedContact.phone}
                      </p>
                    )}
                    <OrderPanel email={selectedContact?.email} orderId={selected.order_id} />
                    {selectedContact?.notes && (
                      <div className="rounded-lg bg-muted/50 p-3 text-xs whitespace-pre-wrap">{selectedContact.notes}</div>
                    )}
                  </aside>
                </div>
              </>
            )}
          </Card>
        )}
      </div>

      <ContactDialog
        open={contactDialog.open}
        onOpenChange={(v) => setContactDialog({ open: v, contact: v ? contactDialog.contact : null })}
        contact={contactDialog.contact}
      />
      <NewConversationDialog
        open={convDialog}
        onOpenChange={setConvDialog}
        contacts={contacts}
        onCreated={(id) => { setView('inbox'); setSelectedId(id); }}
      />
    </div>
  );
}
