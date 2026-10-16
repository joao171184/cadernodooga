-- Leitura pública das imagens do bucket ads (defesa em profundidade; bucket já é public=true).
UPDATE storage.buckets
SET public = true,
    file_size_limit = 1048576,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
WHERE id = 'ads';

DROP POLICY IF EXISTS "Public read ad images" ON storage.objects;
CREATE POLICY "Public read ad images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'ads');
