// Leaderboards.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useBranding } from "./branding/BrandingContext";

const API_BASE_URL =
  "https://clipper-payouts-api-810712855216.us-central1.run.app";

/**
 * Leaderboards (wired to real API)
 * - NO AI-derived analysis text (only metrics you can compute from: videos posted, publish times, views, likes, comments)
 * - Podium + ranked list
 * - Actions: Copy summary, Print/Save PDF (browser print)
 */

// ---------------- Helpers ----------------

const unwrapValue = (v) => {
  // BigQuery sometimes returns { value: '...' }
  if (v && typeof v === "object" && "value" in v) return v.value;
  return v;
};

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

// Fallback so UI never looks empty if API is down
const FALLBACK_ROWS = [
  {
    id: "c1",
    name: "Stevewilldoitbruh",
    views: 43204992,
    likes: 1239400,
    comments: 84500,
    videos: 104,
    firstPublishedAt: "2025-12-23T08:15:00Z",
    lastPublishedAt: "2025-12-29T23:30:00Z",
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
  },
];

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
        boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
        backdropFilter: "blur(10px)",
      }}
    >
      {children}
    </span>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.75 }}>{label}</span>
      <select
        value={value}
        onChange={onChange}
        style={{
          borderRadius: 999,
          padding: "8px 12px",
          border: "1px solid rgba(148,163,184,0.35)",
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.92)",
          outline: "none",
          fontSize: 12,
          boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
          backdropFilter: "blur(8px)",
        }}
      >
        {(options || []).map((o) => (
          <option key={o.v} value={o.v} style={{ background: "#0b1220" }}>
            {o.t}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stars({ rating = 0 }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = Math.max(0, 5 - full - half);

  const star = "★";
  const halfStar = "⯨";
  const emptyStar = "☆";

  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {Array.from({ length: full }).map((_, i) => (
        <span
          key={`f${i}`}
          style={{ fontSize: 12, color: "rgba(250,204,21,0.95)" }}
        >
          {star}
        </span>
      ))}
      {half === 1 && (
        <span
          style={{
            fontSize: 12,
            color: "rgba(250,204,21,0.95)",
            opacity: 0.55,
          }}
        >
          {halfStar}
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <span
          key={`e${i}`}
          style={{ fontSize: 12, color: "rgba(148,163,184,0.55)" }}
        >
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
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.08,
          opacity: 0.78,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 8,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Pill tone={tone}>
          <span style={{ fontWeight: 900 }}>{main}</span>
        </Pill>
        <span style={{ fontSize: 12, opacity: 0.75 }}>{sub}</span>
      </div>
    </div>
  );
}

// ---------------- Main ----------------

export default function Leaderboards() {
  const navigate = useNavigate();
  const boardRef = useRef(null);

  // BRANDING
  const { headingText, watermarkText, defaults } = useBranding();
  const brandText = headingText || defaults.headingText;
  const wmText = watermarkText || defaults.watermarkText;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState("");

  // Filters
  const [week, setWeek] = useState(""); // YYYY-MM-DD
  const [platform, setPlatform] = useState("all"); // all|instagram|tiktok|youtube
  const [rankBy, setRankBy] = useState("views"); // views | videos | vpp | e1k

  // Data
  const [weeks, setWeeks] = useState([]); // options for dropdown
  const [rows, setRows] = useState(FALLBACK_ROWS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 1800);
  };

  const normalizeRows = (input) => {
    const arr = Array.isArray(input) ? input : [];
    return arr.map((r, i) => {
      const id =
        unwrapValue(r.id) ||
        unwrapValue(r.clipper_id) ||
        unwrapValue(r.CLIPPER_ID) ||
        `row_${i}`;

      const name =
        unwrapValue(r.name) ||
        unwrapValue(r.clipper_name) ||
        unwrapValue(r.NAME) ||
        `Clipper ${i + 1}`;

      const views =
        Number(
          unwrapValue(r.views) ??
            unwrapValue(r.weekly_views) ??
            unwrapValue(r.weekly_views_generated) ??
            unwrapValue(r.WEEKLY_VIEWS) ??
            0
        ) || 0;

      const likes =
        Number(
          unwrapValue(r.likes) ??
            unwrapValue(r.weekly_likes) ??
            unwrapValue(r.WEEKLY_LIKES) ??
            0
        ) || 0;

      const comments =
        Number(
          unwrapValue(r.comments) ??
            unwrapValue(r.weekly_comments) ??
            unwrapValue(r.WEEKLY_COMMENTS) ??
            0
        ) || 0;

      const videos =
        Number(
          unwrapValue(r.videos) ??
            unwrapValue(r.videos_posted) ??
            unwrapValue(r.VIDEOS_POSTED) ??
            0
        ) || 0;

      const firstPublishedAt =
        unwrapValue(r.first_published_at) ||
        unwrapValue(r.firstPublishedAt) ||
        unwrapValue(r.first_published_ts) ||
        null;

      const lastPublishedAt =
        unwrapValue(r.last_published_at) ||
        unwrapValue(r.lastPublishedAt) ||
        unwrapValue(r.last_published_ts) ||
        null;

      const rowPlatform =
        String(
          unwrapValue(r.platform) ||
            unwrapValue(r.PLATFORM) ||
            unwrapValue(r.platform_name) ||
            ""
        )
          .trim()
          .toLowerCase() || null;

      return {
        id,
        name,
        views,
        likes,
        comments,
        videos,
        firstPublishedAt,
        lastPublishedAt,
        platform: rowPlatform,
      };
    });
  };

  // Fetch leaderboards (assumes your endpoint supports these params)
  const fetchLeaderboards = async (opts = {}) => {
    const clientId = "default";

    setLoading(true);
    setError("");

    try {
      const qs = new URLSearchParams();
      qs.set("clientId", clientId);

      if (opts.weekOf) qs.set("weekOf", opts.weekOf);
      if (opts.platform) qs.set("platform", opts.platform);
      if (opts.rankBy) qs.set("rankBy", opts.rankBy);

      const res = await fetch(`${API_BASE_URL}/leaderboards?${qs.toString()}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Leaderboards API ${res.status}`);
      }

      const json = await res.json();

      // Accept either:
      // 1) { weeks, weekOf, rows }
      // 2) array of rows
      const apiRows = Array.isArray(json) ? json : json?.rows || json?.data || [];
      const apiWeeks = Array.isArray(json?.weeks)
        ? json.weeks
        : Array.isArray(json?.availableWeeks)
        ? json.availableWeeks
        : [];

      const apiWeekOf =
        unwrapValue(json?.weekOf) ||
        unwrapValue(json?.week_of) ||
        unwrapValue(json?.week) ||
        opts.weekOf ||
        "";

      const normalized = normalizeRows(apiRows);

      if (normalized.length) setRows(normalized);

      // weeks dropdown
      const normalizedWeeks = (apiWeeks || [])
        .map((x) => String(unwrapValue(x) || "").slice(0, 10))
        .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));

      if (normalizedWeeks.length) {
        // sort DESC
        normalizedWeeks.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
        setWeeks(normalizedWeeks);

        // if week not set, default to the newest (or API weekOf)
        if (!opts.weekOf && !week) {
          setWeek(apiWeekOf || normalizedWeeks[0]);
        }
      } else {
        // if no weeks returned, at least keep current selected week if valid
        if (opts.weekOf && !weeks.includes(opts.weekOf)) {
          setWeeks((prev) => {
            const next = [...new Set([opts.weekOf, ...prev])].filter(Boolean);
            next.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
            return next;
          });
        }
      }

      // if API tells you which week it used and ours is empty, adopt it
      if (!week && apiWeekOf) setWeek(apiWeekOf);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to load leaderboards");
      // keep fallback rows visible
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLeaderboards({ weekOf: week, platform, rankBy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filters change (but don't spam on first week initialization)
  const lastKeyRef = useRef("");
  useEffect(() => {
    const key = `${week}|${platform}|${rankBy}`;
    if (!week) return; // wait until week known
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    fetchLeaderboards({ weekOf: week, platform, rankBy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, platform, rankBy]);

  // Derived computations (allowed)
  const computed = useMemo(() => {
    const base = (rows || []).map((r) => {
      const views = Number(r.views || 0);
      const likes = Number(r.likes || 0);
      const comments = Number(r.comments || 0);
      const videosRaw = Number(r.videos || 0);
      const videos = Math.max(1, videosRaw);

      const viewsPerVideo = views / videos;
      const engPer1k = views > 0 ? ((likes + comments) / views) * 1000 : 0;
      const cadence = videosRaw / 7;

      const score = views * 1.0 + likes * 15 + comments * 60 + cadence * 25000;

      return {
        ...r,
        viewsPerVideo,
        engPer1k,
        cadence,
        score,
      };
    });

    // If API returns per-platform rows, filter client-side too
    const filtered =
      platform !== "all" && base.some((x) => x.platform)
        ? base.filter((x) => (x.platform || "").toLowerCase() === platform)
        : base;

    const metricAccessor = (row) => {
      if (rankBy === "videos") return Number(row.videos || 0);
      if (rankBy === "vpp") return Number(row.viewsPerVideo || 0);
      if (rankBy === "e1k") return Number(row.engPer1k || 0);
      return Number(row.views || 0);
    };

    const values = filtered.map(metricAccessor);
    const minV = values.length ? Math.min(...values) : 0;
    const maxV = values.length ? Math.max(...values) : 1;
    const range = Math.max(1e-9, maxV - minV);

    const rowsWithRating = filtered.map((r) => {
      const v = metricAccessor(r);
      const t = (v - minV) / range;
      const rating = 1 + t * 4;
      return { ...r, rating };
    });

    const sorted = [...rowsWithRating].sort(
      (a, b) => metricAccessor(b) - metricAccessor(a)
    );

    const podium = sorted.slice(0, 3);
    const rest = sorted.slice(3);

    const totalViews = rowsWithRating.reduce(
      (s, r) => s + Number(r.views || 0),
      0
    );
    const totalVideos = rowsWithRating.reduce(
      (s, r) => s + Number(r.videos || 0),
      0
    );
    const totalLikes = rowsWithRating.reduce(
      (s, r) => s + Number(r.likes || 0),
      0
    );
    const totalComments = rowsWithRating.reduce(
      (s, r) => s + Number(r.comments || 0),
      0
    );

    const topViews = [...rowsWithRating].sort((a, b) => b.views - a.views)[0];
    const mostVideos = [...rowsWithRating].sort((a, b) => b.videos - a.videos)[0];
    const bestVpp = [...rowsWithRating].sort(
      (a, b) => b.viewsPerVideo - a.viewsPerVideo
    )[0];
    const bestE1k = [...rowsWithRating].sort((a, b) => b.engPer1k - a.engPer1k)[0];

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
  }, [rows, platform, rankBy]);

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
  const goSettings = () => navigate("/settings");
  const goContentApproval = () => navigate("/content-approval");

  const copySummary = async () => {
    const weekLabel = week ? formatDateLabel(week) : "—";
    const platLabel = platform === "all" ? "All Platforms" : platform;

    const metricLabel =
      rankBy === "views"
        ? "Views"
        : rankBy === "videos"
        ? "Videos"
        : rankBy === "vpp"
        ? "Views / Video"
        : "Eng / 1K Views";

    const title = `🏆 Weekly Leaderboard — Week of ${weekLabel} (${platLabel}) — Ranked by ${metricLabel}`;

    const lines = [title, ""];
    (computed.podium || []).forEach((p, idx) => {
      if (!p) return;
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
      `Best views/video: ${computed.bestVpp?.name || "—"} (${formatNumber(
        Math.round(computed.bestVpp?.viewsPerVideo || 0)
      )})`
    );
    lines.push(
      `Best engagement/1K views: ${computed.bestE1k?.name || "—"} (${(
        computed.bestE1k?.engPer1k || 0
      ).toFixed(1)})`
    );
    lines.push(
      `Most videos: ${computed.mostVideos?.name || "—"} (${formatNumber(
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

  // Dropdown options
  const weekOptions =
    weeks.length > 0
      ? weeks.map((w) => ({ v: w, t: formatDateLabel(w) }))
      : week
      ? [{ v: week, t: formatDateLabel(week) }]
      : [{ v: "2025-12-29", t: "Dec 29, 2025" }];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "radial-gradient(circle at top, #141414 0, #020202 55%)",
        color: "#fff",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* WATERMARK */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          display: "grid",
          placeItems: "center",
          zIndex: 0,
          opacity: 0.08,
          transform: "rotate(-18deg)",
          fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
          fontSize: 120,
          letterSpacing: 2,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          color: "rgba(255,255,255,0.20)",
          textShadow: "0 0 60px rgba(0,0,0,0.55)",
        }}
      >
        {wmText}
      </div>

      {/* Soft glow */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.13), rgba(255,255,255,0.00) 38%), radial-gradient(circle at 10% 10%, rgba(96,165,250,0.12), rgba(0,0,0,0) 40%), radial-gradient(circle at 90% 15%, rgba(250,204,21,0.10), rgba(0,0,0,0) 45%)",
        }}
      />

      <Toast message={toast} />

      {/* Layout */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          padding: 18,
          gap: 18,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Sidebar */}
        <div
          className="no-print"
          style={{
            width: sidebarOpen ? 220 : 56,
            transition: "width 180ms ease",
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.75)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: sidebarOpen ? "space-between" : "center",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {sidebarOpen && (
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 700 }}>
                NAVIGATION
              </div>
            )}
            <button
              onClick={() => setSidebarOpen((s) => !s)}
              style={{
                border: "none",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.9)",
                cursor: "pointer",
                borderRadius: 12,
                padding: "8px 10px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
              }}
              title="Toggle"
            >
              {sidebarOpen ? "◀" : "▶"}
            </button>
          </div>

          <div style={{ padding: 10, display: "grid", gap: 8 }}>
            {sidebarOpen ? (
              <>
                <NavBtn onClick={goDashV2} label="Dashboards" />
                <NavBtn onClick={goContentApproval} label="Review Content" />
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
                    background:
                      "linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))",
                    color: "#020617",
                    fontWeight: 800,
                    marginTop: 2,
                    marginBottom: 2,
                  }}
                >
                  Leaderboards
                </button>

                <NavBtn onClick={goGallery} label="Gallery" />
                <NavBtn onClick={goSettings} label="Settings" />

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
            ) : (
              <>
                <IconBtn onClick={goDashV2} emoji="📊" />
                <IconBtn onClick={goContentApproval} emoji="✅" />
                <IconBtn onClick={goPayouts} emoji="💸" />
                <IconBtn onClick={goClippers} emoji="👥" />
                <IconBtn onClick={goPerformance} emoji="⚡" />
                <IconBtn onClick={goLeaderboards} emoji="🏆" />
                <IconBtn onClick={goGallery} emoji="🖼️" />
                <IconBtn onClick={goSettings} emoji="⚙️" />
                <div style={{ flexGrow: 1 }} />
                <IconBtn onClick={handleLogout} emoji="⏻" />
              </>
            )}
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, position: "relative", zIndex: 3, overflow: "auto" }}>
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
              {brandText}
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
              <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>
                Leaderboards
              </h1>
              <span style={{ fontSize: 13, opacity: 0.7 }}>
                Week of {week ? formatDateLabel(week) : "—"} · Ranked by{" "}
                <span style={{ opacity: 0.95, fontWeight: 700 }}>
                  {metricLabel}
                </span>
                {loading ? (
                  <span style={{ marginLeft: 10, opacity: 0.65 }}>
                    · loading…
                  </span>
                ) : null}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
                onClick={() => showToast("Email blast wiring comes next 👀")}
                style={disabledBtnStyle()}
                title="Wire this after we add email addresses"
              >
                Email blast (soon)
              </button>
            </div>
          </div>

          {!!error && (
            <div
              className="no-print"
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(248,113,113,0.35)",
                background: "rgba(248,113,113,0.10)",
                color: "rgba(255,255,255,0.92)",
                boxShadow: "0 18px 45px rgba(0,0,0,0.55)",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 4 }}>API Error</div>
              <div style={{ opacity: 0.85, fontSize: 13 }}>{error}</div>
              <div style={{ opacity: 0.6, fontSize: 12, marginTop: 6 }}>
                (Keeping fallback data visible so the page still looks good.)
              </div>
            </div>
          )}

          {/* Content (print area) */}
          <div ref={boardRef} className="print-area" style={{ paddingBottom: 40 }}>
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
                  value={week || (weekOptions[0]?.v || "")}
                  onChange={(e) => setWeek(e.target.value)}
                  options={weekOptions}
                />
                <FilterSelect
                  label="Platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  options={[
                    { v: "all", t: "All" },
                    { v: "instagram", t: "Instagram" },
                    { v: "tiktok", t: "TikTok" },
                    { v: "youtube", t: "YouTube" },
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
                  <span style={{ fontWeight: 900 }}>
                    {formatNumber(computed.totalViews)}
                  </span>
                </Pill>
                <Pill tone="green">
                  <span style={{ opacity: 0.8 }}>Likes</span>
                  <span style={{ fontWeight: 900 }}>
                    {formatNumber(computed.totalLikes)}
                  </span>
                </Pill>
                <Pill tone="pink">
                  <span style={{ opacity: 0.8 }}>Comments</span>
                  <span style={{ fontWeight: 900 }}>
                    {formatNumber(computed.totalComments)}
                  </span>
                </Pill>
                <Pill tone="neutral">
                  <span style={{ opacity: 0.8 }}>Videos</span>
                  <span style={{ fontWeight: 900 }}>
                    {formatNumber(computed.totalVideos)}
                  </span>
                </Pill>
              </div>
            </div>

            {/* Podium */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <PodiumCard place={2} person={computed.podium[1]} rankBy={rankBy} />
              <PodiumCard
                place={1}
                person={computed.podium[0]}
                rankBy={rankBy}
                isFirst
              />
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
                main={computed.topViews?.name || "—"}
                sub={`${formatNumber(computed.topViews?.views || 0)} views`}
                tone="gold"
              />
              <MiniCard
                title="Most videos posted"
                main={computed.mostVideos?.name || "—"}
                sub={`${formatNumber(computed.mostVideos?.videos || 0)} videos`}
                tone="blue"
              />
              <MiniCard
                title="Best views per video"
                main={computed.bestVpp?.name || "—"}
                sub={`${formatNumber(Math.round(computed.bestVpp?.viewsPerVideo || 0))} avg views/video`}
                tone="silver"
              />
              <MiniCard
                title="Best engagement / 1K views"
                main={computed.bestE1k?.name || "—"}
                sub={`${(computed.bestE1k?.engPer1k || 0).toFixed(1)} per 1K views`}
                tone="green"
              />
            </div>

            {/* Full Rankings */}
            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.22)",
                background: "rgba(0,0,0,0.45)",
                padding: 16,
                backdropFilter: "blur(10px)",
                boxShadow: "0 18px 55px rgba(0,0,0,0.78)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Full Rankings</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 3 }}>
                    Only metrics derived from views · likes · comments · videos · publish times
                  </div>
                </div>

                <div style={{ alignSelf: "center" }}>
                  <Pill tone="neutral">
                    <span style={{ opacity: 0.8 }}>Rank metric:</span>
                    <span style={{ fontWeight: 900 }}>{metricLabel}</span>
                  </Pill>
                </div>
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {(computed.rows || []).map((r, idx) => (
                  <RankRow
                    key={r.id || `${r.name}_${idx}`}
                    idx={idx}
                    row={r}
                    highlight={idx < 3}
                    rankBy={rankBy}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { padding: 0 !important; }
          body { background: #000 !important; }
        }
      `}</style>
    </div>
  );
}

// ---------------- Components ----------------

function NavBtn({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        outline: "none",
        borderRadius: 12,
        padding: "8px 10px",
        textAlign: "left",
        cursor: "pointer",
        fontSize: 13,
        background: "rgba(248,250,252,0.06)",
        color: "rgba(255,255,255,0.85)",
        fontWeight: 650,
        boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
      }}
    >
      {label}
    </button>
  );
}

function IconBtn({ onClick, emoji }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "none",
        outline: "none",
        borderRadius: 12,
        padding: "10px 10px",
        cursor: "pointer",
        background: "rgba(248,250,252,0.06)",
        color: "rgba(255,255,255,0.9)",
        boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
      }}
      title="Navigate"
    >
      <span style={{ fontSize: 14 }}>{emoji}</span>
    </button>
  );
}

function medalTone(place) {
  if (place === 1) return "gold";
  if (place === 2) return "silver";
  return "bronze";
}

function PodiumCard({ place, person, rankBy, isFirst = false }) {
  const p = person || {
    name: "—",
    views: 0,
    likes: 0,
    comments: 0,
    videos: 0,
    viewsPerVideo: 0,
    engPer1k: 0,
    cadence: 0,
    rating: 0,
  };

  const tone = medalTone(place);

  const title =
    place === 1 ? "CHAMPION" : place === 2 ? "RUNNER-UP" : "THIRD PLACE";

  const badgeBg =
    place === 1
      ? "linear-gradient(135deg, rgba(250,204,21,0.95), rgba(249,115,22,0.75))"
      : place === 2
      ? "linear-gradient(135deg, rgba(226,232,240,0.95), rgba(148,163,184,0.55))"
      : "linear-gradient(135deg, rgba(251,146,60,0.90), rgba(120,53,15,0.55))";

  const metricLabel =
    rankBy === "views"
      ? "Views"
      : rankBy === "videos"
      ? "Videos"
      : rankBy === "vpp"
      ? "V/V"
      : "Eng/1K";

  const metricValue =
    rankBy === "videos"
      ? formatNumber(p.videos)
      : rankBy === "vpp"
      ? formatNumber(Math.round(p.viewsPerVideo || 0))
      : rankBy === "e1k"
      ? (p.engPer1k || 0).toFixed(1)
      : formatNumber(p.views);

  return (
    <div
      style={{
        borderRadius: 22,
        border: "1px solid rgba(148,163,184,0.24)",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.07), rgba(0,0,0,0.62) 62%)",
        boxShadow: isFirst
          ? "0 28px 80px rgba(0,0,0,0.90)"
          : "0 18px 55px rgba(0,0,0,0.80)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              color: "#071018",
              background: badgeBg,
              boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
            }}
          >
            {place}
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.75, letterSpacing: 0.08 }}>
              {title}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
              {p.name}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <Pill tone={tone}>
            <span style={{ opacity: 0.85 }}>{metricLabel}</span>
            <span style={{ fontWeight: 900 }}>{metricValue}</span>
          </Pill>
          <div style={{ marginTop: 6 }}>
            <Stars rating={clamp(p.rating || 0, 0, 5)} />
          </div>
        </div>
      </div>

      <div style={{ padding: 14, paddingTop: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <StatBox label="Views" value={formatNumber(p.views)} />
          <StatBox label="Likes" value={formatNumber(p.likes)} />
          <StatBox label="Comments" value={formatNumber(p.comments)} />
          <StatBox label="Videos" value={formatNumber(p.videos)} />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill tone="neutral">
            <span style={{ opacity: 0.8 }}>Avg views/video</span>
            <span style={{ fontWeight: 900 }}>
              {formatNumber(Math.round(p.viewsPerVideo || 0))}
            </span>
          </Pill>
          <Pill tone="neutral">
            <span style={{ opacity: 0.8 }}>Eng/1K</span>
            <span style={{ fontWeight: 900 }}>
              {(p.engPer1k || 0).toFixed(1)}
            </span>
          </Pill>
          <Pill tone="neutral">
            <span style={{ opacity: 0.8 }}>Cadence</span>
            <span style={{ fontWeight: 900 }}>
              {(p.cadence || 0).toFixed(1)}/day
            </span>
          </Pill>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 14px 35px rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function RankRow({ idx, row, highlight = false, rankBy }) {
  const place = idx + 1;

  const badgeTone =
    place === 1 ? "gold" : place === 2 ? "silver" : place === 3 ? "bronze" : "neutral";

  const metricLabel =
    rankBy === "views"
      ? "Views"
      : rankBy === "videos"
      ? "Videos"
      : rankBy === "vpp"
      ? "V/V"
      : "Eng/1K";

  const metricVal =
    rankBy === "videos"
      ? Number(row?.videos || 0)
      : rankBy === "vpp"
      ? Number(row?.viewsPerVideo || 0)
      : rankBy === "e1k"
      ? Number(row?.engPer1k || 0)
      : Number(row?.views || 0);

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(148,163,184,0.18)",
        background: highlight
          ? "linear-gradient(90deg, rgba(250,204,21,0.10), rgba(0,0,0,0.50) 40%)"
          : "rgba(0,0,0,0.35)",
        boxShadow: "0 18px 55px rgba(0,0,0,0.70)",
        padding: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 260 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Pill tone={badgeTone}>
            <span style={{ fontWeight: 900 }}>{place}</span>
          </Pill>
          <AvatarBadge name={row?.name} />
        </div>

        <div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{row?.name}</div>
          <div style={{ marginTop: 6 }}>
            <Stars rating={clamp(row?.rating || 0, 0, 5)} />
          </div>
        </div>

        <Pill tone="gold">
          <span style={{ opacity: 0.85 }}>Score</span>
          <span style={{ fontWeight: 900 }}>{formatNumber(Math.round(row?.score || 0))}</span>
        </Pill>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
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
        <Pill tone="neutral">
          <span style={{ opacity: 0.8 }}>Videos</span>
          <span style={{ fontWeight: 900 }}>{formatNumber(row?.videos)}</span>
        </Pill>

        <Pill tone="neutral">
          <span style={{ opacity: 0.8 }}>V/V</span>
          <span style={{ fontWeight: 900 }}>
            {formatNumber(Math.round(row?.viewsPerVideo || 0))}
          </span>
        </Pill>
        <Pill tone="neutral">
          <span style={{ opacity: 0.8 }}>Eng/1K</span>
          <span style={{ fontWeight: 900 }}>{(row?.engPer1k || 0).toFixed(1)}</span>
        </Pill>

        <Pill tone="neutral">
          <span style={{ opacity: 0.8 }}>{metricLabel}</span>
          <span style={{ fontWeight: 900 }}>
            {rankBy === "e1k"
              ? (metricVal || 0).toFixed(1)
              : rankBy === "vpp"
              ? formatNumber(Math.round(metricVal || 0))
              : formatNumber(metricVal)}
          </span>
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
