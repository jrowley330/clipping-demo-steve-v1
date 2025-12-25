import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

/**
 * Performance.jsx (UI-only v1)
 * - Matches existing Clipper Dashboards UI aesthetic (glass, watermark, sidebar)
 * - Uses mock data by default
 * - Later: wire fetch() to your Cloud Run API querying:
 *   `clipping-app-140330.DEMO.VIDEO_TOP_BOTTOM_CANDIDATES`
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''; // optional later

const PLATFORM_OPTIONS = ['all', 'youtube', 'tiktok', 'instagram'];

function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  try {
    return new Intl.NumberFormat('en-US').format(n);
  } catch {
    return String(n);
  }
}
function formatPct(x) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return '—';
  return `${(Number(x) * 100).toFixed(2)}%`;
}

const MOCK_ROWS = [
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
    motion_level: 'high',
    hook_visual_type: 'face_to_camera',
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
    motion_level: 'med',
    hook_visual_type: 'screen_recording',
    url: 'https://tiktok.com/@demo/video/demo',
    video_id: 'demo3',
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
    motion_level: 'low',
    hook_visual_type: 'b_roll',
    url: 'https://instagram.com/reel/demo',
    video_id: 'demo2',
  },
];

async function fetchCandidates({ platform, username, bucket }) {
  // NOTE: Keeping mock-by-default until you wire a backend endpoint.
  // Recommended future endpoint:
  //   GET `${API_BASE}/performance/candidates?platform=&username=&bucket=`
  // Backend queries `VIDEO_TOP_BOTTOM_CANDIDATES`

  if (!API_BASE) {
    await new Promise((r) => setTimeout(r, 180));
    return MOCK_ROWS
      .filter((r) => (bucket ? r.bucket === bucket : true))
      .filter((r) => (platform && platform !== 'all' ? r.platform === platform : true))
      .filter((r) => (username ? r.username.toLowerCase().includes(username.toLowerCase()) : true));
  }

  const qs = new URLSearchParams();
  if (platform && platform !== 'all') qs.set('platform', platform);
  if (username) qs.set('username', username);
  if (bucket) qs.set('bucket', bucket);

  const res = await fetch(`${API_BASE}/performance/candidates?${qs.toString()}`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Fetch candidates failed (${res.status}): ${txt}`);
  }
  return res.json();
}

async function streamLiveAnalysis({ rows, signal, onToken }) {
  // UI-first: mock streaming if no backend
  if (!API_BASE) {
    const fake = `What I’m seeing across these clips:\n\n` +
      `• Winners consistently show a strong visual anchor in the first second (face or bold on-screen text).\n` +
      `• Motion + pattern interrupts are higher on winners (more scene changes / quicker cuts).\n` +
      `• Losers tend to “start slow” — no explicit promise, no contrast, and text appears too late.\n\n` +
      `3 tests to run next:\n` +
      `1) Add an on-screen hook in frame 1 (6–9 words, high contrast).\n` +
      `2) Cut the first sentence by ~35% and start on the “result” first.\n` +
      `3) Increase pattern interrupts every ~0.8–1.2s (zoom, cut, overlay, switch angle).\n\n` +
      `If you want, I can generate: (a) hook rewrites, (b) first-3-seconds storyboard, (c) editing checklist.`;

    const chunks = fake.split(/(\s+)/);
    for (const c of chunks) {
      if (signal?.aborted) throw new Error('aborted');
      await new Promise((r) => setTimeout(r, 12));
      onToken(c);
    }
    return;
  }

  // Future backend:
  // POST `${API_BASE}/ai/live-performance` (streaming)
  const res = await fetch(`${API_BASE}/ai/live-performance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
    signal,
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Live analysis failed (${res.status}): ${txt}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    onToken(chunk);
  }
}

export default function Performance() {
  const navigate = useNavigate();

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filters
  const [platform, setPlatform] = useState('all');
  const [username, setUsername] = useState('');
  const [bucket, setBucket] = useState('top'); // top | bottom
  const [mode, setMode] = useState('summary'); // summary | details (UI tab)

  // Data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Live analysis
  const [analysisText, setAnalysisText] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisErr, setAnalysisErr] = useState('');
  const abortRef = useRef(null);

  // ---- Nav handlers (match other pages) ----
  const handleGoDashV2 = () => navigate('/dashboard-v2');
  const handleGoDashV1 = () => navigate('/dashboard');
  const handleGoPayouts = () => navigate('/payouts');
  const handleGoClippers = () => navigate('/clippers');
  const handleGoPerformance = () => navigate('/performance');

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await fetchCandidates({ platform, username, bucket });
      setRows(Array.isArray(data) ? data : (data?.rows || []));
    } catch (e) {
      setErr(e?.message || 'Failed to load performance data.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, username, bucket]);

  const stats = useMemo(() => {
    const safe = (rows || []).filter(Boolean);
    const total = safe.length;

    const views24 = safe.reduce((acc, r) => acc + (Number(r.views_24h) || 0), 0);
    const viewsTotal = safe.reduce((acc, r) => acc + (Number(r.view_count) || 0), 0);
    const avgEng = total ? safe.reduce((acc, r) => acc + (Number(r.engagement_rate) || 0), 0) / total : 0;

    return { total, views24, viewsTotal, avgEng };
  }, [rows]);

  const runLiveAnalysis = async () => {
    setAnalysisErr('');
    setAnalysisText('');
    setAnalysisLoading(true);

    try {
      abortRef.current?.abort?.();
    } catch {}
    abortRef.current = new AbortController();

    try {
      const slimRows = (rows || []).slice(0, 12).map((r) => ({
        platform: r.platform,
        video_id: r.video_id,
        title: r.title,
        views_24h: r.views_24h,
        view_count: r.view_count,
        engagement_rate: r.engagement_rate,
        has_speech: r.has_speech,
        has_face: r.has_face,
        has_text: r.has_text,
        motion_level: r.motion_level,
        hook_visual_type: r.hook_visual_type,
        url: r.url,
        username: r.username,
      }));

      await streamLiveAnalysis({
        rows: {
          bucket,
          platform,
          username,
          samples: slimRows,
        },
        signal: abortRef.current.signal,
        onToken: (t) => setAnalysisText((prev) => prev + t),
      });
    } catch (e) {
      if (String(e?.message || '').includes('aborted')) return;
      setAnalysisErr(e?.message || 'Analysis failed.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // ---- Shared styles (matching your pages) ----
  const pageWrap = {
    minHeight: '100vh',
    color: 'rgba(255,255,255,0.92)',
    background:
      'radial-gradient(900px 500px at 25% 0%, rgba(249,115,22,0.10), transparent 60%),' +
      'radial-gradient(900px 500px at 70% 10%, rgba(59,130,246,0.10), transparent 55%),' +
      'radial-gradient(700px 450px at 60% 85%, rgba(34,197,94,0.08), transparent 55%),' +
      'linear-gradient(180deg, #05060a 0%, #070812 50%, #05060a 100%)',
    padding: 22,
  };

  const shell = {
    display: 'flex',
    alignItems: 'stretch',
    gap: 0,
    position: 'relative',
  };

  const content = {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  };

  const watermark = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.06,
    transform: 'rotate(-12deg)',
    fontSize: 120,
    fontWeight: 900,
    letterSpacing: 1,
    color: '#ffffff',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const headerRow = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 14,
    position: 'relative',
    zIndex: 2,
  };

  const title = {
    fontSize: 44,
    fontWeight: 900,
    letterSpacing: 0.2,
    margin: 0,
    lineHeight: 1.05,
  };

  const subtitle = {
    marginTop: 6,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
  };

  const pillRow = {
    display: 'inline-flex',
    gap: 6,
    padding: 6,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
  };

  const pill = (active) => ({
    border: 'none',
    outline: 'none',
    borderRadius: 999,
    padding: '7px 14px',
    fontSize: 12,
    cursor: 'pointer',
    color: active ? '#020617' : 'rgba(255,255,255,0.75)',
    background: active
      ? 'linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))'
      : 'transparent',
    fontWeight: active ? 700 : 600,
  });

  const panel = {
    borderRadius: 18,
    background: 'rgba(0,0,0,0.55)',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 18px 45px rgba(0,0,0,0.65)',
    padding: 14,
  };

  const input = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.92)',
    outline: 'none',
    fontSize: 13,
  };

  const kpiGrid = {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr 1fr',
    gap: 12,
    marginTop: 10,
  };

  const kpiCard = (tone) => ({
    borderRadius: 18,
    padding: 16,
    border: `1px solid ${
      tone === 'orange'
        ? 'rgba(250,204,21,0.35)'
        : tone === 'green'
        ? 'rgba(34,197,94,0.30)'
        : 'rgba(59,130,246,0.30)'
    }`,
    background:
      tone === 'orange'
        ? 'linear-gradient(135deg, rgba(250,204,21,0.10), rgba(249,115,22,0.06))'
        : tone === 'green'
        ? 'linear-gradient(135deg, rgba(34,197,94,0.10), rgba(16,185,129,0.05))'
        : 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(99,102,241,0.05))',
    boxShadow: '0 18px 45px rgba(0,0,0,0.45)',
  });

  const kpiLabel = { fontSize: 12, color: 'rgba(255,255,255,0.62)', marginBottom: 6 };
  const kpiValue = { fontSize: 28, fontWeight: 900, letterSpacing: 0.2 };

  const tableWrap = {
    marginTop: 12,
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
    background: 'rgba(6,10,24,0.55)',
  };

  const th = {
    textAlign: 'left',
    fontSize: 12,
    color: 'rgba(255,255,255,0.62)',
    fontWeight: 800,
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  };

  const td = {
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    verticalAlign: 'top',
  };

  const chip = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.80)',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  };

  const bucketChip = (b) => ({
    ...chip,
    border:
      b === 'top'
        ? '1px solid rgba(34,197,94,0.35)'
        : '1px solid rgba(239,68,68,0.35)',
    background:
      b === 'top' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
  });

  return (
    <div style={pageWrap}>
      <div style={shell}>
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

                {/* Clippers */}
                <button
                  onClick={handleGoClippers}
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

                {/* Performance – active */}
                <button
                  onClick={handleGoPerformance}
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

                <div style={{ flexGrow: 1 }} />

                {/* Dashboards V1 */}
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

                {/* Logout */}
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
                  Clipper performance hub
                </div>
              </>
            )}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={content}>
          <div style={watermark}>PERFORMANCE</div>

          <div style={headerRow}>
            <div>
              <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: 0.2 }}>
                Performance
              </div>
              <div style={subtitle}>
                AI-ready clip analysis (metrics + transcript + visuals)
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={pillRow}>
                  <button style={pill(mode === 'summary')} onClick={() => setMode('summary')}>
                    Summary
                  </button>
                  <button style={pill(mode === 'details')} onClick={() => setMode('details')}>
                    Details
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.10)',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.75)',
                fontSize: 13,
                marginTop: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'Loading…' : `${stats.total} rows · ${bucket === 'top' ? 'Top' : 'Bottom'} set`}
            </div>
          </div>

          {/* FILTERS + KPI + TABLE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
            {/* LEFT */}
            <div style={panel}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr 220px', gap: 12, width: '100%' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', marginBottom: 6 }}>Platform</div>
                    <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={input}>
                      {PLATFORM_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p === 'all' ? 'All' : p[0].toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', marginBottom: 6 }}>Username</div>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Filter by username…"
                      style={input}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', marginBottom: 6 }}>Top / Bottom</div>
                    <div style={pillRow}>
                      <button style={pill(bucket === 'top')} onClick={() => setBucket('top')}>
                        Top
                      </button>
                      <button style={pill(bucket === 'bottom')} onClick={() => setBucket('bottom')}>
                        Bottom
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div style={kpiGrid}>
                <div style={kpiCard('orange')}>
                  <div style={kpiLabel}>24h views (sum)</div>
                  <div style={kpiValue}>{formatNumber(stats.views24)}</div>
                </div>
                <div style={kpiCard('green')}>
                  <div style={kpiLabel}>Avg engagement</div>
                  <div style={kpiValue}>{formatPct(stats.avgEng)}</div>
                </div>
                <div style={kpiCard('blue')}>
                  <div style={kpiLabel}>Total views (sum)</div>
                  <div style={kpiValue}>{formatNumber(stats.viewsTotal)}</div>
                </div>
              </div>

              {/* Errors */}
              {err ? (
                <div style={{ marginTop: 12, color: 'rgba(239,68,68,0.95)', fontSize: 13 }}>
                  {err}
                </div>
              ) : null}

              {/* Table */}
              <div style={tableWrap}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Bucket</th>
                      <th style={th}>Video</th>
                      <th style={th}>24h Views</th>
                      <th style={th}>Total Views</th>
                      <th style={th}>Eng%</th>
                      <th style={th}>Signals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td style={td} colSpan={6}>
                          <span style={{ color: 'rgba(255,255,255,0.62)' }}>Loading…</span>
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td style={td} colSpan={6}>
                          <span style={{ color: 'rgba(255,255,255,0.62)' }}>No rows found for these filters.</span>
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, idx) => (
                        <tr key={`${r.platform}-${r.video_id}-${idx}`}>
                          <td style={td}>
                            <span style={bucketChip(r.bucket || bucket)}>
                              {(r.bucket || bucket) === 'top' ? '▲ Top' : '▼ Bottom'}
                              <span style={{ opacity: 0.75 }}>· {r.platform}</span>
                            </span>
                          </td>

                          <td style={td}>
                            <div style={{ fontWeight: 900, lineHeight: 1.25 }}>
                              {r.title || 'Untitled'}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, marginTop: 6 }}>
                              @{r.username || '—'} • {r.video_id || '—'}
                            </div>
                            {r.url ? (
                              <div style={{ marginTop: 6 }}>
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: 'rgba(160,190,255,0.95)', fontSize: 12, textDecoration: 'none' }}
                                >
                                  Open clip →
                                </a>
                              </div>
                            ) : null}
                          </td>

                          <td style={td}>{formatNumber(r.views_24h)}</td>
                          <td style={td}>{formatNumber(r.view_count)}</td>
                          <td style={td}>{formatPct(r.engagement_rate)}</td>

                          <td style={td}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {r.has_face ? <span style={chip}>Face</span> : null}
                              {r.has_text ? <span style={chip}>Text</span> : null}
                              {r.has_speech ? <span style={chip}>Speech</span> : null}
                              {r.motion_level ? <span style={chip}>{r.motion_level}</span> : null}
                              {r.hook_visual_type ? <span style={chip}>{r.hook_visual_type}</span> : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: LIVE ANALYSIS */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.2 }}>Live AI Analysis</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', marginTop: 4 }}>
                    Coaching-style breakdown based on the currently loaded rows
                  </div>
                </div>

                <button
                  onClick={runLiveAnalysis}
                  disabled={analysisLoading || loading || rows.length === 0}
                  style={{
                    border: 'none',
                    outline: 'none',
                    borderRadius: 999,
                    padding: '10px 14px',
                    cursor: analysisLoading ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#020617',
                    background:
                      analysisLoading
                        ? 'rgba(250,204,21,0.55)'
                        : 'linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))',
                    boxShadow: '0 14px 35px rgba(0,0,0,0.45)',
                  }}
                >
                  {analysisLoading ? 'Analyzing…' : 'Run analysis'}
                </button>
              </div>

              {analysisErr ? (
                <div style={{ marginTop: 10, color: 'rgba(239,68,68,0.95)', fontSize: 13 }}>
                  {analysisErr}
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 12,
                  borderRadius: 18,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(6,10,24,0.45)',
                  padding: 14,
                  minHeight: 360,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                  fontSize: 13,
                  color: analysisText ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.62)',
                }}
              >
                {analysisText ||
                  'Click “Run analysis” to generate a breakdown of why these clips are winning/losing + recommended tests.'}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => {
                    try {
                      abortRef.current?.abort?.();
                    } catch {}
                    setAnalysisLoading(false);
                  }}
                  disabled={!analysisLoading}
                  style={{
                    border: '1px solid rgba(255,255,255,0.14)',
                    outline: 'none',
                    borderRadius: 999,
                    padding: '9px 12px',
                    cursor: analysisLoading ? 'pointer' : 'not-allowed',
                    fontSize: 12,
                    background: 'rgba(255,255,255,0.05)',
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
                    padding: '9px 12px',
                    cursor: analysisLoading || !analysisText ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  Clear
                </button>

                <button
                  onClick={load}
                  style={{
                    marginLeft: 'auto',
                    border: '1px solid rgba(255,255,255,0.14)',
                    outline: 'none',
                    borderRadius: 999,
                    padding: '9px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div style={{ height: 8 }} />
        </div>
      </div>
    </div>
  );
}
