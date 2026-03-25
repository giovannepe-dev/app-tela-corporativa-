
-- Create storage bucket for widget media (images and videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('widget-media', 'widget-media', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload widget media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'widget-media');

-- Allow public read access
CREATE POLICY "Public read access for widget media"
ON storage.objects FOR SELECT
USING (bucket_id = 'widget-media');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update widget media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'widget-media');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete widget media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'widget-media');
