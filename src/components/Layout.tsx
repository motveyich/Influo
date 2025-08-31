import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Target, 
  MessageCircle, 
  Handshake, 
  BarChart3,
  Grid,
  Menu,
  X,
  Zap,
  Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { useProfileCompletion } from '../modules/profiles/hooks/useProfileCompletion';
import { AuthModal } from './AuthModal';
import { BlockedUserNotice } from './BlockedUserNotice';
import { EngagementTracker } from '../modules/analytics/components/EngagementTracker';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const { user, loading, isAuthenticated, signOut, userRole, isModerator, isBlocked, blockCheckLoading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);

  const baseNavigation = [
    { name: 'Главная', href: '/', icon: Zap },
    { name: t('nav.profiles'), href: '/profiles', icon: Users },
    { name: 'Автоматические кампании', href: '/campaigns', icon: Target },
    { name: t('nav.influencerCards'), href: '/influencer-cards', icon: Grid },
    { name: t('nav.chat'), href: '/chat', icon: MessageCircle },
    { name: t('nav.offers'), href: '/offers', icon: Handshake },
  ];

  const adminNavigation = [
    { name: 'Админ-панель', href: '/admin', icon: Shield }
  ];

  const navigation = isModerator ? [...baseNavigation, ...adminNavigation] : baseNavigation;

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(t('auth.signOutFailed'));
    } else {
      toast.success(t('auth.signOutSuccess'));
    }
  };

  // Show loading state
  if (loading || blockCheckLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Show blocked notice if user is blocked
  if (isAuthenticated && isBlocked) {
    return <BlockedUserNotice />;
  }
  
  // Show auth modal if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('auth.welcomeTitle')}</h1>
            <p className="text-xl text-gray-600 mb-8">{t('auth.welcomeSubtitle')}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Новый пользователь?</strong> {t('auth.newUserInfo')}
              </p>
              <p className="text-sm text-blue-800 mt-2">
                <strong>Уже есть аккаунт?</strong> {t('auth.existingUserInfo')}
              </p>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-md text-lg font-medium transition-colors"
            >
              {t('auth.getStarted')}
            </button>
          </div>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  const getCurrentFeature = () => {
    const path = location.pathname;
    if (path.startsWith('/analytics')) return 'analytics_dashboard';
    if (path.startsWith('/campaigns')) return 'campaigns';
    if (path.startsWith('/chat')) return 'chat';
    if (path.startsWith('/offers')) return 'offers';
    if (path.startsWith('/profiles')) return 'profiles';
    if (path.startsWith('/influencer-cards')) return 'influencer_cards';
    return 'unknown';
  };

  return (
    <EngagementTracker userId={currentUserId} feature={getCurrentFeature()}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center">
                <Link to="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">Influo</span>
                </Link>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* User info and mobile menu button */}
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {currentUserProfile?.fullName || user?.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t('nav.signOut')}
                </button>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                        isActive
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </EngagementTracker>
  );
}