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

    console.log('Fetching campaign:', campaignId);

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const automaticSettings = campaign.metadata?.automaticSettings;
    if (!automaticSettings) {
      return new Response(
        JSON.stringify({ error: 'Not an automatic campaign' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Finding matching influencers...');

    let query = supabase
      .from('influencer_cards')
      .select('*, user_profiles!inner(user_id, full_name, email)')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .eq('moderation_status', 'approved');

    if (campaign.preferences.platforms?.length > 0) {
      query = query.in('platform', campaign.preferences.platforms);
    }

    const { data: cards, error: cardsError } = await query;

    if (cardsError) {
      throw cardsError;
    }

    console.log(`Found ${cards?.length || 0} cards in database`);

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No matching influencers found', offersCreated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const filtered = cards.filter(card => {
      const reach = card.reach || {};
      const serviceDetails = card.service_details || {};
      const audienceDemographics = card.audience_demographics || {};
      const followers = reach.followers || 0;

      if (campaign.preferences.audienceSize?.min > 0 && followers < campaign.preferences.audienceSize.min) {
        return false;
      }
      if (campaign.preferences.audienceSize?.max > 0 && followers > campaign.preferences.audienceSize.max) {
        return false;
      }

      if (campaign.preferences.contentTypes?.length > 0) {
        const cardContentTypes = serviceDetails.contentTypes || [];
        const normalizeType = (t: string) => t.toLowerCase().trim();
        const hasMatch = campaign.preferences.contentTypes.some((ft: string) =>
          cardContentTypes.some((ct: string) => normalizeType(ct).includes(normalizeType(ft)) || normalizeType(ft).includes(normalizeType(ct)))
        );
        if (!hasMatch) return false;
      }

      // Geography filtering
      const targetCountries = campaign.preferences.demographics?.countries || [];
      if (targetCountries.length > 0) {
        const cardCountries = Object.keys(audienceDemographics.topCountries) || [];
        const hasCountryMatch = cardCountries.some((country: string) =>
          targetCountries.some((target: string) =>
            target.toLowerCase() === country.toLowerCase()
          )
        );
        if (!hasCountryMatch) return false;
      }

      return true;
    });

    console.log(`${filtered.length} cards passed filtering`);

    const scored = filtered
      .filter(card => card.reach && card.reach.followers && card.reach.followers > 0)
      .map(card => {
        const reach = card.reach || {};
        const followers = reach.followers || 0;
        const engagement = reach.engagementRate || 0;
        const rating = card.rating || 0;
        const completed = card.completed_campaigns || 0;

        const maxFollowers = Math.max(...filtered.map(c => (c.reach?.followers && c.reach.followers > 0) ? c.reach.followers : 0), 1);
        const maxEngagement = Math.max(...filtered.map(c => c.reach?.engagementRate || 0), 1);
        const maxRating = 5;
        const maxCompleted = Math.max(...filtered.map(c => c.completed_campaigns || 0), 1);

        const score =
          (followers / maxFollowers) * automaticSettings.scoringWeights.followers +
          (engagement / maxEngagement) * automaticSettings.scoringWeights.engagement +
          (rating / maxRating) * automaticSettings.scoringWeights.rating +
          (completed / maxCompleted) * automaticSettings.scoringWeights.completedCampaigns;

        return { ...card, score };
      });

    scored.sort((a, b) => b.score - a.score);

    const topInfluencers = scored.slice(0, automaticSettings.targetInfluencerCount);

    console.log(`Creating offers for ${topInfluencers.length} influencers`);

    let offersCreated = 0;
    const errors: string[] = [];

    for (const influencer of topInfluencers) {
      try {
        const pricing = influencer.service_details?.pricing || {};
        const contentTypes = campaign.preferences.contentTypes || [];

        // Find matching content types with prices
        const matchingTypes: Array<{ type: string; price: number }> = [];
        for (const type of contentTypes) {
          const key = type.toLowerCase();
          if (pricing[key] && pricing[key] > 0) {
            matchingTypes.push({ type, price: pricing[key] });
          }
        }

        // Skip if no matching content types
        if (matchingTypes.length === 0) {
          console.log(`⚠️ No matching content types for ${influencer.user_id}`);
          continue;
        }

        // Choose content type with minimum price
        const bestContent = matchingTypes.reduce((min, current) =>
          current.price < min.price ? current : min
        );

        const contentType = bestContent.type;
        const suggestedBudget = bestContent.price;

        const timelineText = `${campaign.timeline.startDate} - ${campaign.timeline.endDate}`;

        const { error: offerError } = await supabase
          .from('collaboration_offers')
          .insert([{
            influencer_id: influencer.user_id,
            campaign_id: campaignId,
            advertiser_id: campaign.advertiser_id,
            influencer_card_id: influencer.id,
            details: {
              title: campaign.title,
              description: campaign.description,
              contentType: contentType,
              proposed_rate: suggestedBudget,
              currency: campaign.budget.currency || 'RUB',
              timeline: timelineText,
              suggestedBudget,
              deliverables: [{
                type: contentType,
                quantity: 1,
                description: `Создание ${contentType.toLowerCase()}`
              }]
            },
            status: 'pending',
            timeline: campaign.timeline,
            metadata: {
              isAutomatic: true,
              campaignId,
              score: influencer.score || 0,
              sentAt: new Date().toISOString()
            },
            current_stage: 'offer_sent',
            initiated_by: campaign.advertiser_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (offerError) {
          console.error('Failed to create offer:', offerError);
          errors.push(`Error for ${influencer.user_id}: ${offerError.message}`);
        } else {
          offersCreated++;
          console.log(`✓ Offer created for ${influencer.user_id} (score: ${influencer.score})`);
        }
      } catch (error) {
        console.error('Error creating offer:', error);
        errors.push(`Error for ${influencer.user_id}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: offersCreated > 0,
        offersCreated,
        totalCandidates: filtered.length,
        errors
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});