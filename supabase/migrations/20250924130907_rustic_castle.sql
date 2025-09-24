```diff
--- a/supabase/migrations/20250924124906_azure_forest.sql
+++ b/supabase/migrations/20250924124906_azure_forest.sql
@@ -1,2 +1,5 @@
 ALTER TABLE public.offers
 DROP CONSTRAINT offers_status_check;
+
+ALTER TABLE public.offers
+ADD CONSTRAINT offers_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'counter'::text, 'completed'::text, 'in_progress'::text, 'terminated'::text, 'cancelled'::text]));
```