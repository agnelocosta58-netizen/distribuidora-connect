
CREATE POLICY "company-assets read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'company-assets');
CREATE POLICY "company-assets insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets');
CREATE POLICY "company-assets update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-assets');
CREATE POLICY "company-assets delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-assets');
