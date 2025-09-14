@@ .. @@
   created_at timestamptz DEFAULT now(),
   updated_at timestamptz DEFAULT now(),
   
   CONSTRAINT collaboration_reviews_pkey PRIMARY KEY (id),
-  CONSTRAINT cannot_review_self CHECK (reviewer_id != reviewee_id),
-  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
-  CONSTRAINT participants_check CHECK (
-    EXISTS (
-      SELECT 1 FROM collaboration_offers 
-      WHERE id = collaboration_reviews.offer_id 
-      AND (influencer_id = collaboration_reviews.reviewer_id OR advertiser_id = collaboration_reviews.reviewer_id)
-    )
-  )
+  CONSTRAINT cannot_review_self CHECK (reviewer_id != reviewee_id),
+  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5)
 );
 
 -- Создание таблицы истории статусов предложений