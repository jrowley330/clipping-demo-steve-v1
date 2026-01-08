// Performance.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

// NEW performance API (Cloud Run)
const PERF_API_BASE_URL = "https://clipper-performance-api-xidmvbbcza-uc.a.run.app";

// ---------- helpers ----------
const formatNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString();
};

const formatPct = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `${(num * 100).toFixed(1)}%`;
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const platformBadgeStyle = (platform) => {
  const p = (platform || "").toLowerCase();
  if (p.includes("youtube")) return { bg: "rgba(239,68,68,0.16)", bd: "rgba(239,68,68,0.45)" };
  if (p.includes("tiktok")) return { bg: "rgba(148,163,184,0.14)", bd: "rgba(148,163,184,0.45)" };
  if (p.includes("insta")) return { bg: "rgba(217,70,239,0.14)", bd: "rgba(217,70,239,0.45)" };
  return { bg: "rgba(59,130,246,0.14)", bd: "rgba(59,130,246,0.45)" };
};

/**
 * Parse an SSE block like:
 * event: delta
 * data: {"delta":"..."}
 *
 * Return: { event: "delta", ...parsedData }
 */
const parseSSEBlock = (evtBlock) => {
  const lines = String(evtBlock || "")
    .split("\n")
    .map((l) => l.trimEnd());

  const eventLine = lines.find((l) => l.startsWith("event:"));
  const eventName = eventLine ? eventLine.replace(/^event:\s?/, "").trim() : null;

  const dataLines = lines.filter((l) => l.startsWith("data:"));
  if (!dataLines.length) return null;

  const jsonStr = dataLines
    .map((l) => l.replace(/^data:\s?/, ""))
    .join("\n")
    .trim();

  if (!jsonStr) return null;

  try {
    const obj = JSON.parse(jsonStr);
    return eventName ? { event: eventName, ...obj } : obj;
  } catch {
    return eventName ? { event: eventName, raw: jsonStr } : { raw: jsonStr };
  }
};

