// Типы для системы интернационализации
export type Language = 'ru' | 'en';

export interface TranslationKeys {
  // Common
  common: {
    loading: string;
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    create: string;
    search: string;
    filter: string;
    clear: string;
    add: string;
    remove: string;
    close: string;
    back: string;
    next: string;
    submit: string;
    send: string;
    accept: string;
    decline: string;
    view: string;
    refresh: string;
    retry: string;
    yes: string;
    no: string;
    required: string;
    optional: string;
    all: string;
    none: string;
    active: string;
    inactive: string;
    online: string;
    offline: string;
    verified: string;
    unverified: string;
    available: string;
    unavailable: string;
  };

  // Navigation
  nav: {
    profiles: string;
    campaigns: string;
    influencerCards: string;
    chat: string;
    offers: string;
    analytics: string;
    signOut: string;
  };

  // Auth
  auth: {
    signIn: string;
    signUp: string;
    email: string;
    password: string;
    confirmPassword: string;
    fullName: string;
    createAccount: string;
    alreadyHaveAccount: string;
    noAccount: string;
    signInLink: string;
    signUpLink: string;
    welcomeTitle: string;
    welcomeSubtitle: string;
    getStarted: string;
    newUserInfo: string;
    existingUserInfo: string;
    signOutSuccess: string;
    signInSuccess: string;
    accountCreated: string;
    invalidCredentials: string;
    emailNotConfirmed: string;
    userAlreadyExists: string;
    passwordTooShort: string;
    authFailed: string;
    signOutFailed: string;
  };

  // Profile
  profile: {
    title: string;
    subtitle: string;
    completeProfile: string;
    editProfile: string;
    basicInfo: string;
    influencerSettings: string;
    advertiserSettings: string;
    socialMediaAccounts: string;
    audienceMetrics: string;
    contentCategories: string;
    companyInfo: string;
    budgetRange: string;
    profileCompletion: string;
    completionBanner: {
      title: string;
      completeNow: string;
      suggestions: string;
      missingSteps: {
        basicInfo: string;
        influencerSetup: string;
        advertiserSetup: string;
      };
    };
    fields: {
      fullName: string;
      email: string;
      bio: string;
      location: string;
      website: string;
      avatar: string;
      companyName: string;
      industry: string;
      totalFollowers: string;
      engagementRate: string;
      averageViews: string;
      responseTime: string;
      previousCampaigns: string;
      averageBudget: string;
      minBudget: string;
      maxBudget: string;
      currency: string;
    };
    placeholders: {
      fullName: string;
      email: string;
      bio: string;
      location: string;
      website: string;
      companyName: string;
      category: string;
      socialUsername: string;
      socialUrl: string;
    };
    validation: {
      fullNameRequired: string;
      emailRequired: string;
      emailInvalid: string;
      bioRequired: string;
      bioTooShort: string;
      emailExists: string;
    };
    success: {
      created: string;
      updated: string;
      socialLinked: string;
      socialUnlinked: string;
    };
    errors: {
      loadFailed: string;
      createFailed: string;
      updateFailed: string;
      linkSocialFailed: string;
    };
  };

  // Campaigns
  campaigns: {
    title: string;
    subtitle: string;
    myCampaigns: string;
    viewAll: string;
    createCampaign: string;
    editCampaign: string;
    findInfluencers: string;
    campaignInfo: string;
    budget: string;
    timeline: string;
    preferences: string;
    platforms: string;
    contentTypes: string;
    audienceSize: string;
    demographics: string;
    deliverables: string;
    status: {
      draft: string;
      active: string;
      paused: string;
      completed: string;
      cancelled: string;
    };
    fields: {
      title: string;
      description: string;
      brand: string;
      startDate: string;
      endDate: string;
      targetCountries: string;
      ageRange: string;
      genders: string;
    };
    stats: {
      total: string;
      active: string;
      totalBudget: string;
      applicants: string;
      accepted: string;
      impressions: string;
    };
    validation: {
      titleRequired: string;
      titleTooShort: string;
      brandRequired: string;
      descriptionRequired: string;
      descriptionTooShort: string;
      minBudgetRequired: string;
      maxBudgetRequired: string;
      budgetInvalid: string;
      platformsRequired: string;
      contentTypesRequired: string;
      startDateRequired: string;
      endDateRequired: string;
      timelineInvalid: string;
      startDatePast: string;
    };
    success: {
      created: string;
      updated: string;
      deleted: string;
      applied: string;
    };
    errors: {
      loadFailed: string;
      createFailed: string;
      updateFailed: string;
      deleteFailed: string;
      applyFailed: string;
    };
    noResults: {
      title: string;
      subtitle: string;
      suggestions: string;
    };
  };

  // Chat
  chat: {
    title: string;
    searchConversations: string;
    typeMessage: string;
    sendCollabRequest: string;
    noConversationSelected: string;
    selectConversation: string;
    lastSeen: string;
    connectionLost: string;
    reconnecting: string;
    rateLimitWarning: string;
    collaborationRequest: {
      title: string;
      campaignTitle: string;
      message: string;
      proposedRate: string;
      deliverables: string;
      timeline: string;
      additionalNotes: string;
      send: string;
    };
    validation: {
      campaignTitleRequired: string;
      messageRequired: string;
      messageTooShort: string;
      rateRequired: string;
      deliverablesRequired: string;
      timelineRequired: string;
    };
    success: {
      requestSent: string;
      messageSent: string;
    };
    errors: {
      loadFailed: string;
      sendFailed: string;
      rateLimitExceeded: string;
      deliveryDelayed: string;
    };
  };

