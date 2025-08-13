import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { ProfilesPage } from './modules/profiles/components/ProfilesPage';
import { CampaignsPage } from './modules/campaigns/components/CampaignsPage';
import { ChatPage } from './modules/chat/components/ChatPage';
import { OffersPage } from './modules/offers/components/OffersPage';
import { InfluencerCardsPage } from './modules/influencer-cards/components/InfluencerCardsPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/profiles" replace />} />
            <Route path="/profiles" element={<ProfilesPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/influencer-cards" element={<InfluencerCardsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/offers" element={<OffersPage />} />
          </Routes>
        </Layout>
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
  );
}

export default App;