// SUPER lightweight markdown renderer (headings + bullets + bold)
// This avoids adding deps like react-markdown.
const renderCoachMarkdown = (text) => {
  const raw = String(text || "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");

  const blocks = [];
  let currentList = null;

  const flushList = () => {
    if (currentList && currentList.items.length) {
      blocks.push({ type: "ul", items: currentList.items });
    }
    currentList = null;
  };

  const renderInline = (s) => {
    // bold: **text**
    const parts = [];
    let i = 0;
    while (i < s.length) {
      const start = s.indexOf("**", i);
      if (start === -1) {
        parts.push({ t: "text", v: s.slice(i) });
        break;
      }
      const end = s.indexOf("**", start + 2);
      if (end === -1) {
        parts.push({ t: "text", v: s.slice(i) });
        break;
      }
      if (start > i) parts.push({ t: "text", v: s.slice(i, start) });
      parts.push({ t: "bold", v: s.slice(start + 2, end) });
      i = end + 2;
    }

    return parts.map((p, idx) =>
      p.t === "bold" ? (
        <strong key={idx} style={{ fontWeight: 900, color: "rgba(255,255,255,0.95)" }}>
          {p.v}
        </strong>
      ) : (
        <span key={idx}>{p.v}</span>
      )
    );
  };

  for (const line of lines) {
    const l = line.trimEnd();

    // empty line -> paragraph break
    if (!l.trim()) {
      flushList();
      continue;
    }

    // headings
    if (l.startsWith("## ")) {
      flushList();
      blocks.push({ type: "h2", text: l.replace(/^##\s+/, "") });
      continue;
    }
    if (l.startsWith("### ")) {
      flushList();
      blocks.push({ type: "h3", text: l.replace(/^###\s+/, "") });
      continue;
    }

    // bullets
    if (/^[-*]\s+/.test(l.trim())) {
      if (!currentList) currentList = { items: [] };
      currentList.items.push(l.trim().replace(/^[-*]\s+/, ""));
      continue;
    }

    // default paragraph
    flushList();
    blocks.push({ type: "p", text: l });
  }
  flushList();

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {blocks.map((b, idx) => {
        if (b.type === "h2")
          return (
            <div
              key={idx}
              style={{
                marginTop: 6,
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: 0.2,
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {b.text}
            </div>
          );
        if (b.type === "h3")
          return (
            <div
              key={idx}
              style={{
                marginTop: 4,
                fontSize: 13,
                fontWeight: 900,
                color: "rgba(255,255,255,0.86)",
              }}
            >
              {b.text}
            </div>
          );
        if (b.type === "ul")
          return (
            <ul
              key={idx}
              style={{
                margin: 0,
                paddingLeft: 18,
                display: "grid",
                gap: 6,
                color: "rgba(255,255,255,0.86)",
                fontSize: 12.8,
                lineHeight: 1.55,
              }}
            >
              {b.items.map((it, j) => (
                <li key={j} style={{ opacity: 0.95 }}>
                  {renderInline(it)}
                </li>
              ))}
            </ul>
          );
        // paragraph
        return (
          <div
            key={idx}
            style={{
              fontSize: 12.8,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.86)",
              opacity: 0.95,
            }}
          >
            {renderInline(b.text)}
          </div>
        );
      })}
    </div>
  );
};

// Basic fallback summary (if /performance/summarize isn’t implemented yet)
const fallbackSummarize = (text) => {
  const raw = String(text || "");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  const pick = (sectionTitle, max = 4) => {
    const idx = lines.findIndex((l) => l.toLowerCase().startsWith(sectionTitle.toLowerCase()));
    if (idx === -1) return [];
    const out = [];
    for (let i = idx + 1; i < lines.length && out.length < max; i++) {
      const l = lines[i];
      if (l.startsWith("## ")) break;
      if (/^[-*]\s+/.test(l)) out.push(l.replace(/^[-*]\s+/, ""));
    }
    return out;
  };

  const s1 = pick("## Summary", 4);
  const s2 = pick("## Primary drivers", 4);
  const s3 = pick("## Experiments to run next week", 3);

  const merged = [...s1, ...s2, ...s3].slice(0, 8);
  if (!merged.length) return "## Key takeaways\n- No summary available yet (try again after output is generated).";

  return `## Key takeaways\n${merged.map((x) => `- ${x}`).join("\n")}`;
};

// ---------- component ----------
export default function PerformancePage() {
  const navigate = useNavigate();

  // sidebar (match other pages)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // right panel toggle
  const [videoMode, setVideoMode] = useState("top"); // 'top' | 'bottom'

  // timeframe toggle
  const [timeframe, setTimeframe] = useState("alltime"); // 'alltime' | 'recent'

  // videos list
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState("");
  const [videos, setVideos] = useState([]);

  // selected video
  const [selectedId, setSelectedId] = useState(null);

  // analysis UX
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisOutput, setAnalysisOutput] = useState("");
  const [analysisLog, setAnalysisLog] = useState([]);
  const [analysisProgress, setAnalysisProgress] = useState(0); // 0..1

  // analysis header (dynamic)
  const [analysisHeader, setAnalysisHeader] = useState("");

  // summarize UX
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  // NEW: keep the full analysis so we can restore after summarizing
  const [fullAnalysisOutput, setFullAnalysisOutput] = useState("");
  const [isShowingSummary, setIsShowingSummary] = useState(false);

  const logRef = useRef(null);

  // ---------- nav handlers ----------
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const goDashV2 = () => navigate("/dashboard-v2");
  const goDashV1 = () => navigate("/dashboard");
  const goPayouts = () => navigate("/payouts");
  const goClippers = () => navigate("/clippers");
  const goPerformance = () => navigate("/performance");
  const goLeaderboards = () => navigate("/leaderboards");
  const goGallery = () => navigate("/gallery");

  // ---------- fetch videos ----------
  useEffect(() => {
    let cancelled = false;

    const fetchVideos = async () => {
      try {
        setVideosLoading(true);
        setVideosError("");

        const qs = new URLSearchParams({
          source: "test", // change to 'prod' later if you want
          mode: videoMode,
          cohort: timeframe,
        });

        const res = await fetch(`${PERF_API_BASE_URL}/performance/videos?${qs.toString()}`);
        if (!res.ok) throw new Error(`Videos API ${res.status}`);
        const data = await res.json();

        const rows = Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
        const normalized = rows.map((v, i) => ({
          id: v.id ?? v.video_id ?? `${videoMode}_${timeframe}_${i}`,
          platform: v.platform ?? "unknown",
          title: v.title ?? v.caption ?? `Video ${i + 1}`,
          url: v.url ?? v.video_url ?? "",
          ai_url: v.ai_url ?? "",
          views: Number(v.view_count ?? v.views ?? 0),
          likes: Number(v.like_count ?? v.likes ?? 0),
          comments: Number(v.comment_count ?? v.comments ?? 0),
          published_at: v.published_at?.value ?? v.published_at ?? null,
          duration_seconds: Number(v.duration_seconds ?? 0),
          engagement_rate: Number(v.engagement_rate ?? NaN),
          reason: v.reason ?? v.summary ?? "",
          _raw: v,
        }));

        if (cancelled) return;

        setVideos(normalized);
        if (normalized.length) {
          const stillExists = selectedId && normalized.some((x) => x.id === selectedId);
          setSelectedId(stillExists ? selectedId : normalized[0].id);
        } else {
          setSelectedId(null);
        }
      } catch (e) {
        if (cancelled) return;
        setVideosError("Unable to load videos. Check the performance API endpoint / query params.");
        setVideos([]);
        setSelectedId(null);
      } finally {
        if (!cancelled) setVideosLoading(false);
      }
    };

    fetchVideos();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoMode, timeframe]);

  const selectedVideo = useMemo(() => videos.find((v) => v.id === selectedId) || null, [videos, selectedId]);

  const topStats = useMemo(() => {
    const n = videos.length || 0;
    const totalViews = videos.reduce((s, v) => s + (Number(v.views) || 0), 0);
    const totalLikes = videos.reduce((s, v) => s + (Number(v.likes) || 0), 0);
    const totalComments = videos.reduce((s, v) => s + (Number(v.comments) || 0), 0);
    return { n, totalViews, totalLikes, totalComments };
  }, [videos]);

  // ---------- analysis logging ----------
  const pushLog = (line) => {
    setAnalysisLog((prev) => [...prev.slice(-18), line]);
    setTimeout(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, 0);
  };

  const selectionLabel = useMemo(() => {
    const n = videos.length || 0;
    const modeLabel = videoMode === "top" ? "Top" : "Bottom";
    const tfLabel = timeframe === "recent" ? "recent (30d)" : "all-time";
    const plural = n === 1 ? "video" : "videos";
    return `Analyzing ${modeLabel} ${n} ${tfLabel} ${plural}…`;
  }, [videos.length, videoMode, timeframe]);

  const summarizeLabel = useMemo(() => {
    const n = videos.length || 0;
    const modeLabel = videoMode === "top" ? "Top" : "Bottom";
    const tfLabel = timeframe === "recent" ? "recent (30d)" : "all-time";
    const plural = n === 1 ? "video" : "videos";
    return `Summary — ${modeLabel} ${n} ${tfLabel} ${plural}`;
  }, [videos.length, videoMode, timeframe]);

  // ---------- live streaming analysis ----------
  const runAnalysis = async () => {
    if (analyzing) return;

    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisOutput("");
    setFullAnalysisOutput("");
    setIsShowingSummary(false);
    setSummaryError("");

    setAnalysisLog([]);
    setAnalysisProgress(0);
    setAnalysisHeader(selectionLabel);

    try {
      pushLog("Booting analysis graph…");
      setAnalysisProgress(0.06);

      const res = await fetch(`${PERF_API_BASE_URL}/performance/analyze/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "test",
          cohort: timeframe,
          mode: videoMode,
          limit: 20,
          selectedVideoId: selectedVideo?.id || null,
        }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(`Stream failed (${res.status}): ${text.slice(0, 200)}`);
      }

      pushLog("Connected. Streaming tokens…");
      setAnalysisProgress(0.12);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let buffer = "";
      let fullText = "";
      let gotMeta = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE blocks separated by \n\n
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const block of parts) {
          const payload = parseSSEBlock(block);
          if (!payload) continue;

          // meta
          if (payload.event === "meta") {
            gotMeta = true;
            const cohortLabel = payload.cohort || timeframe;
            const modeLabel = payload.mode || videoMode;
            pushLog(`Loaded ${payload.input_rows ?? payload.count ?? payload.n ?? "?"} rows · cohort=${cohortLabel} · mode=${modeLabel}`);
            setAnalysisProgress((p) => Math.max(p, 0.18));
            continue;
          }

          // progress (optional)
          if (typeof payload.progress === "number") {
            setAnalysisProgress((p) => Math.max(p, clamp(payload.progress, 0, 1)));
            continue;
          }

          // token delta
          if (payload.event === "delta" && payload.delta) {
            fullText += payload.delta;
            setAnalysisOutput(fullText);
            setAnalysisProgress((p) => Math.min(0.96, Math.max(p, 0.22) + 0.002));
            continue;
          }

          // done
          if (payload.event === "done" || payload.done) {
            pushLog("Done. Insights generated.");
            setAnalysisProgress(1);
            continue;
          }

          // error
          if (payload.event === "error" || payload.error) {
            throw new Error(payload.error || "Stream error");
          }

          // misc logs
          if (payload.log) {
            pushLog(payload.log);
            if (!gotMeta) setAnalysisProgress((p) => Math.max(p, 0.16));
          }
        }
      }

      if (!fullText) {
        pushLog("Stream ended (no output).");
        throw new Error("No analysis output received.");
      }

      // store as the "full" analysis baseline
      setFullAnalysisOutput(fullText);
      setIsShowingSummary(false);

      setAnalysisProgress(1);
      pushLog("Complete.");
    } catch (e) {
      setAnalysisError(e?.message || "Analysis failed.");
      pushLog("Error: analysis failed.");
    } finally {
      setTimeout(() => setAnalyzing(false), 220);
    }
  };

  // ---------- summarize (REPLACES main output) ----------
  const summarize = async () => {
    if (summarizing || !analysisOutput) return;

    setSummarizing(true);
    setSummaryError("");

    try {
      // ensure we have the full analysis captured (in case user ran summarize mid-stream earlier)
      if (!fullAnalysisOutput) setFullAnalysisOutput(analysisOutput);

      const res = await fetch(`${PERF_API_BASE_URL}/performance/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fullAnalysisOutput || analysisOutput,
          cohort: timeframe,
          mode: videoMode,
          hint: selectionLabel,
        }),
      });

      let md = "";
      if (res.ok) {
        const data = await res.json().catch(() => null);
        md = data?.summary_markdown || data?.summary || "";
      }

      if (!md) {
        md = fallbackSummarize(fullAnalysisOutput || analysisOutput);
      }

      // REPLACE the main output
      setAnalysisOutput(md);
      setAnalysisHeader(summarizeLabel);
      setIsShowingSummary(true);
      pushLog("Summarized into key takeaways.");
    } catch (e) {
      setSummaryError("Summarize failed (used fallback).");
      const md = fallbackSummarize(fullAnalysisOutput || analysisOutput);
      setAnalysisOutput(md);
      setAnalysisHeader(summarizeLabel);
      setIsShowingSummary(true);
      pushLog("Summarize failed; showed fallback summary.");
    } finally {
      setSummarizing(false);
    }
  };

  const restoreFull = () => {
    if (!fullAnalysisOutput) return;
    setAnalysisOutput(fullAnalysisOutput);
    setAnalysisHeader(selectionLabel);
    setIsShowingSummary(false);
  };

  // ---------- layout ----------
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle at top, #141414 0, #020202 55%)",
        display: "flex",
        overflowX: "hidden",
        overflowY: "auto",
        color: "#fff",
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "32px",
        paddingTop: "40px",
        paddingBottom: "40px",
        boxSizing: "border-box",
      }}
    >
      {/* page-local styles */}
      <style>{`
        @keyframes pulseRing {
          0% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.30; }
          60% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.10; }
          100% { transform: translate(-50%, -50%) scale(1.10); opacity: 0.0; }
        }
        @keyframes scanLine {
          0% { transform: translateY(-30%); opacity: 0; }
          30% { opacity: 0.35; }
          70% { opacity: 0.35; }
          100% { transform: translateY(130%); opacity: 0; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-40%); opacity: 0; }
          30% { opacity: 0.22; }
          60% { opacity: 0.22; }
          100% { transform: translateX(140%); opacity: 0; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes overlayShimmer {
          0% { transform: translateX(-60%); opacity: 0; }
          25% { opacity: 0.22; }
          60% { opacity: 0.22; }
          100% { transform: translateX(160%); opacity: 0; }
        }
      `}</style>

      {/* WATERMARK */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          opacity: 0.03,
          fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
          fontSize: 140,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#ffffff",
          transform: "rotate(-18deg)",
          textShadow: "0 0 60px rgba(0,0,0,1)",
        }}
      >
        STEVEWILLDOIT
      </div>

      {/* SIDEBAR */}
      <div
        style={{
          width: sidebarOpen ? 190 : 54,
          transition: "width 180ms ease",
          marginRight: 22,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            borderRadius: 18,
            background: "rgba(0,0,0,0.8)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 18px 45px rgba(0,0,0,0.8)",
            padding: 10,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              alignSelf: sidebarOpen ? "flex-end" : "center",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 11,
              padding: "4px 7px",
            }}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>

          {sidebarOpen && (
            <>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
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
                  border: "none",
                  outline: "none",
                  borderRadius: 12,
                  padding: "7px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 12,
                  background: "transparent",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Dashboards
              </button>

              <button
                onClick={goPayouts}
                style={{
                  border: "none",
                  outline: "none",
                  borderRadius: 12,
                  padding: "7px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 12,
                  background: "transparent",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Payouts
              </button>

              <button
                onClick={goClippers}
                style={{
                  border: "none",
                  outline: "none",
                  borderRadius: 12,
                  padding: "7px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 12,
                  background: "transparent",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Clippers
              </button>

              <button
                onClick={goPerformance}
                style={{
                  border: "none",
                  outline: "none",
                  borderRadius: 12,
                  padding: "8px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 13,
                  background: "linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))",
                  color: "#020617",
                  fontWeight: 700,
                  marginTop: 2,
                  marginBottom: 2,
                }}
              >
                Performance
              </button>

              {/* Leaderboards */}
              <button
                  onClick={goLeaderboards}
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
                    marginTop: 2,
                    marginBottom: 2,
                  }}
                >
                  Leaderboards
              </button>

              {/* Gallery */}
              <button
                onClick={goGallery}
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
                Gallery
              </button>

              <button
                style={{
                  border: "none",
                  outline: "none",
                  borderRadius: 12,
                  padding: "7px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 12,
                  background: "transparent",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                Settings
              </button>

              <div style={{ flexGrow: 1 }} />


              <button
                onClick={handleLogout}
                style={{
                  border: "none",
                  outline: "none",
                  borderRadius: 999,
                  padding: "7px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 12,
                  background: "rgba(248,250,252,0.06)",
                  color: "rgba(255,255,255,0.85)",
                  display: "flex",
                  alignItems: "center",
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
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  paddingTop: 8,
                }}
              >
                Performance analysis hub
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, position: "relative", zIndex: 3 }}>
        {/* Branding */}
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
              fontSize: 34,
              letterSpacing: 0.5,
              color: "#ffffff",
              textTransform: "uppercase",
              textShadow: "0 3px 12px rgba(0,0,0,0.7)",
            }}
          >
            STEVEWILLDOIT, LLC
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 18, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Performance</div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
              Live AI Analysis — coaching-style breakdown based on the currently loaded rows
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              gap: 10,
              alignItems: "center",
              backdropFilter: "blur(8px)",
              minWidth: 280,
              justifyContent: "flex-end",
            }}
          >
            <span style={{ opacity: 0.85 }}>
              {topStats.n} videos · {formatNumber(topStats.totalViews)} views · {formatNumber(topStats.totalLikes)} likes
            </span>
          </div>
        </div>

        {/* HERO */}
        <div
          style={{
            borderRadius: 20,
            background: "radial-gradient(circle at top left, rgba(255,255,255,0.05), transparent 60%)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
            padding: 18,
            marginBottom: 18,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: "linear-gradient(90deg, transparent, rgba(250,204,21,0.10), transparent)",
              width: "60%",
              filter: "blur(0.5px)",
              animation: analyzing ? "shimmer 1.2s linear infinite" : "none",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 12, position: "relative" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.2 }}>Live AI Analysis</div>
              <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>
                Click “Run analysis” to generate a breakdown of why these clips are winning/losing + recommended tests.
              </div>
              <div style={{ fontSize: 11, opacity: 0.58, marginTop: 6 }}>
                Mode: <strong style={{ opacity: 0.9 }}>{videoMode}</strong> · Timeframe:{" "}
                <strong style={{ opacity: 0.9 }}>{timeframe === "recent" ? "recent (30d)" : "all-time"}</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {isShowingSummary && fullAnalysisOutput ? (
                <button
                  onClick={restoreFull}
                  disabled={analyzing || summarizing}
                  style={{
                    border: "1px solid rgba(255,255,255,0.14)",
                    cursor: analyzing || summarizing ? "default" : "pointer",
                    borderRadius: 999,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: 0.2,
                    color: "rgba(255,255,255,0.9)",
                    background: "rgba(255,255,255,0.06)",
                    opacity: analyzing || summarizing ? 0.55 : 1,
                  }}
                  title="Switch back to the full analysis"
                >
                  Restore full
                </button>
              ) : (
                <button
                  onClick={summarize}
                  disabled={analyzing || summarizing || !analysisOutput || !fullAnalysisOutput}
                  style={{
                    border: "1px solid rgba(255,255,255,0.14)",
                    cursor: analyzing || summarizing || !analysisOutput || !fullAnalysisOutput ? "default" : "pointer",
                    borderRadius: 999,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: 0.2,
                    color: "rgba(255,255,255,0.9)",
                    background: "rgba(255,255,255,0.06)",
                    opacity: analyzing || summarizing || !analysisOutput || !fullAnalysisOutput ? 0.55 : 1,
                  }}
                  title="Condense the full analysis into key takeaways"
                >
                  {summarizing ? "Summarizing…" : "Summarize"}
                </button>
              )}

              <button
                onClick={runAnalysis}
                disabled={analyzing}
                style={{
                  border: "none",
                  cursor: analyzing ? "default" : "pointer",
                  borderRadius: 999,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 0.2,
                  color: "#0b1220",
                  background: analyzing
                    ? "linear-gradient(135deg, rgba(250,204,21,0.55), rgba(249,115,22,0.55))"
                    : "linear-gradient(135deg, rgba(249,115,22,0.98), rgba(250,204,21,0.98))",
                  boxShadow: analyzing
                    ? "0 12px 30px rgba(0,0,0,0.65)"
                    : "0 18px 45px rgba(250,204,21,0.20), 0 18px 45px rgba(249,115,22,0.18)",
                  opacity: analyzing ? 0.85 : 1,
                }}
              >
                {analyzing ? "Analyzing…" : "Run analysis"}
              </button>
            </div>
          </div>

          {!!summaryError && (
            <div
              style={{
                marginBottom: 10,
                padding: "8px 10px",
                borderRadius: 12,
                background: "rgba(251,146,60,0.10)",
                border: "1px solid rgba(251,146,60,0.35)",
                color: "rgba(255,237,213,0.95)",
                fontSize: 12,
              }}
            >
              {summaryError}
            </div>
          )}

          {/* progress */}
          <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
            <div
              style={{
                height: "100%",
                width: `${clamp(analysisProgress, 0, 1) * 100}%`,
                background: "linear-gradient(90deg, rgba(250,204,21,0.95), rgba(249,115,22,0.95))",
                transition: "width 220ms ease",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 14 }}>
            {/* output */}
            <div
              style={{
                borderRadius: 18,
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: 14,
                minHeight: 210,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {summarizing && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 5,
                    background: "rgba(15, 15, 15, 0.62)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(7px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {/* shimmer sweep */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      width: "55%",
                      background: "linear-gradient(90deg, transparent, rgba(250,204,21,0.10), transparent)",
                      filter: "blur(0.5px)",
                      animation: "overlayShimmer 1.15s linear infinite",
                      pointerEvents: "none",
                    }}
                  />

                  {/* center card */}
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: "rgba(0,0,0,0.55)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        border: "3px solid rgba(255,255,255,0.15)",
                        borderTopColor: "rgba(255,255,255,0.75)",
                        animation: "spin 0.9s linear infinite",
                      }}
                    />
                    <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.92 }}>
                      Summarizing…
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.65 }}>
                      Compressing into key takeaways
                    </div>
                  </div>
                </div>
              )}

              {analyzing && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "14%",
                      top: "55%",
                      width: 220,
                      height: 220,
                      borderRadius: 999,
                      border: "1px solid rgba(250,204,21,0.30)",
                      boxShadow: "0 0 40px rgba(250,204,21,0.08)",
                      transform: "translate(-50%, -50%)",
                      animation: "pulseRing 1.25s ease-out infinite",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: "14%",
                      top: "55%",
                      width: 160,
                      height: 160,
                      borderRadius: 999,
                      border: "1px solid rgba(249,115,22,0.26)",
                      boxShadow: "0 0 40px rgba(249,115,22,0.06)",
                      transform: "translate(-50%, -50%)",
                      animation: "pulseRing 1.25s ease-out infinite",
                      animationDelay: "0.28s",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      height: 80,
                      background: "linear-gradient(to bottom, transparent, rgba(250,204,21,0.12), transparent)",
                      animation: "scanLine 1.15s linear infinite",
                    }}
                  />
                </div>
              )}

              {analysisError && (
                <div
                  style={{
                    marginBottom: 10,
                    padding: "8px 10px",
                    borderRadius: 12,
                    background: "rgba(239,68,68,0.10)",
                    border: "1px solid rgba(239,68,68,0.35)",
                    color: "rgba(254,202,202,0.95)",
                    fontSize: 12,
                  }}
                >
                  {analysisError}
                </div>
              )}

              {/* Analysis header line */}
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Insights output</div>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.85,
                  marginBottom: 10,
                  padding: "6px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                {analysisHeader || selectionLabel}
              </div>

              {/* MAIN output in clean headings/bullets */}
              <div style={{ minHeight: 140 }}>
                {!analysisOutput && !analyzing ? (
                  <div style={{ fontSize: 12.5, lineHeight: 1.55, opacity: 0.78 }}>
                    Run analysis to generate a coaching-style breakdown.
                  </div>
                ) : (
                  <div style={{ opacity: analyzing ? 0.92 : 1 }}>
                    {renderCoachMarkdown(analysisOutput || "Computing…")}
                  </div>
                )}
              </div>
            </div>

            {/* log */}
            <div
              style={{
                borderRadius: 18,
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: 14,
                minHeight: 210,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Compute stream</div>
                <div
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    opacity: 0.85,
                  }}
                >
                  {analyzing ? "LIVE" : "IDLE"}
                </div>
              </div>

              <div
                ref={logRef}
                style={{
                  marginTop: 10,
                  flex: 1,
                  overflow: "auto",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.35)",
                  padding: 10,
                }}
              >
                {analysisLog.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{analyzing ? "Starting…" : "No compute logs yet."}</div>
                ) : (
                  analysisLog.map((l, i) => (
                    <div
                      key={`${l}_${i}`}
                      style={{
                        fontSize: 12,
                        opacity: 0.9,
                        padding: "3px 0",
                        borderBottom: i === analysisLog.length - 1 ? "none" : "1px dashed rgba(255,255,255,0.06)",
                      }}
                    >
                      <span style={{ opacity: 0.55, marginRight: 8 }}>›</span>
                      {l}
                    </div>
                  ))
                )}
              </div>

              <div style={{ fontSize: 11, opacity: 0.55, marginTop: 10 }}>
                Uses the currently loaded rows (top/bottom panel) to generate pattern + tests.
              </div>
            </div>
          </div>
        </div>

        {/* LOWER GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.15fr)", gap: 18 }}>
          {/* left: how to use */}
          <div
            style={{
              borderRadius: 20,
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.65)",
              padding: 16,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>How to use this</div>
            <div style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.55 }}>
              <div style={{ marginBottom: 8 }}>
                1) Choose <strong>Top</strong> or <strong>Bottom</strong> performing videos on the right.
              </div>
              <div style={{ marginBottom: 8 }}>
                2) Choose <strong>All-time</strong> or <strong>Recent (30d)</strong> timeframe.
              </div>
              <div style={{ marginBottom: 8 }}>3) Click a video row to set it as the context anchor.</div>
              <div style={{ marginBottom: 8 }}>
                4) Hit <strong>Run analysis</strong> to generate the “why” + experiments.
              </div>
              <div style={{ marginBottom: 8 }}>
                5) Hit <strong>Summarize</strong> to replace the full output with key takeaways.
              </div>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 10 }}>
                (This is running against your PERF_ANALYSIS_INPUT_TEST rows right now.)
              </div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {[
                { k: "Views", v: formatNumber(topStats.totalViews) },
                { k: "Likes", v: formatNumber(topStats.totalLikes) },
                { k: "Comments", v: formatNumber(topStats.totalComments) },
              ].map((x) => (
                <div
                  key={x.k}
                  style={{
                    borderRadius: 16,
                    padding: 12,
                    background: "radial-gradient(circle at top left, rgba(96,165,250,0.16), rgba(0,0,0,0.35))",
                    border: "1px solid rgba(96,165,250,0.22)",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{x.k}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{x.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* right: videos panel */}
          <div
            style={{
              borderRadius: 20,
              background: "radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 55%)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
              padding: 16,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{videoMode === "top" ? "Top performing videos" : "Bottom performing videos"}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Click a row to focus analysis context.</div>
              </div>

              {/* controls */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {/* Timeframe pill */}
                <div
                  style={{
                    display: "inline-flex",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.55)",
                    padding: 3,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {[
                    { k: "alltime", label: "All-time" },
                    { k: "recent", label: "Recent (30d)" },
                  ].map((t) => {
                    const active = timeframe === t.k;
                    return (
                      <button
                        key={t.k}
                        onClick={() => setTimeframe(t.k)}
                        style={{
                          border: "none",
                          outline: "none",
                          cursor: "pointer",
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          background: active ? "linear-gradient(135deg, #f97316, #facc15)" : "transparent",
                          color: active ? "#000" : "rgba(255,255,255,0.7)",
                          fontWeight: active ? 800 : 500,
                          boxShadow: active ? "0 0 0 1px rgba(0,0,0,0.25), 0 10px 25px rgba(0,0,0,0.7)" : "none",
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Top/Bottom pill */}
                <div
                  style={{
                    display: "inline-flex",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.55)",
                    padding: 3,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {[
                    { k: "top", label: "Top" },
                    { k: "bottom", label: "Bottom" },
                  ].map((t) => {
                    const active = videoMode === t.k;
                    return (
                      <button
                        key={t.k}
                        onClick={() => setVideoMode(t.k)}
                        style={{
                          border: "none",
                          outline: "none",
                          cursor: "pointer",
                          padding: "6px 12px",
                          borderRadius: 999,
                          fontSize: 12,
                          background: active ? "linear-gradient(135deg, #f97316, #facc15)" : "transparent",
                          color: active ? "#000" : "rgba(255,255,255,0.7)",
                          fontWeight: active ? 800 : 500,
                          boxShadow: active ? "0 0 0 1px rgba(0,0,0,0.25), 0 10px 25px rgba(0,0,0,0.7)" : "none",
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {videosLoading && <div style={{ padding: 12, fontSize: 13, opacity: 0.8 }}>Loading videos…</div>}
            {!videosLoading && videosError && <div style={{ padding: 12, fontSize: 12, color: "#fed7aa" }}>{videosError}</div>}

            {/* selected preview */}
            <div
              style={{
                borderRadius: 16,
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: 12,
                marginBottom: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Selected</div>
                <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedVideo?.title || "—"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: `1px solid ${platformBadgeStyle(selectedVideo?.platform).bd}`,
                      background: platformBadgeStyle(selectedVideo?.platform).bg,
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {(selectedVideo?.platform || "UNKNOWN").toUpperCase()}
                  </span>
                  <span style={{ opacity: 0.8 }}>{formatNumber(selectedVideo?.views)} views</span>
                  <span style={{ opacity: 0.7 }}>
                    {formatNumber(selectedVideo?.likes)} likes · {formatNumber(selectedVideo?.comments)} comments
                  </span>
                </div>
              </div>

              {selectedVideo?.url ? (
                <a
                  href={selectedVideo.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration: "none",
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  Open video ↗
                </a>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.5 }}>No URL</div>
              )}
            </div>

            {/* table */}
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.35)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.10)", fontWeight: 600, opacity: 0.7 }}>
                      Video
                    </th>
                    <th style={{ textAlign: "right", padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.10)", fontWeight: 600, opacity: 0.7, width: 110 }}>
                      Views
                    </th>
                    <th style={{ textAlign: "right", padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.10)", fontWeight: 600, opacity: 0.7, width: 90 }}>
                      ER
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!videosLoading && videos.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: 12, opacity: 0.75 }}>
                        No videos loaded yet.
                      </td>
                    </tr>
                  ) : (
                    videos.map((v, idx) => {
                      const active = v.id === selectedId;
                      const er = (Number(v.likes) + Number(v.comments)) / Math.max(1, Number(v.views) || 0);

                      return (
                        <tr
                          key={v.id}
                          onClick={() => setSelectedId(v.id)}
                          style={{
                            cursor: "pointer",
                            background: active
                              ? "linear-gradient(90deg, rgba(249,115,22,0.14), rgba(250,204,21,0.10))"
                              : idx % 2 === 0
                              ? "rgba(255,255,255,0.02)"
                              : "transparent",
                          }}
                        >
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  padding: "3px 8px",
                                  borderRadius: 999,
                                  border: `1px solid ${platformBadgeStyle(v.platform).bd}`,
                                  background: platformBadgeStyle(v.platform).bg,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  flexShrink: 0,
                                }}
                              >
                                {(v.platform || "UNK").toUpperCase()}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: active ? 900 : 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {v.title}
                                </div>
                                {v.reason ? (
                                  <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {v.reason}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: active ? 900 : 600 }}>
                            {formatNumber(v.views)}
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.06)", opacity: 0.9 }}>
                            {formatPct(er)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 10 }}>Tip: keep this list small (10–30 rows) so analysis feels instant.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
