// AnalyticsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

import { useEnvironment } from "./EnvironmentContext";

import { useBranding } from "./branding/BrandingContext";
import { useRole } from "./RoleContext";

const API_BASE_URL =
  'https://clipper-payouts-api-810712855216.us-central1.run.app';

const formatPct = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${num.toFixed(1)}%`;
};

export default function AnalyticsPage() {
  const navigate = useNavigate();

  //clientId
  const { clientId } = useEnvironment();

  const { profile } = useRole();
  const role = profile?.role || "client";
  const isManager = role === "manager";

  const { headingText, watermarkText, defaults } = useBranding();
  const brandText = headingText || defaults.headingText;
  const wmText = watermarkText || defaults.watermarkText;

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [platform, setPlatform] = useState('all');
  const [engSpan, setEngSpan] = useState('all');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // NAVIGATION
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const goDashV2 = () => navigate('/dashboard-v2');
  const goContentApproval = () => navigate('/content-approval');
  const goPayouts = () => navigate('/payouts');
  const goClippers = () => navigate('/clippers');
  const goPerformance = () => navigate('/performance');
  const goLeaderboards = () => navigate('/leaderboards');
  const goGallery = () => navigate('/gallery');
  const goSettings = () => navigate('/settings');
  const goAnalytics = () => navigate('/analytics');

  // FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const env = (clientId || "DEMOV2"); // could be 'arafta' (lowercase) — API normalizes it
        const url =
          `${API_BASE_URL}/analytics/locations` +
          `?clientId=${encodeURIComponent(env)}` +
          `&platform=${encodeURIComponent(platform)}` +
          `&engSpan=${encodeURIComponent(engSpan)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Analytics API ${res.status}`);

        const data = await res.json();
        setRows(data.rows || []);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Unable to load analytics data.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, platform, engSpan]); // <-- KEY: refetch on env change + filter change

    fetchData();
  }, [platform, engSpan]);

  const maxPct = useMemo(() => {
    if (!rows.length) return 0;
    return Math.max(...rows.map(r => Number(r.overall_pct || 0)));
  }, [rows]);

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
        {wmText}
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
          <button
            onClick={() => setSidebarOpen(v => !v)}
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
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>
                Navigation
              </div>

              <button onClick={goDashV2} style={navButtonStyle}>
                Dashboards
              </button>

              <button onClick={goAnalytics} style={activeNavButtonStyle}>
                Analytics
              </button>

              {isManager && <button onClick={goContentApproval} style={navSubStyle}>Review Content</button>}
              {isManager && <button onClick={goPayouts} style={navSubStyle}>Payouts</button>}
              {isManager && <button onClick={goClippers} style={navSubStyle}>Clippers</button>}
              {isManager && <button onClick={goPerformance} style={navSubStyle}>Performance</button>}

              <button onClick={goLeaderboards} style={navSubStyle}>Leaderboards</button>
              <button onClick={goGallery} style={navSubStyle}>Gallery</button>
              {isManager && <button onClick={goSettings} style={navSubStyle}>Settings</button>}

              <div style={{ flexGrow: 1 }} />

              <button onClick={handleLogout} style={logoutStyle}>
                ⏻ Logout
              </button>
            </>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, position: 'relative', zIndex: 3 }}>
        {/* Branding */}
        <div style={{ marginBottom: 12 }}>
          <span
            style={{
              fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
              fontSize: 34,
              textTransform: 'uppercase',
            }}
          >
            {brandText}
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 30, margin: 0 }}>Analytics</h1>
          <span style={{ fontSize: 13, opacity: 0.7 }}>
            Weighted viewer location distribution
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <select value={platform} onChange={e => setPlatform(e.target.value)} style={filterStyle}>
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
          </select>

          <select value={engSpan} onChange={e => setEngSpan(e.target.value)} style={filterStyle}>
            <option value="all">All Languages</option>
            <option value="english">English</option>
            <option value="spanish">Spanish</option>
          </select>
        </div>

        {/* Card */}
        <div
          style={{
            borderRadius: 20,
            padding: 20,
            background:
              'radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 55%)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
          }}
        >
          {loading && <div>Loading analytics…</div>}
          {error && <div style={{ color: '#fed7aa' }}>{error}</div>}

          {!loading && !error && rows.map((row) => {
            const pct = Number(row.overall_pct || 0);
            const width = maxPct ? (pct / maxPct) * 100 : 0;

            return (
              <div key={row.country} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{row.country}</span>
                  <span>{formatPct(pct)}</span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.08)',
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      width: `${width}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, #f97316, #facc15)',
                      transition: 'width 300ms ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const navButtonStyle = {
  border: 'none',
  borderRadius: 12,
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: 13,
  background: 'linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))',
  color: '#020617',
  fontWeight: 600,
  cursor: 'pointer',
};

const activeNavButtonStyle = {
  border: 'none',
  borderRadius: 12,
  padding: '7px 10px',
  textAlign: 'left',
  fontSize: 12,
  background: 'rgba(255,255,255,0.08)',
  color: '#fff',
  cursor: 'pointer',
};

const navSubStyle = {
  border: 'none',
  borderRadius: 12,
  padding: '7px 10px',
  textAlign: 'left',
  fontSize: 12,
  background: 'transparent',
  color: 'rgba(255,255,255,0.7)',
  cursor: 'pointer',
};

const logoutStyle = {
  border: 'none',
  borderRadius: 999,
  padding: '7px 10px',
  fontSize: 12,
  background: 'rgba(248,250,252,0.06)',
  color: 'rgba(255,255,255,0.85)',
  cursor: 'pointer',
};

const filterStyle = {
  fontSize: 12,
  padding: '6px 10px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(0,0,0,0.6)',
  color: '#fff',
};
