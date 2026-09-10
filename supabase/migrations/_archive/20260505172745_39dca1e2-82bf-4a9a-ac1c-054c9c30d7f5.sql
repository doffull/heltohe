UPDATE storage.buckets
SET file_size_limit = 104857600,
    allowed_mime_types = ARRAY[
      'image/jpeg','image/png','image/webp','image/gif','image/svg+xml','image/avif','image/bmp','image/tiff',
      'video/mp4','video/webm','video/quicktime','video/ogg','video/x-matroska',
      'audio/mpeg','audio/wav','audio/ogg','audio/mp4'
    ]
WHERE id = 'media';