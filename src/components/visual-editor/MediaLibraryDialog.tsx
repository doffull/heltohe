import { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMediaLibrary, useUploadMedia } from '@/hooks/useMediaLibrary';
import { SafeImage } from '@/lib/safeMedia';
import { Loader2, Upload, Check, Search } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (url: string) => void;
  onSelectMulti?: (urls: string[]) => void;
  accept?: 'image' | 'video' | 'all';
  title?: string;
  multi?: boolean;
}

export function MediaLibraryDialog({ open, onOpenChange, onSelect, onSelectMulti, accept = 'image', title = 'Médiathèque', multi = false }: Props) {
  const { data: media = [], isLoading } = useMediaLibrary();
  const upload = useUploadMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedMany, setSelectedMany] = useState<string[]>([]);

  useEffect(() => {
    if (!open) { setSelected(null); setSelectedMany([]); }
  }, [open]);

  const filtered = media.filter((f) => {
    if (accept === 'image' && !f.type.startsWith('image/')) return false;
    if (accept === 'video' && !f.type.startsWith('video/')) return false;
    if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const uploaded = await upload.mutateAsync(file);
      if (uploaded?.url) {
        if (multi) setSelectedMany(prev => Array.from(new Set([...prev, uploaded.url])));
        else setSelected(uploaded.url);
      }
    }
  };

  const toggleMany = (url: string) => {
    setSelectedMany(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
  };

  const confirmSelection = () => {
    if (multi) {
      if (!selectedMany.length) return;
      onSelectMulti?.(selectedMany);
    } else {
      if (!selected) return;
      onSelect?.(selected);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {multi ? 'Sélectionnez plusieurs fichiers ou téléversez-en de nouveaux.' : 'Choisissez un fichier existant ou téléversez-en un nouveau.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="pl-7 h-8 text-xs" />
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple={multi}
            accept={accept === 'video' ? 'video/*' : accept === 'image' ? 'image/*' : 'image/*,video/*'}
            className="hidden"
            onChange={(e) => { handleUpload(e.target.files); e.currentTarget.value = ''; }}
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
              const isSelected = multi ? selectedMany.includes(f.url) : selected === f.url;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => multi ? toggleMany(f.url) : setSelected(f.url)}
                  onDoubleClick={() => {
                    if (multi) { toggleMany(f.url); }
                    else { onSelect?.(f.url); onOpenChange(false); }
                  }}
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

        <div className="flex justify-between items-center gap-2 pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            {multi ? `${selectedMany.length} sélectionné(s)` : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button size="sm" onClick={confirmSelection} disabled={multi ? selectedMany.length === 0 : !selected}>
              {multi ? `Ajouter (${selectedMany.length})` : 'Sélectionner'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
