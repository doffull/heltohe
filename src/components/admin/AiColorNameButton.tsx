import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { edgeErrorMessage } from '@/lib/edgeFunctionError';

interface Props {
  hex: string;
  onGenerated: (name: string) => void;
  className?: string;
}

export function AiColorNameButton({ hex, onGenerated, className }: Props) {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    if (!hex) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('product-ai-helpers', {
        body: { action: 'color-name', hex },
      });
      if (error) throw new Error(await edgeErrorMessage(error));
      if ((data as any)?.error) throw new Error((data as any).error);
      const value = ((data as any)?.value || '').toString().trim();
      if (!value) throw new Error('Aucune réponse');
      onGenerated(value);
    } catch (e: any) {
      toast.error(e.message || 'Erreur IA');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={run}
      disabled={loading || !hex}
      title="Nommer la couleur avec l'IA"
      className={cn('h-7 w-7 text-primary hover:text-primary hover:bg-primary/10', className)}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
    </Button>
  );
}
