import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function ClippersPage() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleGoDashV2 = () => {
    navigate('/dashboard-v2'); // BigQuery dashboards
  };

  const handleGoPayouts = () => {
    navigate('/payouts'); // payouts page
  };

  // ------------------------------------------------------------------
  //                  FULLSCREEN LAYOUT + BLACK GUTTER
  // ------------------------------------------------------------------

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at top, #141414 0, #020202 55%)',
        display: 'flex',
        overflowX: 'hidden',
        overflowY: 'auto',
        color: '#fff',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '32px',
        paddingTop: '40px',
        paddingBottom: '40px',
      }}
    >
      {/* WATERMARK */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: 0.03,
          fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
          fontSize: 140,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#ffffff',
          transform: 'rotate(-18deg)',
          textShadow: '0 0 60px rgba(0,0,0,1)',
        }}
      >
        STEVEWILLDOIT
      </div>

      {/* SIDEBAR */}
      <div
        style={{
          width: sidebarOpen ? 190 : 54,
          transition: 'width 180ms ease',
          marginRight: 22,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          style={{
            borderRadius: 18,
            background: 'rgba(0,0,0,0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 18px 45px rgba(0,0,0,0.8)',
            padding: 10,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Collapse button */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              alignSelf: sidebarOpen ? 'flex-end' : 'center',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 11,
              padding: '4px 7px',
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>

          {sidebarOpen && (
            <>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.1,
                  opacity: 0.6,
                  marginTop: 4,
                  marginBottom: 4,
                }}
              >
                Navigation
              </div>

              {/* Dashboards V2 */}
              <button
                onClick={handleGoDashV2}
                style={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: 12,
                  padding: '7px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 12,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Dashboards V2
              </button>

              {/* Clippers – active page */}
              <button
                style={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: 12,
                  padding: '8px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 13,
                  background:
                    'linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))',
                  color: '#020617',
                  fontWeight: 600,
                  marginBottom: 2,
                }}
              >
                Clippers
              </button>

              {/* Payouts */}
              <button
                onClick={handleGoPayouts}
                style={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: 12,
                  padding: '7px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 12,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Payouts
              </button>

              {/* Settings placeholder */}
              <button
                style={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: 12,
                  padding: '7px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 12,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                Settings
              </button>

              {/* Push logout to bottom */}
              <div style={{ flex: 1 }} />

              <button
                onClick={handleLogout}
                style={{
                  borderRadius: 999,
                  padding: '6px 10px',
                  border: '1px solid rgba(248,250,252,0.25)',
                  background: 'rgba(15,23,42,0.9)',
                  color: '#e5e7eb',
                  fontSize: 11,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    border: '1px solid rgba(248,250,252,0.4)',
                    textAlign: 'center',
                    lineHeight: '15px',
                    fontSize: 10,
                  }}
                >
                  ⬤
                </span>
                <span>Log out</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          zIndex: 3,
        }}
      >
        {/* Header / title */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 22,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>
              Clippers
            </h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              Configure clipper accounts & payment routing
            </span>
          </div>

          <button
            style={{
              borderRadius: 999,
              padding: '8px 14px',
              border: '1px solid rgba(248,250,252,0.35)',
              background:
                'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.95))',
              color: '#e5e7eb',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            + Add clipper
          </button>
        </div>

        {/* Placeholder body – we'll replace this with real rows + dropdowns */}
        <div
          style={{
            borderRadius: 18,
            border: '1px solid rgba(148,163,184,0.3)',
            background:
              'radial-gradient(circle at top left, rgba(148,163,184,0.25), rgba(15,23,42,1))',
            padding: 18,
            fontSize: 13,
            opacity: 0.9,
          }}
        >
          <p style={{ margin: 0, marginBottom: 6, opacity: 0.9 }}>
            This is where each <strong>clipper</strong> will show up as a row.
          </p>
          <p style={{ margin: 0, opacity: 0.7 }}>
            Next steps:
            <br />
            – Pull clipper records from <code>DEMO.CLIPPER_ACCOUNTS</code>
            <br />
            – Show per-clipper dropdown with TikTok / Instagram usernames,
            payment processor, key, and active toggle
            <br />– Add &quot;Edit&quot; and &quot;Save&quot; flows to sync
            changes back to BigQuery
          </p>
        </div>
      </div>
    </div>
  );
}

