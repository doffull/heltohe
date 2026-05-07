import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AiTextButtonProps {
  field: 'title' | 'subtitle' | 'description' | 'cta' | 'slide_name' | 'badge_line1' | 'badge_line2' | 'cta_primary' | 'cta_secondary';
  context?: string;
  onGenerated: (value: string) => void;
  className?: string;
}

export function AiTextButton({ field, context, onGenerated, className }: AiTextButtonProps) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-slide-text', {
        body: { field, context },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const value = (data as any)?.value as string | undefined;
      if (!value) throw new Error('Aucune réponse');
      onGenerated(value);
      toast.success('Texte généré');
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
      onClick={generate}
      disabled={loading}
      title="Générer avec l'IA"
      className={cn('h-7 w-7 text-primary hover:text-primary hover:bg-primary/10', className)}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
    </Button>
  );
}
