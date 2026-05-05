import { useState } from 'react';
import { Mail, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SubscribeFab() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('newsletters').insert({ email });
      if (error && !error.message.includes('duplicate')) throw error;
      setDone(true);
      setEmail('');
      toast.success('Merci, vous êtes abonné !');
      setTimeout(() => { setOpen(false); setDone(false); }, 1500);
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 left-6 z-[70] flex items-center gap-2 bg-foreground text-background px-4 py-3 shadow-lg hover:scale-105 transition-transform bevel-corners-sm"
            aria-label="S'abonner à la newsletter"
          >
            <Mail className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">S'abonner</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 left-6 z-[70] w-[320px] max-w-[calc(100vw-1.5rem)] bg-card border border-border shadow-2xl p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-sm uppercase tracking-wider">Newsletter</p>
                <p className="text-xs text-muted-foreground mt-0.5">Offres exclusives en avant-première</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-2">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="h-10 text-sm"
                disabled={loading || done}
                autoFocus
              />
              <Button type="submit" className="w-full h-10 text-xs uppercase tracking-wider" disabled={loading || done}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? '✓ Inscrit' : "S'inscrire"}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
