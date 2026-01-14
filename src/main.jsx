// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import { BrandingProvider } from "./branding/BrandingContext";

import App from "./App.jsx";
import LoginPage from "./LoginPage.jsx";
import SetPasswordPage from "./SetPasswordPage.jsx";
import AuthCallback from "./AuthCallback.jsx";

import PayoutsPage from "./PayoutsPage.jsx";
import DashboardsPageV2 from "./DashboardPageV2.jsx";
import ClippersPage from "./ClippersPage.jsx";
import Performance from "./Performance.jsx";
import Leaderboards from "./Leaderboards.jsx";
import Gallery from "./Gallery.jsx";
import Settings from "./Settings.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard-v2" replace />} />

        {/* unprotected */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* protected */}
        <Route
          path="/set-password"
          element={
            <App>
              <SetPasswordPage />
            </App>
          }
        />

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

        <Route
          path="/settings"
          element={
            <App>
              <Settings />
            </App>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard-v2" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
