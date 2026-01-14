import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function App({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      // ✅ 1) If we returned from an invite/magic link with ?code=..., exchange it for a session
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        // Remove ?code=... from URL but KEEP hash route (#/whatever)
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.hash
        );

        if (error) {
          console.log("exchangeCodeForSession error:", error);
          setLoading(false);
          navigate("/login", { replace: true });
          return;
        }
      }

      // ✅ 2) Now check session normally
      const { data } = await supabase.auth.getSession();
      const s = data.session || null;
      setSession(s);

      if (!s) {
        setLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      // ✅ 3) Enforce "set password" for invited users
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;

      const needsPw = !user?.user_metadata?.password_set;
      const onSetPwRoute = location.pathname === "/set-password";

      if (needsPw && !onSetPwRoute) {
        setLoading(false);
        navigate("/set-password", { replace: true });
        return;
      }

      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);

      if (!newSession) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: u } = await supabase.auth.getUser();
      const user = u.user;

      const invited = !!user?.user_metadata?.invited;
      const needsPw = invited && !user?.user_metadata?.password_set;

      const onSetPwRoute = location.pathname === "/set-password";

      if (needsPw && !onSetPwRoute) {
        navigate("/set-password", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (loading) return <div>Loading…</div>;
  if (!session) return null;

  return <>{children}</>;
}
