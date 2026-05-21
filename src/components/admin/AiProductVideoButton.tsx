import { useState } from 'react';
import { Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  imageUrl?: string;
  durationSec?: number;
  onGenerated: (url: string) => void;
  className?: string;
}

/**
 * Génère une vidéo « Ken Burns » (pan + zoom) à partir de l'image principale
 * via canvas + MediaRecorder, puis l'upload sur Storage (bucket media/products/videos).
 * 100% client — aucune API vidéo externe nécessaire.
 */
export function AiProductVideoButton({ imageUrl, durationSec = 10, onGenerated, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const { upload } = useFileUpload({ folder: 'products/videos', maxSizeMB: 30 });

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const run = async () => {
    if (!imageUrl) {
      toast.error("Ajoutez d'abord une image principale");
      return;
    }
    setBusy(true); setProgress(5);
    try {
      const img = await loadImage(imageUrl);
      // Force 9:16 portrait look — adjust to a clean 720x1280 stage
      const W = 720, H = 1280;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      const fps = 30;
      const totalFrames = Math.min(10, durationSec) * fps;

      const stream = canvas.captureStream(fps);
      const mimeCandidates = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];
      const mime = mimeCandidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || 'video/webm';
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

      const done = new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
      });

      rec.start();

      // Cover-fit image into stage with progressive zoom-in + slow pan
      const baseScale = Math.max(W / img.width, H / img.height);
      const zoomStart = 1.05;
      const zoomEnd = 1.25;

      for (let f = 0; f < totalFrames; f++) {
        const t = f / (totalFrames - 1);
        const eased = t * t * (3 - 2 * t); // smoothstep
        const scale = baseScale * (zoomStart + (zoomEnd - zoomStart) * eased);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        // Slight diagonal pan
        const panX = (drawW - W) * (0.5 - 0.1 * Math.sin(t * Math.PI));
        const panY = (drawH - H) * (0.5 - 0.15 * t);

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, -panX, -panY, drawW, drawH);

        // Vignette
        const grd = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.7);
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(1, 'rgba(0,0,0,0.45)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);

        // Allow encoder to grab the frame
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
        toast.success('Vidéo produit générée');
      }
      setProgress(100);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erreur génération vidéo');
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={run}
        disabled={busy || !imageUrl}
        className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
        title="Générer une vidéo 10s à partir de l'image"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
        {busy ? `Génération… ${progress}%` : `Générer une vidéo (${durationSec}s)`}
      </Button>
    </div>
  );
}
