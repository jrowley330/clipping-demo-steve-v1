// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

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

import { RequireRole } from "./RoleContext";
import { BrandingProvider } from "./branding/BrandingContext";
import { EnvironmentProvider } from "./EnvironmentContext.jsx";

import AppLayout from "./AppLayout.jsx";

// Protected wrapper: App -> RoleProvider -> EnvironmentProvider -> Branding -> Layout
function ProtectedShell({ children }) {
  return (
    <App>
      <EnvironmentProvider>
        <BrandingProvider>
          <AppLayout>{children}</AppLayout>
        </BrandingProvider>
      </EnvironmentProvider>
    </App>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard-v2" replace />} />

        {/* unprotected */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* protected (no layout needed) */}
        <Route
          path="/set-password"
          element={
            <App>
              <EnvironmentProvider>
                <SetPasswordPage />
              </EnvironmentProvider>
            </App>
          }
        />

        {/* protected + layout */}
        <Route
          path="/dashboard-v2"
          element={
            <ProtectedShell>
              <DashboardsPageV2 />
            </ProtectedShell>
          }
        />

        <Route
          path="/content-approval"
          element={
            <ProtectedShell>
              <RequireRole allowed={["manager"]}>
                <ContentApprovalPage />
              </RequireRole>
            </ProtectedShell>
          }
        />

        <Route
          path="/payouts"
          element={
            <ProtectedShell>
              <RequireRole allowed={["manager"]}>
                <PayoutsPage />
              </RequireRole>
            </ProtectedShell>
          }
        />

        <Route
          path="/clippers"
          element={
            <ProtectedShell>
              <RequireRole allowed={["manager"]}>
                <ClippersPage />
              </RequireRole>
            </ProtectedShell>
          }
        />

        <Route
          path="/performance"
          element={
            <ProtectedShell>
              <RequireRole allowed={["manager"]}>
                <Performance />
              </RequireRole>
            </ProtectedShell>
          }
        />

        <Route
          path="/leaderboards"
          element={
            <ProtectedShell>
              <Leaderboards />
            </ProtectedShell>
          }
        />

        <Route
          path="/gallery"
          element={
            <ProtectedShell>
              <Gallery />
            </ProtectedShell>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedShell>
              <RequireRole allowed={["manager"]}>
                <Settings />
              </RequireRole>
            </ProtectedShell>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard-v2" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
