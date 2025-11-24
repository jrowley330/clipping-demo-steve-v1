import React from 'react';
import { supabase } from './supabaseClient';

const POWERBI_EMBED_URL =
  'https://app.powerbi.com/view?r=eyJrIjoiYzUzYjI5YjMtYmZmYi00N2YzLThmZmYtZWU3YmY4OGViOWYyIiwidCI6ImQxYzU2YTYwLWRjZjItNGJhMC04ZDE5LWU0MTY0NmU2ZWFkOCIsImMiOjN9';

const FOOTER_HIDE_HEIGHT = 60; // px to cover at bottom

export default function DashboardPage() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#050505',
        color: '#f5f5f5',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          Clipping Agency Dashboard
        </h1>

        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'transparent',
            color: '#f5f5f5',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Logout
        </button>
      </header>

      {/* Main / iframe wrapper */}
      <main
        style={{
          flex: 1,
          padding: '16px 24px 24px',
          display: 'flex',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            maxWidth: '1400px',
            margin: '0 auto',
            borderRadius: 16,
            overflow: 'hidden', // hides anything beyond the wrapper (including bottom footer)
            boxShadow: '0 18px 40px rgba(0,0,0,0.7)',
            background: '#000',
            height: `calc(100vh - 96px)`, // viewport minus header/padding
          }}
        >
          <iframe
            title="Clipper Dashboards Demo Dev v1"
            src={POWERBI_EMBED_URL}
            style={{
              border: 'none',
              width: '100%',
              height: '100%',
              display: 'block',
            }}
            allowFullScreen
          />

          {/* Overlay strip to cover the bottom Power BI bar */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: FOOTER_HIDE_HEIGHT,
              background:
                'linear-gradient(to top, #050505 0%, rgba(5,5,5,0.9) 40%, transparent 100%)',
              pointerEvents: 'auto', // blocks clicks on the share/footer area
            }}
          />
        </div>
      </main>
    </div>
  );
}
