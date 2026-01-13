// src/AuthCallback.jsx
import React, { useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      // This lets supabase-js parse/store the session if it's in the URL
      await supabase.auth.getSession();

      // After session is stored, go into your normal protected flow.
      // App.jsx will then redirect to /set-password if needed.
      window.location.replace("/#/dashboard-v2");
    })();
  }, []);

  return (
    <div style={{ padding: 24, color: "white" }}>
      Signing you in…
    </div>
  );
}
