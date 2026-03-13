import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, Film, Music, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface FileDropZoneProps {
  accept?: string[];
  onUpload: (url: string) => void;
  currentFile?: string;
  folder?: string;
  label?: string;
  className?: string;
}

const MIME_MAP: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

function getAcceptString(accept?: string[]): string {
  if (!accept) return Object.values(MIME_MAP).flat().join(',');
  return accept.flatMap(t => MIME_MAP[t] || [t]).join(',');
}

function getFileType(url: string): 'image' | 'video' | 'audio' | 'unknown' {
  // Strip query params before checking extension
  const cleanUrl = url.split('?')[0];
  const ext = cleanUrl.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
  // Fallback: check if URL contains image-related paths
  if (url.includes('/branding/') || url.includes('/logo')) return 'image';
  return 'unknown';
}

export function FileDropZone({ 
  accept, 
  onUpload, 
  currentFile, 
  folder = 'uploads', 
  label = 'Glissez un fichier ici ou cliquez',
  className
}: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress } = useFileUpload({ folder });

  const handleFile = async (file: File) => {
    const url = await upload(file);
    if (url) onUpload(url);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleRemove = () => {
    onUpload('');
  };

  const fileType = currentFile ? getFileType(currentFile) : null;

  return (
    <div className={cn("relative", className)}>
      {currentFile ? (
        <div className="relative border border-border rounded-lg overflow-hidden bg-muted">
          {(fileType === 'image' || fileType === 'unknown') && (
            <div className="w-full h-40 flex items-center justify-center bg-muted p-2">
              <img
                src={currentFile}
                alt=""
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  // If image fails to load, show fallback
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML += '<span class="text-xs text-muted-foreground">Aperçu non disponible</span>';
                }}
              />
            </div>
          )}
          {fileType === 'video' && (
            <video src={currentFile} className="w-full h-40 object-cover" controls muted />
          )}
          {fileType === 'audio' && (
            <div className="h-40 flex items-center justify-center p-4">
              <audio src={currentFile} controls className="w-full" />
            </div>
          )}
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all min-h-[140px]",
            dragOver 
              ? "border-primary bg-primary/5 scale-[1.02]" 
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <Progress value={progress} className="w-full max-w-[200px] h-2" />
              <span className="text-xs text-muted-foreground">Upload en cours...</span>
            </>
          ) : (
            <>
              <div className="flex gap-2 text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
                <Film className="h-5 w-5" />
                <Music className="h-5 w-5" />
              </div>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground text-center">{label}</span>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={getAcceptString(accept)}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
