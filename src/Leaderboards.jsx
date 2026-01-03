// Leaderboards.jsx
import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

/**
 * Leaderboards (revamped)
 * - NO AI-derived analysis text (only metrics you can compute from: videos posted, publish times, views, likes, comments)
 * - Cleaner, more “game leaderboard” vibe (podium + ranked list rows)
 * - Actions: Copy summary, Print/Save PDF (browser print)
 * - “Email blast” placeholder (wire later)
 */

const formatNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString();
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return "—";
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return String(dateStr);
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 22,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        padding: "10px 14px",
        borderRadius: 999,
        background: "rgba(0,0,0,0.78)",
        border: "1px solid rgba(255,255,255,0.14)",
        color: "rgba(255,255,255,0.92)",
        fontSize: 12,
        boxShadow: "0 18px 50px rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
      }}
    >
      {message}
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: {
      bg: "rgba(255,255,255,0.06)",
      bd: "rgba(255,255,255,0.12)",
      tx: "rgba(255,255,255,0.92)",
    },
    gold: {
      bg: "rgba(250,204,21,0.12)",
      bd: "rgba(250,204,21,0.35)",
      tx: "rgba(250,204,21,0.95)",
    },
    silver: {
      bg: "rgba(226,232,240,0.10)",
      bd: "rgba(226,232,240,0.30)",
      tx: "rgba(226,232,240,0.95)",
    },
    bronze: {
      bg: "rgba(251,146,60,0.10)",
      bd: "rgba(251,146,60,0.30)",
      tx: "rgba(251,146,60,0.95)",
    },
    green: {
      bg: "rgba(34,197,94,0.12)",
      bd: "rgba(34,197,94,0.28)",
      tx: "rgba(74,222,128,0.95)",
    },
    blue: {
      bg: "rgba(96,165,250,0.12)",
      bd: "rgba(96,165,250,0.28)",
      tx: "rgba(147,197,253,0.95)",
    },
    pink: {
      bg: "rgba(244,114,182,0.12)",
      bd: "rgba(244,114,182,0.28)",
      tx: "rgba(251,113,133,0.95)",
    },
  };

  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        borderRadius: 999,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.tx,
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Medal({ place }) {
  // Sleek “coin” medal (CSS only)
  const cfg =
    place === 1
      ? { tone: "gold", label: "1", glow: "rgba(250,204,21,0.22)" }
      : place === 2
      ? { tone: "silver", label: "2", glow: "rgba(226,232,240,0.16)" }
      : { tone: "bronze", label: "3", glow: "rgba(251,146,60,0.16)" };

  const ring =
    place === 1
      ? "linear-gradient(135deg, rgba(250,204,21,0.95), rgba(253,230,138,0.65))"
      : place === 2
      ? "linear-gradient(135deg, rgba(226,232,240,0.95), rgba(148,163,184,0.55))"
      : "linear-gradient(135deg, rgba(251,146,60,0.95), rgba(245,158,11,0.45))";

  return (
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: 16,
        position: "relative",
        boxShadow: `0 0 28px ${cfg.glow}`,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
      title={`${place}${place === 1 ? "st" : place === 2 ? "nd" : "rd"} place`}
    >
      <div
        style={{
          position: "absolute",
          inset: -10,
          background: ring,
          opacity: 0.35,
          filter: "blur(0px)",
          transform: "rotate(22deg)",
        }}
      />
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          background: ring,
          display: "grid",
          placeItems: "center",
          border: "1px solid rgba(0,0,0,0.25)",
          boxShadow: "inset 0 2px 10px rgba(0,0,0,0.25)",
          position: "relative",
          zIndex: 2,
          fontWeight: 900,
          color: "rgba(2,6,23,0.92)",
        }}
      >
        {cfg.label}
      </div>
      <div
        style={{
          position: "absolute",
          top: -6,
          left: 8,
          width: 12,
          height: 12,
          borderRadius: 6,
          background: "rgba(255,255,255,0.55)",
          opacity: 0.35,
          transform: "rotate(20deg)",
        }}
      />
    </div>
  );
}

