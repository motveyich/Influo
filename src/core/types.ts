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
    responseTime: string;
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
    topCountries: string[];
    interests: string[];
  };
  serviceDetails: {
    contentTypes: string[];
    pricing: {
      post: number;
      story: number;
      reel: number;
      video: number;
    };
    availability: boolean;
    responseTime: string;
    description: string;
    deliveryTime: string;
    revisions: number;
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
  productType: string;
  budget: {
    type: 'fixed' | 'range';
    amount?: number;
    min?: number;
    max?: number;
    currency: string;
  };
  targetAudience: {
    description: string;
    categories: string[];
    ageRange: [number, number];
    genders: string[];
    countries: string[];
  };
  campaignFormat: string[];
  campaignDuration: {
    startDate: string;
    endDate: string;
    isFlexible: boolean;
  };
  influencerRequirements: {
    platforms: string[];
    minReach: number;
    maxReach?: number;
    contentThemes: string[];
    engagementRate?: number;
    locations?: string[];
  };
  contactInfo: {
    email: string;
    phone?: string;
    website?: string;
    preferredContact: 'email' | 'phone' | 'chat';
  };
  campaignStats?: {
    completedCampaigns: number;
    averageRating: number;
    totalInfluencersWorked: number;
    successRate: number;
  };
  isActive: boolean;
  isPriority: boolean;
  priority: 'low' | 'medium' | 'high';
  applicationDeadline?: string;
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
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
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

export interface Offer {
  offerId: string;
  influencerId: string;
  campaignId: string;
  advertiserId: string;
  details: {
    rate: number;
    currency: string;
    deliverables: string[];
    timeline: string;
    terms: string;
  };
  status: 'pending' | 'accepted' | 'declined' | 'counter' | 'completed' | 'withdrawn' | 'info_requested';
  timeline: {
    createdAt: string;
    respondedAt?: string;
    completedAt?: string;
    withdrawnAt?: string;
  };
  messages: string[];
  metadata: {
    viewCount: number;
    lastViewed?: string;
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
export interface PlatformNews {
  id: string;
  title: string;
  summary: string;
  content?: string;
  url?: string;
  source: string;
  category: 'industry' | 'platform' | 'trends';
  publishedAt: string;
  isPublished: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

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

// Payment Window types (rebuilt)
export type PaymentStatus = 'pending' | 'paying' | 'paid' | 'failed' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentType = 'full_prepay' | 'partial_prepay_postpay' | 'postpay';

export interface PaymentRequest {
  id: string;
  payerId: string; // Рекламодатель
  payeeId: string; // Инфлюенсер 
  relatedOfferId?: string;
  relatedApplicationId?: string;
  amount: number;
  currency: string;
  paymentType: PaymentType;
  paymentStage: 'prepay' | 'postpay';
  paymentDetails: {
    cardNumber?: string;
    bankAccount?: string;
    paypalEmail?: string;
    cryptoAddress?: string;
    instructions: string;
  };
  status: PaymentStatus;
  isEditable: boolean;
  statusHistory: Array<{
    status: PaymentStatus;
    changedBy: string;
    timestamp: string;
    note?: string;
  }>;
  metadata: {
    createdBy: string;
    totalAmount?: number;
    paidAmount?: number;
    remainingAmount?: number;
    prepayPercentage?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AIAnalysisResult {
  conversationStatus: 'constructive' | 'neutral' | 'concerning';
  sentiment: 'positive' | 'neutral' | 'negative';
  suggestions: string[];
  nextSteps: string[];
  confidence: number;
  riskFactors?: string[];
}