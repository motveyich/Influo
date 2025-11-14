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
import { DemoWelcomePage } from './demo/pages/DemoWelcomePage';
import { DemoLayout } from './demo/components/DemoLayout';
import { DemoHomePage } from './demo/pages/DemoHomePage';
import { DemoProfilesPage } from './demo/pages/DemoProfilesPage';
import { DemoCampaignsPage } from './demo/pages/DemoCampaignsPage';
import { DemoInfluencerCardsPage } from './demo/pages/DemoInfluencerCardsPage';
import { DemoOffersPage } from './demo/pages/DemoOffersPage';
import { DemoChatPage } from './demo/pages/DemoChatPage';

function App() {
  return (
    <DemoProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Routes>
            {/* Demo Routes */}
            <Route path="/demo" element={<DemoWelcomePage />} />
            <Route path="/demo/*" element={
              <DemoLayout>
                <Routes>
                  <Route index element={<DemoHomePage />} />
                  <Route path="profiles" element={<DemoProfilesPage />} />
                  <Route path="campaigns" element={<DemoCampaignsPage />} />
                  <Route path="influencer-cards" element={<DemoInfluencerCardsPage />} />
                  <Route path="offers" element={<DemoOffersPage />} />
                  <Route path="chat" element={<DemoChatPage />} />
                </Routes>
              </DemoLayout>
            } />

            {/* Real App Routes */}
            <Route path="/" element={<Navigate to="/demo" replace />} />
            <Route path="/app/*" element={
              <Layout>
                <Routes>
                  <Route index element={<HomePage />} />
                  <Route path="profiles" element={<ProfilesPage />} />
                  <Route path="campaigns" element={<CampaignsPage />} />
                  <Route path="influencer-cards" element={<InfluencerCardsPage />} />
                  <Route path="influencer-cards/:cardId" element={<InfluencerCardDetailPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="offers" element={<OffersPage />} />
                  <Route path="admin" element={<AdminPanel />} />
                </Routes>
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