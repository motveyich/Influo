import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { ProfilesPage } from './modules/profiles/components/ProfilesPage';
import { CampaignsPage } from './modules/campaigns/components/CampaignsPage';
import { ChatPage } from './modules/chat/components/ChatPage';
import { InfluencerCardsPage } from './modules/influencer-cards/components/InfluencerCardsPage';
import { InfluencerCardDetailPage } from './modules/influencer-cards/components/InfluencerCardDetailPage';
import { HomePage } from './modules/home/components/HomePage';
import { AdminPanel } from './modules/admin/components/AdminPanel';
import { OffersPage } from './modules/offers/components/OffersPage';
import { DemoProvider } from './demo/DemoContext';
import { DemoLayout } from './demo/components/DemoLayout';
import { DemoHomePage } from './demo/pages/DemoHomePage';
import { DemoProfilesPage } from './demo/pages/DemoProfilesPage';
import { DemoCampaignsPage } from './demo/pages/DemoCampaignsPage';
import { DemoInfluencerCardsPage } from './demo/pages/DemoInfluencerCardsPage';
import { DemoOffersPage } from './demo/pages/DemoOffersPage';
import { DemoChatPage } from './demo/pages/DemoChatPage';
import { LandingPage } from './pages/LandingPage';

function App() {
  return (
    <DemoProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

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
            <Route path="/campaigns" element={
              <DemoLayout>
                <DemoCampaignsPage />
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
            <Route path="/app/campaigns" element={
              <Layout>
                <CampaignsPage />
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
                <ChatPage />
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