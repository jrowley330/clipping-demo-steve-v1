import React from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function PayoutsPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
        padding: '40px',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          padding: '8px 14px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.08)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 16 }}>⏻</span>
        Logout
      </button>

      <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '20px' }}>
        Payouts
      </h1>

      <p style={{ opacity: 0.7 }}>
        This is your Payouts page.  
        We’ll fill this in once you give me your ideas.
      </p>
    </div>
  );
}
