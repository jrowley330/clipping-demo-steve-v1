import React from 'react';
import { supabase } from './supabaseClient';

const POWERBI_EMBED_URL =
  'https://app.powerbi.com/view?r=eyJrIjoiYzUzYjI5YjMtYmZmYi00N2YzLThmZmYtZWU3YmY4OGViOWYyIiwidCI6ImQxYzU2YTYwLWRjZjItNGJhMC04ZDE5LWU0MTY0NmU2ZWFkOCIsImMiOjN9';

const FOOTER_BLOCK_HEIGHT = 40;   // solid bar that blocks clicks
const GRADIENT_HEIGHT = 20;      // visual fade height above it

export default function DashboardPage() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div
      style={{
        position: 'fixed',   // lock to viewport
        inset: 0,            // top:0, right:0, bottom:0, left:0
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
      {/* Floating Logout button */}
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          padding: '8px 16px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.4)',
          background: 'rgba(0,0,0,0.6)',
          color: '#f5f5f5',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
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
          title="Clipper Dashboards Demo Dev v1"
          src={POWERBI_EMBED_URL}
          style={{
            border: 'none',
            width: '100%',            // zoom trick to remove side gutters
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
            pointerEvents: 'none', // don't block clicks
          }}
        />

        {/* NON-CLICKABLE bottom blocker (hides actual Power BI footer) */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: FOOTER_BLOCK_HEIGHT,
            background: '#000',
            pointerEvents: 'auto', // blocks clicks only in this small bar
          }}
        />
      </div>
    </div>
  );
}
