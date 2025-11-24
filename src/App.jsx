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
      if (!data.session) navigate('/login');
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) navigate('/login');
      else navigate('/dashboard');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) return <div>Loading…</div>;
  if (!session) return null; // redirect handled above

  return <>{children}</>;
}
