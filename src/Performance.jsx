import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Performance.jsx
 * - Top/Bottom performers table + filters
 * - Live AI Analysis panel (streaming-ready)
 *
 * Assumptions:
 * - Your app already has global CSS vars similar to:
 *   --bg, --panel, --panel-2, --border, --text, --muted, --accentA
 * - You’ll later wire API_BASE to your Cloud Run API that queries BigQuery views.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || ""; // e.g. https://your-api.run.app

const PLATFORM_OPTIONS = ["all", "youtube", "tiktok", "instagram"];

function formatNumber(n) {
  if (n === null || n === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-US").format(n);
  } catch {
    return String(n);
  }
}

function formatPct(x) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return "—";
  return `${(Number(x) * 100).toFixed(2)}%`;
}

function badgeStyle(kind) {
  const base = {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    border: "1px solid var(--border)",
    color: "var(--text)",
    background: "rgba(255,255,255,0.04)",
    display: "inline-flex",
    gap: 8,
    alignItems: "center",
    whiteSpace: "nowrap",
  };
  if (kind === "top") return { ...base, background: "rgba(109,60,255,0.12)", border: "1px solid rgba(109,60,255,0.35)" };
  if (kind === "bottom") return { ...base, background: "rgba(255,80,80,0.10)", border: "1px solid rgba(255,80,80,0.35)" };
  return base;
}

const mockRows = [
  {
    bucket: "top",
    platform: "youtube",
    username: "demo_creator",
    title: "How I doubled views in 24 hours",
    views_24h: 18420,
    view_count: 225000,
    engagement_rate: 0.043,
    has_speech: true,
    has_face: true,
    has_text: true,
    motion_level: "high",
    hook_visual_type: "face_to_camera",
    url: "https://youtube.com/shorts/demo",
    video_id: "demo1",
  },
  {
    bucket: "bottom",
    platform: "instagram",
    username: "demo_creator",
    title: "Aesthetic montage (no hook)",
    views_24h: 12,
    view_count: 1900,
    engagement_rate: 0.006,
    has_speech: false,
    has_face: false,
    has_text: true,
    motion_level: "low",
    hook_visual_type: "b_roll",
    url: "https://instagram.com/reel/demo",
    video_id: "demo2",
  },
];

