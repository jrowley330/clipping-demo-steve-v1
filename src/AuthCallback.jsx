import React, { useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      // 1) Exchange ?code=... for a session (PKCE)
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.log("exchangeCodeForSession error:", error);
          window.location.replace("/#/login?from=invite");
          return;
        }
      }

      // 2) Get session after exchange
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        console.log("No session after callback");
        window.location.replace("/#/login?from=invite");
        return;
      }

      // 3) Mark this user as invited (so App.jsx knows to enforce set-password)
      await supabase.auth.updateUser({ data: { invited: true } });

      // 4) Continue into app; App.jsx will redirect to /set-password if needed
      window.location.replace("/#/dashboard-v2");
    })();
  }, []);

  return <div style={{ padding: 24, color: "white" }}>Signing you in…</div>;
}
