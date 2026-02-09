import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      return fileName;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-library'] });
      toast({ title: 'Fichier uploadé avec succès' });
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
