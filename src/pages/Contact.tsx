import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, MessageSquare, Mail, Phone, MapPin, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-chat`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (e: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || 'Erreur du service IA');
    return;
  }

  if (!resp.body) { onError('Stream indisponible'); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;

  while (!done) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { buffer = line + '\n' + buffer; break; }
    }
  }

  onDone();
}

const SUGGESTIONS = [
  'Quels sont vos délais de livraison ?',
  'Comment retourner un article ?',
  'Quelle taille choisir ?',
  'Votre garantie produit ?',
];

export default function Contact() {
  const { toast } = useToast();

  // Contact form
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  // Chatbot
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis l\'assistant LVTK6. Comment puis-je vous aider aujourd\'hui ?' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Le nom est requis';
    else if (form.name.length > 100) errors.name = 'Le nom ne doit pas dépasser 100 caractères';
    if (!form.email.trim()) errors.email = 'L\'email est requis';
    else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.email)) errors.email = 'Email invalide';
    if (!form.message.trim()) errors.message = 'Le message est requis';
    else if (form.message.length > 2000) errors.message = 'Le message ne doit pas dépasser 2000 caractères';
    return errors;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Honeypot: if the hidden field is filled, silently reject
    if (form.website) {
      setSent(true);
      return;
    }
    // Rate limiting: minimum 10s between submissions
    const now = Date.now();
    if (now - lastSubmitTime < 10000) {
      toast({ title: 'Veuillez patienter', description: 'Attendez quelques secondes avant de renvoyer un message.', variant: 'destructive' });
      return;
    }
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSending(true);
    setLastSubmitTime(now);
    const { error } = await supabase.from('messages').insert({
      name: form.name,
      email: form.email,
      message: form.message,
    });
    setSending(false);
    if (error) {
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer le message.', variant: 'destructive' });
    } else {
      setSent(true);
      setForm({ name: '', email: '', message: '', website: '' });
    }
  };

  const sendChat = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || isLoading) return;
    setInput('');
    const userMsg: Msg = { role: 'user', content };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsLoading(true);

    let assistantSoFar = '';
    await streamChat({
      messages: nextMessages,
      onDelta: (chunk) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      },
      onDone: () => setIsLoading(false),
      onError: (err) => {
        setIsLoading(false);
        toast({ title: 'Erreur IA', description: err, variant: 'destructive' });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[10px] hud-text text-primary uppercase tracking-[0.3em] mb-3">// CONTACT</p>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">Parlons-en</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Une question, une commande, une collaboration ? Notre équipe et notre assistant IA sont là pour vous.</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Contact form + infos */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {/* Info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: Mail, label: 'Email', value: 'contact@lvtk6.com' },
                { icon: Phone, label: 'Téléphone', value: '+33 1 23 45 67 89' },
                { icon: MapPin, label: 'Adresse', value: 'Paris, France' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="chamfer-hud-sm bg-card/40 border border-border/30 p-3 flex items-start gap-3">
                  <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] hud-text text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-xs font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="chamfer-hud-lg bg-card/20 border border-border/30 p-6">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold hud-text uppercase tracking-widest">Formulaire de contact</h2>
              </div>

              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="success"
                    className="flex flex-col items-center gap-3 py-10 text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <CheckCircle className="h-12 w-12 text-primary" />
                    <p className="font-bold">Message envoyé !</p>
                    <p className="text-sm text-muted-foreground">Nous vous répondrons dans les plus brefs délais.</p>
                    <Button variant="outline" size="sm" onClick={() => setSent(false)} className="mt-2">
                      Envoyer un autre message
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-xs hud-text uppercase tracking-wider">Nom *</Label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); setFormErrors(prev => ({ ...prev, name: '' })); }}
                          placeholder="Votre nom"
                          maxLength={100}
                          required
                          className={formErrors.name ? 'border-destructive' : ''}
                        />
                        {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs hud-text uppercase tracking-wider">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => { setForm(f => ({ ...f, email: e.target.value })); setFormErrors(prev => ({ ...prev, email: '' })); }}
                          placeholder="votre@email.com"
                          maxLength={255}
                          required
                          className={formErrors.email ? 'border-destructive' : ''}
                        />
                        {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-xs hud-text uppercase tracking-wider">Message *</Label>
                      <Textarea
                        id="message"
                        value={form.message}
                        onChange={(e) => { setForm(f => ({ ...f, message: e.target.value })); setFormErrors(prev => ({ ...prev, message: '' })); }}
                        placeholder="Votre message..."
                        className={cn("min-h-[120px] resize-none", formErrors.message && 'border-destructive')}
                        maxLength={2000}
                        required
                      />
                      <div className="flex justify-between">
                        {formErrors.message && <p className="text-xs text-destructive">{formErrors.message}</p>}
                        <p className="text-xs text-muted-foreground ml-auto">{form.message.length}/2000</p>
                      </div>
                    </div>
                    {/* Honeypot - hidden from real users */}
                    <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
                      <label htmlFor="website">Website</label>
                      <input
                        id="website"
                        name="website"
                        type="text"
                        value={form.website}
                        onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
                        autoComplete="off"
                        tabIndex={-1}
                      />
                    </div>
                    <Button type="submit" disabled={sending} className="w-full">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Envoyer le message
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right: AI Chatbot */}
          <motion.div
            className="flex flex-col"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="chamfer-hud-lg bg-card/20 border border-border/30 flex flex-col h-[600px]">
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b border-border/20">
                <div className="w-8 h-8 bg-primary/10 chamfer-hud-sm flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold hud-text uppercase tracking-widest">Assistant LVTK6</p>
                  <p className="text-[10px] text-primary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
                    En ligne
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 bg-primary/10 chamfer-hud-sm flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] px-3 py-2 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground chamfer-hud-sm'
                          : 'bg-card/60 border border-border/20 chamfer-hud-sm'
                      )}
                    >
                      {msg.content || <span className="opacity-50">…</span>}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-6 h-6 bg-muted chamfer-hud-sm flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-6 h-6 bg-primary/10 chamfer-hud-sm flex items-center justify-center shrink-0">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="bg-card/60 border border-border/20 chamfer-hud-sm px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Suggestion chips */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendChat(s)}
                      className="text-[10px] hud-text px-2 py-1 border border-border/30 hover:border-primary/50 hover:text-primary transition-colors chamfer-hud-sm bg-card/30"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-border/20 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez votre question..."
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  disabled={isLoading}
                  className="flex-1 text-sm"
                />
                <Button
                  size="icon"
                  onClick={() => sendChat()}
                  disabled={isLoading || !input.trim()}
                  className="shrink-0"
                  aria-label="Envoyer le message"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
