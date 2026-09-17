import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { mediaUploadOptions, prepareMediaForUpload } from '@/lib/storageUpload';

export interface MediaFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
}

const BUCKET = 'media';

export function useMediaLibrary() {
  return useQuery({
    queryKey: ['media-library'],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).list('', {
        limit: 500,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl('');
      const baseUrl = urlData.publicUrl.replace(/\/$/, '');

      return (data || [])
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map((f): MediaFile => ({
          id: f.id || f.name,
          name: f.name,
          url: `${baseUrl}/${f.name}`,
          size: f.metadata?.size || 0,
          type: f.metadata?.mimetype || 'unknown',
          createdAt: f.created_at || '',
        }));
    },
  });
}

export function useUploadMedia() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`Fichier trop volumineux (max ${isVideo ? '100' : '50'}MB)`);
      }
      const safeName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const fileName = `${Date.now()}-${safeName || 'media'}`;
      // Chemin générique (racine du bucket) : on ne connaît pas l'usage
      // final, d'où le plafond unique de 2048 px.
      const payload = await prepareMediaForUpload(file);

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, payload, mediaUploadOptions({ upsert: false, contentType: file.type || undefined }));
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
      return { fileName, url: urlData.publicUrl, type: file.type || 'application/octet-stream', size: file.size };
    },
    onSuccess: (uploaded) => {
      qc.setQueryData<MediaFile[]>(['media-library'], (prev) => {
        if (!prev) return prev;
        return prev.some((f) => f.name === uploaded.fileName)
          ? prev
          : [{ id: uploaded.fileName, name: uploaded.fileName, url: uploaded.url, size: uploaded.size, type: uploaded.type, createdAt: new Date().toISOString() }, ...prev];
      });
      qc.invalidateQueries({ queryKey: ['media-library'] });
      toast({ title: 'Fichier uploadé' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erreur upload', description: e.message, variant: 'destructive' });
    },
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fileName: string) => {
      const { error } = await supabase.storage.from(BUCKET).remove([fileName]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-library'] });
      toast({ title: 'Fichier supprimé' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erreur suppression', description: e.message, variant: 'destructive' });
    },
  });
}

export function useBulkDeleteMedia() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fileNames: string[]) => {
      const { error } = await supabase.storage.from(BUCKET).remove(fileNames);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-library'] });
      toast({ title: 'Fichiers supprimés' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erreur suppression', description: e.message, variant: 'destructive' });
    },
  });
}
