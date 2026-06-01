import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-chat`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
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
    if (resp.status === 429) { onError("Trop de requêtes, réessayez dans un moment."); return; }
    if (resp.status === 402) { onError("Quota dépassé. Contactez l'administrateur."); return; }
    onError("Erreur du service. Réessayez plus tard.");
    return;
  }

  if (!resp.body) { onError("Pas de réponse."); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;

  while (!done) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buffer += decoder.decode(value, { stream: true });

    let newline: number;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || !line.trim()) continue;
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') { done = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }
  onDone();
}

interface ChatBotWidgetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function ChatBotWidget({ open: openProp, onOpenChange, hideTrigger }: ChatBotWidgetProps = {}) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    if (openProp === undefined) setOpenInternal(v);
  };
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener('lvtk:open-chatbot', h);
    return () => window.removeEventListener('lvtk:open-chatbot', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: botConfig } = useQuery({
    queryKey: ['bot-config-widget'],
    queryFn: async () => {
      const { data } = await (supabase.from('bot_config_public' as any).select('*').eq('is_active', true).single() as any);
      return data as { bot_name?: string; bot_avatar?: string; welcome_message?: string; suggestions?: string[] } | null;
    },
  });

  const botName = botConfig?.bot_name || 'Helvetica';
  const welcomeMessage = botConfig?.welcome_message || 'Bonjour ! Je suis Helvetica, votre expert mode LVTK6. Comment puis-je vous aider ?';
  const suggestions: string[] = Array.isArray(botConfig?.suggestions) ? (botConfig.suggestions as string[]) : [];

  // Init welcome message when opening for the first time
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: welcomeMessage }]);
    }
  }, [open, welcomeMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  // Signal global chat-open state so other floating elements (UnifiedFab) can step aside
  useEffect(() => {
    if (open) document.body.dataset.chatOpen = '1';
    else delete document.body.dataset.chatOpen;
    window.dispatchEvent(new CustomEvent('lvtk:chat-open', { detail: { open } }));
    return () => { delete document.body.dataset.chatOpen; };
  }, [open]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;
    setInput('');

    const userMsg: Msg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    let assistantText = '';
    const upsertAssistant = (chunk: string) => {
      assistantText += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
        }
        return [...prev, { role: 'assistant', content: assistantText }];
      });
    };

    try {
      await streamChat({
        messages: newMessages.filter(m => m.role !== 'assistant' || m.content !== welcomeMessage),
        onDelta: upsertAssistant,
        onDone: async () => {
          setIsLoading(false);
          // Log the conversation
          try {
            await supabase.from('chat_logs').insert({
              session_id: sessionId,
              user_message: content,
              bot_response: assistantText,
            });
          } catch {}
        },
        onError: (err) => {
          setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err}` }]);
          setIsLoading(false);
        },
      });
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Une erreur est survenue.' }]);
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating button (only when no external trigger) */}
      <AnimatePresence>
        {!open && !hideTrigger && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 chamfer-hud-sm shadow-lg hover:scale-105 transition-transform"
            style={{ clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)' }}
          >
            <Bot className="h-5 w-5" />
            <span className="text-sm font-bold tracking-wider">{botName}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-1.5rem)] flex flex-col bg-card border border-border shadow-2xl"
            style={{ height: '520px', clipPath: 'polygon(12px 0%, 100% 0%, calc(100% - 4px) 4px, calc(100% - 4px) calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 4px calc(100% - 4px), 4px 12px)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
              <div className="w-8 h-8 bg-primary/20 border border-primary/40 flex items-center justify-center"
                style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}>
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold hud-text">{botName}</p>
                <p className="text-[10px] text-primary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  En ligne
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)} aria-label="Fermer le chat">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ clipPath: 'polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%)' }}>
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[80%] px-3 py-2 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground',
                  )}
                    style={{ clipPath: msg.role === 'user' ? 'polygon(6px 0%, 100% 0%, calc(100% - 2px) 2px, calc(100% - 2px) calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 2px calc(100% - 2px), 2px 6px)' : 'polygon(0% 0%, calc(100% - 6px) 0%, 100% 6px, 100% 100%, 6px 100%, 0% calc(100% - 6px))' }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0"
                    style={{ clipPath: 'polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%)' }}>
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="bg-secondary px-3 py-2" style={{ clipPath: 'polygon(0% 0%, calc(100% - 6px) 0%, 100% 6px, 100% 100%, 6px 100%, 0% calc(100% - 6px))' }}>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            {messages.length <= 1 && suggestions.length > 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2 flex-shrink-0">
                {suggestions.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-[10px] px-2 py-1 border border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-border flex-shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez votre question..."
                  className="flex-1 h-10 text-sm bg-secondary/50 border-border/30"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" className="h-10 w-10 flex-shrink-0" disabled={isLoading || !input.trim()} aria-label="Envoyer le message">
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