function Stars({ rating }) {
  const r = clamp(Number(rating || 0), 0, 5);
  const full = Math.floor(r);
  const half = r - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;

  const star = "★";
  const halfStar = "★"; // visually we’ll render half via opacity
  const emptyStar = "★";

  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} style={{ fontSize: 12, color: "rgba(250,204,21,0.95)" }}>
          {star}
        </span>
      ))}
      {half === 1 && (
        <span style={{ fontSize: 12, color: "rgba(250,204,21,0.95)", opacity: 0.55 }}>
          {halfStar}
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} style={{ fontSize: 12, color: "rgba(148,163,184,0.55)" }}>
          {emptyStar}
        </span>
      ))}
    </span>
  );
}

function AvatarBadge({ name }) {
  const letter = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 14,
        display: "grid",
        placeItems: "center",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 12px 28px rgba(0,0,0,0.5)",
        fontWeight: 900,
        color: "rgba(255,255,255,0.92)",
      }}
    >
      {letter}
    </div>
  );
}

function MiniCard({ title, main, sub, tone = "neutral" }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.06), rgba(0,0,0,0.55) 60%)",
        border: "1px solid rgba(148,163,184,0.22)",
        boxShadow: "0 20px 55px rgba(0,0,0,0.78)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.08, opacity: 0.78 }}>
        {title}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Pill tone={tone}>
          <span style={{ fontWeight: 900 }}>{main}</span>
        </Pill>
        <span style={{ fontSize: 12, opacity: 0.75 }}>{sub}</span>
      </div>
    </div>
  );
}

