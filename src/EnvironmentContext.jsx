// src/EnvironmentContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRole } from "./RoleContext";

const EnvContext = createContext(null);

// localStorage key for MANAGER selection only
const LS_KEY = "clientId_manager";

// normalize environment keys to match API dataset map
const norm = (v) => String(v || "").toLowerCase().trim();

// choose a safe default for managers if nothing set yet
const DEFAULT_MANAGER_ENV = "arafta";

export function EnvironmentProvider({ children }) {
  // profile comes from Supabase profiles table
  const { profile, roleLoading } = useRole();

  const role = profile?.role || "client";
  const isManager = role === "manager";

  // This is what managers are trying to use (and what we store)
  const [managerClientId, setManagerClientId] = useState(() => {
    return norm(localStorage.getItem(LS_KEY)) || DEFAULT_MANAGER_ENV;
  });

  // Persist manager selection only
  useEffect(() => {
    if (!isManager) return;
    localStorage.setItem(LS_KEY, norm(managerClientId));
  }, [isManager, managerClientId]);

  // Effective clientId that the app should use
  const effectiveClientId = useMemo(() => {
    if (roleLoading) return null;

    if (isManager) {
      return norm(managerClientId) || DEFAULT_MANAGER_ENV;
    }

    // clients are locked to their profile client_id
    return norm(profile?.client_id) || "default";
  }, [roleLoading, isManager, managerClientId, profile?.client_id]);

  // Only allow setClientId for managers
  const setClientId = (next) => {
    if (!isManager) return; // clients can't change env
    setManagerClientId(norm(next));
  };

  const value = useMemo(
    () => ({
      clientId: effectiveClientId, // can be null while loading
      setClientId,
      isManager,
      roleLoading,
    }),
    [effectiveClientId, isManager, roleLoading]
  );

  return <EnvContext.Provider value={value}>{children}</EnvContext.Provider>;
}

export function useEnvironment() {
  const ctx = useContext(EnvContext);
  if (!ctx) throw new Error("useEnvironment must be used within EnvironmentProvider");
  return ctx;
}
