import { useState, useCallback } from 'react';
import { useMediaLibrary, useUploadMedia, useDeleteMedia, useBulkDeleteMedia, MediaFile } from '@/hooks/useMediaLibrary';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Upload, Trash2, Copy, Search, Image, Film, FileText, X
} from 'lucide-react';

export default function AdminMedia() {
  const { toast } = useToast();
  const { data: files = [], isLoading } = useMediaLibrary();
  const uploadMedia = useUploadMedia();
  const deleteMedia = useDeleteMedia();
  const bulkDeleteMedia = useBulkDeleteMedia();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<MediaFile | null>(null);

  const filtered = files.filter(f => {
    if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filter === 'image' && !f.type.startsWith('image/')) return false;
    if (filter === 'video' && !f.type.startsWith('video/')) return false;
    return true;
  });

  const { selectedIds, toggle, toggleAll, clear, allSelected, someSelected, count } = useBulkSelection(filtered);

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${count} fichier(s) ?`)) return;
    const names = filtered.filter(f => selectedIds.has(f.id)).map(f => f.name);
    try {
      await bulkDeleteMedia.mutateAsync(names);
      clear();
    } catch {}
  };

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    let ok = 0, ko = 0;
    for (const file of files) {
      try {
        await uploadMedia.mutateAsync(file);
        ok++;
      } catch {
        ko++;
      }
    }
    if (files.length > 1) {
      toast({ title: `Upload terminé : ${ok} réussi(s)${ko ? `, ${ko} échec(s)` : ''}` });
    }
  }, [uploadMedia, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'URL copiée' });
  };

  const isImage = (type: string) => type.startsWith('image/');
  const isVideo = (type: string) => type.startsWith('video/');
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold hud-text">ESPACE MÉDIA</h1>
        <p className="text-muted-foreground mt-1">{files.length} fichiers</p>
      </div>

      {/* Upload Zone */}
      <div
        className={`chamfer-hud border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-card/50'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file'; input.multiple = true; input.accept = 'image/*,video/*';
          input.onchange = () => handleFiles(input.files);
          input.click();
        }}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Glissez-déposez vos fichiers ici ou <span className="text-primary underline">cliquez pour sélectionner</span></p>
        {uploadMedia.isPending && <p className="text-xs text-primary mt-2">Upload en cours...</p>}
      </div>

      {/* Filters */}
      <div className="chamfer-hud bg-card/50 p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {(['all', 'image', 'video'] as const).map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'Tout' : f === 'image' ? 'Images' : 'Vidéos'}
            </Button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {someSelected && (
        <div className="chamfer-hud bg-primary/10 border border-primary/30 p-3 flex items-center gap-4">
          <span className="text-sm font-bold">{count} sélectionné(s)</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleteMedia.isPending}>
            <Trash2 className="h-3 w-3 mr-2" />Supprimer
          </Button>
          <Button variant="ghost" size="sm" onClick={clear}>Désélectionner</Button>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="p-12 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center chamfer-hud bg-card/50">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun fichier</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(file => (
            <div key={file.id} className={`chamfer-hud bg-card border overflow-hidden group relative ${selectedIds.has(file.id) ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
              <div className="absolute top-2 left-2 z-10">
                <Checkbox checked={selectedIds.has(file.id)} onCheckedChange={() => toggle(file.id)} className="bg-background/80" />
              </div>
              <div className="aspect-square overflow-hidden cursor-pointer" onClick={() => setPreview(file)}>
                {isImage(file.type) ? (
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                ) : isVideo(file.type) ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center"><Film className="h-8 w-8 text-muted-foreground" /></div>
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center"><FileText className="h-8 w-8 text-muted-foreground" /></div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs truncate font-medium">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button size="icon" variant="secondary" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); copyUrl(file.url); }}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="destructive" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteMedia.mutate(file.name); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setPreview(null)}>
          <div className="relative max-w-4xl max-h-[80vh] w-full" onClick={e => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="absolute -top-10 right-0" onClick={() => setPreview(null)}>
              <X className="h-5 w-5" />
            </Button>
            {isImage(preview.type) ? (
              <img src={preview.url} alt={preview.name} className="w-full h-full object-contain rounded-lg" />
            ) : isVideo(preview.type) ? (
              <video src={preview.url} controls className="w-full rounded-lg" />
            ) : null}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm font-medium">{preview.name}</p>
              <Button size="sm" variant="outline" onClick={() => copyUrl(preview.url)}>
                <Copy className="h-3 w-3 mr-2" />Copier l'URL
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