async function fetchCandidates({ platform, username, bucket }) {
  // TODO: replace with your real endpoint (recommended)
  // Example:
  // GET /performance/candidates?platform=youtube&username=abc&bucket=top
  //
  // That endpoint should query:
  // `DEMO.VIDEO_TOP_BOTTOM_CANDIDATES`
  // and return rows with the columns you want to display.

  if (!API_BASE) {
    // no backend yet → use mock
    await new Promise((r) => setTimeout(r, 250));
    return mockRows
      .filter((r) => (bucket ? r.bucket === bucket : true))
      .filter((r) => (platform && platform !== "all" ? r.platform === platform : true))
      .filter((r) => (username ? r.username.toLowerCase().includes(username.toLowerCase()) : true));
  }

  const qs = new URLSearchParams();
  if (platform && platform !== "all") qs.set("platform", platform);
  if (username) qs.set("username", username);
  if (bucket) qs.set("bucket", bucket);

  const res = await fetch(`${API_BASE}/performance/candidates?${qs.toString()}`, {
    headers: { "Content-Type": "application/json" },
    // if you use API key auth:
    // headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_API_KEY }
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Fetch candidates failed (${res.status}): ${txt}`);
  }
  return res.json();
}

async function streamLiveAnalysis({ platform, username, bucket, rows, signal, onToken }) {
  // TODO: replace with your real streaming endpoint
  // POST /ai/live-performance (streaming)
  // body: { platform, username, bucket, rows: [...] }
  //
  // If backend not wired, we fake it.
  if (!API_BASE) {
    const fake = `Here’s what I’m seeing:\n\n• Top clips have a clear face + fast motion + on-screen text early.\n• Bottom clips lack an explicit hook in first 1–2 seconds.\n\nNext test:\n1) Add a bold text hook in first frame.\n2) Cut the intro by 30–40%.\n3) Increase scene changes or add pattern interrupts every ~1s.\n`;
    const chunks = fake.split(/(\s+)/);
    for (const c of chunks) {
      if (signal?.aborted) throw new Error("aborted");
      await new Promise((r) => setTimeout(r, 15));
      onToken(c);
    }
    return;
  }

  const res = await fetch(`${API_BASE}/ai/live-performance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform, username, bucket, rows }),
    signal,
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
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
  const [platform, setPlatform] = useState("all");
  const [username, setUsername] = useState("");
  const [bucket, setBucket] = useState("top"); // top | bottom

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [analysisText, setAnalysisText] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisErr, setAnalysisErr] = useState("");

  const abortRef = useRef(null);

  const filteredRows = useMemo(() => rows, [rows]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await fetchCandidates({ platform, username, bucket });
      setRows(Array.isArray(data) ? data : (data?.rows || []));
    } catch (e) {
      setErr(e?.message || "Failed to load performance data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, username, bucket]);

  async function runLiveAnalysis() {
    setAnalysisErr("");
    setAnalysisText("");
    setAnalysisLoading(true);

    // abort prior
    try {
      abortRef.current?.abort?.();
    } catch {}
    abortRef.current = new AbortController();

    try {
      const slimRows = (filteredRows || []).slice(0, 10).map((r) => ({
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
      }));

      await streamLiveAnalysis({
        platform,
        username,
        bucket,
        rows: slimRows,
        signal: abortRef.current.signal,
        onToken: (t) => setAnalysisText((prev) => prev + t),
      });
    } catch (e) {
      if (String(e?.message || "").includes("aborted")) return;
      setAnalysisErr(e?.message || "Analysis failed.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  const container = {
    padding: 20,
    color: "var(--text)",
  };

  const headerRow = {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  };

  const titleStyle = {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 0.2,
  };

  const subtitleStyle = {
    marginTop: 6,
    color: "var(--muted)",
    fontSize: 13,
  };

  const panel = {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  };

  const filtersRow = {
    display: "grid",
    gridTemplateColumns: "160px 1fr 240px",
    gap: 12,
    marginBottom: 14,
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "rgba(0,0,0,0.25)",
    color: "var(--text)",
    outline: "none",
  };

  const button = (primary) => ({
    padding: "10px 12px",
    borderRadius: 12,
    border: primary ? "1px solid rgba(109,60,255,0.55)" : "1px solid var(--border)",
    background: primary ? "rgba(109,60,255,0.18)" : "rgba(255,255,255,0.04)",
    color: "var(--text)",
    cursor: "pointer",
    fontWeight: 600,
  });

  const tableWrap = {
    overflow: "auto",
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "rgba(0,0,0,0.18)",
  };

  const th = {
    textAlign: "left",
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 700,
    padding: "12px 12px",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    top: 0,
    background: "rgba(10,10,14,0.95)",
    backdropFilter: "blur(10px)",
    zIndex: 1,
  };

  const td = {
    padding: "12px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    fontSize: 13,
    verticalAlign: "top",
  };

  return (
    <div style={container}>
      <div style={headerRow}>
        <div>
          <div style={titleStyle}>Performance</div>
          <div style={subtitleStyle}>
            Top vs bottom performers (powered by <code>VIDEO_ANALYSIS_READY</code> + <code>VIDEO_TOP_BOTTOM_CANDIDATES</code>)
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={button(bucket === "top")}
            onClick={() => setBucket("top")}
            title="Show top performers"
          >
            Top
          </button>
          <button
            style={button(bucket === "bottom")}
            onClick={() => setBucket("bottom")}
            title="Show bottom performers"
          >
            Bottom
          </button>
          <button style={button(false)} onClick={load} title="Refresh">
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
        {/* LEFT: candidates */}
        <div style={panel}>
          <div style={filtersRow}>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Platform</div>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}>
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p === "all" ? "All" : p[0].toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Username / Channel</div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Filter by username…"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <button style={button(true)} onClick={runLiveAnalysis} disabled={analysisLoading}>
                {analysisLoading ? "Analyzing…" : "Run Live AI Analysis"}
              </button>
            </div>
          </div>

          {err ? (
            <div style={{ color: "rgba(255,120,120,0.95)", fontSize: 13 }}>{err}</div>
          ) : null}

          {loading ? (
            <div style={{ color: "var(--muted)", fontSize: 13, padding: 12 }}>Loading…</div>
          ) : (
            <div style={tableWrap}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
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
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td style={td} colSpan={6}>
                        <span style={{ color: "var(--muted)" }}>No videos found for these filters.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={`${r.platform}-${r.video_id}-${idx}`}>
                        <td style={td}>
                          <span style={badgeStyle(r.bucket || bucket)}>
                            {(r.bucket || bucket) === "top" ? "▲ Top" : "▼ Bottom"}
                            <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                              {r.platform}
                            </span>
                          </span>
                        </td>

                        <td style={td}>
                          <div style={{ fontWeight: 700, lineHeight: 1.25 }}>
                            {r.title || "Untitled"}
                          </div>
                          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                            @{r.username || "—"} • {r.video_id || "—"}
                          </div>
                          {r.url ? (
                            <div style={{ marginTop: 6 }}>
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "rgba(160,190,255,0.95)", fontSize: 12 }}
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
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {r.has_face ? <span style={badgeStyle()}>Face</span> : null}
                            {r.has_text ? <span style={badgeStyle()}>Text</span> : null}
                            {r.has_speech ? <span style={badgeStyle()}>Speech</span> : null}
                            {r.motion_level ? <span style={badgeStyle()}>{r.motion_level}</span> : null}
                            {r.hook_visual_type ? <span style={badgeStyle()}>{r.hook_visual_type}</span> : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT: live analysis panel */}
        <div style={panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Live AI Analysis</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              {analysisLoading ? "streaming…" : "ready"}
            </div>
          </div>

          {analysisErr ? (
            <div style={{ color: "rgba(255,120,120,0.95)", fontSize: 13, marginBottom: 10 }}>
              {analysisErr}
            </div>
          ) : null}

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              background: "rgba(0,0,0,0.18)",
              padding: 12,
              minHeight: 320,
              whiteSpace: "pre-wrap",
              lineHeight: 1.45,
              fontSize: 13,
              color: analysisText ? "var(--text)" : "var(--muted)",
            }}
          >
            {analysisText ||
              "Click “Run Live AI Analysis” to generate a coaching-style breakdown of what’s working vs not working (hook, pacing, visuals, and suggested tests)."}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              style={button(false)}
              onClick={() => {
                try {
                  abortRef.current?.abort?.();
                } catch {}
                setAnalysisLoading(false);
              }}
              disabled={!analysisLoading}
            >
              Stop
            </button>
            <button
              style={button(false)}
              onClick={() => setAnalysisText("")}
              disabled={analysisLoading || !analysisText}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
