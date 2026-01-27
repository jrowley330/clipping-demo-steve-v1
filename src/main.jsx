// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import { BrandingProvider } from "./branding/BrandingContext";

import { RequireRole } from "./RoleContext";

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
import ContentApprovalPage from "./ContentApprovalPage.jsx";

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
          path="/content-approval"
          element={
            <App>
              <RequireRole allowed={["manager"]}>
              <BrandingProvider clientId="default">
                <ContentApprovalPage />
              </BrandingProvider>
              </RequireRole>
            </App>
          }
        />
        
        <Route
          path="/payouts"
          element={
            <App>
              <RequireRole allowed={["manager"]}>
                <BrandingProvider clientId="default">
                  <PayoutsPage />
                </BrandingProvider>
              </RequireRole>
            </App>
          }
        />

        <Route
          path="/clippers"
          element={
            <App>
              <RequireRole allowed={["manager"]}>
              <BrandingProvider clientId="default">
                <ClippersPage />
              </BrandingProvider>
              </RequireRole>
            </App>
          }
        />

        <Route
          path="/performance"
          element={
            <App>
              <RequireRole allowed={["manager"]}>
              <BrandingProvider clientId="default">
                <Performance />
              </BrandingProvider>
              </RequireRole>
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
              <RequireRole allowed={["manager"]}>
              <BrandingProvider clientId="default">
              <Settings />
              </BrandingProvider>
              </RequireRole>
            </App>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard-v2" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
