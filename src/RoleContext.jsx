// src/RoleContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const RoleCtx = createContext(null);

export function RoleProvider({ session, children }) {
  const [profile, setProfile] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!session?.user?.id) {
        setProfile(null);
        setRoleLoading(false);
        return;
      }

      setRoleLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("role, client_id, email")
        .eq("user_id", session.user.id)
        .single();

      if (cancelled) return;

      if (error) {
        console.error("RoleProvider: failed to load profiles row", error);
        // fail-safe: treat as client if something goes wrong
        setProfile({
          role: "client",
          client_id: "default",
          email: session.user.email || null,
        });
      } else {
        setProfile(data);
      }

      setRoleLoading(false);
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const value = useMemo(() => ({ profile, roleLoading }), [profile, roleLoading]);

  return <RoleCtx.Provider value={value}>{children}</RoleCtx.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleCtx);
  if (!ctx) throw new Error("useRole must be used inside <RoleProvider>");
  return ctx;
}

export function AccessRestricted() {
  return (
    <div style={{ padding: 24, color: "#fff" }}>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Access Restricted</div>
      <div style={{ opacity: 0.85 }}>
        You don’t have permission to view this page.
      </div>
    </div>
  );
}

export function RequireRole({ allowed = [], children }) {
  const { profile, roleLoading } = useRole();

  if (roleLoading) return <div style={{ padding: 16, color: "#fff" }}>Loading…</div>;

  const role = profile?.role || "client";
  const ok = allowed.length === 0 || allowed.includes(role);

  if (!ok) return <AccessRestricted />;

  return <>{children}</>;
}
