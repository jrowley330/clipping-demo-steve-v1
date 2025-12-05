import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
  'https://clipper-payouts-api-810712855216.us-central1.run.app';

const unwrapValue = (v) => {
  if (v && typeof v === 'object' && 'value' in v) {
    return v.value;
  }
  return v;
};

export default function ClippersPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [clippers, setClippers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // which clipper is expanded (showing dropdown)
  const [expandedId, setExpandedId] = useState(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleGoDashV2 = () => {
    navigate('/dashboard-v2');
  };

  const handleGoPayouts = () => {
    navigate('/payouts');
  };

  const handleGoDashV1 = () => {
    navigate('/dashboard');
  };

  // -------------------------------------------------------
  // FETCH CLIPPERS FROM API
  // -------------------------------------------------------
  useEffect(() => {
    const fetchClippers = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`${API_BASE_URL}/clippers`);
        if (!res.ok) {
          throw new Error(`Clippers API ${res.status}`);
        }

        const data = await res.json();

        const normalized = (Array.isArray(data) ? data : []).map((row, i) => {
          const id = row.id || `clipper_${i}`;
          return {
            id, // internal only (we don't show it in UI)
            clipperName:
              unwrapValue(row.clipper_name ?? row.clipperName) ||
              `Clipper ${i + 1}`,
            clientId: unwrapValue(row.client_id ?? row.clientId) || '',
            tiktokUsername: unwrapValue(
              row.tiktok_username ?? row.tiktokUsername
            ),
            instagramUsername: unwrapValue(
              row.instagram_username ?? row.instagramUsername
            ),
            youtubeUsername: unwrapValue(
              row.youtube_username ?? row.youtubeUsername
            ),
            isActive:
              typeof row.is_active === 'boolean'
                ? row.is_active
                : !!row.isActive,
            paymentProcessor: unwrapValue(
              row.payment_processor ?? row.paymentProcessor
            ),
            processorKey: unwrapValue(row.processor_key ?? row.processorKey),
            createdAt: unwrapValue(row.created_at ?? row.createdAt),
            updatedAt: unwrapValue(row.updated_at ?? row.updatedAt),
          };
        });

        setClippers(normalized);
      } catch (err) {
        console.error('Error loading clippers:', err);
        setError(err.message || 'Failed to load clippers');
      } finally {
        setLoading(false);
      }
    };

    fetchClippers();
  }, []);

  const toggleExpanded = (id) => {
    setExpandedId((current) => (current === id ? null : id));
  };

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
                  marginTop: 2,
                }}
              >
                Payouts
              </button>

              {/* Clippers – active page (3rd) */}
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
                  marginTop: 2,
                  marginBottom: 2,
                }}
              >
                Clippers
              </button>

              {/* Settings placeholder under Clippers */}
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

              {/* push bottom cluster down */}
              <div style={{ flexGrow: 1 }} />

              {/* Dashboards V1 at bottom */}
              <button
                onClick={handleGoDashV1}
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
                  marginBottom: 4,
                }}
              >
                Dashboards V1
              </button>

              {/* Logout – same style as other pages */}
              <button
                onClick={handleLogout}
                style={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: 999,
                  padding: '7px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 12,
                  background: 'rgba(248,250,252,0.06)',
                  color: 'rgba(255,255,255,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 12 }}>⏻</span>
                Logout
              </button>

              <div
                style={{
                  fontSize: 11,
                  opacity: 0.55,
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  paddingTop: 8,
                }}
              >
                Clipper accounts hub
              </div>
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

        {/* Clipper list with dropdowns */}
        <div
          style={{
            borderRadius: 18,
            border: '1px solid rgba(148,163,184,0.3)',
            background:
              'radial-gradient(circle at top left, rgba(148,163,184,0.25), rgba(15,23,42,1))',
            padding: 18,
            fontSize: 13,
            opacity: 0.95,
          }}
        >
          {loading ? (
            <div style={{ opacity: 0.85 }}>Loading clippers…</div>
          ) : error ? (
            <div style={{ color: '#fecaca' }}>
              Error loading clippers: {error}
            </div>
          ) : clippers.length === 0 ? (
            <div style={{ opacity: 0.8 }}>
              No clippers configured yet. Use <strong>+ Add clipper</strong> to
              create your first one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clippers.map((clipper) => {
                const isExpanded = expandedId === clipper.id;
                return (
                  <div
                    key={clipper.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: 'rgba(15,23,42,0.92)',
                      border: '1px solid rgba(148,163,184,0.5)',
                      boxShadow: '0 14px 30px rgba(15,23,42,0.9)',
                    }}
                  >
                    {/* Row header: name + status + dropdown arrow */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      {/* Left side: arrow + clipper name + quick summary */}
                      <button
                        onClick={() => toggleExpanded(clipper.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'inherit',
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 16,
                            opacity: 0.9,
                            transform: isExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 120ms ease',
                          }}
                        >
                          ▶
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              letterSpacing: 0.1,
                            }}
                          >
                            {clipper.clipperName}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              opacity: 0.75,
                            }}
                          >
                            {clipper.clientId && (
                              <>
                                Client ID: <code>{clipper.clientId}</code> ·{' '}
                              </>
                            )}
                            TikTok:{' '}
                            <span style={{ opacity: 0.9 }}>
                              {clipper.tiktokUsername || <em>none</em>}
                            </span>{' '}
                            · Instagram:{' '}
                            <span style={{ opacity: 0.9 }}>
                              {clipper.instagramUsername || <em>none</em>}
                            </span>{' '}
                            · YouTube:{' '}
                            <span style={{ opacity: 0.9 }}>
                              {clipper.youtubeUsername || <em>none</em>}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Right side: status pill */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            borderRadius: 999,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 500,
                            background: clipper.isActive
                              ? 'rgba(34,197,94,0.2)'
                              : 'rgba(148,163,184,0.2)',
                            color: clipper.isActive
                              ? 'rgb(74,222,128)'
                              : 'rgba(148,163,184,0.95)',
                            border: clipper.isActive
                              ? '1px solid rgba(74,222,128,0.7)'
                              : '1px solid rgba(148,163,184,0.7)',
                          }}
                        >
                          {clipper.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {clipper.createdAt && (
                          <span
                            style={{
                              fontSize: 10,
                              opacity: 0.6,
                            }}
                          >
                            Created:{' '}
                            {String(clipper.createdAt).slice(0, 10)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded section */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: '1px solid rgba(148,163,184,0.4)',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: 12,
                          fontSize: 12,
                        }}
                      >
                        {/* TikTok */}
                        <div>
                          <div
                            style={{
                              opacity: 0.65,
                              marginBottom: 3,
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: 0.04,
                            }}
                          >
                            TikTok username
                          </div>
                          <div
                            style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              background: 'rgba(15,23,42,0.9)',
                              border: '1px solid rgba(51,65,85,0.9)',
                              fontFamily: 'monospace',
                              fontSize: 12,
                              opacity: clipper.tiktokUsername ? 0.95 : 0.6,
                            }}
                          >
                            {clipper.tiktokUsername || 'none'}
                          </div>
                        </div>

                        {/* Instagram */}
                        <div>
                          <div
                            style={{
                              opacity: 0.65,
                              marginBottom: 3,
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: 0.04,
                            }}
                          >
                            Instagram username
                          </div>
                          <div
                            style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              background: 'rgba(15,23,42,0.9)',
                              border: '1px solid rgba(51,65,85,0.9)',
                              fontFamily: 'monospace',
                              fontSize: 12,
                              opacity: clipper.instagramUsername ? 0.95 : 0.6,
                            }}
                          >
                            {clipper.instagramUsername || 'none'}
                          </div>
                        </div>

                        {/* YouTube */}
                        <div>
                          <div
                            style={{
                              opacity: 0.65,
                              marginBottom: 3,
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: 0.04,
                            }}
                          >
                            YouTube username / channel ID
                          </div>
                          <div
                            style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              background: 'rgba(15,23,42,0.9)',
                              border: '1px solid rgba(51,65,85,0.9)',
                              fontFamily: 'monospace',
                              fontSize: 12,
                              opacity: clipper.youtubeUsername ? 0.95 : 0.6,
                            }}
                          >
                            {clipper.youtubeUsername || 'none'}
                          </div>
                        </div>

                        {/* Payment processor */}
                        <div>
                          <div
                            style={{
                              opacity: 0.65,
                              marginBottom: 3,
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: 0.04,
                            }}
                          >
                            Payment processor
                          </div>
                          <div
                            style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              background: 'rgba(15,23,42,0.9)',
                              border: '1px solid rgba(51,65,85,0.9)',
                              fontSize: 12,
                              opacity: clipper.paymentProcessor ? 0.95 : 0.6,
                            }}
                          >
                            {clipper.paymentProcessor || 'none'}
                          </div>
                        </div>

                        {/* Processor key */}
                        <div style={{ gridColumn: 'span 2' }}>
                          <div
                            style={{
                              opacity: 0.65,
                              marginBottom: 3,
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: 0.04,
                            }}
                          >
                            Processor key / customer ID
                          </div>
                          <div
                            style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              background: 'rgba(15,23,42,0.9)',
                              border: '1px solid rgba(51,65,85,0.9)',
                              fontFamily: 'monospace',
                              fontSize: 12,
                              opacity: clipper.processorKey ? 0.95 : 0.6,
                              wordBreak: 'break-all',
                            }}
                          >
                            {clipper.processorKey || 'none'}
                          </div>
                        </div>

                        {/* Active status summary */}
                        <div>
                          <div
                            style={{
                              opacity: 0.65,
                              marginBottom: 3,
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: 0.04,
                            }}
                          >
                            Status
                          </div>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 10px',
                              borderRadius: 999,
                              background: clipper.isActive
                                ? 'rgba(34,197,94,0.2)'
                                : 'rgba(148,163,184,0.2)',
                              border: clipper.isActive
                                ? '1px solid rgba(74,222,128,0.7)'
                                : '1px solid rgba(148,163,184,0.7)',
                              fontSize: 11,
                              fontWeight: 500,
                              color: clipper.isActive
                                ? 'rgb(74,222,128)'
                                : 'rgba(148,163,184,0.95)',
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 999,
                                background: clipper.isActive
                                  ? 'rgb(74,222,128)'
                                  : 'rgba(148,163,184,0.9)',
                              }}
                            />
                            {clipper.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
