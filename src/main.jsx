import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import { BrandingProvider } from "./branding/BrandingContext";

import App from './App.jsx';
import LoginPage from './LoginPage.jsx';
import PayoutsPage from './PayoutsPage.jsx';
import DashboardsPageV2 from './DashboardPageV2.jsx';
import ClippersPage from './ClippersPage.jsx';
import Performance from "./Performance.jsx";
import Leaderboards from './Leaderboards.jsx';
import Gallery from './Gallery.jsx';
import Settings from "./Settings.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        {/* default: go to Dashboards V2 */}
        <Route path="/" element={<Navigate to="/dashboard-v2" replace />} />

        {/* login (unprotected) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Dashboards V2 – NEW (BigQuery-powered) */}
        <Route
          path="/dashboard-v2"
          element={
            <App>
              <BrandingProvider clientId="default">
                <DashboardsPageV2 />
              </BrandingProvider>
            </App>
          }
        />


        {/* Payouts */}
        <Route
          path="/payouts"
          element={
            <App>
              <BrandingProvider clientId="default">
                <PayoutsPage />
              </BrandingProvider>
            </App>
          }
        />

        {/* Clippers */}
        <Route
          path="/clippers"
          element={
            <App>
              <BrandingProvider clientId="default">
                <ClippersPage />
              </BrandingProvider>
            </App>
          }
        />

        {/* Performance */}
        <Route
          path="/performance"
          element={
            <App>
              <BrandingProvider clientId="default">
                <Performance />
              </BrandingProvider>
            </App>
          }
        />

        {/* Leaderboards */}
        <Route
          path="/leaderboards"
          element={
            <App>
              <BrandingProvider clientId="default">
                <Leaderboards />
              </BrandingProvider>
            </App>
          }
        />

        {/* Gallery */}
        <Route
          path="/gallery"
          element={
            <App>
              <BrandingProvider clientId="default">
                <Gallery />
              </BrandingProvider>
            </App>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <App>
                <Settings />
            </App>
          }
        />

        {/* any unknown hash -> Dashboards V2 */}
        <Route path="*" element={<Navigate to="/dashboard-v2" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
