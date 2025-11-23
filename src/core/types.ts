// Core types for the Influo platform
export interface SocialMediaLink {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter';
  url: string;
  username?: string;
  verified?: boolean;
}

export interface InfluencerMetrics {
  totalFollowers: number;
  engagementRate: number;
  averageViews: number;
  monthlyGrowth?: number;
}

export interface AudienceDemographics {
  ageGroups: Record<string, number>;
  genderSplit: Record<string, number>;
  topCountries: string[];
  interests: string[];
}

export interface AdvertiserPreferences {
  preferredPlatforms: string[];
  budgetRange: {
    min: number;
    max: number;
    currency: string;
  };
  targetAudience: {
    ageRange: [number, number];
    genders: string[];
    countries: string[];
    interests: string[];
  };
  campaignTypes: string[];
}

export interface UserProfile {
  userId: string;
  email: string;
  fullName: string;
  username?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  
  // Influencer data
  influencerData?: {
    socialMediaLinks: SocialMediaLink[];
    metrics: InfluencerMetrics;
    audienceDemographics?: AudienceDemographics;
    contentCategories: string[];
    availableForCollabs: boolean;
    pricing?: {
      post: number;
      story: number;
      reel: number;
      video: number;
    };
  };
  
  // Advertiser data
  advertiserData?: {
    companyName?: string;
    industry?: string;
    campaignPreferences: AdvertiserPreferences;
    previousCampaigns: number;
    averageBudget: number;
  };
  
  // Profile completion tracking
  profileCompletion: {
    basicInfo: boolean;
    influencerSetup: boolean;
    advertiserSetup: boolean;
    overallComplete: boolean;
    completionPercentage: number;
  };
  
