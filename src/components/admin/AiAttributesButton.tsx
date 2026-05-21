import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  name?: string;
  category?: string;
  imageUrl?: string;
  onGenerated: (items: Record<string, string>) => void;
  className?: string;
}

export function AiAttributesButton({ name, category, imageUrl, onGenerated, className }: Props) {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('product-ai-helpers', {
        body: { action: 'attributes', name, category, imageUrl },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const items = ((data as any)?.items || []) as { key: string; value: string }[];
      if (!items.length) throw new Error('Aucun attribut généré');
      const map: Record<string, string> = {};
      items.forEach((it) => { if (it.key && it.value) map[it.key] = it.value; });
      onGenerated(map);
      toast.success(`${items.length} attributs générés`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur IA');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={run}
      disabled={loading}
      className={cn('gap-1.5 text-primary border-primary/30 hover:bg-primary/10', className)}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      Générer avec l'IA
    </Button>
  );
}
