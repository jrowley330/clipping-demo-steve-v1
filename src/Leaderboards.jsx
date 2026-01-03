// Leaderboards.jsx
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const API_BASE_URL =
  'https://clipper-payouts-api-810712855216.us-central1.run.app';

// Helpers
const formatNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString();
};

const formatPct = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${(num * 100).toFixed(1)}%`;
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return '—';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return String(dateStr);
  return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

// Small toast
function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 22,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        padding: '10px 14px',
        borderRadius: 999,
        background: 'rgba(0,0,0,0.78)',
        border: '1px solid rgba(255,255,255,0.14)',
        color: 'rgba(255,255,255,0.92)',
        fontSize: 12,
        boxShadow: '0 18px 50px rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {message}
    </div>
  );
}

export default function Leaderboards() {
  const navigate = useNavigate();
  const boardRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState('');

  // Filters (placeholder)
  const [week, setWeek] = useState('2025-12-29'); // week start (Mon)
  const [platform, setPlatform] = useState('all'); // all | IG | TT | YT
  const [metric, setMetric] = useState('views'); // views | engagement | videos

  // Placeholder data (you’ll replace with API later)
  const placeholder = useMemo(() => {
    // Think: this is what your /leaderboards endpoint returns later.
    // Keep fields stable so wiring is easy.
    const rows = [
      {
        id: 'c1',
        name: 'Stevewilldoitbruh',
        views: 43204992,
        videos: 104,
        engagementRate: 0.061,
        streakWeeks: 6,
        deltaRank: +2,
        highlights: ['2 viral reels', 'best hook rate', 'strong comment velocity'],
      },
      {
        id: 'c2',
        name: 'Stevewilldoitfr',
        views: 43990426,
        videos: 82,
        engagementRate: 0.055,
        streakWeeks: 4,
        deltaRank: -1,
        highlights: ['highest avg views/video', 'fastest posting cadence'],
      },
      {
        id: 'c3',
        name: 'realstevewilldoit',
        views: 39831447,
        videos: 79,
        engagementRate: 0.058,
        streakWeeks: 5,
        deltaRank: +0,
        highlights: ['best share rate', 'strong saves'],
      },
      {
        id: 'c4',
        name: 'Stevewilldoitclips_',
        views: 23296224,
        videos: 83,
        engagementRate: 0.049,
        streakWeeks: 3,
        deltaRank: +1,
        highlights: ['clean edits', 'good retention'],
      },
      {
        id: 'c5',
        name: 'Stevewilldoit.viral',
        views: 19462001,
        videos: 84,
        engagementRate: 0.047,
        streakWeeks: 2,
        deltaRank: +3,
        highlights: ['biggest mover', 'strong repost loop'],
      },
      {
        id: 'c6',
        name: 'Stevewilldoitfunny',
        views: 10199241,
        videos: 91,
        engagementRate: 0.043,
        streakWeeks: 1,
        deltaRank: -2,
        highlights: ['high volume', 'needs stronger hooks'],
      },
    ];

    return {
      weekOf: week,
      platform,
      rows,
    };
  }, [week, platform]);

  const computed = useMemo(() => {
    const rows = [...placeholder.rows];

    const sorted = rows.sort((a, b) => {
      if (metric === 'videos') return (b.videos || 0) - (a.videos || 0);
      if (metric === 'engagement') return (b.engagementRate || 0) - (a.engagementRate || 0);
      return (b.views || 0) - (a.views || 0);
    });

    const podium = sorted.slice(0, 3);
    const rest = sorted.slice(3);

    const topViews = [...rows].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
    const mostVideos = [...rows].sort((a, b) => (b.videos || 0) - (a.videos || 0))[0];
    const bestEng = [...rows].sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0))[0];
    const longestStreak = [...rows].sort((a, b) => (b.streakWeeks || 0) - (a.streakWeeks || 0))[0];
    const biggestMover = [...rows].sort((a, b) => (b.deltaRank || 0) - (a.deltaRank || 0))[0];

    const totalViews = rows.reduce((s, r) => s + Number(r.views || 0), 0);
    const totalVideos = rows.reduce((s, r) => s + Number(r.videos || 0), 0);

    return {
      podium,
      rest,
      totalViews,
      totalVideos,
      topViews,
      mostVideos,
      bestEng,
      longestStreak,
      biggestMover,
    };
  }, [placeholder.rows, metric]);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(''), 1800);
  };

  // NAV
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const goDashV2 = () => navigate('/dashboard-v2');
  const goDashV1 = () => navigate('/dashboard');
  const goPayouts = () => navigate('/payouts');
  const goClippers = () => navigate('/clippers');
  const goLeaderboards = () => navigate('/leaderboards');

  // Actions
  const copySummary = async () => {
    const lines = [];
    lines.push(`🏆 Weekly Leaderboard — Week of ${formatDateLabel(placeholder.weekOf)} (${platform.toUpperCase() === 'ALL' ? 'All Platforms' : platform})`);
    lines.push('');
    computed.podium.forEach((p, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
      lines.push(`${medal} ${p.name} — ${formatNumber(p.views)} views · ${formatNumber(p.videos)} videos · ${formatPct(p.engagementRate)} ER`);
    });
    lines.push('');
    lines.push(`Totals: ${formatNumber(computed.totalViews)} views · ${formatNumber(computed.totalVideos)} videos`);
    lines.push(`Most videos: ${computed.mostVideos?.name} (${formatNumber(computed.mostVideos?.videos)})`);
    lines.push(`Best engagement: ${computed.bestEng?.name} (${formatPct(computed.bestEng?.engagementRate)})`);
    lines.push(`Longest streak: ${computed.longestStreak?.name} (${computed.longestStreak?.streakWeeks || 0} weeks)`);

    const text = lines.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied leaderboard summary ✅');
    } catch {
      showToast('Copy failed (browser permissions) ⚠️');
    }
  };

  const printToPdf = () => {
    // Browser print dialog -> user can “Save as PDF”
    showToast('Opening print view…');
    window.print();
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
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '32px',
        paddingTop: '40px',
        paddingBottom: '40px',
      }}
    >
      {/* PRINT STYLES: print only the board area */}
      <style>{`
        @media print {
          body { background: #000 !important; }
          .no-print { display: none !important; }
          .print-area {
            position: static !important;
            inset: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* WATERMARK */}
      <div
        className="no-print"
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
        className="no-print"
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

              <button
                onClick={goDashV2}
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

              <button
                onClick={goPayouts}
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

              <button
                onClick={goClippers}
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
                Clippers
              </button>

              {/* ACTIVE: Leaderboards */}
              <button
                onClick={goLeaderboards}
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
                Leaderboards
              </button>

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

              <div style={{ flexGrow: 1 }} />

              <button
                onClick={goDashV1}
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
                Weekly performance arena
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, position: 'relative', zIndex: 3 }}>
        {/* Brand */}
        <div className="no-print" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
              fontSize: 34,
              letterSpacing: 0.5,
              color: '#ffffff',
              textTransform: 'uppercase',
              textShadow: '0 3px 12px rgba(0,0,0,0.7)',
            }}
          >
            STEVEWILLDOIT, LLC
          </span>
        </div>

        {/* Header */}
        <div
          className="no-print"
          style={{
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Leaderboards</h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              Weekly rankings · built for competition
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={copySummary}
              style={{
                borderRadius: 999,
                padding: '8px 12px',
                border: '1px solid rgba(148,163,184,0.45)',
                background: 'rgba(0,0,0,0.55)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 12,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
            >
              Copy summary
            </button>

            <button
              onClick={printToPdf}
              style={{
                borderRadius: 999,
                padding: '8px 12px',
                border: '1px solid rgba(148,163,184,0.45)',
                background: 'rgba(0,0,0,0.55)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 12,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
            >
              Print / Save PDF
            </button>

            <button
              disabled
              title="Wire to an API endpoint later (SendGrid/Mailgun)."
              style={{
                borderRadius: 999,
                padding: '8px 12px',
                border: '1px solid rgba(148,163,184,0.25)',
                background: 'rgba(0,0,0,0.35)',
                color: 'rgba(255,255,255,0.45)',
                fontSize: 12,
                cursor: 'not-allowed',
              }}
            >
              Send to clippers (soon)
            </button>
          </div>
        </div>

        {/* PRINT AREA */}
        <div ref={boardRef} className="print-area">
          {/* Filters bar */}
          <div
            className="no-print"
            style={{
              borderRadius: 18,
              border: '1px solid rgba(148,163,184,0.25)',
              background: 'rgba(0,0,0,0.45)',
              padding: 14,
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              marginBottom: 16,
              backdropFilter: 'blur(10px)',
              boxShadow: '0 18px 50px rgba(0,0,0,0.75)',
            }}
          >
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                <span style={{ opacity: 0.7 }}>Week of</span>
                <select
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.16)',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'rgba(255,255,255,0.9)',
                    minWidth: 160,
                  }}
                >
                  <option value="2025-12-29">Dec 29, 2025</option>
                  <option value="2025-12-22">Dec 22, 2025</option>
                  <option value="2025-12-15">Dec 15, 2025</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                <span style={{ opacity: 0.7 }}>Platform</span>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.16)',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'rgba(255,255,255,0.9)',
                    minWidth: 160,
                  }}
                >
                  <option value="all">All</option>
                  <option value="IG">Instagram</option>
                  <option value="TT">TikTok</option>
                  <option value="YT">YouTube</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                <span style={{ opacity: 0.7 }}>Rank by</span>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.16)',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'rgba(255,255,255,0.9)',
                    minWidth: 180,
                  }}
                >
                  <option value="views">Views generated</option>
                  <option value="videos">Videos posted</option>
                  <option value="engagement">Engagement rate</option>
                </select>
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ opacity: 0.85 }}>
                Week of {formatDateLabel(placeholder.weekOf)} · {formatNumber(computed.totalViews)} views
              </span>
            </div>
          </div>

          {/* Podium */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 14,
              marginBottom: 16,
            }}
          >
            {/* 2nd */}
            <PodiumCard
              place="2"
              label="2nd"
              accent="silver"
              person={computed.podium[1]}
            />
            {/* 1st */}
            <PodiumCard
              place="1"
              label="1st"
              accent="gold"
              person={computed.podium[0]}
              isFirst
            />
            {/* 3rd */}
            <PodiumCard
              place="3"
              label="3rd"
              accent="bronze"
              person={computed.podium[2]}
            />
          </div>

          {/* Mini leaderboards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              marginBottom: 16,
            }}
          >
            <MiniAward
              title="Most views"
              value={`${computed.topViews?.name || '—'}`}
              sub={`${formatNumber(computed.topViews?.views)} views`}
              glow="rgba(250,204,21,0.35)"
            />
            <MiniAward
              title="Most videos"
              value={`${computed.mostVideos?.name || '—'}`}
              sub={`${formatNumber(computed.mostVideos?.videos)} videos`}
              glow="rgba(96,165,250,0.35)"
            />
            <MiniAward
              title="Best engagement"
              value={`${computed.bestEng?.name || '—'}`}
              sub={`${formatPct(computed.bestEng?.engagementRate)} ER`}
              glow="rgba(34,197,94,0.35)"
            />
            <MiniAward
              title="Biggest mover"
              value={`${computed.biggestMover?.name || '—'}`}
              sub={`${computed.biggestMover?.deltaRank > 0 ? '+' : ''}${computed.biggestMover?.deltaRank || 0} rank`}
              glow="rgba(244,114,182,0.35)"
            />
          </div>

          {/* Rest of leaderboard */}
          <div
            style={{
              borderRadius: 20,
              background: 'radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 55%)',
              padding: 18,
              boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Full rankings</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  Sorted by {metric === 'views' ? 'views' : metric === 'videos' ? 'videos posted' : 'engagement rate'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, fontSize: 12, opacity: 0.75 }}>
                <span>🔥 streaks</span>
                <span>↕︎ movement</span>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {computed.rest.map((r, idx) => (
                <div
                  key={r.id}
                  style={{
                    borderRadius: 14,
                    padding: '12px 12px',
                    background: 'rgba(15,23,42,0.92)',
                    border: '1px solid rgba(148,163,184,0.35)',
                    boxShadow: '0 14px 30px rgba(15,23,42,0.85)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.92)',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }}
                    >
                      {idx + 4}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.1 }}>{r.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {r.highlights?.slice(0, 2).join(' · ') || '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <StatPill label="Views" value={formatNumber(r.views)} />
                    <StatPill label="Videos" value={formatNumber(r.videos)} />
                    <StatPill label="ER" value={formatPct(r.engagementRate)} />
                    <StatPill
                      label="Streak"
                      value={`${r.streakWeeks || 0}w`}
                      vibe="streak"
                    />
                    <StatPill
                      label="Move"
                      value={`${r.deltaRank > 0 ? '▲' : r.deltaRank < 0 ? '▼' : '•'} ${Math.abs(r.deltaRank || 0)}`}
                      vibe={r.deltaRank > 0 ? 'up' : r.deltaRank < 0 ? 'down' : 'flat'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Share pack (UI only for now) */}
          <div
            className="no-print"
            style={{
              marginTop: 16,
              borderRadius: 20,
              padding: 16,
              border: '1px solid rgba(148,163,184,0.25)',
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 18px 50px rgba(0,0,0,0.75)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Share pack</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Designed for sending to clippers weekly (email automation later).
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={copySummary}
                  style={{
                    borderRadius: 999,
                    padding: '8px 12px',
                    border: '1px solid rgba(148,163,184,0.45)',
                    background: 'rgba(0,0,0,0.55)',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Copy text
                </button>
                <button
                  onClick={printToPdf}
                  style={{
                    borderRadius: 999,
                    padding: '8px 12px',
                    border: '1px solid rgba(148,163,184,0.45)',
                    background: 'rgba(0,0,0,0.55)',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Export PDF
                </button>
                <button
                  disabled
                  title="Later: POST to /leaderboards/email with week + platform, server sends to clipper emails."
                  style={{
                    borderRadius: 999,
                    padding: '8px 12px',
                    border: '1px solid rgba(148,163,184,0.25)',
                    background: 'rgba(0,0,0,0.35)',
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 12,
                    cursor: 'not-allowed',
                  }}
                >
                  Email blast (later)
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
              Later wiring idea: use your <strong>Clippers</strong> table to store emails → backend builds a PDF (or image) + sends weekly via SendGrid.
            </div>
          </div>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}

/* --- Components --- */

function PodiumCard({ place, label, accent, person, isFirst }) {
  const palette =
    accent === 'gold'
      ? {
          border: 'rgba(250,204,21,0.55)',
          glow: 'rgba(250,204,21,0.22)',
          title: 'rgba(250,204,21,0.95)',
        }
      : accent === 'silver'
      ? {
          border: 'rgba(226,232,240,0.55)',
          glow: 'rgba(226,232,240,0.16)',
          title: 'rgba(226,232,240,0.92)',
        }
      : {
          border: 'rgba(251,146,60,0.55)',
          glow: 'rgba(251,146,60,0.18)',
          title: 'rgba(251,146,60,0.92)',
        };

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 16,
        background: `radial-gradient(circle at top left, ${palette.glow}, rgba(15,23,42,1))`,
        border: `1px solid ${palette.border}`,
        boxShadow: isFirst
          ? '0 28px 90px rgba(0,0,0,0.85)'
          : '0 22px 65px rgba(0,0,0,0.78)',
        position: 'relative',
        overflow: 'hidden',
        transform: isFirst ? 'translateY(-4px)' : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.06), transparent 40%)',
          opacity: isFirst ? 0.9 : 0.75,
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 0.12,
                textTransform: 'uppercase',
                opacity: 0.75,
              }}
            >
              {label} place
            </div>
            <div
              style={{
                fontSize: isFirst ? 20 : 18,
                fontWeight: 800,
                color: 'rgba(255,255,255,0.95)',
                letterSpacing: 0.2,
              }}
            >
              {person?.name || '—'}
            </div>
          </div>

          <div
            style={{
              width: isFirst ? 46 : 42,
              height: isFirst ? 46 : 42,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: isFirst ? 18 : 16,
              background: 'rgba(0,0,0,0.35)',
              border: `1px solid ${palette.border}`,
              color: palette.title,
              boxShadow: isFirst ? `0 0 35px ${palette.glow}` : 'none',
            }}
          >
            {place}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <PodiumStat label="Views" value={formatNumber(person?.views)} accent={palette.title} />
          <PodiumStat label="Videos" value={formatNumber(person?.videos)} accent={palette.title} />
          <PodiumStat label="ER" value={formatPct(person?.engagementRate)} accent={palette.title} />
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.78 }}>
          {(person?.highlights || []).slice(0, 3).map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: i === 0 ? 0 : 6 }}>
              <span style={{ color: palette.title }}>✦</span>
              <span>{h}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PodiumStat({ label, value, accent }) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: '10px 10px',
        background: 'rgba(0,0,0,0.28)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

function MiniAward({ title, value, sub, glow }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        background: `radial-gradient(circle at top left, ${glow}, rgba(15,23,42,1))`,
        border: '1px solid rgba(148,163,184,0.22)',
        boxShadow: '0 20px 55px rgba(0,0,0,0.78)',
      }}
    >
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.08, opacity: 0.75 }}>
        {title}
      </div>
      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 800 }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 12, opacity: 0.72 }}>{sub}</div>
    </div>
  );
}

function StatPill({ label, value, vibe }) {
  const styles =
    vibe === 'up'
      ? { border: 'rgba(34,197,94,0.45)', bg: 'rgba(34,197,94,0.14)', color: 'rgba(74,222,128,0.95)' }
      : vibe === 'down'
      ? { border: 'rgba(244,63,94,0.45)', bg: 'rgba(244,63,94,0.14)', color: 'rgba(251,113,133,0.95)' }
      : vibe === 'streak'
      ? { border: 'rgba(250,204,21,0.45)', bg: 'rgba(250,204,21,0.12)', color: 'rgba(250,204,21,0.95)' }
      : vibe === 'flat'
      ? { border: 'rgba(148,163,184,0.35)', bg: 'rgba(148,163,184,0.10)', color: 'rgba(226,232,240,0.9)' }
      : { border: 'rgba(148,163,184,0.25)', bg: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.88)' };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 999,
        border: `1px solid ${styles.border}`,
        background: styles.bg,
        fontSize: 12,
        color: styles.color,
      }}
    >
      <span style={{ fontSize: 11, opacity: 0.85 }}>{label}</span>
      <span style={{ fontWeight: 800, color: styles.color }}>{value}</span>
    </div>
  );
}
