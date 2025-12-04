import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import App from './App.jsx';
import LoginPage from './LoginPage.jsx';
import DashboardPage from './DashboardPage.jsx';      // Dashboards V1 (Power BI)
import PayoutsPage from './PayoutsPage.jsx';
import DashboardsPageV2 from './DashboardPageV2.jsx'; // new BigQuery dashboards
import ClippersPage from './ClippersPage.jsx'; // new BigQuery dashboards

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

        {/* Dashboards V1 – existing Power BI embed */}
        <Route
          path="/dashboard"
          element={
            <App>
              <DashboardPage />
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

        {/* any unknown hash -> Dashboards V2 */}
        <Route path="*" element={<Navigate to="/dashboard-v2" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
