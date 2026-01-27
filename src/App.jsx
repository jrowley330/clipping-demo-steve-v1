// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { supabase } from "./supabaseClient";
import { RoleProvider } from "./RoleContext";

const INVITE_FORCE_KEY = "force_set_password";

export default function App({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const didInitRef = useRef(false);

  const shouldForceSetPassword = () => {
    // ONLY true when AuthCallback sets it (invite flow)
    return window.localStorage.getItem(INVITE_FORCE_KEY) === "1";
  };

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    (async () => {
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const s = data.session || null;
      setSession(s);

      if (!s) {
        setLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      // If invite flow is active, send them to set-password once
      if (shouldForceSetPassword() && location.pathname !== "/set-password") {
        setLoading(false);
        navigate("/set-password", { replace: true });
        return;
      }

      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);

      if (!newSession) {
        navigate("/login", { replace: true });
        return;
      }

      // On any auth change, still honor invite force flag
      if (shouldForceSetPassword() && location.pathname !== "/set-password") {
        navigate("/set-password", { replace: true });
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (loading) return <div>Loading…</div>;
  if (!session) return null;

  return <RoleProvider session={session}>{children}</RoleProvider>;
}
