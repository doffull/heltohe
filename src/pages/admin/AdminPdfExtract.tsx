import { useCallback, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useUploadMedia } from '@/hooks/useMediaLibrary';
import { Download, FileUp, Loader2, Trash2, UploadCloud, Check } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface RenderedPage {
  page: number;
  dataUrl: string;
  width: number;
  height: number;
}

const QUALITY_LABELS: Record<number, string> = { 1: 'Standard', 2: 'Haute', 3: 'Très haute' };

export default function AdminPdfExtract() {
  const { toast } = useToast();
  const upload = useUploadMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [scale, setScale] = useState(2);
  const [savedPages, setSavedPages] = useState<number[]>([]);
  const [busyPage, setBusyPage] = useState<number | null>(null);

  const baseName = (fileName || 'catalogue').replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9._-]+/g, '-');

  const renderPdf = useCallback(async (file: File, renderScale: number) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: 'Fichier non supporté', description: 'Sélectionnez un fichier PDF.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setPages([]);
    setSavedPages([]);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      setProgress({ done: 0, total: doc.numPages });
      const out: RenderedPage[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // @ts-expect-error - pdf.js types require canvas typing not exposed here
        await page.render({ canvasContext: ctx, viewport }).promise;
        out.push({
          page: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.9),
          width: canvas.width,
          height: canvas.height,
        });
        setPages([...out]);
        setProgress({ done: i, total: doc.numPages });
        page.cleanup();
      }
      toast({ title: `${out.length} page(s) rendue(s)` });
    } catch (e) {
      toast({
        title: 'Lecture du PDF impossible',
        description: e instanceof Error ? e.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [toast]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void renderPdf(file, scale);
  };

  const download = (p: RenderedPage) => {
    const a = document.createElement('a');
    a.href = p.dataUrl;
    a.download = `${baseName}-p${String(p.page).padStart(2, '0')}.jpg`;
    a.click();
  };

  const dataUrlToFile = async (p: RenderedPage) => {
    const blob = await (await fetch(p.dataUrl)).blob();
    return new File([blob], `${baseName}-p${String(p.page).padStart(2, '0')}.jpg`, { type: 'image/jpeg' });
  };

  const saveToLibrary = async (p: RenderedPage) => {
    setBusyPage(p.page);
    try {
      await upload.mutateAsync(await dataUrlToFile(p));
      setSavedPages((prev) => (prev.includes(p.page) ? prev : [...prev, p.page]));
    } finally {
      setBusyPage(null);
    }
  };

  const saveAll = async () => {
    for (const p of pages) {
      if (savedPages.includes(p.page)) continue;
      await saveToLibrary(p);
    }
  };

  const reset = () => {
    setPages([]);
    setSavedPages([]);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-light uppercase tracking-[0.25em]">Import PDF / Médias</h1>
          <p className="text-sm text-muted-foreground">
            Extraction locale des pages d'un catalogue PDF, sans envoi du fichier vers un serveur externe.
          </p>
        </div>
        {pages.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <Trash2 className="mr-2 h-4 w-4" /> Réinitialiser
            </Button>
            <Button size="sm" onClick={saveAll} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Tout enregistrer
            </Button>
          </div>
        )}
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium uppercase tracking-widest">Fichier source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center transition-colors ${
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            {loading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <FileUp className="h-8 w-8 text-muted-foreground" />}
            <p className="text-sm font-medium">
              {loading
                ? `Rendu en cours ${progress ? `${progress.done}/${progress.total}` : ''}`
                : 'Glissez votre catalogue PDF ici ou cliquez pour parcourir'}
            </p>
            <p className="text-xs text-muted-foreground">{fileName ?? 'PDF uniquement · traitement 100 % navigateur'}</p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void renderPdf(file, scale);
              }}
            />
          </div>

          <div className="flex flex-col gap-2 sm:max-w-sm">
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
              <span>Qualité de rendu</span>
              <span>{QUALITY_LABELS[scale] ?? `x${scale}`}</span>
            </div>
            <Slider value={[scale]} min={1} max={3} step={1} onValueChange={([v]) => setScale(v)} />
            <p className="text-xs text-muted-foreground">
              Modifiez la qualité avant d'importer le fichier (ou réimportez-le pour appliquer).
            </p>
          </div>
        </CardContent>
      </Card>

      {pages.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pages.map((p) => {
            const saved = savedPages.includes(p.page);
            return (
              <Card key={p.page} className="overflow-hidden">
                <div className="relative bg-muted/40">
                  <img
                    src={p.dataUrl}
                    alt={`Page ${p.page} du PDF ${fileName ?? ''}`}
                    className="h-64 w-full object-contain"
                    loading="lazy"
                  />
                  <Badge variant="secondary" className="absolute left-2 top-2 text-[10px]">Page {p.page}</Badge>
                  {saved && (
                    <Badge className="absolute right-2 top-2 text-[10px]">
                      <Check className="mr-1 h-3 w-3" /> Enregistrée
                    </Badge>
                  )}
                </div>
                <CardContent className="space-y-2 p-3">
                  <p className="text-[11px] text-muted-foreground">{p.width} × {p.height} px · JPEG</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => void saveToLibrary(p)}
                      disabled={busyPage === p.page}
                    >
                      {busyPage === p.page ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                      Extraire et enregistrer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => download(p)} aria-label={`Télécharger la page ${p.page}`}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
