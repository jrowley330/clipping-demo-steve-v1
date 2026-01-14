// src/AuthCallback.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function parseHashQuery() {
  // HashRouter URL looks like: "#/auth/callback?type=invite&token_hash=XYZ"
  const hash = window.location.hash || "";
  const qIndex = hash.indexOf("?");
  const qs = qIndex >= 0 ? hash.slice(qIndex + 1) : "";
  return new URLSearchParams(qs);
}

export default function AuthCallback() {
  const [msg, setMsg] = useState("Signing you in…");

  useEffect(() => {
    (async () => {
      try {
        // 1) Handle invite / magic link token_hash flow (your email template)
        const hashParams = parseHashQuery();
        const type = hashParams.get("type");
        const token_hash = hashParams.get("token_hash");

        if (type && token_hash) {
          setMsg("Verifying invite…");
          const { error } = await supabase.auth.verifyOtp({ type, token_hash });
          if (error) {
            console.log("verifyOtp error:", error);
            setMsg("Invite link is invalid/expired. Ask for a new invite.");
            return;
          }

          // go set password immediately (invite flow)
          window.localStorage.setItem("force_set_password", "1");
          window.location.replace("/#/set-password");
          return;
        }

        // 2) Fallback: handle PKCE code flow if it ever appears
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          // strip ?code=...
          window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);

          if (error) {
            console.log("exchangeCodeForSession error:", error);
            setMsg("Auth failed. Please try again.");
            return;
          }

          window.location.replace("/#/dashboard-v2");
          return;
        }

        // 3) If no token_hash + no code, just go login
        window.location.replace("/#/login");
      } catch (e) {
        console.log(e);
        setMsg("Auth failed. Please try again.");
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24, color: "white" }}>
      {msg}
    </div>
  );
}
