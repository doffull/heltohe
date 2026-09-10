import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { prepareImageForUpload } from '@/lib/iosImage';
import { mediaUploadOptions } from '@/lib/storageUpload';

interface UseFileUploadOptions {
  bucket?: string;
  folder?: string;
  maxSizeMB?: number;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { bucket = 'media', folder = '', maxSizeMB = 50 } = options;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (rawFile: File): Promise<string | null> => {
    // iPhone photos arrive in HEIC and can be huge → convert + downscale first,
    // otherwise they render blank on Android/Chrome or blow WebKit's memory cap.
    const file = rawFile.type.startsWith('video/') ? rawFile : await prepareImageForUpload(rawFile);
    // Per-type size guard: videos are limited stricter
    const isVideo = file.type.startsWith('video/');
    const effectiveMax = isVideo ? Math.min(maxSizeMB, 30) : maxSizeMB;
    if (file.size > effectiveMax * 1024 * 1024) {
      toast.error(`Le fichier dépasse la limite de ${effectiveMax}MB`);
      return null;
    }

    setUploading(true);
    setProgress(10);

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      setProgress(30);

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, mediaUploadOptions({ upsert: true }));

      if (error) throw error;

      setProgress(80);

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setProgress(100);
      toast.success('Fichier uploadé avec succès');
      return urlData.publicUrl;
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Erreur lors de l\'upload');
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const remove = async (url: string): Promise<boolean> => {
    try {
      const path = url.split(`/storage/v1/object/public/${bucket}/`)[1];
      if (!path) return false;
      
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
      
      toast.success('Fichier supprimé');
      return true;
    } catch (err: any) {
      toast.error('Erreur lors de la suppression');
      return false;
    }
  };

  return { upload, remove, uploading, progress };
}
