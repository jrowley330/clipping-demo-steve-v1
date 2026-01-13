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
      const { data } = await supabase.auth.getSession();
      const s = data.session || null;
      setSession(s);
      setLoading(false);

      if (!s) {
        navigate("/login", { replace: true });
        return;
      }

      // ✅ Force set-password if user hasn't set it
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;

      const needsPw = !user?.user_metadata?.password_set;
      const onSetPwRoute = location.pathname === "/set-password";

      if (needsPw && !onSetPwRoute) {
        navigate("/set-password", { replace: true });
      }
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

      // ✅ also enforce on auth changes
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      const needsPw = !user?.user_metadata?.password_set;
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
