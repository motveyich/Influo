import { Application, CollaborationOffer } from '../../../core/types';

export interface UnifiedCollaboration {
  id: string;
  type: 'application' | 'offer';

  influencerId: string;
  advertiserId: string;

  title: string;
  description: string;

  status: string;
  proposedRate?: number;
  currency?: string;

  timeline?: string;
  deliverables?: string[];

  createdAt: string;
  updatedAt?: string;

  originalData: Application | CollaborationOffer;
}

export class CollaborationAdapter {
  static applicationToUnified(app: Application, currentUserId: string, targetInfo?: any): UnifiedCollaboration {
    const isApplicant = app.applicantId === currentUserId;

    let influencerId: string;
    let advertiserId: string;

    if (app.targetType === 'influencer_card') {
      influencerId = app.targetId;
      advertiserId = app.applicantId;
    } else if (app.targetType === 'advertiser_card') {
      influencerId = app.applicantId;
      advertiserId = app.targetId;
    } else {
      influencerId = isApplicant ? app.applicantId : app.targetId;
      advertiserId = isApplicant ? app.targetId : app.applicantId;
    }

    const title = `Заявка на ${
      app.targetType === 'influencer_card' ? 'карточку инфлюенсера' :
      app.targetType === 'advertiser_card' ? 'карточку рекламодателя' :
      'кампанию'
    }`;

    return {
      id: app.id,
      type: 'application',
      influencerId,
      advertiserId,
      title,
      description: app.applicationData?.message || 'Нет описания',
      status: app.status,
      proposedRate: app.applicationData?.proposedRate,
      currency: 'RUB',
      timeline: app.applicationData?.timeline,
      deliverables: app.applicationData?.deliverables || [],
      createdAt: app.createdAt,
      updatedAt: app.updatedAt || app.createdAt,
      originalData: app,
    };
  }

  static applicationToOfferFormat(app: Application, currentUserId: string): CollaborationOffer {
    const isApplicant = app.applicantId === currentUserId;

    let influencerId: string;
    let advertiserId: string;

    if (app.targetType === 'influencer_card') {
      influencerId = app.targetId;
      advertiserId = app.applicantId;
    } else if (app.targetType === 'advertiser_card') {
      influencerId = app.applicantId;
      advertiserId = app.targetId;
    } else {
      influencerId = isApplicant ? app.applicantId : app.targetId;
      advertiserId = isApplicant ? app.targetId : app.applicantId;
    }

    const title = `Заявка на ${
      app.targetType === 'influencer_card' ? 'карточку инфлюенсера' :
      app.targetType === 'advertiser_card' ? 'карточку рекламодателя' :
      'кампанию'
    }`;

    return {
      offer_id: app.id,
      id: app.id,
      influencerId,
      advertiserId,
      campaignId: undefined,
      influencerCardId: app.targetType === 'influencer_card' ? app.targetReferenceId : undefined,
      initiatedBy: app.applicantId,

      title,
      description: app.applicationData?.message || 'Нет описания',
      proposedRate: app.applicationData?.proposedRate || 0,
      currency: 'RUB',
      deliverables: app.applicationData?.deliverables || [],

      status: app.status as any,
      currentStage: 'negotiation' as any,

      timeline: {
        deadline: app.applicationData?.timeline || '',
        startDate: app.createdAt,
      },

      details: app.applicationData || {},
      metadata: app.metadata || { viewCount: 0 },

      influencerResponse: 'pending',
      advertiserResponse: 'pending',

      createdAt: app.createdAt,
      updatedAt: app.updatedAt || app.createdAt,
    } as CollaborationOffer;
  }

  static offerToUnified(offer: CollaborationOffer): UnifiedCollaboration {
    return {
      id: offer.offer_id || offer.id || '',
      type: 'offer',
      influencerId: offer.influencerId,
      advertiserId: offer.advertiserId,
      title: offer.title || 'Без названия',
      description: offer.description || '',
      status: offer.status,
      proposedRate: offer.proposedRate,
      currency: offer.currency || 'RUB',
      timeline: offer.timeline?.deadline || offer.timeline?.startDate || '',
      deliverables: offer.deliverables || [],
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt || offer.createdAt,
      originalData: offer,
    };
  }

  static mergeAndSort(applications: Application[], offers: CollaborationOffer[], currentUserId: string): UnifiedCollaboration[] {
    const unifiedApps = applications.map(app =>
      this.applicationToUnified(app, currentUserId)
    );

    const unifiedOffers = offers.map(offer =>
      this.offerToUnified(offer)
    );

    const allCollaborations = [...unifiedApps, ...unifiedOffers];

    allCollaborations.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return allCollaborations;
  }

  static isActiveStatus(status: string): boolean {
    return ['pending', 'sent', 'accepted', 'in_progress'].includes(status);
  }

  static isCompletedStatus(status: string): boolean {
    return ['completed', 'declined', 'cancelled', 'terminated'].includes(status);
  }
}