export default function Leaderboards() {
  const navigate = useNavigate();
  const boardRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState("");

  // Filters (placeholder)
  const [week, setWeek] = useState("2025-12-29");
  const [platform, setPlatform] = useState("all");
  const [rankBy, setRankBy] = useState("views"); // views | videos | vpp | e1k

  // Placeholder data (STRICT: only things derivable from views/likes/comments/videos/publish times)
  const placeholder = useMemo(() => {
    const rows = [
      {
        id: "c1",
        name: "Stevewilldoitbruh",
        views: 43204992,
        likes: 1239400,
        comments: 84500,
        videos: 104,
        firstPublishedAt: "2025-12-23T08:15:00Z",
        lastPublishedAt: "2025-12-29T23:30:00Z",
        streakWeeks: 6,
        deltaRank: +2,
      },
      {
        id: "c2",
        name: "Stevewilldoitfr",
        views: 43990426,
        likes: 1182500,
        comments: 80200,
        videos: 82,
        firstPublishedAt: "2025-12-23T12:10:00Z",
        lastPublishedAt: "2025-12-29T22:05:00Z",
        streakWeeks: 4,
        deltaRank: -1,
      },
      {
        id: "c3",
        name: "realstevewilldoit",
        views: 39831447,
        likes: 1211800,
        comments: 91200,
        videos: 79,
        firstPublishedAt: "2025-12-23T10:40:00Z",
        lastPublishedAt: "2025-12-29T21:18:00Z",
        streakWeeks: 5,
        deltaRank: 0,
      },
      {
        id: "c4",
        name: "Stevewilldoitclips_",
        views: 23296224,
        likes: 703000,
        comments: 49000,
        videos: 83,
        firstPublishedAt: "2025-12-23T09:25:00Z",
        lastPublishedAt: "2025-12-29T20:48:00Z",
        streakWeeks: 3,
        deltaRank: +1,
      },
      {
        id: "c5",
        name: "Stevewilldoit.viral",
        views: 19462001,
        likes: 610000,
        comments: 42000,
        videos: 84,
        firstPublishedAt: "2025-12-23T11:05:00Z",
        lastPublishedAt: "2025-12-29T19:12:00Z",
        streakWeeks: 2,
        deltaRank: +3,
      },
      {
        id: "c6",
        name: "Stevewilldoitfunny",
        views: 10199241,
        likes: 330000,
        comments: 25500,
        videos: 91,
        firstPublishedAt: "2025-12-23T08:55:00Z",
        lastPublishedAt: "2025-12-29T18:40:00Z",
        streakWeeks: 1,
        deltaRank: -2,
      },
    ];

    return { weekOf: week, platform, rows };
  }, [week, platform]);

  const computed = useMemo(() => {
    const rows = placeholder.rows.map((r) => {
      const views = Number(r.views || 0);
      const likes = Number(r.likes || 0);
      const comments = Number(r.comments || 0);
      const videos = Math.max(1, Number(r.videos || 0));

      // Derived metrics (allowed)
      const viewsPerVideo = views / videos;
      const likesPerVideo = likes / videos;
      const commentsPerVideo = comments / videos;

      // Engagement per 1K views: (likes + comments)/views*1000
      const engPer1k = views > 0 ? ((likes + comments) / views) * 1000 : 0;

      // Posting cadence (videos/day) (week window assumed = 7 days here)
      const cadence = videos / 7;

      // "Score" for game vibe (still derived from metrics)
      // Weights: views heavy, then likes/comments, then cadence.
      const score =
        views * 1.0 +
        likes * 15 +
        comments * 60 +
        cadence * 25000;

      return {
        ...r,
        viewsPerVideo,
        likesPerVideo,
        commentsPerVideo,
        engPer1k,
        cadence,
        score,
      };
    });

    // Stars: map selected rank metric into 1..5 based on min/max in dataset
    const metricAccessor = (row) => {
      if (rankBy === "videos") return row.videos;
      if (rankBy === "vpp") return row.viewsPerVideo;
      if (rankBy === "e1k") return row.engPer1k;
      return row.views;
    };

    const values = rows.map(metricAccessor);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = Math.max(1e-9, maxV - minV);

    const rowsWithRating = rows.map((r) => {
      const v = metricAccessor(r);
      const t = (v - minV) / range; // 0..1
      const rating = 1 + t * 4; // 1..5
      return { ...r, rating };
    });

    const sorted = [...rowsWithRating].sort((a, b) => metricAccessor(b) - metricAccessor(a));
    const podium = sorted.slice(0, 3);
    const rest = sorted.slice(3);

    // Mini leaders (allowed)
    const topViews = [...rowsWithRating].sort((a, b) => b.views - a.views)[0];
    const mostVideos = [...rowsWithRating].sort((a, b) => b.videos - a.videos)[0];
    const bestVpp = [...rowsWithRating].sort((a, b) => b.viewsPerVideo - a.viewsPerVideo)[0];
    const bestE1k = [...rowsWithRating].sort((a, b) => b.engPer1k - a.engPer1k)[0];

    const totalViews = rowsWithRating.reduce((s, r) => s + Number(r.views || 0), 0);
    const totalVideos = rowsWithRating.reduce((s, r) => s + Number(r.videos || 0), 0);
    const totalLikes = rowsWithRating.reduce((s, r) => s + Number(r.likes || 0), 0);
    const totalComments = rowsWithRating.reduce((s, r) => s + Number(r.comments || 0), 0);

    return {
      rows: rowsWithRating,
      podium,
      rest,
      totalViews,
      totalVideos,
      totalLikes,
      totalComments,
      topViews,
      mostVideos,
      bestVpp,
      bestE1k,
      metricAccessor,
    };
  }, [placeholder.rows, rankBy]);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 1800);
  };

  // NAV
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const goDashV2 = () => navigate("/dashboard-v2");
  const goPayouts = () => navigate("/payouts");
  const goClippers = () => navigate("/clippers");
  const goPerformance = () => navigate("/performance");
  const goLeaderboards = () => navigate("/leaderboards");
  const goGallery = () => navigate("/gallery");


  const copySummary = async () => {
    const title = `🏆 Weekly Leaderboard — Week of ${formatDateLabel(
      placeholder.weekOf
    )} (${platform === "all" ? "All Platforms" : platform})`;

    const lines = [title, ""];
    computed.podium.forEach((p, idx) => {
      const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
      lines.push(
        `${medal} ${p.name} — ${formatNumber(p.views)} views · ${formatNumber(
          p.likes
        )} likes · ${formatNumber(p.comments)} comments · ${formatNumber(
          p.videos
        )} videos`
      );
    });

    lines.push("");
    lines.push(
      `Totals: ${formatNumber(computed.totalViews)} views · ${formatNumber(
        computed.totalLikes
      )} likes · ${formatNumber(computed.totalComments)} comments · ${formatNumber(
        computed.totalVideos
      )} videos`
    );

    lines.push(
      `Best views/video: ${computed.bestVpp?.name} (${formatNumber(
        Math.round(computed.bestVpp?.viewsPerVideo || 0)
      )})`
    );
    lines.push(
      `Best engagement/1K views: ${computed.bestE1k?.name} (${(computed.bestE1k?.engPer1k || 0).toFixed(
        1
      )})`
    );
    lines.push(
      `Most videos: ${computed.mostVideos?.name} (${formatNumber(
        computed.mostVideos?.videos
      )})`
    );

    const text = lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied leaderboard summary ✅");
    } catch {
      showToast("Copy failed (browser permissions) ⚠️");
    }
  };

  const printToPdf = () => {
    showToast("Opening print view…");
    window.print();
  };

  const metricLabel =
    rankBy === "views"
      ? "Views"
      : rankBy === "videos"
      ? "Videos"
      : rankBy === "vpp"
      ? "Views / Video"
      : "Eng / 1K Views";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(circle at top, rgba(223, 223, 223, 0.02) 0, rgba(2, 2, 2, 1) 45%)",
        display: "flex",
        overflowX: "hidden",
        overflowY: "auto",
        color: "#ffffffff",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "32px",
        paddingTop: "40px",
        paddingBottom: "40px",
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
            margin: 0 !important recognizes;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Watermark */}
      <div
        className="no-print"
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

      {/* Sidebar */}
      <div
        className="no-print"
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
            background: "rgba(0,0,0,0.80)",
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

              <NavBtn onClick={goDashV2} label="Dashboards" />
              <NavBtn onClick={goPayouts} label="Payouts" />
              <NavBtn onClick={goClippers} label="Clippers" />
              <NavBtn onClick={goPerformance} label="Performance" />

              {/* Active */}
              <button
                onClick={goLeaderboards}
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
                Leaderboards
              </button>

              <NavBtn onClick={goGallery} label="Gallery" /> 

              <NavBtn label="Settings" muted />

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
                Weekly competition board
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, position: "relative", zIndex: 3 }}>
        {/* Brand */}
        <div
          className="no-print"
          style={{
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
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
        <div
          className="no-print"
          style={{
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>
              Leaderboards
            </h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              Week of {formatDateLabel(placeholder.weekOf)} · Ranked by{" "}
              <span style={{ opacity: 0.95, fontWeight: 700 }}>{metricLabel}</span>
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={copySummary}
              style={topActionBtnStyle()}
              title="Copy a clean summary for Slack/email"
            >
              Copy summary
            </button>

            <button
              onClick={printToPdf}
              style={topActionBtnStyle()}
              title="Print / Save as PDF"
            >
              Print / Save PDF
            </button>

            <button
              disabled
              title="Wire later to your API (SendGrid/Mailgun) to email all clippers"
              style={disabledBtnStyle()}
            >
              Email blast (soon)
            </button>
          </div>
        </div>

        {/* Content (print area) */}
        <div ref={boardRef} className="print-area">
          {/* Filters */}
          <div
            className="no-print"
            style={{
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.25)",
              background: "rgba(0,0,0,0.45)",
              padding: 14,
              display: "flex",
              gap: 14,
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              marginBottom: 16,
              backdropFilter: "blur(10px)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.75)",
            }}
          >
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <FilterSelect
                label="Week of"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                options={[
                  { v: "2025-12-29", t: "Dec 29, 2025" },
                  { v: "2025-12-22", t: "Dec 22, 2025" },
                  { v: "2025-12-15", t: "Dec 15, 2025" },
                ]}
              />
              <FilterSelect
                label="Platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                options={[
                  { v: "all", t: "All" },
                  { v: "IG", t: "Instagram" },
                  { v: "TT", t: "TikTok" },
                  { v: "YT", t: "YouTube" },
                ]}
              />
              <FilterSelect
                label="Rank by"
                value={rankBy}
                onChange={(e) => setRankBy(e.target.value)}
                options={[
                  { v: "views", t: "Views generated" },
                  { v: "videos", t: "Videos posted" },
                  { v: "vpp", t: "Views per video" },
                  { v: "e1k", t: "Engagement per 1K views" },
                ]}
              />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Pill tone="blue">
                <span style={{ opacity: 0.8 }}>Views</span>
                <span style={{ fontWeight: 900 }}>{formatNumber(computed.totalViews)}</span>
              </Pill>
              <Pill tone="green">
                <span style={{ opacity: 0.8 }}>Likes</span>
                <span style={{ fontWeight: 900 }}>{formatNumber(computed.totalLikes)}</span>
              </Pill>
              <Pill tone="pink">
                <span style={{ opacity: 0.8 }}>Comments</span>
                <span style={{ fontWeight: 900 }}>{formatNumber(computed.totalComments)}</span>
              </Pill>
              <Pill tone="neutral">
                <span style={{ opacity: 0.8 }}>Videos</span>
                <span style={{ fontWeight: 900 }}>{formatNumber(computed.totalVideos)}</span>
              </Pill>
            </div>
          </div>

          {/* Podium (cleaner + tighter) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <PodiumCard place={2} person={computed.podium[1]} rankBy={rankBy} />
            <PodiumCard place={1} person={computed.podium[0]} rankBy={rankBy} isFirst />
            <PodiumCard place={3} person={computed.podium[2]} rankBy={rankBy} />
          </div>

          {/* Quick awards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <MiniCard
              title="Most views"
              tone="gold"
              main={computed.topViews?.name || "—"}
              sub={`${formatNumber(computed.topViews?.views)} views`}
            />
            <MiniCard
              title="Most videos posted"
              tone="blue"
              main={computed.mostVideos?.name || "—"}
              sub={`${formatNumber(computed.mostVideos?.videos)} videos`}
            />
            <MiniCard
              title="Best views per video"
              tone="silver"
              main={computed.bestVpp?.name || "—"}
              sub={`${formatNumber(Math.round(computed.bestVpp?.viewsPerVideo || 0))} avg views/video`}
            />
            <MiniCard
              title="Best engagement / 1K views"
              tone="green"
              main={computed.bestE1k?.name || "—"}
              sub={`${(computed.bestE1k?.engPer1k || 0).toFixed(1)} per 1K views`}
            />
          </div>

          {/* Main Leaderboard List (game-style rows) */}
          <div
            style={{
              borderRadius: 22,
              background:
                "radial-gradient(circle at top left, rgba(255,255,255,0.06), rgba(0,0,0,0.55) 55%)",
              padding: 16,
              border: "1px solid rgba(148,163,184,0.22)",
              boxShadow: "0 26px 70px rgba(0,0,0,0.85)",
              backdropFilter: "blur(10px)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.2 }}>
                  Full Rankings
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  Only metrics derived from views · likes · comments · videos · publish times
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Pill>
                  <span style={{ opacity: 0.75 }}>Rank metric:</span>
                  <span style={{ fontWeight: 900 }}>{metricLabel}</span>
                </Pill>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {/** Render podium as top rows too (optional); keeping only rest for a cleaner list */}
              {computed.podium
                .filter(Boolean)
                .map((r, idx) => (
                  <RankRow
                    key={r.id}
                    rank={idx + 1}
                    row={r}
                    metricValue={computed.metricAccessor(r)}
                    highlightTone={idx === 0 ? "gold" : idx === 1 ? "silver" : "bronze"}
                    isTop
                  />
                ))}

              {computed.rest.map((r, idx) => (
                <RankRow
                  key={r.id}
                  rank={idx + 4}
                  row={r}
                  metricValue={computed.metricAccessor(r)}
                />
              ))}
            </div>
          </div>

          {/* Share pack */}
          <div
            className="no-print"
            style={{
              marginTop: 16,
              borderRadius: 22,
              padding: 16,
              border: "1px solid rgba(148,163,184,0.22)",
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.75)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 900 }}>Share pack</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  Copy to clipboard or export PDF and send to clippers.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={copySummary} style={topActionBtnStyle()}>
                  Copy text
                </button>
                <button onClick={printToPdf} style={topActionBtnStyle()}>
                  Export PDF
                </button>
                <button disabled style={disabledBtnStyle()}>
                  Email blast (later)
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
              Later wiring idea: store clipper emails in BigQuery → backend builds a “weekly leaderboard”
              email and sends via SendGrid. (Also easy to attach the PDF generated server-side.)
            </div>
          </div>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}

/* ---------------- Components ---------------- */

function NavBtn({ onClick, label, muted }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        outline: "none",
        borderRadius: 12,
        padding: "7px 10px",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        fontSize: 12,
        background: "transparent",
        color: muted ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.7)",
        marginTop: 2,
      }}
    >
      {label}
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <select
        value={value}
        onChange={onChange}
        style={{
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(0,0,0,0.6)",
          color: "rgba(255,255,255,0.9)",
          minWidth: 170,
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.t}
          </option>
        ))}
      </select>
    </div>
  );
}

