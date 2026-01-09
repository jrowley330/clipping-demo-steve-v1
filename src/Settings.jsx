// Settings.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

// ✅ match your other pages (Cloud Run base)
const API_BASE_URL =
  "https://clipper-payouts-api-810712855216.us-central1.run.app";

// ✅ for now (later you can tie to a real client/user id)
const DEFAULT_CLIENT_ID = "default";

const DEFAULT_PAYOUT = {
  viewsPerDollar: 1000,
  maxPayEnabled: false,
  maxPayPerVideoUsd: 200,
  minViewsEnabled: false,
  minViewCountEligibility: 50000,
  monthlyRetainerEnabled: false,
  monthlyRetainerUsd: 0,
};

const ALL_PLATFORMS = ["Instagram", "YouTube", "TikTok"];

const DEFAULTS = {
  // App Branding
  headingText: "Your Clipping Campaign",
  watermarkText: "CLIPPING",

  // Campaign Details
  campaignName: "Whop Clips VIP",
  platforms: ["Instagram", "YouTube", "TikTok"],
  budgetUsd: 0,
  deadline: "", // YYYY-MM-DD

  requirements: [
    "Must tag @whop in bio",
    "Must have whop youtube linked in bio",
  ],

  // Payout configs (per platform)
  payouts: {
    instagram: { ...DEFAULT_PAYOUT },
    youtube: { ...DEFAULT_PAYOUT },
    tiktok: { ...DEFAULT_PAYOUT },
  },
};

// helpers
const toInt = (v, fallback = 0) => {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : fallback;
};
const toMoney = (v, fallback = 0) => {
  const cleaned = String(v ?? "").replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
};
const fmt = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString();
};

// ✅ map API row -> UI state (FLAT payout columns -> nested UI payouts)
const mapApiToUi = (row) => {
  if (!row) return null;

  const mkPayout = (prefix, fallback) => ({
    ...fallback,
    viewsPerDollar:
      row[`${prefix}_views_per_dollar`] ?? fallback.viewsPerDollar,
    maxPayEnabled:
      row[`${prefix}_max_pay_enabled`] ?? fallback.maxPayEnabled,
    maxPayPerVideoUsd:
      row[`${prefix}_max_pay_per_video_usd`] ?? fallback.maxPayPerVideoUsd,
    minViewsEnabled:
      row[`${prefix}_min_views_enabled`] ?? fallback.minViewsEnabled,
    minViewCountEligibility:
      row[`${prefix}_min_view_count_eligibility`] ?? fallback.minViewCountEligibility,
    monthlyRetainerEnabled:
      row[`${prefix}_monthly_retainer_enabled`] ?? fallback.monthlyRetainerEnabled,
    monthlyRetainerUsd:
      row[`${prefix}_monthly_retainer_usd`] ?? fallback.monthlyRetainerUsd,
  });

  // deadline might come back like "2026-01-13" or full timestamp; keep YYYY-MM-DD
  const deadlineStr = row.deadline
    ? String(row.deadline).slice(0, 10)
    : DEFAULTS.deadline;

  return {
    ...DEFAULTS,

    headingText: row.heading_text ?? DEFAULTS.headingText,
    watermarkText: row.watermark_text ?? DEFAULTS.watermarkText,

    campaignName: row.campaign_name ?? DEFAULTS.campaignName,
    platforms: row.platforms ?? DEFAULTS.platforms,
    budgetUsd: row.budget_usd ?? DEFAULTS.budgetUsd,
    deadline: deadlineStr,
    requirements: row.requirements ?? DEFAULTS.requirements,

    payouts: {
      instagram: mkPayout("payouts_instagram", DEFAULTS.payouts.instagram),
      youtube: mkPayout("payouts_youtube", DEFAULTS.payouts.youtube),
      tiktok: mkPayout("payouts_tiktok", DEFAULTS.payouts.tiktok),
    },
  };
};


