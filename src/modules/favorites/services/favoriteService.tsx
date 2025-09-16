@@ .. @@
   async isFavorite(userId: string, targetType: string, targetId: string): Promise<boolean> {
     try {
      // Skip removing from favorites for non-UUID target IDs
      if (!this.isValidUUID(targetId)) {
        console.warn('Cannot remove mock data from favorites:', targetId);
        return;
      }

      // Skip adding to favorites for non-UUID target IDs
      if (!this.isValidUUID(favoriteData.targetId!)) {
        throw new Error('Cannot add mock data to favorites');
      }

       // Check if Supabase is configured before making any requests
       if (!isSupabaseConfigured()) {
         console.warn('Supabase not configured, returning false for favorite check');
         return false;
       }
 
+      // Skip favorite check for non-UUID target IDs (like mock advertiser cards)
+      if (!this.isValidUUID(targetId)) {
+        console.warn('Invalid UUID for target_id, skipping favorite check:', targetId);
+        return false;
+      }
+
       // Проверяем, что таблица существует
       const { error: tableError } = await supabase
         .from('favorites')
         .select('id')
         .limit(1);
       
       if (tableError && tableError.code === '42P01') {
         console.warn('Favorites table does not exist yet');
         return false;
       }
 
       const favorite = await this.getFavorite(userId, targetType, targetId);
       return !!favorite;
     } catch (error) {
       console.error('Failed to check if favorite:', error);
       return false;
     }
   }

  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }