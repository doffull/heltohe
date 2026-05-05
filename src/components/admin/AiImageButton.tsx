import { useState } from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AiImageButtonProps {
  onGenerated: (url: string) => void;
  defaultPrompt?: string;
  label?: string;
}

export function AiImageButton({ onGenerated, defaultPrompt = '', label = 'Générer avec IA' }: AiImageButtonProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setPreviewUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-slide-image', {
        body: { prompt },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const url = (data as any)?.url as string | undefined;
      if (!url) throw new Error('Aucune image renvoyée');
      setPreviewUrl(url);
    } catch (e: any) {
      toast.error(e.message || 'Erreur IA');
    } finally {
      setLoading(false);
    }
  };

  const useImage = () => {
    if (previewUrl) {
      onGenerated(previewUrl);
      toast.success('Image ajoutée');
      setOpen(false);
      setPreviewUrl(null);
      setPrompt('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Description de l'image</Label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Mannequin en parka noire dans une rue urbaine au crépuscule"
              onKeyDown={(e) => { if (e.key === 'Enter' && !loading) generate(); }}
            />
          </div>

          {previewUrl && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img src={previewUrl} alt="Aperçu IA" className="w-full h-auto" />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={generate} disabled={loading || !prompt.trim()} variant="secondary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {previewUrl ? 'Régénérer' : 'Générer'}
          </Button>
          {previewUrl && (
            <Button onClick={useImage}>
              <Check className="h-4 w-4 mr-2" />
              Utiliser
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