function PodiumCard({ place, person, rankBy, isFirst }) {
  const tone = place === 1 ? "gold" : place === 2 ? "silver" : "bronze";

  const bgGlow =
    place === 1
      ? "rgba(250,204,21,0.18)"
      : place === 2
      ? "rgba(226,232,240,0.14)"
      : "rgba(251,146,60,0.14)";

  const metricValue =
    rankBy === "views"
      ? formatNumber(person?.views)
      : rankBy === "videos"
      ? formatNumber(person?.videos)
      : rankBy === "vpp"
      ? formatNumber(Math.round(person?.viewsPerVideo || 0))
      : (person?.engPer1k || 0).toFixed(1);

  const metricLabel =
    rankBy === "views"
      ? "Views"
      : rankBy === "videos"
      ? "Videos"
      : rankBy === "vpp"
      ? "Views/Video"
      : "Eng/1K";

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 16,
        background: `radial-gradient(circle at top left, ${bgGlow}, rgba(15,23,42,0.95) 60%)`,
        border: "1px solid rgba(148,163,184,0.25)",
        boxShadow: isFirst
          ? "0 30px 100px rgba(0,0,0,0.85)"
          : "0 22px 70px rgba(0,0,0,0.78)",
        position: "relative",
        overflow: "hidden",
        transform: isFirst ? "translateY(-5px)" : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.08), transparent 45%)",
          opacity: isFirst ? 0.95 : 0.75,
        }}
      />

      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Medal place={place} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.12,
                  opacity: 0.7,
                }}
              >
                {place === 1 ? "Champion" : place === 2 ? "Runner-up" : "Third place"}
              </div>
              <div
                style={{
                  fontSize: isFirst ? 20 : 18,
                  fontWeight: 900,
                  letterSpacing: 0.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {person?.name || "—"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <Pill tone={tone}>
              <span style={{ opacity: 0.8 }}>{metricLabel}</span>
              <span style={{ fontWeight: 900 }}>{metricValue}</span>
            </Pill>
            <Stars rating={person?.rating || 0} />
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          <MiniStat label="Views" value={formatNumber(person?.views)} />
          <MiniStat label="Likes" value={formatNumber(person?.likes)} />
          <MiniStat label="Comments" value={formatNumber(person?.comments)} />
          <MiniStat label="Videos" value={formatNumber(person?.videos)} />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill>
            <span style={{ opacity: 0.75 }}>Avg views/video</span>
            <span style={{ fontWeight: 900 }}>
              {formatNumber(Math.round(person?.viewsPerVideo || 0))}
            </span>
          </Pill>
          <Pill>
            <span style={{ opacity: 0.75 }}>Eng/1K</span>
            <span style={{ fontWeight: 900 }}>
              {(person?.engPer1k || 0).toFixed(1)}
            </span>
          </Pill>
          <Pill>
            <span style={{ opacity: 0.75 }}>Cadence</span>
            <span style={{ fontWeight: 900 }}>
              {(person?.cadence || 0).toFixed(1)}/day
            </span>
          </Pill>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: "10px 10px",
        background: "rgba(0,0,0,0.28)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function RankRow({ rank, row, metricValue, isTop, highlightTone }) {
  const tone =
    highlightTone ||
    (rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "neutral");

  const medalEmoji =
    rank === 1 ? "🏆" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  const leftBadge = rank <= 3 ? (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Medal place={rank} />
      <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.85 }}>
        {medalEmoji ? medalEmoji : `#${rank}`}
      </div>
    </div>
  ) : (
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: 16,
        display: "grid",
        placeItems: "center",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        fontWeight: 900,
        color: "rgba(255,255,255,0.85)",
      }}
    >
      {rank}
    </div>
  );

  return (
    <div
      style={{
        borderRadius: 18,
        padding: "12px 12px",
        background: isTop
          ? "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(0,0,0,0.65))"
          : "rgba(15,23,42,0.92)",
        border: isTop
          ? "1px solid rgba(255,255,255,0.14)"
          : "1px solid rgba(148,163,184,0.30)",
        boxShadow: isTop
          ? "0 18px 45px rgba(0,0,0,0.82)"
          : "0 14px 30px rgba(15,23,42,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isTop && (
        <div
          style={{
            position: "absolute",
            inset: -2,
            background:
              tone === "gold"
                ? "radial-gradient(circle at top left, rgba(250,204,21,0.20), transparent 55%)"
                : tone === "silver"
                ? "radial-gradient(circle at top left, rgba(226,232,240,0.16), transparent 55%)"
                : tone === "bronze"
                ? "radial-gradient(circle at top left, rgba(251,146,60,0.16), transparent 55%)"
                : "radial-gradient(circle at top left, rgba(59,130,246,0.14), transparent 55%)",
            pointerEvents: "none",
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 260, position: "relative", zIndex: 2 }}>
        {leftBadge}
        <AvatarBadge name={row?.name} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: 0.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row?.name}
          </div>
          <div style={{ marginTop: 4, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Stars rating={row?.rating || 0} />
            <Pill tone={tone}>
              <span style={{ opacity: 0.78 }}>Score</span>
              <span style={{ fontWeight: 900 }}>
                {formatNumber(Math.round(row?.score || 0))}
              </span>
            </Pill>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", position: "relative", zIndex: 2 }}>
        <Pill tone="blue">
          <span style={{ opacity: 0.8 }}>Views</span>
          <span style={{ fontWeight: 900 }}>{formatNumber(row?.views)}</span>
        </Pill>
        <Pill tone="green">
          <span style={{ opacity: 0.8 }}>Likes</span>
          <span style={{ fontWeight: 900 }}>{formatNumber(row?.likes)}</span>
        </Pill>
        <Pill tone="pink">
          <span style={{ opacity: 0.8 }}>Comments</span>
          <span style={{ fontWeight: 900 }}>{formatNumber(row?.comments)}</span>
        </Pill>
        <Pill>
          <span style={{ opacity: 0.8 }}>Videos</span>
          <span style={{ fontWeight: 900 }}>{formatNumber(row?.videos)}</span>
        </Pill>
        <Pill>
          <span style={{ opacity: 0.8 }}>V/V</span>
          <span style={{ fontWeight: 900 }}>
            {formatNumber(Math.round(row?.viewsPerVideo || 0))}
          </span>
        </Pill>
        <Pill>
          <span style={{ opacity: 0.8 }}>Eng/1K</span>
          <span style={{ fontWeight: 900 }}>{(row?.engPer1k || 0).toFixed(1)}</span>
        </Pill>
      </div>
    </div>
  );
}

/* ---------------- Styles ---------------- */

function topActionBtnStyle() {
  return {
    borderRadius: 999,
    padding: "8px 12px",
    border: "1px solid rgba(148,163,184,0.45)",
    background: "rgba(0,0,0,0.55)",
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    cursor: "pointer",
    backdropFilter: "blur(8px)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.55)",
  };
}

function disabledBtnStyle() {
  return {
    borderRadius: 999,
    padding: "8px 12px",
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(0,0,0,0.35)",
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    cursor: "not-allowed",
  };
}