const Label = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      opacity: 0.7,
      textTransform: "uppercase",
      letterSpacing: 0.06,
      marginBottom: 6,
    }}
  >
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, disabled, width, type = "text" }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder || ""}
    disabled={disabled}
    type={type}
    style={{
      width: width || "100%",
      boxSizing: "border-box",
      padding: "9px 10px",
      borderRadius: 10,
      border: "1px solid rgba(148,163,184,0.55)",
      background: disabled ? "rgba(15,23,42,0.35)" : "rgba(15,23,42,0.9)",
      color: "rgba(229,231,235,1)",
      fontSize: 13,
      outline: "none",
      opacity: disabled ? 0.55 : 1,
    }}
  />
);

const Toggle = ({ on, setOn }) => (
  <button
    type="button"
    onClick={() => setOn((v) => !v)}
    style={{
      borderRadius: 999,
      padding: "7px 10px",
      border: "1px solid rgba(148,163,184,0.55)",
      background: on ? "rgba(34,197,94,0.14)" : "rgba(148,163,184,0.10)",
      color: on ? "rgb(74,222,128)" : "rgba(148,163,184,0.95)",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      whiteSpace: "nowrap",
      minWidth: 64,
    }}
    title="Toggle"
  >
    {on ? "On" : "Off"}
  </button>
);

const Pill = ({ active, children, onClick, tint }) => (
  <button
    onClick={onClick}
    type="button"
    style={{
      borderRadius: 999,
      padding: "7px 12px",
      border: active ? `1px solid ${tint.border}` : "1px solid rgba(148,163,184,0.40)",
      background: active ? tint.bg : "rgba(255,255,255,0.03)",
      color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
      fontSize: 12,
      fontWeight: 800,
      cursor: "pointer",
      boxShadow: active ? `0 10px 24px ${tint.shadow}` : "none",
    }}
  >
    {children}
  </button>
);

const SectionCard = ({ title, subtitle, accent, children }) => (
  <div
    style={{
      borderRadius: 16,
      border: "1px solid rgba(148,163,184,0.22)",
      background: accent
        ? `radial-gradient(circle at top left, ${accent}, rgba(255,255,255,0.02))`
        : "rgba(255,255,255,0.03)",
      padding: 16,
      marginBottom: 14,
    }}
  >
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
      {subtitle ? <div style={{ fontSize: 12, opacity: 0.65 }}>{subtitle}</div> : null}
    </div>
    {children}
  </div>
);

