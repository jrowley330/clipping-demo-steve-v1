// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import App from "./App.jsx";
import LoginPage from "./LoginPage.jsx";
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
        {/* default */}
        <Route path="/" element={<Navigate to="/dashboard-v2" replace />} />

        {/* login (unprotected) */}
        <Route path="/login" element={<LoginPage />} />

        {/* protected layout: App stays mounted, pages render via <Outlet /> */}
        <Route element={<App />}>
          <Route path="/dashboard-v2" element={<DashboardsPageV2 />} />
          <Route path="/payouts" element={<PayoutsPage />} />
          <Route path="/clippers" element={<ClippersPage />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* any unknown hash -> Dashboards V2 */}
        <Route path="*" element={<Navigate to="/dashboard-v2" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