  // Offers
  offers: {
    title: string;
    subtitle: string;
    sentOffers: string;
    receivedOffers: string;
    viewSent: string;
    viewReceived: string;
    createOffer: string;
    sendOffer: string;
    respondToOffer: string;
    offerDetails: string;
    rate: string;
    timeline: string;
    deliverables: string;
    terms: string;
    status: {
      pending: string;
      accepted: string;
      declined: string;
      counter: string;
      completed: string;
      withdrawn: string;
      infoRequested: string;
    };
    actions: {
      accept: string;
      decline: string;
      counter: string;
      withdraw: string;
      requestInfo: string;
      sendCounterOffer: string;
    };
    stats: {
      total: string;
      pending: string;
      accepted: string;
      declined: string;
      completed: string;
      views: string;
      messages: string;
    };
    validation: {
      rateRequired: string;
      deliverablesRequired: string;
      timelineRequired: string;
      termsRequired: string;
      termsTooShort: string;
    };
    success: {
      sent: string;
      accepted: string;
      declined: string;
      withdrawn: string;
      infoRequested: string;
    };
    errors: {
      loadFailed: string;
      sendFailed: string;
      respondFailed: string;
      withdrawFailed: string;
    };
  };

  // Analytics
  analytics: {
    title: string;
    subtitle: string;
    dashboard: string;
    accountPerformance: string;
    performanceMetrics: string;
    campaignPerformance: string;
    offerPerformance: string;
    connectionStatus: string;
    lastUpdated: string;
    timeRange: {
      last7Days: string;
      last30Days: string;
      last90Days: string;
    };
    metrics: {
      totalReach: string;
      offerAcceptanceRate: string;
      totalCampaigns: string;
      totalOffers: string;
      engagement: string;
      completionRate: string;
      averageResponseTime: string;
      revenue: string;
    };
    connection: {
      allConnected: string;
      partialConnectivity: string;
      offline: string;
      unavailable: string;
      eventsQueued: string;
      retrySync: string;
    };
    errors: {
      loadFailed: string;
      noPermission: string;
      tryAgain: string;
    };
  };

  // Influencer Cards
  influencerCards: {
    title: string;
    subtitle: string;
    myCards: string;
    viewAllCards: string;
    createCard: string;
    editCard: string;
    platform: string;
    reachEngagement: string;
    serviceDetails: string;
    audienceDemographics: string;
    contentTypes: string;
    serviceDescription: string;
    pricing: string;
    targetCountries: string;
    audienceInterests: string;
    ageDistribution: string;
    responseTime: string;
    deliveryTime: string;
    revisionsIncluded: string;
    startingFrom: string;
    viewDetails: string;
    stats: {
      totalCards: string;
      active: string;
      avgRating: string;
      campaigns: string;
    };
    validation: {
      followersRequired: string;
      engagementInvalid: string;
      contentTypesRequired: string;
      descriptionRequired: string;
      descriptionTooShort: string;
      countriesRequired: string;
      pricingRequired: string;
    };
    success: {
      created: string;
      updated: string;
      deleted: string;
      activated: string;
      deactivated: string;
    };
    errors: {
      loadFailed: string;
      saveFailed: string;
      deleteFailed: string;
      toggleFailed: string;
    };
  };

  // Feature Gate
  featureGate: {
    title: string;
    description: string;
    requirements: string;
    completeNow: string;
  };

  // Time formats
  time: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    weeksAgo: string;
    monthsAgo: string;
    yearsAgo: string;
    within1Hour: string;
    within24Hours: string;
    within48Hours: string;
    within1Week: string;
    days1to2: string;
    days3to5: string;
    week1: string;
    weeks2: string;
  };

  // Industries
  industries: {
    fashion: string;
    tech: string;
    food: string;
    travel: string;
    fitness: string;
    lifestyle: string;
    other: string;
  };

  // Content categories
  contentCategories: {
    fashionStyle: string;
    beautyCosmetics: string;
    lifestyle: string;
    travelTourism: string;
    foodCooking: string;
    fitnessHealth: string;
    sports: string;
    techGadgets: string;
    gamingEsports: string;
    musicEntertainment: string;
    artCreativity: string;
    businessEntrepreneurship: string;
    educationLearning: string;
    scienceResearch: string;
    automotiveTransport: string;
    realEstateInteriorDesign: string;
    financeInvestment: string;
    parentingFamily: string;
    pets: string;
    booksLiterature: string;
    moviesShows: string;
    photography: string;
    designArchitecture: string;
    politicsSociety: string;
    ecologySustainability: string;
    psychologyPersonalDevelopment: string;
    medicineHealthcare: string;
    humorComedy: string;
    newsJournalism: string;
    religionSpirituality: string;
  };

  // Genders
  genders: {
    male: string;
    female: string;
    nonBinary: string;
    other: string;
  };

  // Platforms
  platforms: {
    instagram: string;
    youtube: string;
    twitter: string;
    tiktok: string;
    multi: string;
  };

  // Content types
  contentTypes: {
    post: string;
    story: string;
    reel: string;
    video: string;
    live: string;
    igtv: string;
    shorts: string;
    tweet: string;
    thread: string;
    review: string;
    unboxing: string;
    tutorial: string;
  };
}