  unifiedAccountInfo: {
    isVerified: boolean;
    joinedAt: string;
    lastActive: string;
    accountType: 'influencer' | 'advertiser' | 'both';
    completedDeals?: number;
    totalReviews?: number;
    averageRating?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InfluencerCard {
  id: string;
  userId: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'multi';
  reach: {
    followers: number;
    averageViews: number;
    engagementRate: number;
  };
  audienceDemographics: {
    ageGroups: Record<string, number>;
    genderSplit: Record<string, number>;
    topCountries: Record<string, number> | string[];
    interests: string[];
  };
  serviceDetails: {
    contentTypes: string[];
    pricing: Record<string, number>;
    currency: string;
    blacklistedProductCategories: string[];
  };
  rating: number;
  completedCampaigns: number;
  isActive: boolean;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertiserCard {
  id: string;
  userId: string;
  companyName: string;
  campaignTitle: string;
  campaignDescription: string;
  platform: 'vk' | 'youtube' | 'instagram' | 'telegram' | 'ok' | 'facebook' | 'twitter' | 'tiktok' | 'twitch' | 'rutube' | 'yandex_zen' | 'likee';
  productCategories: string[];
  budget: {
    amount: number;
    currency: string;
  };
  serviceFormat: string[];
  campaignDuration: {
    startDate: string;
    endDate: string;
  };
  influencerRequirements: {
    minFollowers: number;
    maxFollowers?: number;
    minEngagementRate?: number;
  };
  targetAudience: {
    interests: string[];
  };
  contactInfo: {
    email: string;
    phone?: string;
    website?: string;
  };
  campaignStats?: {
    completedCampaigns: number;
    averageRating: number;
    totalInfluencersWorked: number;
    successRate: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  campaignId: string;
  advertiserId: string;
  title: string;
  description: string;
  brand: string;
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  preferences: {
    platforms: string[];
    contentTypes: string[];
    audienceSize: {
      min: number;
      max: number;
    };
    demographics: {
      ageRange: [number, number];
      genders: string[];
      countries: string[];
    };
  };
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'in_progress';
  enableChat?: boolean;
  timeline: {
    startDate: string;
    endDate: string;
    deliverables: Array<{
      type: string;
      dueDate: string;
      completed: boolean;
    }>;
  };
  metrics: {
    applicants: number;
    accepted: number;
    impressions: number;
    engagement: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CollaborationForm {
  id: string;
  formFields: {
    campaignId: string;
    message: string;
    proposedRate: number;
    deliverables: string[];
    timeline: string;
    additionalNotes?: string;
  };
  linkedCampaign: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  messageContent: string;
  messageType: 'text' | 'image' | 'file' | 'offer';
  timestamp: string;
  isRead: boolean;
  metadata?: {
    collaborationFormId?: string;
    campaignId?: string;
    offerId?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  };
}


export interface AnalyticsEvent {
  eventId: string;
  userId: string;
  eventType: 'campaign_created' | 'offer_sent' | 'offer_received' | 'chat_message' | 'profile_view' | 'search_performed';
  eventData: Record<string, any>;
  timestamp: string;
  sessionId: string;
  metadata: {
    userAgent: string;
    ipAddress?: string;
    referrer?: string;
  };
}

// Real-time event types
export interface RealtimeEvent {
  type: 'chat_message' | 'offer_update' | 'campaign_update' | 'notification';
  data: any;
  userId: string;
  timestamp: string;
}

// Application system types
export interface Application {
  id: string;
  applicantId: string;
  targetId: string;
  targetType: 'influencer_card' | 'advertiser_card' | 'campaign';
  targetReferenceId: string;
  applicationData: {
    status: 'pending' | 'sent' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';
    proposedRate?: number;
    timeline?: string;
    deliverables?: string[];
    additionalInfo?: string;
  };
  status: 'pending' | 'sent' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';
  responseData?: {
    message?: string;
    counterOffer?: any;
    declineReason?: string;
  };
  timeline: {
    pendingAt: string;
    respondedAt?: string;
    completedAt?: string;
  };
  metadata: {
    viewCount: number;
    lastViewed?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  targetType: 'influencer_card' | 'advertiser_card' | 'campaign' | 'profile';
  targetId: string;
  metadata: {
    addedAt: string;
    notes?: string;
  };
  createdAt: string;
}

export interface CardAnalytics {
  id: string;
  cardType: 'influencer' | 'advertiser';
  cardId: string;
  ownerId: string;
  metrics: {
    totalViews: number;
    uniqueViews: number;
    applications: number;
    acceptanceRate: number;
    averageResponseTime: number;
    rating: number;
    completedProjects: number;
  };
  dailyStats: Record<string, {
    views: number;
    applications: number;
    messages: number;
  }>;
  campaignStats: Array<{
    campaignId: string;
    performance: number;
    engagement: number;
    roi: number;
  }>;
  engagementData: {
    clickThroughRate: number;
    messageRate: number;
    favoriteRate: number;
  };
  dateRecorded: string;
  createdAt: string;
  updatedAt: string;
}

// Role system types
export type UserRole = 'user' | 'moderator' | 'admin';
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type ReportType = 'spam' | 'inappropriate' | 'fake' | 'harassment' | 'copyright' | 'other';

export interface UserRoleData {
  id: string;
  userId: string;
  role: UserRole;
  assignedBy?: string;
  assignedAt: string;
  expiresAt?: string;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  targetType: 'user_profile' | 'influencer_card' | 'campaign' | 'chat_message' | 'offer';
  targetId: string;
  reportType: ReportType;
  description: string;
  evidence: Record<string, any>;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  resolutionNotes?: string;
  priority: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationQueueItem {
  id: string;
  contentType: 'user_profile' | 'influencer_card' | 'campaign' | 'chat_message' | 'offer';
  contentId: string;
  contentData: Record<string, any>;
  moderationStatus: ModerationStatus;
  flaggedReasons: string[];
  autoFlagged: boolean;
  filterMatches: Record<string, any>;
  assignedModerator?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  priority: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  actionType: string;
  targetType?: string;
  targetId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt: string;
}

export interface ContentFilter {
  id: string;
  filterName: string;
  filterType: 'profanity' | 'contact_info' | 'spam' | 'custom';
  pattern: string;
  isRegex: boolean;
  isActive: boolean;
  severity: number;
  action: 'flag' | 'block' | 'review';
  createdBy?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Platform content management types

export interface PlatformUpdate {
  id: string;
  title: string;
  description: string;
  content?: string;
  type: 'feature' | 'improvement' | 'announcement' | 'maintenance';
  isImportant: boolean;
  publishedAt: string;
  isPublished: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformEvent {
  id: string;
  title: string;
  description: string;
  content?: string;
  type: 'campaign_launch' | 'achievement' | 'contest' | 'milestone' | 'announcement' | 'maintenance';
  participantCount?: number;
  publishedAt: string;
  isPublished: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// AI Chat Assistant types
export interface AIChatThread {
  id: string;
  conversationId: string;
  user1Id: string;
  user2Id: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AIChatMessage {
  id: string;
  threadId: string;
  messageType: 'user_question' | 'ai_response' | 'ai_analysis' | 'ai_suggestion';
  content: string;
  metadata: {
    analysisType?: 'conversation_flow' | 'sentiment' | 'recommendation';
    confidence?: number;
    suggestedActions?: string[];
    conversationStatus?: 'constructive' | 'neutral' | 'concerning';
    originalMessageId?: string;
  };
  createdAt: string;
}

// Offers system types
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'terminated' | 'cancelled';
export type PaymentRequestStatus = 'draft' | 'pending' | 'paying' | 'paid' | 'confirmed' | 'failed' | 'cancelled';
export type CollaborationStage = 'pre_payment' | 'work_in_progress' | 'post_payment' | 'completed';

export interface CollaborationOffer {
  offer_id: string; // Primary key в таблице offers
  id?: string; // Deprecated alias для обратной совместимости
  influencerId: string;
  advertiserId: string;
  campaignId?: string;
  influencerCardId?: string;
  initiatedBy?: string;

  // Offer details
  title: string;
  description: string;
  proposedRate: number;
  currency: string;
  deliverables: string[];
  timeline: string;
  platform?: string;
  integrationType?: string;
  contentType?: string;
  suggestedBudget?: number;

  // Status and stages
  status: OfferStatus;
  currentStage: 'negotiation' | 'payment' | 'work' | 'completion' | 'review';

  // Response tracking
  influencerResponse: 'pending' | 'accepted' | 'declined' | 'counter';
  advertiserResponse: 'pending' | 'accepted' | 'declined' | 'counter';

  // Acceptance details
  acceptedAt?: string;
  acceptedRate?: number;
  finalTerms?: Record<string, any>;

  // Completion details
  completedAt?: string;
  terminatedAt?: string;
  terminationReason?: string;

  // Reviews
  influencerReviewed: boolean;
  advertiserReviewed: boolean;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequest {
  id: string;
  offerId: string;
  createdBy: string;
  
  // Payment details
  amount: number;
  currency: string;
  paymentType: 'prepay' | 'postpay' | 'full';
  paymentMethod: string;
  
  // Payment instructions
  paymentDetails: {
    bankAccount?: string;
    cardNumber?: string;
    paypalEmail?: string;
    cryptoAddress?: string;
    accountHolder?: string;
    bankName?: string;
    routingNumber?: string;
  };
  instructions?: string;
  
  // Status
  status: PaymentRequestStatus;
  isFrozen: boolean;
  
  // Confirmation details
  confirmedBy?: string;
  confirmedAt?: string;
  paymentProof?: Record<string, any>;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CollaborationReview {
  id: string;
  offerId: string;
  reviewerId: string;
  revieweeId: string;
  
  // Review content
  rating: number;
  title: string;
  comment: string;
  
  // Review metadata
  isPublic: boolean;
  helpfulVotes: number;
  metadata: Record<string, any>;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface OfferStatusHistory {
  id: string;
  offerId: string;
  previousStatus?: OfferStatus;
  newStatus: OfferStatus;
  changedBy: string;
  reason?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface PaymentStatusHistory {
  id: string;
  paymentRequestId: string;
  previousStatus?: PaymentRequestStatus;
  newStatus: PaymentRequestStatus;
  changedBy: string;
  reason?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface AIAnalysisResult {
  conversationStatus: 'constructive' | 'neutral' | 'concerning';
  sentiment: 'positive' | 'neutral' | 'negative';
  suggestions: string[];
  nextSteps: string[];
  confidence: number;
  riskFactors?: string[];
}

// User Settings Types
export interface UserSettings {
  id: string;
  userId: string;
  
  // Security settings
  security: {
    twoFactorEnabled: boolean;
    passwordLastChanged: string;
    activeSessions: Array<{
      id: string;
      deviceInfo: string;
      lastActive: string;
      ipAddress?: string;
      isCurrent: boolean;
    }>;
  };
  
  // Privacy settings
  privacy: {
    hideEmail: boolean;
    hidePhone: boolean;
    hideSocialMedia: boolean;
    profileVisibility: 'public' | 'contacts_only' | 'private';
  };
  
  // Notification settings
  notifications: {
    email: {
      applications: boolean;
      messages: boolean;
      payments: boolean;
      reviews: boolean;
      marketing: boolean;
    };
    push: {
      enabled: boolean;
      applications: boolean;
      messages: boolean;
      payments: boolean;
      reviews: boolean;
    };
    frequency: 'immediate' | 'daily' | 'weekly';
    soundEnabled: boolean;
  };
  
  // Interface settings
  interface: {
    theme: 'light' | 'dark';
    language: 'ru' | 'en';
    fontSize: 'small' | 'medium' | 'large';
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
    timezone: string;
  };
  
  // Account status
  account: {
    isActive: boolean;
    isDeactivated: boolean;
    deactivatedAt?: string;
    deactivationReason?: string;
  };

  createdAt: string;
  updatedAt: string;
}

// Auto-campaigns
export interface AutoCampaign {
  id: string;
  advertiserId: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'closed' | 'completed';
  budgetMin: number;
  budgetMax: number;
  audienceMin: number;
  audienceMax: number;
  targetInfluencersCount: number;
  contentTypes: string[];
  platforms: string[];
  targetCountries: string[];
  targetAudienceInterests: string[];
  productCategories: string[];
  enableChat: boolean;
  startDate?: string;
  endDate?: string;
  targetPricePerFollower?: number;
  sentOffersCount: number;
  acceptedOffersCount: number;
  completedOffersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutoCampaignFormData {
  title: string;
  description?: string;
  budgetMin: number;
  budgetMax: number;
  audienceMin: number;
  audienceMax: number;
  targetInfluencersCount: number;
  contentTypes: string[];
  platforms: string[];
  targetCountries: string[];
  targetAudienceInterests: string[];
  productCategories: string[];
  enableChat: boolean;
  startDate?: string;
  endDate?: string;
}