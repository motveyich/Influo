import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProfilesPage } from './modules/profiles/components/ProfilesPage';
import { ChatPage } from './modules/chat/components/ChatPage';
import { InfluencerCardsPage } from './modules/influencer-cards/components/InfluencerCardsPage';
import { InfluencerCardDetailPage } from './modules/influencer-cards/components/InfluencerCardDetailPage';
import { HomePage } from './modules/home/components/HomePage';
import { AdminPanel } from './modules/admin/components/AdminPanel';
import { OffersPage } from './modules/offers/components/OffersPage';
import { AutoCampaignsPage } from './modules/auto-campaigns/components/AutoCampaignsPage';
import { DemoProvider } from './demo/DemoContext';
import { DemoLayout } from './demo/components/DemoLayout';
import { DemoHomePage } from './demo/pages/DemoHomePage';
import { DemoProfilesPage } from './demo/pages/DemoProfilesPage';
import { DemoInfluencerCardsPage } from './demo/pages/DemoInfluencerCardsPage';
import { DemoOffersPage } from './demo/pages/DemoOffersPage';
import { DemoChatPage } from './demo/pages/DemoChatPage';
import { LandingPage } from './pages/LandingPage';
import { useAuth } from './hooks/useAuth';

function LandingPageGuard() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return <LandingPage />;
}

function App() {
  return (
    <DemoProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPageGuard />} />

            {/* Demo Routes */}
            <Route path="/demo" element={
              <DemoLayout>
                <DemoHomePage />
              </DemoLayout>
            } />
            <Route path="/profiles" element={
              <DemoLayout>
                <DemoProfilesPage />
              </DemoLayout>
            } />
            <Route path="/influencer-cards" element={
              <DemoLayout>
                <DemoInfluencerCardsPage />
              </DemoLayout>
            } />
            <Route path="/offers" element={
              <DemoLayout>
                <DemoOffersPage />
              </DemoLayout>
            } />
            <Route path="/chat" element={
              <DemoLayout>
                <DemoChatPage />
              </DemoLayout>
            } />

            {/* Real App Routes - After Auth */}
            <Route path="/app" element={
              <Layout>
                <HomePage />
              </Layout>
            } />
            <Route path="/app/profiles" element={
              <Layout>
                <ProfilesPage />
              </Layout>
            } />
            <Route path="/app/auto-campaigns" element={
              <Layout>
                <AutoCampaignsPage />
              </Layout>
            } />
            <Route path="/app/influencer-cards" element={
              <Layout>
                <InfluencerCardsPage />
              </Layout>
            } />
            <Route path="/app/influencer-cards/:cardId" element={
              <Layout>
                <InfluencerCardDetailPage />
              </Layout>
            } />
            <Route path="/app/chat" element={
              <Layout>
                <ErrorBoundary>
                  <ChatPage />
                </ErrorBoundary>
              </Layout>
            } />
            <Route path="/app/offers" element={
              <Layout>
                <OffersPage />
              </Layout>
            } />
            <Route path="/app/admin" element={
              <Layout>
                <AdminPanel />
              </Layout>
            } />
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </DemoProvider>
  );
}

export default App;