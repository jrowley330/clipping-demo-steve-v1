// src/App.jsx
import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import { BrandingProvider } from "./branding/BrandingContext";
import BrandWatermark from "./branding/BrandWatermark";
import BrandHeading from "./branding/BrandHeading";


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
      {/* Global brand heading (matches the “STEVEWILLDOIT, LLC” spot) */}
      <div style={{ position: "relative", zIndex: 2, minHeight: 44, }}>
        <BrandHeading
          style={{
            fontSize: 34,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
            margin: "22px 0 0 88px", // adjust if needed
            color: "#fff",
          }}
        />
      </div>
      <Outlet />
    </BrandingProvider>
  );
}
