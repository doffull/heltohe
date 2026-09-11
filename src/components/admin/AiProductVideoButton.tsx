import { useState } from 'react';
import { Video, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useFileUpload } from '@/hooks/useFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { edgeErrorMessage } from '@/lib/edgeFunctionError';

interface Props {
  imageUrl?: string;
  productName?: string;
  durationSec?: number;
  onGenerated: (url: string) => void;
  className?: string;
}

type Ratio = '9:16' | '16:9' | '1:1';

/**
 * Génération vidéo produit avec deux modes :
 *  - IA (Veo 3 via Lovable AI Gateway) — via edge function `generate-product-video`
 *  - Rapide (canvas Ken Burns 100% client) — fallback local, aucune consommation IA
 */
export function AiProductVideoButton({
  imageUrl,
  productName,
  durationSec = 6,
  onGenerated,
  className,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(
    productName
      ? `Showcase cinématographique de ${productName}, léger dolly-in, lumière studio douce, mood luxe, sans texte.`
      : '',
  );
  const [duration, setDuration] = useState<5 | 6 | 8>(6);
  const [ratio, setRatio] = useState<Ratio>('9:16');

  const { upload } = useFileUpload({ folder: 'products/videos', maxSizeMB: 30 });

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const runCanvas = async () => {
    if (!imageUrl) return toast.error("Ajoutez d'abord une image principale");
    setBusy(true);
    setProgress(5);
    try {
      const img = await loadImage(imageUrl);
      const [W, H] =
        ratio === '16:9' ? [1280, 720] : ratio === '1:1' ? [1080, 1080] : [720, 1280];
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      const fps = 30;
      const totalFrames = Math.min(10, durationSec) * fps;

      const stream = canvas.captureStream(fps);
      const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      const mime =
        mimeCandidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) ||
        'video/webm';
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
      });
      rec.start();

      const baseScale = Math.max(W / img.width, H / img.height);
      const zoomStart = 1.05;
      const zoomEnd = 1.25;
      for (let f = 0; f < totalFrames; f++) {
        const t = f / (totalFrames - 1);
        const eased = t * t * (3 - 2 * t);
        const scale = baseScale * (zoomStart + (zoomEnd - zoomStart) * eased);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const panX = (drawW - W) * (0.5 - 0.1 * Math.sin(t * Math.PI));
        const panY = (drawH - H) * (0.5 - 0.15 * t);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, -panX, -panY, drawW, drawH);
        const grd = ctx.createRadialGradient(
          W / 2,
          H / 2,
          Math.min(W, H) * 0.45,
          W / 2,
          H / 2,
          Math.max(W, H) * 0.7,
        );
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(1, 'rgba(0,0,0,0.45)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
        await new Promise((r) => setTimeout(r, 1000 / fps));
        setProgress(Math.round((f / totalFrames) * 90));
      }
      rec.stop();
      const blob = await done;
      setProgress(95);
      const file = new File([blob], `product-${Date.now()}.webm`, { type: blob.type });
      const url = await upload(file);
      if (url) {
        onGenerated(url);
        toast.success('Vidéo rapide générée');
      }
      setProgress(100);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erreur génération vidéo');
    } finally {
      setBusy(false);
      setOpen(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const runAi = async () => {
    if (!imageUrl) return toast.error("Ajoutez d'abord une image principale");
    setBusy(true);
    setProgress(5);
    const tick = setInterval(() => setProgress((p) => Math.min(90, p + 2)), 2500);
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-video', {
        body: { imageUrl, prompt: prompt || undefined, durationSec: duration, aspectRatio: ratio },
      });
      if (error) throw new Error(await edgeErrorMessage(error, 'Erreur IA vidéo'));
      const url = (data as any)?.url;
      if (!url) throw new Error("Aucune URL vidéo retournée");
      onGenerated(url);
      toast.success('Vidéo IA générée (Veo 3)');
      setProgress(100);
    } catch (e: any) {
      console.error('AI video error', e);
      const msg = String(e?.message || '');
      toast.error(msg || 'Erreur génération IA', {
        description: /indisponible|404|400/i.test(msg)
          ? 'Utilisation du mode rapide (canvas) recommandée.'
          : undefined,
      });
    } finally {
      clearInterval(tick);
      setBusy(false);
      setOpen(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  return (
    <Popover open={open} onOpenChange={(v) => !busy && setOpen(v)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!imageUrl || busy}
          className={cn(
            'gap-1.5 text-primary border-primary/30 hover:bg-primary/10',
            className,
          )}
          title="Générer une vidéo à partir de l'image"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Video className="h-3.5 w-3.5" />
          )}
          {busy ? `Génération… ${progress}%` : 'Générer une vidéo'}
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px] font-bold">
            IA
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4 space-y-3" align="start">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm">Vidéo produit IA</span>
          <Badge variant="outline" className="ml-auto text-[9px]">Veo 3</Badge>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Prompt (optionnel)</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Décrivez l'ambiance souhaitée…"
            className="text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Durée</Label>
            <div className="flex gap-1">
              {[5, 6, 8].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d as 5 | 6 | 8)}
                  className={cn(
                    'flex-1 text-xs border px-2 py-1',
                    duration === d
                      ? 'border-primary bg-primary/10 font-bold'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Format</Label>
            <div className="flex gap-1">
              {(['9:16', '16:9', '1:1'] as Ratio[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRatio(r)}
                  className={cn(
                    'flex-1 text-xs border px-1 py-1',
                    ratio === r
                      ? 'border-primary bg-primary/10 font-bold'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button
            onClick={runAi}
            disabled={busy || !imageUrl}
            size="sm"
            className="w-full gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Générer avec Veo 3 (IA)
          </Button>
          <Button
            onClick={runCanvas}
            disabled={busy || !imageUrl}
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Mode rapide (canvas, sans IA)
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground leading-snug">
          Le mode IA prend 30–90 s et consomme des crédits Lovable AI. Le mode rapide anime
          l'image via un effet Ken Burns (zoom + pan) — instantané, aucun coût.
        </p>
      </PopoverContent>
    </Popover>
  );
}
