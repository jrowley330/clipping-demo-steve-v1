import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import App from './App.jsx';
import LoginPage from './LoginPage.jsx';
import PayoutsPage from './PayoutsPage.jsx';
import DashboardsPageV2 from './DashboardPageV2.jsx';
import ClippersPage from './ClippersPage.jsx';
import Performance from "./Performance.jsx";
import Leaderboards from './Leaderboards.jsx';
import Gallery from './Gallery.jsx';
import SettingsPage from "./Settings.jsx";

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
              <DashboardsPageV2 />
            </App>
          }
        />

        {/* Payouts */}
        <Route
          path="/payouts"
          element={
            <App>
              <PayoutsPage />
            </App>
          }
        />

        {/* Clippers */}
        <Route
          path="/clippers"
          element={
            <App>
              <ClippersPage />
            </App>
          }
        />

        {/* Performance */}
        <Route
          path="/performance"
          element={
            <App>
              <Performance />
            </App>
          }
        />

        {/* Leaderboards */}
        <Route
          path="/leaderboards"
          element={
            <App>
              <Leaderboards />
            </App>
          }
        />

        {/* Gallery */}
        <Route
          path="/gallery"
          element={
            <App>
              <Gallery />
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
