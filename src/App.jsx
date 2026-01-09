// src/App.jsx
import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import { BrandingProvider } from "./branding/BrandingContext";
import BrandWatermark from "./branding/BrandWatermark";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  // later: set this from user/session
  const clientId = "default";

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setLoading(false);

      if (!data.session) {
        navigate("/login", { replace: true });
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession) {
        navigate("/login", { replace: true });
      }
      // IMPORTANT: do NOT force redirect on login
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) return <div>Loading…</div>;
  if (!session) return null; // redirect handled above

  return (
    <BrandingProvider clientId={clientId}>
      <BrandWatermark />
      <Outlet />
    </BrandingProvider>
  );
}
