import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

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
  if (!API_BASE) {
    await new Promise((r) => setTimeout(r, 160));
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

async function streamLiveAnalysis({ payload, signal, onToken }) {
  // mock streaming for now
  if (!API_BASE) {
    const fake =
      `High-level read:\n\n` +
      `• Winners anchor attention immediately (face or bold text in frame 1).\n` +
      `• Winners maintain velocity (higher motion + more pattern interrupts).\n` +
      `• Losers start slow: unclear promise, weak contrast, hook arrives late.\n\n` +
      `What to test next:\n` +
      `1) Put the result first (start with outcome, not context).\n` +
      `2) Add on-screen hook in first frame (6–9 words, high contrast).\n` +
      `3) Add a pattern interrupt every ~0.8–1.2s (cut/zoom/overlay).\n\n` +
      `If you want: I can generate 10 hook rewrites + a first-3-seconds storyboard for the top/bottom set.\n`;

    const chunks = fake.split(/(\s+)/);
    for (const c of chunks) {
      if (signal?.aborted) throw new Error('aborted');
      await new Promise((r) => setTimeout(r, 12));
      onToken(c);
    }
    return;
  }

  // future real endpoint:
  const res = await fetch(`${API_BASE}/ai/live-performance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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

  // sidebar state (same as your other pages)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // filters
  const [platform, setPlatform] = useState('all');
  const [username, setUsername] = useState('');
  const [bucket, setBucket] = useState('top');

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // analysis
  const [analysisText, setAnalysisText] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisErr, setAnalysisErr] = useState('');
  const abortRef = useRef(null);

  // “cool visualization” state
  const [progress, setProgress] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phases = useMemo(
    () => [
      'Loading metrics + recent snapshots…',
      'Comparing top vs bottom patterns…',
      'Scoring hooks / pacing / motion…',
      'Synthesizing recommendations…',
      'Generating coaching summary…',
    ],
    []
  );

  // ---- nav handlers (match other pages) ----
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

  // progress animation while analyzing
  useEffect(() => {
    if (!analysisLoading) return;

    setProgress(0);
    setPhaseIdx(0);

    const t0 = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - t0;

      // progress curve: fast -> slow, never hits 100 until done
      const next = Math.min(92, Math.floor(20 + 72 * (1 - Math.exp(-elapsed / 1800))));
      setProgress((p) => Math.max(p, next));

      // phase stepping
      const step = Math.min(phases.length - 1, Math.floor(elapsed / 1300));
      setPhaseIdx(step);
    }, 120);

    return () => clearInterval(id);
  }, [analysisLoading, phases.length]);

  const stats = useMemo(() => {
    const safe = (rows || []).filter(Boolean);
    const total = safe.length;
    const views24 = safe.reduce((acc, r) => acc + (Number(r.views_24h) || 0), 0);
    const viewsTotal = safe.reduce((acc, r) => acc + (Number(r.view_count) || 0), 0);
    const avgEng = total ? safe.reduce((acc, r) => acc + (Number(r.engagement_rate) || 0), 0) / total : 0;
    const withSpeech = safe.filter((r) => !!r.has_speech).length;
    const withFace = safe.filter((r) => !!r.has_face).length;
    const withText = safe.filter((r) => !!r.has_text).length;

    return { total, views24, viewsTotal, avgEng, withSpeech, withFace, withText };
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
      const slimRows = (rows || []).slice(0, 14).map((r) => ({
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
        payload: {
          filters: { bucket, platform, username },
          samples: slimRows,
          aggregates: stats,
        },
        signal: abortRef.current.signal,
        onToken: (t) => setAnalysisText((prev) => prev + t),
      });

      setProgress(100);
    } catch (e) {
      if (String(e?.message || '').includes('aborted')) return;
      setAnalysisErr(e?.message || 'Analysis failed.');
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

  // ---- style (match your look) ----
  const pageWrap = {
    minHeight: '100vh',
    width: '100vw',
    overflowX: 'hidden',
    background:
      'radial-gradient(900px 500px at 25% 0%, rgba(249,115,22,0.10), transparent 60%),' +
      'radial-gradient(900px 500px at 70% 10%, rgba(59,130,246,0.10), transparent 55%),' +
      'radial-gradient(700px 450px at 60% 85%, rgba(34,197,94,0.08), transparent 55%),' +
      'linear-gradient(180deg, #05060a 0%, #070812 50%, #05060a 100%)',
    padding: 22,
    color: 'rgba(255,255,255,0.92)',
  };

  const shell = { display: 'flex', alignItems: 'stretch', position: 'relative' };
  const content = { flex: 1, position: 'relative', zIndex: 1 };

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

  const panel = {
    borderRadius: 18,
    background: 'rgba(0,0,0,0.55)',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 18px 45px rgba(0,0,0,0.65)',
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
    fontWeight: active ? 800 : 650,
  });

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
    fontWeight: 750,
    whiteSpace: 'nowrap',
  };

  const th = {
    textAlign: 'left',
    fontSize: 12,
    color: 'rgba(255,255,255,0.62)',
    fontWeight: 850,
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

  const analysisButton = {
    border: 'none',
    outline: 'none',
    borderRadius: 999,
    padding: '12px 16px',
    cursor: analysisLoading ? 'not-allowed' : 'pointer',
    fontSize: 13,
    fontWeight: 900,
    color: '#020617',
    background:
      analysisLoading
        ? 'rgba(250,204,21,0.65)'
        : 'linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))',
    boxShadow: '0 18px 45px rgba(0,0,0,0.55)',
    minWidth: 150,
  };

  return (
    <div style={pageWrap}>
      {/* removes the white border + default margins globally */}
      <style>{`
        html, body, #root { height: 100%; width: 100%; margin: 0; padding: 0; background: #05060a; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={shell}>
        {/* SIDEBAR (your exact style, Performance active) */}
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

                {/* ACTIVE */}
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

        {/* MAIN */}
        <div style={content}>
          <div style={watermark}>PERFORMANCE</div>

          {/* Header */}
          <div style={{ position: 'relative', zIndex: 2, marginBottom: 14 }}>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: 0.2, lineHeight: 1.05 }}>
              Performance AI
            </div>
            <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.62)', fontSize: 13 }}>
              Live coaching analysis based on top vs bottom performers (metrics + transcript + visuals)
            </div>
          </div>

          {/* Layout: AI is the hero (left/center). Videos are secondary (right rail). */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.85fr 1fr', gap: 14, position: 'relative', zIndex: 2 }}>
            {/* HERO AI PANEL */}
            <div style={{ ...panel, padding: 16, position: 'relative', overflow: 'hidden' }}>
              {/* subtle animated “scanline” while analyzing */}
              {analysisLoading ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, transparent 0%, rgba(250,204,21,0.08) 45%, transparent 70%)',
                    transform: 'translateY(-60%)',
                    animation: 'scan 1.8s ease-in-out infinite',
                    pointerEvents: 'none',
                  }}
                />
              ) : null}

              <style>{`
                @keyframes scan {
                  0% { transform: translateY(-70%); opacity: 0.0; }
                  20% { opacity: 0.9; }
                  60% { opacity: 0.35; }
                  100% { transform: translateY(120%); opacity: 0.0; }
                }
                @keyframes pulseOrb {
                  0% { transform: scale(1); opacity: 0.55; }
                  50% { transform: scale(1.08); opacity: 0.9; }
                  100% { transform: scale(1); opacity: 0.55; }
                }
                @keyframes shimmer {
                  0% { transform: translateX(-60%); opacity: 0.0; }
                  20% { opacity: 0.7; }
                  100% { transform: translateX(160%); opacity: 0.0; }
                }
              `}</style>

              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 30, fontWeight: 950, letterSpacing: 0.2 }}>
                    Live AI Analysis
                  </div>
                  <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.62)', fontSize: 13 }}>
                    Coaching-style breakdown based on the currently loaded rows
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={runLiveAnalysis}
                    disabled={analysisLoading || loading || rows.length === 0}
                    style={analysisButton}
                  >
                    {analysisLoading ? 'Analyzing…' : 'Run analysis'}
                  </button>
                </div>
              </div>

              {/* Filters row (compact, doesn’t steal focus) */}
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '160px 1fr 220px', gap: 12 }}>
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

              {/* “AI computation” visualization bar */}
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'rgba(6,10,24,0.45)',
                    padding: 12,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* shimmer */}
                  {analysisLoading ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        width: '40%',
                        background:
                          'linear-gradient(90deg, transparent, rgba(250,204,21,0.12), transparent)',
                        animation: 'shimmer 1.2s ease-in-out infinite',
                        pointerEvents: 'none',
                      }}
                    />
                  ) : null}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* orb */}
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 999,
                          background:
                            'radial-gradient(circle at 35% 35%, rgba(250,204,21,0.9), rgba(249,115,22,0.2) 55%, rgba(0,0,0,0) 70%)',
                          border: '1px solid rgba(250,204,21,0.25)',
                          boxShadow: '0 18px 45px rgba(0,0,0,0.55)',
                          animation: analysisLoading ? 'pulseOrb 1.2s ease-in-out infinite' : 'none',
                          opacity: analysisLoading ? 1 : 0.55,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)' }}>
                          {analysisLoading ? 'AI computing…' : 'Ready'}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>
                          {analysisLoading ? phases[phaseIdx] : 'Click “Run analysis” to generate insights.'}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', whiteSpace: 'nowrap' }}>
                      {analysisLoading ? `${progress}%` : `${stats.total} rows loaded`}
                    </div>
                  </div>

                  {/* progress bar */}
                  <div
                    style={{
                      marginTop: 10,
                      height: 10,
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.10)',
                      background: 'rgba(255,255,255,0.04)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${analysisLoading ? progress : 0}%`,
                        transition: 'width 220ms ease',
                        background:
                          'linear-gradient(90deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))',
                        boxShadow: '0 0 24px rgba(250,204,21,0.25)',
                      }}
                    />
                  </div>

                  {/* tiny signal chips */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    <span style={chip}>24h views: {formatNumber(stats.views24)}</span>
                    <span style={chip}>Avg eng: {formatPct(stats.avgEng)}</span>
                    <span style={chip}>Speech: {stats.withSpeech}/{stats.total}</span>
                    <span style={chip}>Face: {stats.withFace}/{stats.total}</span>
                    <span style={chip}>Text: {stats.withText}/{stats.total}</span>
                  </div>
                </div>
              </div>

              {/* errors */}
              {analysisErr ? (
                <div style={{ marginTop: 12, color: 'rgba(239,68,68,0.95)', fontSize: 13 }}>
                  {analysisErr}
                </div>
              ) : null}

              {/* output box */}
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 18,
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(6,10,24,0.45)',
                  padding: 14,
                  minHeight: 360,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.55,
                  fontSize: 14,
                  color: analysisText ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.62)',
                }}
              >
                {analysisText ? (
                  <>
                    {analysisText}
                    {analysisLoading ? <span style={{ opacity: 0.9 }}>▌</span> : null}
                  </>
                ) : (
                  'Click “Run analysis” to generate a breakdown of why these clips are winning/losing + recommended tests.'
                )}
              </div>

              {/* actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  onClick={stopAnalysis}
                  disabled={!analysisLoading}
                  style={{
                    border: '1px solid rgba(255,255,255,0.14)',
                    outline: 'none',
                    borderRadius: 999,
                    padding: '10px 12px',
                    cursor: analysisLoading ? 'pointer' : 'not-allowed',
                    fontSize: 12,
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: 750,
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
                    padding: '10px 12px',
                    cursor: analysisLoading || !analysisText ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: 750,
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
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: 750,
                  }}
                >
                  Refresh data
                </button>
              </div>
            </div>

            {/* RIGHT RAIL: TOP/BOTTOM list (secondary) */}
            <div style={{ ...panel, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.2 }}>
                    {bucket === 'top' ? 'Top performers' : 'Bottom performers'}
                  </div>
                  <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.62)', fontSize: 12 }}>
                    {loading ? 'Loading…' : `${stats.total} clips`}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.10)',
                    padding: '7px 10px',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.72)',
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {platform === 'all' ? 'All platforms' : platform}
                </div>
              </div>

              {err ? (
                <div style={{ marginTop: 10, color: 'rgba(239,68,68,0.95)', fontSize: 13 }}>
                  {err}
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 12,
                  borderRadius: 18,
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  background: 'rgba(6,10,24,0.55)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Clip</th>
                      <th style={th}>24h</th>
                      <th style={th}>Eng%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td style={td} colSpan={3}>
                          <span style={{ color: 'rgba(255,255,255,0.62)' }}>Loading…</span>
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td style={td} colSpan={3}>
                          <span style={{ color: 'rgba(255,255,255,0.62)' }}>No rows found.</span>
                        </td>
                      </tr>
                    ) : (
                      rows.slice(0, 10).map((r, idx) => (
                        <tr key={`${r.platform}-${r.video_id}-${idx}`}>
                          <td style={td}>
                            <div style={{ fontWeight: 900, lineHeight: 1.2 }}>
                              {r.title || 'Untitled'}
                            </div>
                            <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.62)', fontSize: 12 }}>
                              @{r.username || '—'} • {r.platform}
                            </div>
                            {r.url ? (
                              <div style={{ marginTop: 6 }}>
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: 'rgba(160,190,255,0.95)', fontSize: 12, textDecoration: 'none' }}
                                >
                                  Open →
                                </a>
                              </div>
                            ) : null}

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                              {r.has_face ? <span style={chip}>Face</span> : null}
                              {r.has_text ? <span style={chip}>Text</span> : null}
                              {r.has_speech ? <span style={chip}>Speech</span> : null}
                            </div>
                          </td>

                          <td style={td}>{formatNumber(r.views_24h)}</td>
                          <td style={td}>{formatPct(r.engagement_rate)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
                Tip: keep the list small; the AI panel is the main event.
              </div>
            </div>
          </div>

          <div style={{ height: 8 }} />
        </div>
      </div>
    </div>
  );
}
