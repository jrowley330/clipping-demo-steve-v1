import React from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const POWERBI_EMBED_URL =
  'https://app.powerbi.com/view?r=eyJrIjoiYzUzYjI5YjMtYmZmYi00N2YzLThmZmYtZWU3YmY4OGViOWYyIiwidCI6ImQxYzU2YTYwLWRjZjItNGJhMC04ZDE5LWU0MTY0NmU2ZWFkOCIsImMiOjN9';

const FOOTER_BLOCK_HEIGHT = 56;
const GRADIENT_HEIGHT = 10;

export default function DashboardPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const goPayouts = () => {
    navigate('/payouts');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* ==================== PRIMARY: Payouts button (BOTTOM LEFT) ==================== */}
      <button
        onClick={goPayouts}
        style={{
          position: 'absolute',
          bottom: 8,
          left: 16,
          zIndex: 20,
          padding: '10px 22px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          fontWeight: 600,
          fontSize: 15,
          cursor: 'pointer',
          letterSpacing: 0.4,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 0 12px rgba(255,255,255,0.15)',
          transition: 'all 0.2s ease',
        }}
      >
        Payouts
      </button>

      {/* ==================== SECONDARY: Logout button (BOTTOM RIGHT) ==================== */}
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          bottom: 12,
          right: 16,
          zIndex: 20,
          padding: '5px 10px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.55)',
          cursor: 'pointer',
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          backdropFilter: 'blur(4px)',
          opacity: 0.55,
          transition: 'opacity 0.2s ease',
        }}
      >
        <span style={{ fontSize: 12 }}>⏻</span>
        Logout
      </button>

      {/* ==================== IFRAME AREA ==================== */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: '#000',
        }}
      >
        <iframe
          title="Clipper Dashboards Dev"
          src={POWERBI_EMBED_URL}
          style={{
            border: 'none',
            width: '100%',
            height: '100%',
            transform: 'scale(1.00)',
            transformOrigin: 'center center',
            display: 'block',
          }}
          allowFullScreen
        />

        {/* gradient fade */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: FOOTER_BLOCK_HEIGHT,
            height: GRADIENT_HEIGHT,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6) 40%, transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* bottom blocker */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: FOOTER_BLOCK_HEIGHT,
            background: '#000',
            pointerEvents: 'auto',
          }}
        />
      </div>
    </div>
  );
}
