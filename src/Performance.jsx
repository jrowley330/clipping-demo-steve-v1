// src/pages/Performance.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const API_BASE_URL =
  'https://clipper-payouts-api-810712855216.us-central1.run.app';

// --- helpers (match your style) ---
const formatNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString();
};

const formatPct = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${(num * 100).toFixed(2)}%`;
};

// TEMP: mock rows until you wire endpoints
const MOCK = [
  {
    bucket: 'top',
    platform: 'youtube',
    username: 'joeyr',
    title: 'How I doubled views in 24 hours',
    views_24h: 18420,
    view_count: 225000,
    engagement_rate: 0.043,
    has_speech: true,
    has_face: true,
    has_text: true,
    url: 'https://youtube.com/shorts/demo',
    video_id: 'demo1',
  },
  {
    bucket: 'top',
    platform: 'tiktok',
    username: 'john',
    title: 'The 3-second hook formula',
    views_24h: 9021,
    view_count: 71200,
    engagement_rate: 0.061,
    has_speech: true,
    has_face: true,
    has_text: false,
    url: 'https://tiktok.com/@demo/video/demo',
    video_id: 'demo2',
  },
  {
    bucket: 'bottom',
    platform: 'instagram',
    username: 'joeyr',
    title: 'Aesthetic montage (no hook)',
    views_24h: 12,
    view_count: 1900,
    engagement_rate: 0.006,
    has_speech: false,
    has_face: false,
    has_text: true,
    url: 'https://instagram.com/reel/demo',
    video_id: 'demo3',
  },
];

async function fetchCandidates({ platform, username, bucket }) {
  // If you don’t have endpoints yet, use mock
  // Later: replace with real fetch call to your API
  await new Promise((r) => setTimeout(r, 160));
  return MOCK
    .filter((r) => (bucket ? r.bucket === bucket : true))
    .filter((r) => (platform !== 'all' ? r.platform === platform : true))
    .filter((r) =>
      username ? (r.username || '').toLowerCase().includes(username.toLowerCase()) : true
    );
}

async function fakeStreamingAnalysis({ signal, onToken }) {
  const text =
    `High-level read:\n\n` +
    `• Winners win the first second (face/text + clear promise).\n` +
    `• Winners keep velocity: frequent cuts + contrast + pattern interrupts.\n` +
    `• Losers start slow: no explicit result, low motion, hook arrives late.\n\n` +
    `Recommended tests:\n` +
    `1) Lead with the outcome (result first, context second).\n` +
    `2) On-screen hook in frame 1 (6–9 words, high contrast).\n` +
    `3) Add a pattern interrupt every ~0.8–1.2s.\n\n` +
    `If you want: I can generate 10 hooks + a first-3-seconds storyboard based on your winners.\n`;

  const chunks = text.split(/(\s+)/);
  for (const c of chunks) {
    if (signal?.aborted) throw new Error('aborted');
    await new Promise((r) => setTimeout(r, 12));
    onToken(c);
  }
}

export default function Performance() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [platform, setPlatform] = useState('all');
  const [bucket, setBucket] = useState('top');
  const [username, setUsername] = useState('');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [analysisText, setAnalysisText] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const abortRef = useRef(null);

  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);

  const phases = useMemo(
    () => [
      'Loading snapshots + metrics…',
      'Comparing top vs bottom patterns…',
      'Scoring hook / pacing / clarity…',
      'Extracting repeatable traits…',
      'Generating coaching plan…',
    ],
    []
  );

  // NAV
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };
  const goDashV2 = () => navigate('/dashboard-v2');
  const goDashV1 = () => navigate('/dashboard');
  const goPayouts = () => navigate('/payouts');
  const goClippers = () => navigate('/clippers');
  const goPerformance = () => navigate('/performance');

  // load candidates
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await fetchCandidates({ platform, username, bucket });
        setRows(data || []);
      } catch (e) {
        setError(e?.message || 'Failed to load candidates.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [platform, username, bucket]);

  // compute stats
  const stats = useMemo(() => {
    const total = rows.length;
    const views24 = rows.reduce((s, r) => s + Number(r.views_24h || 0), 0);
    const viewsTotal = rows.reduce((s, r) => s + Number(r.view_count || 0), 0);
    const avgEng = total
      ? rows.reduce((s, r) => s + Number(r.engagement_rate || 0), 0) / total
      : 0;

    return { total, views24, viewsTotal, avgEng };
  }, [rows]);

  // progress animation
  useEffect(() => {
    if (!analysisLoading) return;

    setProgress(0);
    setPhase(0);

    const t0 = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - t0;
      const p = Math.min(92, Math.floor(18 + 74 * (1 - Math.exp(-elapsed / 1700))));
      setProgress((prev) => Math.max(prev, p));
      setPhase(Math.min(phases.length - 1, Math.floor(elapsed / 1200)));
    }, 120);

    return () => clearInterval(id);
  }, [analysisLoading, phases.length]);

  const runAnalysis = async () => {
    setAnalysisError('');
    setAnalysisText('');
    setAnalysisLoading(true);

    try {
      abortRef.current?.abort?.();
    } catch {}
    abortRef.current = new AbortController();

    try {
      await fakeStreamingAnalysis({
        signal: abortRef.current.signal,
        onToken: (t) => setAnalysisText((prev) => prev + t),
      });
      setProgress(100);
    } catch (e) {
      if (String(e?.message || '').includes('aborted')) return;
      setAnalysisError(e?.message || 'Analysis failed.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const stopAnalysis = () => {
    try {
      abortRef.current?.abort?.();
    } catch {}
    setAnalysisLoading(false);
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

      {/* SIDEBAR (same as your DashboardPageV2) */}
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

              {/* ACTIVE: Performance */}
              <button
                onClick={goPerformance}
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
                  fontWeight: 700,
                  marginTop: 2,
                  marginBottom: 2,
                }}
              >
                Performance
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
                Performance AI hub
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, position: 'relative', zIndex: 3 }}>
        {/* Branding */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
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
          style={{
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Performance AI</h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              Coaching-style breakdown of what’s working vs what’s not
            </span>
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
              {stats.total} rows · 24h views: {formatNumber(stats.views24)} · avg eng: {formatPct(stats.avgEng)}
            </span>
          </div>
        </div>

        {/* CONTENT CARD */}
        <div
          style={{
            borderRadius: 20,
            background:
              'radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 55%)',
            padding: 20,
            boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
          }}
        >
          {/* layout: AI is the hero */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr', gap: 16 }}>
            {/* AI HERO */}
            <div
              style={{
                borderRadius: 20,
                padding: 18,
                background: 'rgba(0,0,0,0.55)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 18px 45px rgba(0,0,0,0.65)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 520,
              }}
            >
              <style>{`
                @keyframes scanline {
                  0% { transform: translateY(-80%); opacity: 0; }
                  15% { opacity: 0.65; }
                  60% { opacity: 0.25; }
                  100% { transform: translateY(140%); opacity: 0; }
                }
              `}</style>

              {analysisLoading && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: -120,
                    height: 280,
                    background:
                      'linear-gradient(180deg, transparent, rgba(250,204,21,0.10), transparent)',
                    animation: 'scanline 1.6s ease-in-out infinite',
                    pointerEvents: 'none',
                  }}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>Live AI Analysis</div>
                  <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
                    Run analysis on the currently loaded rows (top/bottom performers)
                  </div>
                </div>

                <button
                  onClick={runAnalysis}
                  disabled={analysisLoading || loading || rows.length === 0}
                  style={{
                    border: 'none',
                    outline: 'none',
                    borderRadius: 999,
                    padding: '12px 18px',
                    cursor: analysisLoading ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#020617',
                    background:
                      'linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
                    minWidth: 160,
                  }}
                >
                  {analysisLoading ? 'Analyzing…' : 'Run analysis'}
                </button>
              </div>

              {/* filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 210px', gap: 12, marginTop: 14 }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Platform</div>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    style={{
                      fontSize: 12,
                      padding: '8px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'rgba(255,255,255,0.9)',
                      width: '100%',
                    }}
                  >
                    <option value="all">All</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Username</div>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Filter by username…"
                    style={{
                      fontSize: 12,
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'rgba(255,255,255,0.9)',
                      width: '100%',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Bucket</div>
                  <div
                    style={{
                      display: 'inline-flex',
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(0,0,0,0.55)',
                      padding: 3,
                      backdropFilter: 'blur(8px)',
                      width: '100%',
                    }}
                  >
                    {[
                      { key: 'top', label: 'Top' },
                      { key: 'bottom', label: 'Bottom' },
                    ].map((t) => {
                      const active = bucket === t.key;
                      return (
                        <button
                          key={t.key}
                          onClick={() => setBucket(t.key)}
                          style={{
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            padding: '6px 14px',
                            borderRadius: 999,
                            fontSize: 12,
                            background: active
                              ? 'linear-gradient(135deg, #f97316, #facc15)'
                              : 'transparent',
                            color: active ? '#000' : 'rgba(255,255,255,0.7)',
                            fontWeight: active ? 600 : 400,
                            transition: 'all 150ms ease',
                            flex: 1,
                          }}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* “AI compute” bar */}
              <div
                style={{
                  marginTop: 14,
                  borderRadius: 16,
                  padding: 12,
                  background:
                    'radial-gradient(circle at top left, rgba(250,204,21,0.12), rgba(15,23,42,1))',
                  border: '1px solid rgba(250,204,21,0.28)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    {analysisLoading ? phases[phase] : 'Ready to analyze'}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    {analysisLoading ? `${progress}%` : `${stats.total} rows loaded`}
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    height: 10,
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(0,0,0,0.55)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${analysisLoading ? progress : 0}%`,
                      transition: 'width 220ms ease',
                      background: 'linear-gradient(135deg, #f97316, #facc15)',
                    }}
                  />
                </div>
              </div>

              {/* analysis output */}
              {analysisError && (
                <div style={{ marginTop: 10, color: '#fed7aa', fontSize: 12 }}>
                  {analysisError}
                </div>
              )}

              <div
                style={{
                  marginTop: 12,
                  borderRadius: 16,
                  background: 'rgba(0,0,0,0.55)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  padding: 14,
                  minHeight: 250,
                  whiteSpace: 'pre-wrap',
                  fontSize: 13,
                  lineHeight: 1.55,
                  opacity: analysisText ? 1 : 0.75,
                }}
              >
                {analysisText || 'Click “Run analysis” to generate a breakdown of why these clips are winning/losing + recommended tests.'}
                {analysisLoading ? ' ▌' : ''}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  onClick={stopAnalysis}
                  disabled={!analysisLoading}
                  style={{
                    border: '1px solid rgba(255,255,255,0.14)',
                    outline: 'none',
                    borderRadius: 999,
                    padding: '8px 12px',
                    cursor: analysisLoading ? 'pointer' : 'not-allowed',
                    fontSize: 12,
                    background: 'rgba(248,250,252,0.06)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  Stop
                </button>

                <button
                  onClick={() => setAnalysisText('')}
                  disabled={analysisLoading || !analysisText}
                  style={{
                    border: '1px solid rgba(255,255,255,0.14)',
                    outline: 'none',
                    borderRadius: 999,
                    padding: '8px 12px',
                    cursor: analysisLoading || !analysisText ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    background: 'rgba(248,250,252,0.06)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* TOP/BOTTOM LIST (secondary) */}
            <div
              style={{
                borderRadius: 20,
                padding: 16,
                background: 'rgba(0,0,0,0.55)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 18px 45px rgba(0,0,0,0.65)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                {bucket === 'top' ? 'Top performers' : 'Bottom performers'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
                {loading ? 'Loading…' : `${rows.length} clips`}
              </div>

              {error && <div style={{ color: '#fed7aa', fontSize: 12 }}>{error}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(rows || []).slice(0, 10).map((r) => (
                  <div
                    key={`${r.platform}-${r.video_id}`}
                    style={{
                      borderRadius: 16,
                      padding: 12,
                      background: 'rgba(0,0,0,0.55)',
                      border: '1px solid rgba(255,255,255,0.10)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                      {r.title || 'Untitled'}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      @{r.username || '—'} · {r.platform}
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                      <span>24h: {formatNumber(r.views_24h)}</span>
                      <span>eng: {formatPct(r.engagement_rate)}</span>
                    </div>

                    {r.url && (
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 12, color: 'rgba(250,204,21,0.95)', textDecoration: 'none' }}
                        >
                          Open →
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.65 }}>
                This panel is secondary — the AI coaching panel is the main event.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
