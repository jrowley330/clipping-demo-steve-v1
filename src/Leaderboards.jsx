// Leaderboards.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import { useBranding } from "./branding/BrandingContext";

const API_BASE_URL =
  "https://clipper-payouts-api-810712855216.us-central1.run.app";

/**
 * Leaderboards (revamped)
 * - NO AI-derived analysis text (only derived from views/likes/comments/videos/publish times)
 * - Export PDF (browser print)
 * - “Email blast” (wire later)
 */

const formatNumber = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US");
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function safePct(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return x;
}

function Stars({ rating }) {
  const r = Math.max(0, Math.min(5, Number(rating || 0)));
  const full = Math.floor(r);
  const half = r - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;

  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} style={{ opacity: 0.95 }}>
          ★
        </span>
      ))}
      {half ? <span style={{ opacity: 0.75 }}>★</span> : null}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} style={{ opacity: 0.25 }}>
          ★
        </span>
      ))}
    </span>
  );
}

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
      ? { bg: "rgba(250,204,21,0.14)", bd: "rgba(250,204,21,0.45)", tx: "rgba(250,204,21,0.98)" }
      : place === 2
      ? { bg: "rgba(226,232,240,0.14)", bd: "rgba(226,232,240,0.40)", tx: "rgba(226,232,240,0.98)" }
      : { bg: "rgba(251,146,60,0.14)", bd: "rgba(251,146,60,0.40)", tx: "rgba(251,146,60,0.98)" };

  const emoji = place === 1 ? "🏆" : place === 2 ? "🥈" : "🥉";

  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: cfg.bg,
        border: `1px solid ${cfg.bd}`,
        color: cfg.tx,
        boxShadow: "0 12px 30px rgba(0,0,0,0.55)",
        fontSize: 16,
      }}
      title={place === 1 ? "Champion" : place === 2 ? "Runner-up" : "Third place"}
    >
      {emoji}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, disabled }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(0,0,0,0.6)",
          color: "rgba(255,255,255,0.9)",
          minWidth: 170,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
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
  const metricLabel =
    rankBy === "videos"
      ? "Videos"
      : rankBy === "vpp"
      ? "V/V"
      : rankBy === "e1k"
      ? "Eng/1K"
      : "Views";

  const metricValue =
    rankBy === "videos"
      ? formatNumber(person?.videos)
      : rankBy === "vpp"
      ? formatNumber(Math.round(person?.viewsPerVideo || 0))
      : rankBy === "e1k"
      ? (person?.engPer1k || 0).toFixed(1)
      : formatNumber(person?.views);

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 14,
        background: "rgba(0,0,0,0.45)",
        border: "1px solid rgba(148,163,184,0.25)",
        boxShadow: isFirst ? "0 26px 70px rgba(0,0,0,0.9)" : "0 18px 55px rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -60,
          background:
            place === 1
              ? "radial-gradient(circle at top, rgba(250,204,21,0.20), rgba(0,0,0,0) 55%)"
              : place === 2
              ? "radial-gradient(circle at top, rgba(226,232,240,0.18), rgba(0,0,0,0) 55%)"
              : "radial-gradient(circle at top, rgba(251,146,60,0.18), rgba(0,0,0,0) 55%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Medal place={place} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 3 }}>
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
            <span style={{ fontWeight: 900 }}>{formatNumber(Math.round(person?.viewsPerVideo || 0))}</span>
          </Pill>
          <Pill>
            <span style={{ opacity: 0.75 }}>Eng/1K</span>
            <span style={{ fontWeight: 900 }}>{(person?.engPer1k || 0).toFixed(1)}</span>
          </Pill>
          <Pill>
            <span style={{ opacity: 0.75 }}>Cadence</span>
            <span style={{ fontWeight: 900 }}>{(person?.cadence || 0).toFixed(1)}/day</span>
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

  const medalEmoji = rank === 1 ? "🏆" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  const leftBadge =
    rank <= 3 ? (
      <Pill tone={tone}>
        <span style={{ fontWeight: 900 }}>{rank}</span>
        <span style={{ opacity: 0.8 }}>{medalEmoji}</span>
      </Pill>
    ) : (
      <Pill>
        <span style={{ fontWeight: 900 }}>#{rank}</span>
      </Pill>
    );

  return (
    <div
      style={{
        borderRadius: 18,
        padding: "12px 12px",
        border: "1px solid rgba(148,163,184,0.18)",
        background: isTop ? "rgba(0,0,0,0.50)" : "rgba(0,0,0,0.35)",
        backdropFilter: "blur(8px)",
        boxShadow: isTop ? "0 18px 55px rgba(0,0,0,0.75)" : "0 10px 28px rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {leftBadge}

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {row?.name}
          </div>
          <div style={{ marginTop: 4, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Stars rating={row?.rating || 0} />
            <Pill tone={tone}>
              <span style={{ opacity: 0.78 }}>Score</span>
              <span style={{ fontWeight: 900 }}>{formatNumber(Math.round(row?.score || 0))}</span>
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
          <span style={{ fontWeight: 900 }}>{formatNumber(Math.round(row?.viewsPerVideo || 0))}</span>
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

/* ---------------- Main ---------------- */

export default function Leaderboards() {
  const navigate = useNavigate();
  const boardRef = useRef(null);

  //BRANDING
  const { headingText, watermarkText, defaults } = useBranding();
  const brandText = headingText || defaults.headingText;
  const wmText = watermarkText || defaults.watermarkText;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState("");

  // Filters
  // week = weekEnd (YYYY-MM-DD). If empty, backend returns latest available week.
  const [week, setWeek] = useState("");
  const [platform, setPlatform] = useState("all"); // all | instagram | tiktok | youtube
  const [rankBy, setRankBy] = useState("views"); // views | videos | vpp | e1k

  // Data
  const [rowsApi, setRowsApi] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  // -------------------------------------------------------
  // FETCH LEADERBOARDS FROM API (no placeholder/mock)
  // -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const fetchLeaderboards = async () => {
      try {
        setDataLoading(true);
        setDataError("");

        const params = new URLSearchParams();
        params.set("clientId", "default");
        params.set("platform", platform);
        params.set("rankBy", rankBy);
        params.set("limit", "50");
        if (week) params.set("weekEnd", week);

        const res = await fetch(`${API_BASE_URL}/leaderboards?${params.toString()}`);
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `Leaderboards API ${res.status}`);
        }

        const data = await res.json();

        const normalized = (Array.isArray(data?.rows) ? data.rows : []).map((r, i) => ({
          id: r.clipper_id ?? `clipper_${i}`,
          name: r.clipper_name ?? `Clipper ${i + 1}`,
          views: Number(r.views_generated || 0),
          likes: Number(r.likes_generated || 0),
          comments: Number(r.comments_generated || 0),
          videos: Number(r.videos_posted || 0),
          // already-derived in SQL (still okay to use)
          viewsPerVideo: Number(r.avg_views_per_video || 0),
          engPer1k: Number(r.eng_per_1k_views || 0),
          cadence: Number(r.cadence_per_day || 0),
        }));

        if (cancelled) return;

        setRowsApi(normalized);

        // If week wasn't chosen, lock UI to the returned weekEnd (latest available).
        const returnedWeek = data?.weekEnd?.value ?? data?.weekEnd ?? null;
        if (!week && returnedWeek) setWeek(String(returnedWeek));
      } catch (e) {
        if (!cancelled) setDataError(e?.message || "Failed to load leaderboards");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };

    fetchLeaderboards();

    return () => {
      cancelled = true;
    };
  }, [platform, rankBy, week]);

  const computed = useMemo(() => {
    const rows = rowsApi.map((r) => {
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
      const score = views * 1.0 + likes * 15 + comments * 60 + cadence * 25000;

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
    const minV = values.length ? Math.min(...values) : 0;
    const maxV = values.length ? Math.max(...values) : 0;
    const range = Math.max(1e-9, maxV - minV);

    const rowsWithRating = rows.map((r) => {
      const v = metricAccessor(r);
      const t = (v - minV) / range; // 0..1
      const rating = 1 + t * 4; // 1..5
      return { ...r, rating };
    });

    const sorted = [...rowsWithRating].sort((a, b) => metricAccessor(b) - metricAccessor(a));

    // Podium + rest
    const podium = [sorted[0], sorted[1], sorted[2]];
    const rest = sorted.slice(3);

    // Totals + best-of
    const totalViews = rows.reduce((s, r) => s + (Number(r.views) || 0), 0);
    const totalLikes = rows.reduce((s, r) => s + (Number(r.likes) || 0), 0);
    const totalComments = rows.reduce((s, r) => s + (Number(r.comments) || 0), 0);
    const totalVideos = rows.reduce((s, r) => s + (Number(r.videos) || 0), 0);

    const bestVpp = sorted[0]?.viewsPerVideo ? Math.max(...rows.map((r) => r.viewsPerVideo || 0)) : 0;
    const bestE1k = sorted[0]?.engPer1k ? Math.max(...rows.map((r) => r.engPer1k || 0)) : 0;

    return {
      sorted,
      podium,
      rest,
      totalViews,
      totalLikes,
      totalComments,
      totalVideos,
      bestVpp,
      bestE1k,
      metricAccessor,
    };
  }, [rowsApi, rankBy]);

  const metricLabel =
    rankBy === "videos"
      ? "Videos posted"
      : rankBy === "vpp"
      ? "Views per video"
      : rankBy === "e1k"
      ? "Engagement per 1K views"
      : "Views generated";

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  };

  const printToPdf = () => {
    window.print();
  };

  const copySummary = async () => {
    const platformLabel =
      platform === "all"
        ? "All Platforms"
        : platform === "instagram"
        ? "Instagram"
        : platform === "tiktok"
        ? "TikTok"
        : "YouTube";

    const lines = [];
    lines.push(`Leaderboard — Week of ${formatDateLabel(week)} (${platformLabel})`);
    lines.push(`Ranked by: ${metricLabel}`);
    lines.push("");

    computed.sorted.slice(0, 10).forEach((r, i) => {
      lines.push(
        `${i + 1}. ${r.name} — Views: ${formatNumber(r.views)} · Likes: ${formatNumber(
          r.likes
        )} · Comments: ${formatNumber(r.comments)} · Videos: ${formatNumber(r.videos)}`
      );
    });

    const txt = lines.join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      showToast("Copied.");
    } catch {
      showToast("Copy failed (clipboard blocked).");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleGoDashV2 = () => navigate("/dashboard-v2");
  const handleGoPayouts = () => navigate("/payouts");
  const handleGoClippers = () => navigate("/clippers");
  const handleGoPerformance = () => navigate("/performance");
  const goLeaderboards = () => navigate("/leaderboards");
  const goGallery = () => navigate("/gallery");
  const goSettings = () => navigate("/settings");
  const goContentApproval = () => navigate("/content-approval");

  // Platform display label
  const platformLabel =
    platform === "all"
      ? "All Platforms"
      : platform === "instagram"
      ? "Instagram"
      : platform === "tiktok"
      ? "TikTok"
      : "YouTube";

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
      {/* WATERMARK */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-18deg)",
          fontSize: 160,
          fontWeight: 900,
          letterSpacing: 2,
          opacity: 0.055,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
          zIndex: 0,
        }}
      >
        {wmText}
      </div>

      {/* Sidebar */}
      <div
        className="no-print"
        style={{
          width: sidebarOpen ? 240 : 70,
          minWidth: sidebarOpen ? 240 : 70,
          transition: "width 160ms ease",
          borderRadius: 22,
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(148,163,184,0.22)",
          padding: 14,
          height: "fit-content",
          position: "sticky",
          top: 30,
          alignSelf: "flex-start",
          boxShadow: "0 20px 55px rgba(0,0,0,0.78)",
          backdropFilter: "blur(10px)",
          zIndex: 5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>
            {sidebarOpen ? brandText : "DD"}
          </div>
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            style={{
              border: "none",
              outline: "none",
              width: 30,
              height: 30,
              borderRadius: 10,
              cursor: "pointer",
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.85)",
              fontWeight: 900,
            }}
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            {sidebarOpen ? "‹" : "›"}
          </button>
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
          <NavBtn label="Dashboard" onClick={handleGoDashV2} />
          <NavBtn label="Payouts" onClick={handleGoPayouts} />
          <NavBtn label="Clippers" onClick={handleGoClippers} />
          <NavBtn label="Performance" onClick={handleGoPerformance} />
          <NavBtn label="Leaderboards" onClick={goLeaderboards} muted />
          <NavBtn label="Gallery" onClick={goGallery} />
          <NavBtn label="Content Approval" onClick={goContentApproval} />
          <NavBtn label="Settings" onClick={goSettings} />
          <div style={{ height: 10 }} />
          <NavBtn label="Logout" onClick={handleLogout} />
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, marginLeft: 18, position: "relative", zIndex: 1 }}>
        {/* Top header + actions */}
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: 0.2 }}>
              Leaderboard — Week of {formatDateLabel(week)} ({platformLabel})
            </div>
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
              Rankings update weekly. Only metrics derived from views / likes / comments / videos.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={copySummary} style={topActionBtnStyle()} disabled={dataLoading}>
              Copy
            </button>
            <button onClick={printToPdf} style={topActionBtnStyle()}>
              Export PDF
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
                disabled={dataLoading}
                options={[
                  {
                    v: week || "",
                    t: dataLoading ? "Loading..." : formatDateLabel(week),
                  },
                ]}
              />
              <FilterSelect
                label="Platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={dataLoading}
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
                disabled={dataLoading}
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
                <span style={{ fontWeight: 900 }}>{dataLoading ? "—" : formatNumber(computed.totalViews)}</span>
              </Pill>
              <Pill tone="green">
                <span style={{ opacity: 0.8 }}>Likes</span>
                <span style={{ fontWeight: 900 }}>{dataLoading ? "—" : formatNumber(computed.totalLikes)}</span>
              </Pill>
              <Pill tone="pink">
                <span style={{ opacity: 0.8 }}>Comments</span>
                <span style={{ fontWeight: 900 }}>{dataLoading ? "—" : formatNumber(computed.totalComments)}</span>
              </Pill>
              <Pill>
                <span style={{ opacity: 0.8 }}>Videos</span>
                <span style={{ fontWeight: 900 }}>{dataLoading ? "—" : formatNumber(computed.totalVideos)}</span>
              </Pill>
            </div>
          </div>

          {/* Podium */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <PodiumCard place={2} person={computed.podium[1]} rankBy={rankBy} />
            <PodiumCard place={1} person={computed.podium[0]} rankBy={rankBy} isFirst />
            <PodiumCard place={3} person={computed.podium[2]} rankBy={rankBy} />
          </div>

          {/* Full rankings */}
          <div
            style={{
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
                <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.2 }}>
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
              {dataLoading ? (
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    border: "1px solid rgba(148,163,184,0.22)",
                    background: "rgba(0,0,0,0.35)",
                    opacity: 0.85,
                    fontSize: 13,
                  }}
                >
                  Loading...
                </div>
              ) : dataError ? (
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    border: "1px solid rgba(248,113,113,0.35)",
                    background: "rgba(248,113,113,0.08)",
                    color: "rgba(254,226,226,0.95)",
                    fontSize: 13,
                  }}
                >
                  Failed to load leaderboards: {dataError}
                </div>
              ) : (
                <>
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
                </>
              )}
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
                <button onClick={copySummary} style={topActionBtnStyle()} disabled={dataLoading}>
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
