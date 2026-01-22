import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import { useBranding } from "./branding/BrandingContext";

// ✅ set this to your Cloud Run API
const API_BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL ||
  "https://clipper-payouts-api-810712855216.us-central1.run.app";

const formatNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString();
};

const daysAgoLabel = (daysAgo) => {
  const d = Number(daysAgo);
  if (!Number.isFinite(d)) return "—";
  if (d === 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
};

const platformMeta = {
  youtube: {
    label: "YouTube",
    pillBg: "rgba(239,68,68,0.18)",
    pillBorder: "rgba(239,68,68,0.55)",
    pillText: "rgba(248,113,113,0.95)",
    icon: "▶",
  },
  tiktok: {
    label: "TikTok",
    pillBg: "rgba(94,234,212,0.14)",
    pillBorder: "rgba(94,234,212,0.55)",
    pillText: "rgba(94,234,212,0.95)",
    icon: "♪",
  },
  instagram: {
    label: "Instagram",
    pillBg: "rgba(168,85,247,0.14)",
    pillBorder: "rgba(168,85,247,0.55)",
    pillText: "rgba(216,180,254,0.95)",
    icon: "◎",
  },
};

const placeholderThumb = (seed = 1) =>
  `https://picsum.photos/seed/clipper_gallery_${seed}/800/1200`;

function normPlatform(p) {
  const x = String(p || "").toLowerCase().trim();
  if (x === "yt") return "youtube";
  if (x === "ig") return "instagram";
  if (x === "tt") return "tiktok";
  return x || "unknown";
}

export default function Gallery() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // BRANDING
  const { headingText, watermarkText, defaults } = useBranding();
  const brandText = headingText || defaults.headingText;
  const wmText = watermarkText || defaults.watermarkText;

  // UI filters
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Data
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setLoadErr("");

      try {
        const res = await fetch(`${API_BASE_URL}/video-gallery`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${txt || res.statusText}`);
        }

        const json = await res.json();
        const rows = Array.isArray(json) ? json : Array.isArray(json?.rows) ? json.rows : [];

        const mapped = rows.map((r, idx) => {
          const platform = normPlatform(r.platform);

          return {
            // use gallery_id if present, else fallback
            id: String(r.gallery_id || r.id || `${platform}_${r.video_id || idx}`),

            platform,
            title: r.title || "Untitled",
            videoUrl: r.url || "#",
            thumbnailUrl: r.thumbnail_url || placeholderThumb(idx + 1),

            views: r.view_count ?? r.views ?? 0,
            likes: r.like_count ?? r.likes ?? 0,
            comments: r.comment_count ?? r.comments ?? 0,

            daysAgo: r.days_ago ?? r.daysAgo ?? null,
            account: r.username || "",
          };
        });

        if (alive) setVideos(mapped);
      } catch (e) {
        if (alive) setLoadErr(e?.message || "Failed to load gallery.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return videos.filter((v) => {
      if (platformFilter !== "all" && v.platform !== platformFilter) return false;
      if (!q) return true;
      return (
        (v.title || "").toLowerCase().includes(q) ||
        (v.account || "").toLowerCase().includes(q)
      );
    });
  }, [videos, platformFilter, search]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const goDashV2 = () => navigate("/dashboard-v2");
  const goPayouts = () => navigate("/payouts");
  const goClippers = () => navigate("/clippers");
  const goPerformance = () => navigate("/performance");
  const goLeaderboards = () => navigate("/leaderboards");
  const goSettings = () => navigate("/settings");
  const goContentApproval = () => navigate("/content-approval");

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
      }}
    >
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
        {wmText}
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

              <NavBtn onClick={goDashV2} label="Dashboards" />
              <NavBtn onClick={goContentApproval} label="Review Content" />
              <NavBtn onClick={goPayouts} label="Payouts" />
              <NavBtn onClick={goClippers} label="Clippers" />
              <NavBtn onClick={goPerformance} label="Performance" />
              <NavBtn onClick={goLeaderboards} label="Leaderboards" />

              {/* Active */}
              <button
                onClick={() => navigate("/gallery")}
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
                  fontWeight: 600,
                  marginTop: 2,
                  marginBottom: 2,
                }}
              >
                Gallery
              </button>

              <NavBtn onClick={goSettings} label="Settings" muted />

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
                Video gallery hub
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN */}
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
            {brandText}
          </span>
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 18,
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Gallery</h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              All posted videos · thumbnails + stats
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              style={{
                fontSize: 12,
                padding: "7px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(0,0,0,0.6)",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              <option value="all">All platforms</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
            </select>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or account…"
              style={{
                width: 260,
                maxWidth: "50vw",
                fontSize: 12,
                padding: "7px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(0,0,0,0.6)",
                color: "rgba(255,255,255,0.92)",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Content card */}
        <div
          style={{
            borderRadius: 20,
            background: "radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 55%)",
            padding: 18,
            boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {loading && (
            <div style={{ padding: 14, opacity: 0.8, fontSize: 13 }}>
              Loading gallery…
            </div>
          )}

          {!loading && loadErr && (
            <div style={{ padding: 14, opacity: 0.9, fontSize: 13, color: "rgba(248,113,113,0.95)" }}>
              Failed to load: {loadErr}
            </div>
          )}

          {!loading && !loadErr && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 14,
                }}
              >
                {filtered.map((v) => {
                  const meta = platformMeta[v.platform] || {
                    label: v.platform,
                    pillBg: "rgba(148,163,184,0.12)",
                    pillBorder: "rgba(148,163,184,0.35)",
                    pillText: "rgba(148,163,184,0.95)",
                    icon: "•",
                  };

                  return (
                    <div
                      key={v.id}
                      style={{
                        borderRadius: 18,
                        overflow: "hidden",
                        background: "rgba(0,0,0,0.55)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "0 18px 45px rgba(0,0,0,0.75)",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 420,
                      }}
                    >
                      {/* Top bar */}
                      <div
                        style={{
                          padding: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          background: "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.3))",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 11,
                              padding: "4px 10px",
                              borderRadius: 999,
                              background: meta.pillBg,
                              border: `1px solid ${meta.pillBorder}`,
                              color: meta.pillText,
                            }}
                          >
                            <span style={{ opacity: 0.9 }}>{meta.icon}</span>
                            {meta.label}
                          </span>

                          {v.account && (
                            <span style={{ fontSize: 11, opacity: 0.65 }}>@{v.account}</span>
                          )}
                        </div>

                        <a
                          href={v.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.78)",
                            textDecoration: "none",
                            border: "1px solid rgba(255,255,255,0.16)",
                            padding: "5px 10px",
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.06)",
                          }}
                        >
                          View ↗
                        </a>
                      </div>

                      {/* Thumb */}
                      <div style={{ position: "relative", flex: 1, background: "#000" }}>
                        <img
                          src={v.thumbnailUrl}
                          alt={v.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            filter: "contrast(1.02) saturate(1.05)",
                          }}
                          loading="lazy"
                          onError={(e) => {
                            // fallback if hotlink fails
                            e.currentTarget.src = placeholderThumb(String(v.id).length || 1);
                          }}
                        />

                        {/* Play overlay */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pointerEvents: "none",
                          }}
                        >
                          <div
                            style={{
                              width: 62,
                              height: 62,
                              borderRadius: 999,
                              background: "rgba(0,0,0,0.55)",
                              border: "1px solid rgba(255,255,255,0.18)",
                              boxShadow: "0 18px 50px rgba(0,0,0,0.8)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backdropFilter: "blur(6px)",
                            }}
                          >
                            <span style={{ fontSize: 22, opacity: 0.9 }}>▶</span>
                          </div>
                        </div>

                        {/* Title gradient */}
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            padding: 12,
                            background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.85))",
                          }}
                        >
                          <div
                            title={v.title}
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              lineHeight: 1.25,
                              textShadow: "0 6px 18px rgba(0,0,0,0.9)",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {v.title}
                          </div>
                        </div>
                      </div>

                      {/* Bottom stats */}
                      <div
                        style={{
                          padding: 12,
                          borderTop: "1px solid rgba(255,255,255,0.06)",
                          background: "rgba(0,0,0,0.55)",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 8,
                            marginBottom: 10,
                          }}
                        >
                          <Stat label="Views" value={formatNumber(v.views)} />
                          <Stat label="Likes" value={formatNumber(v.likes)} />
                          <Stat label="Comments" value={formatNumber(v.comments)} />
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: 11,
                            opacity: 0.65,
                          }}
                        >
                          <span>Posted {daysAgoLabel(v.daysAgo)}</span>
                          <span style={{ opacity: 0.85 }}>
                            ID: <span style={{ fontFamily: "monospace" }}>{v.id}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <div style={{ padding: 14, opacity: 0.75, fontSize: 13 }}>
                  No videos match your filters.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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

function Stat({ label, value }) {
  return (
    <div
      style={{
        borderRadius: 12,
        padding: 10,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ fontSize: 10, opacity: 0.65, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
