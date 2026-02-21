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

  // Animated counter for total views
  useEffect(() => {
    if (!totalViews) return;
    let start = 0;
    const duration = 900;
    const increment = totalViews / (duration / 16);

    const counter = setInterval(() => {
      start += increment;
      if (start >= totalViews) {
        setAnimatedTotal(totalViews);
        clearInterval(counter);
      } else {
        setAnimatedTotal(start);
      }
    }, 16);

    return () => clearInterval(counter);
  }, [totalViews]);

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

  // FETCH
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
        setTotalViews(data.totalViews || 0);

        setTimeout(() => setAnimateBars(true), 80);

      } catch (err) {
        console.error(err);
        setError("Unable to load analytics data.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, platform, engSpan]);

  const maxPct = useMemo(() => {
    if (!rows.length) return 0;
    return Math.max(...rows.map(r => Number(r.overall_pct || 0)));
  }, [rows]);

  const exportCSV = () => {
    const header = "Country,Percentage,Views\n";
    const body = rows
      .map(r => `${r.country},${r.overall_pct},${r.weighted_views}`)
      .join("\n");

    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "location-analytics.csv";
    a.click();
  };

  return (
    <div style={containerStyle}>

      <Watermark text={wmText} />

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isManager={isManager}
        goDashV2={goDashV2}
        goContentApproval={goContentApproval}
        goPayouts={goPayouts}
        goClippers={goClippers}
        goPerformance={goPerformance}
        goLeaderboards={goLeaderboards}
        goGallery={goGallery}
        goAnalytics={goAnalytics}
        goSettings={goSettings}
        handleLogout={handleLogout}
      />

      <div style={{ flex: 1, position: 'relative', zIndex: 3 }}>
        <div style={{ marginBottom: 12 }}>
          <span style={brandStyle}>{brandText}</span>
        </div>

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

        {/* CARD */}
        <div style={cardStyle}>

          {/* Export Button */}
          {!loading && !error && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button onClick={exportCSV} style={exportBtn}>
                Export CSV
              </button>
            </div>
          )}

          {/* Summary */}
          {!loading && totalViews > 0 && (
            <div style={summaryBox}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.6 }}>Total Views (Filtered)</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>
                  {formatViews(animatedTotal)}
                </div>
              </div>
              <div style={badgeStyle}>Includes Unreported</div>
            </div>
          )}

          {loading && <ShimmerLoader />}
          {error && <div style={{ color: '#fed7aa' }}>{error}</div>}

          {!loading && rows.map((row, i) => {
            const pct = Number(row.overall_pct || 0);
            const width = maxPct ? (pct / maxPct) * 100 : 0;

            return (
              <div key={row.country} style={{ marginBottom: 16 }}>
                <div style={rowHeader}>
                  <span>{row.country}</span>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>
                      {formatPct(pct)}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>
                      {formatViews(row.weighted_views)} views
                    </div>
                  </div>
                </div>

                <div style={barTrack}>
                  <div
                    title={`${formatPct(pct)} — ${formatViews(row.weighted_views)} views`}
                    style={{
                      ...barFill,
                      width: animateBars ? `${width}%` : "0%",
                      transitionDelay: `${i * 50}ms`
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

/* ================== COMPONENTS ================== */

const ShimmerLoader = () => (
  <div style={{ padding: 20 }}>
    {[...Array(6)].map((_, i) => (
      <div key={i} style={{
        height: 14,
        marginBottom: 16,
        borderRadius: 8,
        background: "linear-gradient(90deg,#222 25%,#333 37%,#222 63%)",
        backgroundSize: "400% 100%",
        animation: "shimmer 1.4s ease infinite"
      }} />
    ))}
  </div>
);

/* ================== STYLES ================== */

const containerStyle = {
  position: 'fixed',
  inset: 0,
  background: 'radial-gradient(circle at top, #141414 0, #020202 55%)',
  display: 'flex',
  overflowY: 'auto',
  color: '#fff',
  fontFamily: 'system-ui, sans-serif',
  padding: 32,
};

const cardStyle = {
  borderRadius: 20,
  padding: 20,
  background: 'radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 55%)',
  boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
};

const summaryBox = {
  marginBottom: 28,
  padding: '18px 24px',
  borderRadius: 18,
  background: 'linear-gradient(90deg, rgba(249,115,22,0.15), rgba(250,204,21,0.05))',
  border: '1px solid rgba(249,115,22,0.3)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const badgeStyle = {
  fontSize: 12,
  background: "rgba(250,204,21,0.15)",
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(250,204,21,0.4)"
};

const rowHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  fontSize: 13,
};

const barTrack = {
  height: 8,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  marginTop: 6,
  overflow: 'hidden',
};

const barFill = {
  height: '100%',
  borderRadius: 999,
  background: 'linear-gradient(135deg, #f97316, #facc15)',
  boxShadow: '0 0 14px rgba(249,115,22,0.6)',
  transition: 'width 900ms cubic-bezier(0.22, 1, 0.36, 1)',
};

const exportBtn = {
  border: "none",
  padding: "6px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  cursor: "pointer",
};

const filterStyle = {
  fontSize: 12,
  padding: '6px 10px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(0,0,0,0.6)',
  color: '#fff',
};

const brandStyle = {
  fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
  fontSize: 34,
  textTransform: 'uppercase',
};
