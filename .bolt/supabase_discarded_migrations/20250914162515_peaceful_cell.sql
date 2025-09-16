@@ .. @@
     amount numeric(10,2) NOT NULL CHECK (amount > 0),
     currency text NOT NULL DEFAULT 'USD',
     payment_type payment_type NOT NULL DEFAULT 'full_prepay',
     payment_method text NOT NULL DEFAULT 'bank_transfer',
     payment_details jsonb NOT NULL DEFAULT '{}',
     instructions text,
     status payment_request_status NOT NULL DEFAULT 'draft',
     is_frozen boolean NOT NULL DEFAULT false,
     confirmed_by uuid,
     confirmed_at timestamptz,
     payment_proof jsonb DEFAULT '{}',
     metadata jsonb DEFAULT '{}',
     created_at timestamptz DEFAULT now(),
-    updated_at timestamptz DEFAULT now(),
-    
-    -- Constraints
-    CONSTRAINT different_users CHECK (
-      EXISTS (
-        SELECT 1 FROM collaboration_offers 
-        WHERE id = payment_requests.offer_id 
-        AND influencer_id != advertiser_id
-      )
-    )
+    updated_at timestamptz DEFAULT now()
   );
 
   -- Indexes for payment_requests
@@ .. @@
     comment text NOT NULL,
     is_public boolean NOT NULL DEFAULT true,
     helpful_votes integer DEFAULT 0,
     metadata jsonb DEFAULT '{}',
     created_at timestamptz DEFAULT now(),
-    updated_at timestamptz DEFAULT now(),
-    
-    -- Constraints
-    CONSTRAINT cannot_review_self CHECK (reviewer_id != reviewee_id),
-    CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
-    CONSTRAINT participants_check CHECK (
-      EXISTS (
-        SELECT 1 FROM collaboration_offers 
-        WHERE id = collaboration_reviews.offer_id 
-        AND (influencer_id = collaboration_reviews.reviewer_id OR advertiser_id = collaboration_reviews.reviewer_id)
-        AND (influencer_id = collaboration_reviews.reviewee_id OR advertiser_id = collaboration_reviews.reviewee_id)
-      )
-    )
+    updated_at timestamptz DEFAULT now()
   );
 
+  -- Add simple constraints without subqueries
+  ALTER TABLE collaboration_reviews 
+  ADD CONSTRAINT cannot_review_self CHECK (reviewer_id != reviewee_id);
+  
+  ALTER TABLE collaboration_reviews 
+  ADD CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5);
+
   -- Indexes for collaboration_reviews
   CREATE INDEX idx_collaboration_reviews_offer_id ON collaboration_reviews(offer_id);
   CREATE INDEX idx_collaboration_reviews_reviewer_id ON collaboration_reviews(reviewer_id);