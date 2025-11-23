import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaignId } = await req.json();

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: 'campaignId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Auto-Campaign] Processing campaign:', campaignId);

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_automatic', true)
      .single();

    if (campaignError || !campaign) {
      console.error('[Auto-Campaign] Campaign not found:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found or not automatic' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = campaign.automatic_settings;
    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'Missing automatic settings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Auto-Campaign] Finding influencers...');

    let query = supabase
      .from('influencer_cards')
      .select('*, user_profiles!inner(user_id, full_name, email)')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .eq('moderation_status', 'approved')
      .gte('rating', settings.minRating || 0);

    if (campaign.preferences.platforms?.length > 0) {
      query = query.in('platform', campaign.preferences.platforms);
    }

    const { data: cards, error: cardsError } = await query;

    if (cardsError) {
      console.error('[Auto-Campaign] Error fetching cards:', cardsError);
      throw cardsError;
    }

    if (!cards || cards.length === 0) {
      console.log('[Auto-Campaign] No cards found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          offersCreated: 0, 
          message: 'No matching influencers found' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Auto-Campaign] Found ${cards.length} cards, filtering...`);

    const filtered = cards.filter(card => {
      const reach = card.reach || {};
      const serviceDetails = card.service_details || {};
      const audienceDemographics = card.audience_demographics || {};
      const followers = reach.followers || 0;

      if (followers === 0) return false;

      if (campaign.preferences.audienceSize?.min && followers < campaign.preferences.audienceSize.min) {
        return false;
      }
      if (campaign.preferences.audienceSize?.max && followers > campaign.preferences.audienceSize.max) {
        return false;
      }

      if (campaign.preferences.contentTypes?.length > 0) {
        const cardContentTypes = serviceDetails.contentTypes || [];
        const hasMatch = campaign.preferences.contentTypes.some((prefType: string) =>
          cardContentTypes.some((cardType: string) => 
            cardType.toLowerCase().includes(prefType.toLowerCase()) ||
            prefType.toLowerCase().includes(cardType.toLowerCase())
          )
        );
        if (!hasMatch) return false;
      }

      if (campaign.preferences.demographics?.countries?.length > 0) {
        const cardCountries = Object.keys(audienceDemographics.topCountries || {});
        const hasCountryMatch = campaign.preferences.demographics.countries.some((prefCountry: string) =>
          cardCountries.some((cardCountry: string) => 
            cardCountry.toLowerCase() === prefCountry.toLowerCase()
          )
        );
        if (!hasCountryMatch) return false;
      }

      return true;
    });

    console.log(`[Auto-Campaign] ${filtered.length} cards passed filtering`);

    if (filtered.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          offersCreated: 0, 
          message: 'No influencers match criteria' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scored = filtered
      .filter(card => card.reach && card.reach.followers > 0)
      .map(card => {
        const reach = card.reach || {};
        const followers = reach.followers || 0;
        const engagement = reach.engagementRate || 0;
        const rating = card.rating || 0;
        const completed = card.completed_campaigns || 0;

        const weights = settings.scoringWeights || { followers: 30, engagement: 30, rating: 20, completedCampaigns: 20 };
        const maxFollowers = Math.max(...filtered.map((c: any) => c.reach?.followers || 0), 1);
        const maxEngagement = Math.max(...filtered.map((c: any) => c.reach?.engagementRate || 0), 1);
        const maxCompleted = Math.max(...filtered.map((c: any) => c.completed_campaigns || 0), 1);

        const score = 
          (followers / maxFollowers) * (weights.followers / 100) +
          (engagement / maxEngagement) * (weights.engagement / 100) +
          (rating / 5) * (weights.rating / 100) +
          (completed / maxCompleted) * (weights.completedCampaigns / 100);

        return { ...card, score: score * 100 };
      });

    scored.sort((a, b) => b.score - a.score);

    const targetCount = settings.targetInfluencerCount || 5;
    const topInfluencers = scored.slice(0, targetCount);

    console.log(`[Auto-Campaign] Creating offers for ${topInfluencers.length} influencers`);

    let offersCreated = 0;
    const errors: string[] = [];

    for (const influencer of topInfluencers) {
      try {
        const pricing = influencer.service_details?.pricing || {};
        const contentTypes = campaign.preferences.contentTypes || [];

        const matchingTypes: Array<{ type: string; price: number }> = [];
        for (const type of contentTypes) {
          const key = type.toLowerCase();
          if (pricing[key] && pricing[key] > 0) {
            matchingTypes.push({ type, price: pricing[key] });
          }
        }

        if (matchingTypes.length === 0) {
          console.log(`[Auto-Campaign] No matching content types for ${influencer.user_id}`);
          continue;
        }

        const bestContent = matchingTypes.reduce((min, current) =>
          current.price < min.price ? current : min
        );

        const { error: offerError } = await supabase
          .from('offers')
          .insert([{
            influencer_id: influencer.user_id,
            campaign_id: campaignId,
            advertiser_id: campaign.advertiser_id,
            influencer_card_id: influencer.id,
            details: {
              title: campaign.title,
              description: campaign.description,
              contentType: bestContent.type,
              proposed_rate: bestContent.price,
              currency: campaign.budget.currency || 'RUB',
              timeline: `${campaign.timeline.startDate} - ${campaign.timeline.endDate}`,
              deliverables: [{
                type: bestContent.type,
                quantity: 1,
                description: `Создание ${bestContent.type.toLowerCase()}`
              }]
            },
            status: 'pending',
            timeline: campaign.timeline,
            metadata: {
              isAutomatic: true,
              score: influencer.score || 0,
              sentAt: new Date().toISOString()
            },
            current_stage: 'offer_sent',
            initiated_by: campaign.advertiser_id
          }]);

        if (offerError) {
          console.error('[Auto-Campaign] Failed to create offer:', offerError);
          errors.push(`Error for ${influencer.user_id}: ${offerError.message}`);
        } else {
          offersCreated++;
          console.log(`[Auto-Campaign] ✓ Offer created for ${influencer.user_id} (score: ${influencer.score?.toFixed(1)})`);
        }
      } catch (error) {
        console.error('[Auto-Campaign] Error creating offer:', error);
        errors.push(`Error for ${influencer.user_id}: ${error.message}`);
      }
    }

    console.log(`[Auto-Campaign] Completed: ${offersCreated} offers created`);

    return new Response(
      JSON.stringify({
        success: offersCreated > 0,
        offersCreated,
        targetCount,
        totalCandidates: filtered.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Auto-Campaign] Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});