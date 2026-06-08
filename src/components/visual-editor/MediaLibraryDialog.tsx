import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMediaLibrary, useUploadMedia } from '@/hooks/useMediaLibrary';
import { SafeImage } from '@/lib/safeMedia';
import { Loader2, Upload, Check, Search } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  accept?: 'image' | 'video' | 'all';
  title?: string;
}

export function MediaLibraryDialog({ open, onOpenChange, onSelect, accept = 'image', title = 'Médiathèque' }: Props) {
  const { data: media = [], isLoading } = useMediaLibrary();
  const upload = useUploadMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = media.filter((f) => {
    if (accept === 'image' && !f.type.startsWith('image/')) return false;
    if (accept === 'video' && !f.type.startsWith('video/')) return false;
    if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const handleUpload = async (file: File) => {
    const uploaded = await upload.mutateAsync(file);
    if (uploaded?.url) setSelected(uploaded.url);
  };

  const confirmSelection = () => {
    if (!selected) return;
    onSelect(selected);
    onOpenChange(false);
    setSelected(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Choisissez un fichier existant ou téléversez-en un nouveau.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-7 h-8 text-xs" />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept === 'video' ? 'video/*' : accept === 'image' ? 'image/*' : 'image/*,video/*'}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.currentTarget.value = ''; }}
          />
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
            Téléverser
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {isLoading && <p className="text-xs text-muted-foreground text-center py-8">Chargement…</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Aucun fichier.</p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {filtered.map((f) => {
              const isVideo = f.type.startsWith('video/');
              const isSelected = selected === f.url;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelected(f.url)}
                  onDoubleClick={() => { onSelect(f.url); onOpenChange(false); setSelected(null); }}
                  className={`relative aspect-square rounded overflow-hidden border-2 transition ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}
                  title={f.name}
                >
                  {isVideo ? (
                    <video src={f.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <SafeImage src={f.url} alt={f.name} className="w-full h-full object-cover" />
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-1.5"><Check className="h-3 w-3" /></div>
                    </div>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">{f.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button size="sm" onClick={confirmSelection} disabled={!selected}>Sélectionner</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
