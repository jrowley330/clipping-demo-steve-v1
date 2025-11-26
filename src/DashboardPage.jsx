import React from 'react';
import { supabase } from './supabaseClient';

const POWERBI_EMBED_URL =
  'https://app.powerbi.com/view?r=eyJrIjoiYzUzYjI5YjMtYmZmYi00N2YzLThmZmYtZWU3YmY4OGViOWYyIiwidCI6ImQxYzU2YTYwLWRjZjItNGJhMC04ZDE5LWU0MTY0NmU2ZWFkOCIsImMiOjN9';

const FOOTER_BLOCK_HEIGHT = 56;   
const GRADIENT_HEIGHT = 10;

export default function DashboardPage() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const goPayouts = () => {
    window.location.href = '/payouts';
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        margin: 0,
        padding: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Payouts button */}
      <button
        onClick={goPayouts}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 20,
          padding: '8px 18px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.08)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 14,
          backdropFilter: 'blur(6px)',
        }}
      >
        💰 Payouts
      </button>

      {/* Logout bottom-left */}
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 20,
          padding: '8px 16px 8px 14px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.35)',
          background: 'rgba(255,255,255,0.08)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backdropFilter: 'blur(5px)',
        }}
      >
        <span style={{ fontSize: 16 }}>⏻</span>
        Logout
      </button>

      {/* Fullscreen iframe */}
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

        {/* CLICK-THROUGH gradient fade */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: FOOTER_BLOCK_HEIGHT,
            height: GRADIENT_HEIGHT,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* NON-CLICKABLE bottom blocker */}
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

