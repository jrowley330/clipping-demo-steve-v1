// Settings.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

const DEFAULT_PAYOUT = {
  viewsPerDollar: 1000,

  maxPayEnabled: false,
  maxPayPerVideoUsd: 200,

  minViewsEnabled: false,
  minViewCountEligibility: 50000,

  monthlyRetainerEnabled: false,
  monthlyRetainerUsd: 0,
};

const DEFAULTS = {
  // Branding
  headingText: "Your Clipping Campaign",
  watermarkText: "CLIPPING",

  // Campaign Details
  campaignName: "Whop Clips VIP",
  campaignHandle: "@whop_clips_vip",
  approvalRatePct: 97, // optional display
  category: "Personal Brand",
  platforms: ["Instagram", "YouTube", "TikTok"],

  // Requirements
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

const Line = () => (
  <div style={{ height: 1, background: "rgba(148,163,184,0.18)", margin: "18px 0" }} />
);

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

const Input = ({ value, onChange, placeholder, disabled, width }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder || ""}
    disabled={disabled}
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

const Pill = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    style={{
      borderRadius: 999,
      padding: "7px 12px",
      border: "1px solid rgba(148,163,184,0.40)",
      background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
      color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
    }}
    type="button"
  >
    {children}
  </button>
);

export default function SettingsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [s, setS] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [activePlatform, setActivePlatform] = useState("instagram"); // instagram | youtube | tiktok
  const p = s.payouts[activePlatform];

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

  const addRequirement = () => {
    setS((prev) => ({
      ...prev,
      requirements: [...(prev.requirements || []), ""],
    }));
  };

  const updateRequirement = (idx, value) => {
    setS((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r, i) => (i === idx ? value : r)),
    }));
  };

  const removeRequirement = (idx) => {
    setS((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== idx),
    }));
  };

  const togglePlatformChip = (name) => {
    setS((prev) => {
      const exists = prev.platforms.includes(name);
      const next = exists ? prev.platforms.filter((p) => p !== name) : [...prev.platforms, name];
      return { ...prev, platforms: next };
    });
  };

  const onSave = async () => {
    if (saving) return;

    // normalize important stuff
    const norm = {
      ...s,
      headingText: String(s.headingText || "").trim(),
      watermarkText: String(s.watermarkText || "").trim(),
      campaignName: String(s.campaignName || "").trim(),
      campaignHandle: String(s.campaignHandle || "").trim(),
      approvalRatePct: Math.max(0, Math.min(100, toInt(s.approvalRatePct, 0))),
      category: String(s.category || "").trim(),
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

    // UI-only for now
    setSaving(true);
    setSaveMsg("");
    try {
      await new Promise((r) => setTimeout(r, 450));
      setSaveMsg("Saved (UI only for now).");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 2000);
    }
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

        {/* title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Settings</h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>Campaign details, requirements, branding, and payouts</span>
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
          {/* Campaign Details */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Campaign Details</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Basic campaign info shown to clippers</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginTop: 14 }}>
            <div>
              <Label>Campaign Name</Label>
              <Input value={s.campaignName} onChange={(e) => setS((p) => ({ ...p, campaignName: e.target.value }))} placeholder="Whop Clips VIP" />
            </div>

            <div>
              <Label>Handle / Username</Label>
              <Input value={s.campaignHandle} onChange={(e) => setS((p) => ({ ...p, campaignHandle: e.target.value }))} placeholder="@whop_clips_vip" />
            </div>

            <div>
              <Label>Category</Label>
              <Input value={s.category} onChange={(e) => setS((p) => ({ ...p, category: e.target.value }))} placeholder="Personal Brand" />
            </div>

            <div>
              <Label>Approval Rate %</Label>
              <Input value={s.approvalRatePct} onChange={(e) => setS((p) => ({ ...p, approvalRatePct: e.target.value }))} placeholder="97" />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <Label>Platforms</Label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["Instagram", "YouTube", "TikTok"].map((name) => {
                const active = s.platforms.includes(name);
                return (
                  <Pill key={name} active={active} onClick={() => togglePlatformChip(name)}>
                    {name}
                  </Pill>
                );
              })}
            </div>
            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
              Selected: {s.platforms.length ? s.platforms.join(", ") : "None"}
            </div>
          </div>

          <Line />

          {/* Requirements */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Requirements</div>
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
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              + Add requirement
            </button>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {(s.requirements || []).map((req, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
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
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                  title="Remove"
                >
                  Remove
                </button>
              </div>
            ))}

            {(!s.requirements || s.requirements.length === 0) && (
              <div style={{ fontSize: 12, opacity: 0.65 }}>No requirements yet. Click “Add requirement”.</div>
            )}
          </div>

          <Line />

          {/* Branding */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Branding</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Controls header + watermark</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <div>
              <Label>Heading Text</Label>
              <Input value={s.headingText} onChange={(e) => setS((p) => ({ ...p, headingText: e.target.value }))} placeholder="Your Clipping Campaign" />
            </div>

            <div>
              <Label>Watermark Text</Label>
              <Input value={s.watermarkText} onChange={(e) => setS((p) => ({ ...p, watermarkText: e.target.value }))} placeholder="CLIPPING" />
            </div>
          </div>

          <Line />

          {/* Configure Payouts */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Configure Payouts</div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>Platform-specific payout rules</div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Pill active={activePlatform === "instagram"} onClick={() => setActivePlatform("instagram")}>
                Instagram
              </Pill>
              <Pill active={activePlatform === "youtube"} onClick={() => setActivePlatform("youtube")}>
                YouTube
              </Pill>
              <Pill active={activePlatform === "tiktok"} onClick={() => setActivePlatform("tiktok")}>
                TikTok
              </Pill>
            </div>
          </div>

          {/* A) $1 / views */}
          <div style={{ marginTop: 14 }}>
            <Label>$1 / ____ Views</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  borderRadius: 14,
                  padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800 }}>$1</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>/</div>
                <Input width={160} value={p.viewsPerDollar} onChange={(e) => updatePayout({ viewsPerDollar: e.target.value })} placeholder="1000" />
                <div style={{ fontSize: 12, opacity: 0.75 }}>Views</div>
              </div>

              <div style={{ fontSize: 12, opacity: 0.7 }}>{payoutExplain}</div>
            </div>
          </div>

          {/* B) Max Pay Per Video */}
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
                <div style={{ fontWeight: 700 }}>Max Pay Per Video</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>Cap payout per video</div>
              </div>
            </div>

            <div>
              <Input value={p.maxPayPerVideoUsd} onChange={(e) => updatePayout({ maxPayPerVideoUsd: e.target.value })} placeholder="200" disabled={!p.maxPayEnabled} />
            </div>
          </div>

          {/* C) Min Views Eligibility */}
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
                <div style={{ fontWeight: 700 }}>Min View Count Eligibility</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>Minimum views to qualify</div>
              </div>
            </div>

            <div>
              <Input
                value={p.minViewCountEligibility}
                onChange={(e) => updatePayout({ minViewCountEligibility: e.target.value })}
                placeholder="50000"
                disabled={!p.minViewsEnabled}
              />
            </div>
          </div>

          {/* D) Monthly Retainer */}
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
                <div style={{ fontWeight: 700 }}>Monthly Retainer</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>Optional flat monthly amount</div>
              </div>
            </div>

            <div>
              <Input value={p.monthlyRetainerUsd} onChange={(e) => updatePayout({ monthlyRetainerUsd: e.target.value })} placeholder="0" disabled={!p.monthlyRetainerEnabled} />
            </div>
          </div>

          <Line />

          {/* Integrations placeholder */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Integrations</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Placeholder for now</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
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
                  <div style={{ fontWeight: 800 }}>{x.name}</div>
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
                      fontWeight: 800,
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
        </div>
      </div>
    </div>
  );
}
