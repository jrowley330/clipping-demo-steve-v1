// src/AppLayout.jsx
import React from "react";
import EnvironmentSwitcher from "./components/EnvironmentSwitcher";
import { useRole } from "./RoleContext";

export default function AppLayout({ children }) {
  const { profile } = useRole();
  const isManager = (profile?.role || "client") === "manager";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle at top, #141414 0, #020202 55%)",
      }}
    >
      {isManager && <EnvironmentSwitcher />}
      {children}
    </div>
  );
}
