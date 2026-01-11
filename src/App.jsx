import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function App({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setLoading(false);

      // if not logged in, send to login
      if (!data.session) {
        navigate('/login', { replace: true });
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (!session) {
        // logged out → go to login
        navigate('/login', { replace: true });
      }
      // ❌ IMPORTANT: do NOT force /dashboard here
      // if there *is* a session, just stay on whatever route we're on
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) return <div>Loading…</div>;
  if (!session) return null; // redirect handled above

  // render whichever page was wrapped in <App> ... </App>
  return <>{children}</>;
}