export default function SettingsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [s, setS] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // ✅ new: load state + error
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState("");

  const clientId = DEFAULT_CLIENT_ID;

  const [activePlatform, setActivePlatform] = useState("instagram"); // instagram | youtube | tiktok
  const p = s.payouts[activePlatform];

  const platformTint = useMemo(() => {
    // subtle tints (you asked: YT light red, IG light purple, TT darker metallic)
    if (activePlatform === "youtube")
      return {
        name: "YouTube",
        header: "rgba(239,68,68,0.85)",
        bg: "rgba(239,68,68,0.10)",
        border: "rgba(239,68,68,0.35)",
        shadow: "rgba(239,68,68,0.20)",
        sectionAccent: "rgba(239,68,68,0.10)",
      };
    if (activePlatform === "tiktok")
      return {
        name: "TikTok",
        header: "rgba(168,85,247,0.92)",
        bg: "rgba(2,6,23,0.35)",
        border: "rgba(168,85,247,0.35)",
        shadow: "rgba(168,85,247,0.18)",
        sectionAccent: "rgba(168,85,247,0.12)",
      };
    return {
      name: "Instagram",
      header: "rgba(192,132,252,0.92)",
      bg: "rgba(192,132,252,0.10)",
      border: "rgba(192,132,252,0.35)",
      shadow: "rgba(192,132,252,0.18)",
      sectionAccent: "rgba(192,132,252,0.10)",
    };
  }, [activePlatform]);

  // ✅ GET settings on mount
  useEffect(() => {
    const run = async () => {
      setLoadingSettings(true);
      setSettingsError("");

      try {
        const resp = await fetch(
          `${API_BASE_URL}/settings?clientId=${encodeURIComponent(clientId)}`
        );

        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          throw new Error(txt || `GET /settings failed (${resp.status})`);
        }

        const row = await resp.json();
        const mapped = mapApiToUi(row);
        if (mapped) setS(mapped);
      } catch (e) {
        setSettingsError(e?.message || "Failed to load settings");
      } finally {
        setLoadingSettings(false);
      }
    };

    run();
  }, [clientId]);

  // nav
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

  const payoutExplain = useMemo(() => {
    const v = Math.max(1, toInt(p.viewsPerDollar, 1000));
    return `Clippers will be paid $1 for every ${fmt(v)} views generated.`;
  }, [p.viewsPerDollar]);

  const updatePayout = (patch) => {
    setS((prev) => ({
      ...prev,
      payouts: {
        ...prev.payouts,
        [activePlatform]: {
          ...prev.payouts[activePlatform],
          ...patch,
        },
      },
    }));
  };

  // requirements
  const addRequirement = () =>
    setS((prev) => ({ ...prev, requirements: [...(prev.requirements || []), ""] }));

  const updateRequirement = (idx, value) =>
    setS((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r, i) => (i === idx ? value : r)),
    }));

  const removeRequirement = (idx) =>
    setS((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== idx),
    }));

  // platforms dropdown
  const [platformMenuOpen, setPlatformMenuOpen] = useState(false);

  const setPlatforms = (next) => setS((prev) => ({ ...prev, platforms: next }));

  const togglePlatform = (name) => {
    setPlatforms(
      s.platforms.includes(name)
        ? s.platforms.filter((p) => p !== name)
        : [...s.platforms, name]
    );
  };

  const selectAllPlatforms = () => setPlatforms([...ALL_PLATFORMS]);
  const clearPlatforms = () => setPlatforms([]);

  // ✅ POST settings on save
  const onSave = async () => {
    if (saving) return;

    const norm = {
      ...s,
      headingText: String(s.headingText || "").trim(),
      watermarkText: String(s.watermarkText || "").trim(),
      campaignName: String(s.campaignName || "").trim(),
      budgetUsd: Math.max(0, toMoney(s.budgetUsd, 0)),
      deadline: String(s.deadline || "").trim(),
      platforms: (s.platforms || []).filter(Boolean),
      requirements: (s.requirements || []).map((x) => String(x || "").trim()).filter(Boolean),
      payouts: {
        instagram: {
          ...s.payouts.instagram,
          viewsPerDollar: Math.max(1, toInt(s.payouts.instagram.viewsPerDollar, 1000)),
          maxPayPerVideoUsd: Math.max(0, toMoney(s.payouts.instagram.maxPayPerVideoUsd, 0)),
          minViewCountEligibility: Math.max(0, toInt(s.payouts.instagram.minViewCountEligibility, 0)),
          monthlyRetainerUsd: Math.max(0, toMoney(s.payouts.instagram.monthlyRetainerUsd, 0)),
        },
        youtube: {
          ...s.payouts.youtube,
          viewsPerDollar: Math.max(1, toInt(s.payouts.youtube.viewsPerDollar, 1000)),
          maxPayPerVideoUsd: Math.max(0, toMoney(s.payouts.youtube.maxPayPerVideoUsd, 0)),
          minViewCountEligibility: Math.max(0, toInt(s.payouts.youtube.minViewCountEligibility, 0)),
          monthlyRetainerUsd: Math.max(0, toMoney(s.payouts.youtube.monthlyRetainerUsd, 0)),
        },
        tiktok: {
          ...s.payouts.tiktok,
          viewsPerDollar: Math.max(1, toInt(s.payouts.tiktok.viewsPerDollar, 1000)),
          maxPayPerVideoUsd: Math.max(0, toMoney(s.payouts.tiktok.maxPayPerVideoUsd, 0)),
          minViewCountEligibility: Math.max(0, toInt(s.payouts.tiktok.minViewCountEligibility, 0)),
          monthlyRetainerUsd: Math.max(0, toMoney(s.payouts.tiktok.monthlyRetainerUsd, 0)),
        },
      },
    };

    setS(norm);

    setSaving(true);
    setSaveMsg("");
    setSettingsError("");

    try {
      const payload = {
        clientId,

        headingText: norm.headingText,
        watermarkText: norm.watermarkText,

        campaignName: norm.campaignName,
        platforms: norm.platforms,
        budgetUsd: norm.budgetUsd,
        deadline: norm.deadline || null,
        requirements: norm.requirements,

        // FLAT payout fields (per platform)
        payoutsInstagramViewsPerDollar: norm.payouts.instagram.viewsPerDollar,
        payoutsInstagramMaxPayEnabled: norm.payouts.instagram.maxPayEnabled,
        payoutsInstagramMaxPayPerVideoUsd: norm.payouts.instagram.maxPayPerVideoUsd,
        payoutsInstagramMinViewsEnabled: norm.payouts.instagram.minViewsEnabled,
        payoutsInstagramMinViewCountEligibility: norm.payouts.instagram.minViewCountEligibility,
        payoutsInstagramMonthlyRetainerEnabled: norm.payouts.instagram.monthlyRetainerEnabled,
        payoutsInstagramMonthlyRetainerUsd: norm.payouts.instagram.monthlyRetainerUsd,

        payoutsYoutubeViewsPerDollar: norm.payouts.youtube.viewsPerDollar,
        payoutsYoutubeMaxPayEnabled: norm.payouts.youtube.maxPayEnabled,
        payoutsYoutubeMaxPayPerVideoUsd: norm.payouts.youtube.maxPayPerVideoUsd,
        payoutsYoutubeMinViewsEnabled: norm.payouts.youtube.minViewsEnabled,
        payoutsYoutubeMinViewCountEligibility: norm.payouts.youtube.minViewCountEligibility,
        payoutsYoutubeMonthlyRetainerEnabled: norm.payouts.youtube.monthlyRetainerEnabled,
        payoutsYoutubeMonthlyRetainerUsd: norm.payouts.youtube.monthlyRetainerUsd,

        payoutsTiktokViewsPerDollar: norm.payouts.tiktok.viewsPerDollar,
        payoutsTiktokMaxPayEnabled: norm.payouts.tiktok.maxPayEnabled,
        payoutsTiktokMaxPayPerVideoUsd: norm.payouts.tiktok.maxPayPerVideoUsd,
        payoutsTiktokMinViewsEnabled: norm.payouts.tiktok.minViewsEnabled,
        payoutsTiktokMinViewCountEligibility: norm.payouts.tiktok.minViewCountEligibility,
        payoutsTiktokMonthlyRetainerEnabled: norm.payouts.tiktok.monthlyRetainerEnabled,
        payoutsTiktokMonthlyRetainerUsd: norm.payouts.tiktok.monthlyRetainerUsd,
      };


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
        {(s.watermarkText || "CLIPPING").toUpperCase()}
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
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.1, opacity: 0.6, marginTop: 4, marginBottom: 4 }}>
                Navigation
              </div>

              <button onClick={goDashV2} style={{ border: "none", borderRadius: 12, padding: "7px 10px", textAlign: "left", cursor: "pointer", fontSize: 12, background: "transparent", color: "rgba(255,255,255,0.7)" }}>
                Dashboards
              </button>
              <button onClick={goPayouts} style={{ border: "none", borderRadius: 12, padding: "7px 10px", textAlign: "left", cursor: "pointer", fontSize: 12, background: "transparent", color: "rgba(255,255,255,0.7)" }}>
                Payouts
              </button>
              <button onClick={goClippers} style={{ border: "none", borderRadius: 12, padding: "7px 10px", textAlign: "left", cursor: "pointer", fontSize: 12, background: "transparent", color: "rgba(255,255,255,0.7)" }}>
                Clippers
              </button>
              <button onClick={goPerformance} style={{ border: "none", borderRadius: 12, padding: "7px 10px", textAlign: "left", cursor: "pointer", fontSize: 12, background: "transparent", color: "rgba(255,255,255,0.55)" }}>
                Performance
              </button>
              <button onClick={goLeaderboards} style={{ border: "none", borderRadius: 12, padding: "7px 10px", textAlign: "left", cursor: "pointer", fontSize: 12, background: "transparent", color: "rgba(255,255,255,0.55)" }}>
                Leaderboards
              </button>
              <button onClick={goGallery} style={{ border: "none", borderRadius: 12, padding: "7px 10px", textAlign: "left", cursor: "pointer", fontSize: 12, background: "transparent", color: "rgba(255,255,255,0.7)" }}>
                Gallery
              </button>

              <button
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "8px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 13,
                  background: "linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))",
                  color: "#020617",
                  fontWeight: 600,
                  marginTop: 2,
                  marginBottom: 2,
                }}
              >
                Settings
              </button>

              <div style={{ flexGrow: 1 }} />

              <button
                onClick={handleLogout}
                style={{
                  border: "none",
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

              <div style={{ fontSize: 11, opacity: 0.55, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }}>
                App configuration hub
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, position: "relative", zIndex: 3 }}>
        {/* BIG HEADER (live preview) */}
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
              fontSize: 34,
              letterSpacing: 0.5,
              color: "#ffffff",
              textTransform: "uppercase",
              textShadow: "0 3px 12px rgba(0,0,0,0.7)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
            title={s.headingText}
          >
            {(s.headingText || "Your Clipping Campaign").toUpperCase()}
          </span>
        </div>

        {/* ✅ loading + error */}
        {loadingSettings ? (
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
            Loading settings…
          </div>
        ) : null}

        {settingsError ? (
          <div
            style={{
              marginBottom: 10,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.10)",
              color: "rgba(254,202,202,0.95)",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {settingsError}
          </div>
        ) : null}

        {/* title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Settings</h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>Configure payouts, campaign details, and branding</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {saveMsg ? (
              <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.6)", opacity: 0.92 }}>
                {saveMsg}
              </div>
            ) : null}

            <button
              onClick={onSave}
              disabled={saving}
              style={{
                borderRadius: 999,
                padding: "8px 14px",
                border: "1px solid rgba(248,250,252,0.35)",
                background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.95))",
                color: "#e5e7eb",
                fontSize: 12,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.65 : 1,
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {/* MAIN CONTAINER */}
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.3)",
            background: "radial-gradient(circle at top left, rgba(148,163,184,0.18), rgba(15,23,42,1))",
            padding: 18,
            fontSize: 13,
            opacity: 0.95,
          }}
        >
          {/* 1) Configure Payouts (top) */}
          <SectionCard
            title="Configure Payouts"
            subtitle={`Define earnings rules for clippers (${platformTint.name})`}
            accent={platformTint.sectionAccent}
          >
            {/* platform selector */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <Pill
                active={activePlatform === "instagram"}
                onClick={() => setActivePlatform("instagram")}
                tint={{
                  bg: "rgba(192,132,252,0.12)",
                  border: "rgba(192,132,252,0.45)",
                  shadow: "rgba(192,132,252,0.18)",
                }}
              >
                Instagram
              </Pill>
              <Pill
                active={activePlatform === "youtube"}
                onClick={() => setActivePlatform("youtube")}
                tint={{
                  bg: "rgba(239,68,68,0.12)",
                  border: "rgba(239,68,68,0.45)",
                  shadow: "rgba(239,68,68,0.18)",
                }}
              >
                YouTube
              </Pill>
              <Pill
                active={activePlatform === "tiktok"}
                onClick={() => setActivePlatform("tiktok")}
                tint={{
                  bg: "rgba(168,85,247,0.12)",
                  border: "rgba(168,85,247,0.45)",
                  shadow: "rgba(168,85,247,0.16)",
                }}
              >
                TikTok
              </Pill>
            </div>

            {/* A) $1 / views */}
            <div>
              <Label>$1 / ____ Views</Label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    borderRadius: 14,
                    padding: "10px 12px",
                    border: `1px solid ${platformTint.border}`,
                    background: platformTint.bg,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900 }}>$1</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>/</div>
                  <Input width={160} value={p.viewsPerDollar} onChange={(e) => updatePayout({ viewsPerDollar: e.target.value })} placeholder="1000" />
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Views</div>
                </div>

                <div style={{ fontSize: 12, opacity: 0.7 }}>{payoutExplain}</div>
              </div>
            </div>

            {/* B/C/D rows */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "240px 1fr",
                gap: 12,
                alignItems: "center",
                marginTop: 16,
                paddingTop: 12,
                borderTop: "1px solid rgba(148,163,184,0.18)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Toggle on={p.maxPayEnabled} setOn={(fn) => updatePayout({ maxPayEnabled: fn(p.maxPayEnabled) })} />
                <div>
                  <div style={{ fontWeight: 800 }}>Max Pay Per Video</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>Cap payout per video</div>
                </div>
              </div>

              <div>
                <Input value={p.maxPayPerVideoUsd} onChange={(e) => updatePayout({ maxPayPerVideoUsd: e.target.value })} placeholder="200" disabled={!p.maxPayEnabled} />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "240px 1fr",
                gap: 12,
                alignItems: "center",
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid rgba(148,163,184,0.18)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Toggle on={p.minViewsEnabled} setOn={(fn) => updatePayout({ minViewsEnabled: fn(p.minViewsEnabled) })} />
                <div>
                  <div style={{ fontWeight: 800 }}>Min View Count Eligibility</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>Minimum views to qualify</div>
                </div>
              </div>

              <div>
                <Input value={p.minViewCountEligibility} onChange={(e) => updatePayout({ minViewCountEligibility: e.target.value })} placeholder="50000" disabled={!p.minViewsEnabled} />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "240px 1fr",
                gap: 12,
                alignItems: "center",
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid rgba(148,163,184,0.18)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Toggle on={p.monthlyRetainerEnabled} setOn={(fn) => updatePayout({ monthlyRetainerEnabled: fn(p.monthlyRetainerEnabled) })} />
                <div>
                  <div style={{ fontWeight: 800 }}>Monthly Retainer</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>Optional flat monthly amount</div>
                </div>
              </div>

              <div>
                <Input value={p.monthlyRetainerUsd} onChange={(e) => updatePayout({ monthlyRetainerUsd: e.target.value })} placeholder="0" disabled={!p.monthlyRetainerEnabled} />
              </div>
            </div>
          </SectionCard>

          {/* 2) Campaign Details (below payouts) with Requirements inside */}
          <SectionCard title="Campaign Details" subtitle="Information shown to clippers (about campaign + rules)">
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
              <div>
                <Label>Campaign Name</Label>
                <Input value={s.campaignName} onChange={(e) => setS((p) => ({ ...p, campaignName: e.target.value }))} placeholder="Whop Clips VIP" />
              </div>

              <div>
                <Label>Budget (USD)</Label>
                <Input value={s.budgetUsd} onChange={(e) => setS((p) => ({ ...p, budgetUsd: e.target.value }))} placeholder="0" />
              </div>

              {/* Platforms selector + display field */}
              <div style={{ position: "relative" }}>
                <Label>Platforms</Label>

                {/* display-like input + dropdown trigger */}
                <button
                  type="button"
                  onClick={() => setPlatformMenuOpen((v) => !v)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    borderRadius: 10,
                    padding: "9px 10px",
                    border: "1px solid rgba(148,163,184,0.55)",
                    background: "rgba(15,23,42,0.9)",
                    color: "rgba(229,231,235,1)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {s.platforms.length ? s.platforms.join(", ") : "Select platforms…"}
                  <span style={{ float: "right", opacity: 0.7 }}>▾</span>
                </button>

                {platformMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: 62,
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.28)",
                      background: "rgba(2,6,23,0.95)",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
                      padding: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                      <button
                        type="button"
                        onClick={selectAllPlatforms}
                        style={{
                          borderRadius: 10,
                          padding: "8px 10px",
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.9)",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={clearPlatforms}
                        style={{
                          borderRadius: 10,
                          padding: "8px 10px",
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.03)",
                          color: "rgba(255,255,255,0.7)",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Clear
                      </button>
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      {ALL_PLATFORMS.map((name) => {
                        const checked = s.platforms.includes(name);
                        return (
                          <label
                            key={name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "8px 8px",
                              borderRadius: 10,
                              cursor: "pointer",
                              background: checked ? "rgba(255,255,255,0.06)" : "transparent",
                              border: checked ? "1px solid rgba(255,255,255,0.10)" : "1px solid transparent",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePlatform(name)}
                              style={{ transform: "scale(1.05)" }}
                            />
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => setPlatformMenuOpen(false)}
                        style={{
                          borderRadius: 10,
                          padding: "8px 10px",
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.9)",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label>Deadline</Label>
                <Input type="date" value={s.deadline} onChange={(e) => setS((p) => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>

            {/* Requirements inside Campaign Details */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(148,163,184,0.18)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 900 }}>Requirements</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>Add rules clippers must follow</div>
                </div>

                <button
                  onClick={addRequirement}
                  type="button"
                  style={{
                    borderRadius: 999,
                    padding: "8px 12px",
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  + Add requirement
                </button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {(s.requirements || []).map((req, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                    <Input value={req} onChange={(e) => updateRequirement(idx, e.target.value)} placeholder="Type requirement..." />
                    <button
                      type="button"
                      onClick={() => removeRequirement(idx)}
                      style={{
                        borderRadius: 10,
                        padding: "9px 10px",
                        border: "1px solid rgba(239,68,68,0.25)",
                        background: "rgba(239,68,68,0.10)",
                        color: "rgba(254,202,202,0.95)",
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                      title="Remove"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {(!s.requirements || s.requirements.length === 0) && <div style={{ fontSize: 12, opacity: 0.65 }}>No requirements yet.</div>}
              </div>
            </div>
          </SectionCard>

          {/* 3) App Branding */}
          <SectionCard title="App Branding" subtitle="Controls header + watermark (shown across your app)" accent="rgba(96,165,250,0.08)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <Label>Heading Text</Label>
                <Input value={s.headingText} onChange={(e) => setS((p) => ({ ...p, headingText: e.target.value }))} placeholder="Your Clipping Campaign" />
              </div>

              <div>
                <Label>Watermark Text</Label>
                <Input value={s.watermarkText} onChange={(e) => setS((p) => ({ ...p, watermarkText: e.target.value }))} placeholder="CLIPPING" />
              </div>
            </div>
          </SectionCard>

          {/* Integrations placeholder */}
          <SectionCard title="Integrations" subtitle="Placeholder for now">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {[
                { name: "Stripe", desc: "Connect Stripe for automated payouts." },
                { name: "Revolut", desc: "Send payouts via Revolut integration." },
                { name: "Wise", desc: "International payouts through Wise." },
              ].map((x) => (
                <div
                  key={x.name}
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(148,163,184,0.22)",
                    background: "rgba(255,255,255,0.03)",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 900 }}>{x.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.65 }}>Coming soon</div>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>{x.desc}</div>
                  <div style={{ marginTop: 6 }}>
                    <button
                      disabled
                      style={{
                        borderRadius: 999,
                        padding: "8px 12px",
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.8)",
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: "not-allowed",
                        opacity: 0.6,
                      }}
                    >
                      Connect
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 12 }}>
              Next: we’ll add OAuth/Connect flows + store account IDs in BigQuery.
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
