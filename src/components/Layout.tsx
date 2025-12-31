import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  Target,
  MessageCircle,
  BarChart3,
  Grid,
  Menu,
  X,
  Zap,
  Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserSettings } from '../hooks/useUserSettings';
import { applyInterfaceSettings } from '../core/interfaceSettingsUtils';
import { useTranslation } from '../hooks/useTranslation';
import { useProfileCompletion } from '../modules/profiles/hooks/useProfileCompletion';
import { AuthModal } from './AuthModal';
import { BlockedUserNotice } from './BlockedUserNotice';
import { EngagementTracker } from '../modules/analytics/components/EngagementTracker';
import { UserAvatar } from './UserAvatar';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const { user, loading, isAuthenticated, signOut, userRole, isModerator, isBlocked, blockCheckLoading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);
  const { settings } = useUserSettings(currentUserId);
  const prevIsAuthenticatedRef = React.useRef<boolean | null>(null);

  const baseNavigation = [
    { name: t('nav.home'), href: '/app', icon: Zap },
    { name: t('nav.profiles'), href: '/app/profiles', icon: Users },
    { name: t('nav.autoCampaigns'), href: '/app/auto-campaigns', icon: Target },
    { name: t('nav.influencerCards'), href: '/app/influencer-cards', icon: Grid },
    { name: t('nav.offers'), href: '/app/offers', icon: MessageCircle },
    { name: t('nav.chat'), href: '/app/chat', icon: MessageCircle },
  ];

  const adminNavigation = [
    { name: t('nav.adminPanel'), href: '/app/admin', icon: Shield }
  ];

  const navigation = [
    ...baseNavigation,
    ...(isModerator ? adminNavigation : [])
  ];

  // Apply interface settings from user settings
  React.useEffect(() => {
    if (settings?.interface) {
      applyInterfaceSettings(settings.interface);
    }
  }, [settings?.interface]);

  // Redirect to landing page only when user logs out (not on initial load)
  React.useEffect(() => {
    if (!loading) {
      const prevAuthenticated = prevIsAuthenticatedRef.current;

      // Redirect only if user was previously authenticated and is now not authenticated (logout)
      if (prevAuthenticated === true && !isAuthenticated) {
        navigate('/', { replace: true });
      }

      // Update the ref with current authentication state
      prevIsAuthenticatedRef.current = isAuthenticated;
    }
  }, [loading, isAuthenticated, navigate]);

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Show blocked notice if user is blocked
  if (isAuthenticated && isBlocked) {
    console.log('🚨 [Layout] User is blocked, showing blocked notice');
    return <BlockedUserNotice />;
  }

  // Show loading while redirecting
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const getCurrentFeature = () => {
    const path = location.pathname;
    if (path.startsWith('/analytics')) return 'analytics_dashboard';
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
                <Link to="/app" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">Influo</span>
                </Link>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === '/app'
                    ? location.pathname === '/app'
                    : location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
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
                <UserAvatar
                  avatarUrl={currentUserProfile?.avatar}
                  fullName={currentUserProfile?.fullName}
                  size="sm"
                />
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
                          ? 'bg-blue-100 text-blue-700'
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