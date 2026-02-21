// AnalyticsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

// remove decimals from views
const formatViews = (v) =>
  Math.round(Number(v || 0)).toLocaleString('en-US');

export default function AnalyticsPage() {
  const navigate = useNavigate();
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
  const [totalViews, setTotalViews] = useState(0);

  const [animatedTotal, setAnimatedTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [animateBars, setAnimateBars] = useState(false);

  const lastTotalRef = useRef(0);

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
        setAnimateBars(false);

        const env = clientId || "DEMOV2";

        const url =
          `${API_BASE_URL}/analytics/locations` +
          `?clientId=${encodeURIComponent(env)}` +
          `&platform=${encodeURIComponent(platform)}` +
          `&engSpan=${encodeURIComponent(engSpan)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Analytics API ${res.status}`);

        const data = await res.json();

        setRows(data.rows || []);
        setTotalViews(Number(data.totalViews || 0));

        // trigger bar animation after render
        requestAnimationFrame(() => {
          setTimeout(() => setAnimateBars(true), 80);
        });
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Unable to load analytics data.");
        setRows([]);
        setTotalViews(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, platform, engSpan]);

  // Animate the total views count-up when totalViews changes
  useEffect(() => {
    const target = Number(totalViews || 0);
    const from = Number(lastTotalRef.current || 0);

    // if first load or target is smaller, just set it
    if (!Number.isFinite(target) || target <= 0 || from === 0 || target < from) {
      setAnimatedTotal(target);
      lastTotalRef.current = target;
      return;
    }

    const durationMs = 900;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / durationMs, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (target - from) * eased;
      setAnimatedTotal(value);
      if (t < 1) requestAnimationFrame(tick);
      else {
        setAnimatedTotal(target);
        lastTotalRef.current = target;
      }
    };

    requestAnimationFrame(tick);
  }, [totalViews]);

  const maxPct = useMemo(() => {
    if (!rows.length) return 0;
    return Math.max(...rows.map(r => Number(r.overall_pct || 0)));
  }, [rows]);

  const exportCSV = () => {
    const header = "Country,OverallPct,WeightedViews\n";
    const body = (rows || [])
      .map(r => {
        const c = String(r.country ?? '').replaceAll('"', '""');
        const p = Number(r.overall_pct ?? 0);
        const w = Number(r.weighted_views ?? 0);
        return `"${c}",${p},${w}`;
      })
      .join("\n");

    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `location-analytics_${clientId || "DEMOV2"}_${platform}_${engSpan}.csv`;
    a.click();

    URL.revokeObjectURL(url);
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
      {/* Keyframes (inline so no CSS file needed) */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>

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

              <button onClick={goDashV2} style={navSubStyle}>Dashboards</button>
              {isManager && <button onClick={goContentApproval} style={navSubStyle}>Review Content</button>}
              {isManager && <button onClick={goPayouts} style={navSubStyle}>Payouts</button>}
              {isManager && <button onClick={goClippers} style={navSubStyle}>Clippers</button>}
              {isManager && <button onClick={goPerformance} style={navSubStyle}>Performance</button>}
              <button onClick={goLeaderboards} style={navSubStyle}>Leaderboards</button>
              <button onClick={goGallery} style={navSubStyle}>Gallery</button>
              <button onClick={goAnalytics} style={navButtonStyle}>Analytics</button>
              {isManager && <button onClick={goSettings} style={navSubStyle}>Settings</button>}

              <div style={{ flexGrow: 1 }} />
              <button onClick={handleLogout} style={logoutStyle}>⏻ Logout</button>
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
          {/* Top right actions */}
          {!loading && !error && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button
                onClick={exportCSV}
                style={{
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.9)',
                  padding: '6px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Export CSV
              </button>
            </div>
          )}

          {/* SUMMARY BOX */}
          {!loading && !error && totalViews > 0 && (
            <div
              style={{
                marginBottom: 26,
                padding: '18px 24px',
                borderRadius: 18,
                background:
                  'linear-gradient(90deg, rgba(249,115,22,0.15), rgba(250,204,21,0.05))',
                border: '1px solid rgba(249,115,22,0.3)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 13, opacity: 0.6 }}>
                  Total Views (Filtered)
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>
                  {formatViews(animatedTotal)}
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: 'rgba(250,204,21,0.12)',
                  border: '1px solid rgba(250,204,21,0.35)',
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                Includes Unreported
              </div>
            </div>
          )}

          {/* Loading / error */}
          {loading && (
            <div style={{ paddingTop: 6 }}>
              {[...Array(10)].map((_, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      height: 12,
                      width: `${70 + (i % 3) * 10}%`,
                      borderRadius: 8,
                      background:
                        'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.11) 37%, rgba(255,255,255,0.06) 63%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.35s ease infinite',
                    }}
                  />
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)',
                      marginTop: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${25 + (i % 5) * 8}%`,
                        borderRadius: 999,
                        background:
                          'linear-gradient(135deg, rgba(249,115,22,0.35), rgba(250,204,21,0.25))',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <div style={{ color: '#fed7aa' }}>{error}</div>}

          {/* Rows */}
          {!loading && !error && rows.map((row, i) => {
            const pct = Number(row.overall_pct || 0);
            const width = maxPct ? (pct / maxPct) * 100 : 0;

            return (
              <div
                key={`${row.country}-${i}`}
                style={{
                  marginBottom: 14,
                  padding: '10px 10px',
                  borderRadius: 14,
                  transition: 'transform 150ms ease, background 150ms ease',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    fontSize: 13,
                  }}
                >
                  <span style={{ opacity: 0.95 }}>{row.country}</span>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>
                      {formatPct(pct)}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                      {formatViews(row.weighted_views)} views
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.08)',
                    marginTop: 6,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    title={`${formatPct(pct)} • ${formatViews(row.weighted_views)} views`}
                    style={{
                      width: animateBars ? `${width}%` : '0%',
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, #f97316, #facc15)',
                      boxShadow: '0 0 12px rgba(249,115,22,0.55)',
                      transition: 'width 950ms cubic-bezier(0.22, 1, 0.36, 1)',
                      transitionDelay: `${i * 45}ms`, // stagger
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
