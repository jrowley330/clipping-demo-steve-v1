// Settings.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

const DEFAULTS = {
  // Branding
  headingText: "Your Clipping Campaign",
  watermarkText: "CLIPPING",

  // Payouts
  viewsPerDollar: 1000,

  maxPayEnabled: false,
  maxPayPerVideoUsd: 200,

  minViewsEnabled: false,
  minViewCountEligibility: 50000,

  monthlyRetainerEnabled: false,
  monthlyRetainerUsd: 0,
};

// small helpers
const clampInt = (v, fallback = 0) => {
  const n = parseInt(String(v || "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : fallback;
};

const clampMoney = (v, fallback = 0) => {
  // allow decimals
  const cleaned = String(v || "").replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
};

const formatNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString();
};

const SectionTitle = ({ title, subtitle }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
    <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 0.2 }}>{title}</div>
    {subtitle ? <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>{subtitle}</div> : null}
  </div>
);

const Card = ({ children }) => (
  <div
    style={{
      borderRadius: 20,
      background: "rgba(0,0,0,0.55)",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 20px 50px rgba(0,0,0,0.65)",
      padding: 16,
    }}
  >
    {children}
  </div>
);

const FieldLabel = ({ label, hint }) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.06 }}>{label}</div>
    {hint ? <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>{hint}</div> : null}
  </div>
);

const Input = ({ value, onChange, placeholder, mono = false, disabled = false }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder || ""}
    disabled={disabled}
    style={{
      width: "100%",
      boxSizing: "border-box",
      padding: "9px 10px",
      borderRadius: 10,
      border: "1px solid rgba(148,163,184,0.75)",
      background: disabled ? "rgba(15,23,42,0.45)" : "rgba(15,23,42,0.9)",
      color: "rgba(229,231,235,1)",
      fontSize: 13,
      fontFamily: mono ? "monospace" : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      opacity: disabled ? 0.55 : 1,
      outline: "none",
    }}
  />
);

const TogglePill = ({ on, setOn, labelOn = "On", labelOff = "Off" }) => (
  <button
    type="button"
    onClick={() => setOn((v) => !v)}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 10px",
      borderRadius: 999,
      border: "1px solid rgba(148,163,184,0.75)",
      background: on ? "rgba(34,197,94,0.18)" : "rgba(148,163,184,0.14)",
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 800,
      color: on ? "rgb(74,222,128)" : "rgba(148,163,184,0.95)",
      whiteSpace: "nowrap",
    }}
    title="Toggle"
  >
    <span
      style={{
        width: 20,
        height: 10,
        borderRadius: 999,
        background: on ? "rgba(34,197,94,0.26)" : "rgba(148,163,184,0.35)",
        position: "relative",
        display: "inline-block",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          left: on ? 10 : 2,
          width: 6,
          height: 6,
          borderRadius: 999,
          background: on ? "rgb(74,222,128)" : "rgba(148,163,184,0.95)",
          transition: "left 120ms ease",
        }}
      />
    </span>
    {on ? labelOn : labelOff}
  </button>
);

export default function SettingsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // settings state (UI only for now)
  const [s, setS] = useState(DEFAULTS);

  // save UX
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // ---------- nav handlers ----------
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

  // derived helper text
  const payoutExplain = useMemo(() => {
    const v = Math.max(1, clampInt(s.viewsPerDollar, 1000));
    return `Clippers will be paid $1 for every ${formatNumber(v)} views generated.`;
  }, [s.viewsPerDollar]);

  const onSave = async () => {
    if (saving) return;

    // normalize values a bit
    const normalized = {
      ...s,
      headingText: String(s.headingText || "").trim(),
      watermarkText: String(s.watermarkText || "").trim(),
      viewsPerDollar: Math.max(1, clampInt(s.viewsPerDollar, 1000)),

      maxPayPerVideoUsd: Math.max(0, clampMoney(s.maxPayPerVideoUsd, 0)),
      minViewCountEligibility: Math.max(0, clampInt(s.minViewCountEligibility, 0)),
      monthlyRetainerUsd: Math.max(0, clampMoney(s.monthlyRetainerUsd, 0)),
    };

    setS(normalized);

    // UI-only for now (later: call your API)
    setSaving(true);
    setSaveMsg("");
    try {
      await new Promise((r) => setTimeout(r, 450));
      setSaveMsg("Saved (UI only). Next step: wire Save → API → BigQuery.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 2500);
    }
  };

  const onReset = () => {
    setS(DEFAULTS);
    setSaveMsg("Reset to defaults.");
    setTimeout(() => setSaveMsg(""), 1800);
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
                  padding: "7px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 12,
                  background: "transparent",
                  color: "rgba(255,255,255,0.55)",
                  marginTop: 2,
                  marginBottom: 2,
                }}
              >
                Performance
              </button>

              <button
                onClick={goLeaderboards}
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
                  marginTop: 2,
                  marginBottom: 2,
                }}
              >
                Leaderboards
              </button>

              <button
                onClick={goGallery}
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
                Gallery
              </button>

              {/* SETTINGS (active) */}
              <button
                onClick={goSettings}
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
                App configuration hub
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, position: "relative", zIndex: 3 }}>
        {/* Branding header text (uses Heading Text) */}
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

        {/* Page header */}
        <div
          style={{
            marginBottom: 18,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>Settings</div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
              Branding, payout configuration, and integrations.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {saveMsg ? (
              <div
                style={{
                  fontSize: 12,
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.6)",
                  opacity: 0.92,
                }}
              >
                {saveMsg}
              </div>
            ) : null}

            <button
              onClick={onReset}
              disabled={saving}
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                cursor: saving ? "default" : "pointer",
                borderRadius: 999,
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.2,
                color: "rgba(255,255,255,0.9)",
                background: "rgba(255,255,255,0.06)",
                opacity: saving ? 0.55 : 1,
              }}
            >
              Reset
            </button>

            <button
              onClick={onSave}
              disabled={saving}
              style={{
                border: "none",
                cursor: saving ? "default" : "pointer",
                borderRadius: 999,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: 0.2,
                color: "#0b1220",
                background: saving
                  ? "linear-gradient(135deg, rgba(250,204,21,0.55), rgba(249,115,22,0.55))"
                  : "linear-gradient(135deg, rgba(249,115,22,0.98), rgba(250,204,21,0.98))",
                boxShadow: saving
                  ? "0 12px 30px rgba(0,0,0,0.65)"
                  : "0 18px 45px rgba(250,204,21,0.20), 0 18px 45px rgba(249,115,22,0.18)",
                opacity: saving ? 0.85 : 1,
              }}
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>

        {/* GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 18 }}>
          {/* Branding */}
          <Card>
            <SectionTitle
              title="Branding"
              subtitle="These values will later be stored in BigQuery and used to render your page headers + background watermark."
            />

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <FieldLabel label="Heading Text" hint="Shown at the top of pages (big Impact text)." />
                <Input
                  value={s.headingText}
                  onChange={(e) => setS((p) => ({ ...p, headingText: e.target.value }))}
                  placeholder="Your Clipping Campaign"
                />
              </div>

              <div>
                <FieldLabel label="Watermark Text" hint="Large faint watermark behind the UI." />
                <Input
                  value={s.watermarkText}
                  onChange={(e) => setS((p) => ({ ...p, watermarkText: e.target.value }))}
                  placeholder="CLIPPING"
                  mono
                />
              </div>

              <div
                style={{
                  borderRadius: 14,
                  padding: 12,
                  background: "radial-gradient(circle at top left, rgba(96,165,250,0.14), rgba(0,0,0,0.35))",
                  border: "1px solid rgba(96,165,250,0.22)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>Preview</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  Heading: <strong style={{ opacity: 0.95 }}>{s.headingText || "—"}</strong>
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  Watermark: <strong style={{ opacity: 0.95 }}>{(s.watermarkText || "—").toUpperCase()}</strong>
                </div>
              </div>
            </div>
          </Card>

          {/* Configure payouts */}
          <Card>
            <SectionTitle
              title="Configure Payouts"
              subtitle="Define how views translate into earnings. These will later power payout calculations in BigQuery."
            />

            <div style={{ display: "grid", gap: 14 }}>
              {/* A) $1 / views */}
              <div>
                <FieldLabel label="Views Value" hint='Set how many views equal $1 of payout.' />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
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
                    <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.9 }}>$1</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>/</div>
                    <div style={{ width: 150 }}>
                      <Input
                        value={s.viewsPerDollar}
                        onChange={(e) => setS((p) => ({ ...p, viewsPerDollar: e.target.value }))}
                        placeholder="1000"
                        mono
                      />
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>Views</div>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.7 }}>{payoutExplain}</div>
                </div>
              </div>

              {/* B) Max pay per video */}
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>Max Pay Per Video</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                      Cap payouts per video so one outlier doesn’t explode costs.
                    </div>
                  </div>
                  <TogglePill on={s.maxPayEnabled} setOn={(fn) => setS((p) => ({ ...p, maxPayEnabled: fn(p.maxPayEnabled) }))} />
                </div>

                <div style={{ marginTop: 10 }}>
                  <FieldLabel label="Maximum USD per video" />
                  <Input
                    value={s.maxPayPerVideoUsd}
                    onChange={(e) => setS((p) => ({ ...p, maxPayPerVideoUsd: e.target.value }))}
                    placeholder="200"
                    disabled={!s.maxPayEnabled}
                    mono
                  />
                </div>
              </div>

              {/* C) Min view eligibility */}
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>Min View Count Eligibility</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                      Require a minimum number of views before a clipper gets paid.
                    </div>
                  </div>
                  <TogglePill
                    on={s.minViewsEnabled}
                    setOn={(fn) => setS((p) => ({ ...p, minViewsEnabled: fn(p.minViewsEnabled) }))}
                  />
                </div>

                <div style={{ marginTop: 10 }}>
                  <FieldLabel label="Minimum views" />
                  <Input
                    value={s.minViewCountEligibility}
                    onChange={(e) => setS((p) => ({ ...p, minViewCountEligibility: e.target.value }))}
                    placeholder="50000"
                    disabled={!s.minViewsEnabled}
                    mono
                  />
                </div>
              </div>

              {/* D) Monthly retainer */}
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>Monthly Retainer</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                      Flat monthly amount paid regardless of views (optional).
                    </div>
                  </div>
                  <TogglePill
                    on={s.monthlyRetainerEnabled}
                    setOn={(fn) => setS((p) => ({ ...p, monthlyRetainerEnabled: fn(p.monthlyRetainerEnabled) }))}
                  />
                </div>

                <div style={{ marginTop: 10 }}>
                  <FieldLabel label="Retainer USD" />
                  <Input
                    value={s.monthlyRetainerUsd}
                    onChange={(e) => setS((p) => ({ ...p, monthlyRetainerUsd: e.target.value }))}
                    placeholder="0"
                    disabled={!s.monthlyRetainerEnabled}
                    mono
                  />
                </div>
              </div>

              {/* quick summary */}
              <div
                style={{
                  borderRadius: 16,
                  padding: 12,
                  background: "radial-gradient(circle at top left, rgba(34,197,94,0.10), rgba(0,0,0,0.35))",
                  border: "1px solid rgba(34,197,94,0.22)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>Payout rule summary</div>
                <div style={{ fontSize: 12, opacity: 0.72, marginTop: 6, lineHeight: 1.55 }}>
                  • ${"{1}"} per {formatNumber(Math.max(1, clampInt(s.viewsPerDollar, 1000)))} views
                  <br />
                  • Max per video:{" "}
                  <strong style={{ opacity: 0.92 }}>
                    {s.maxPayEnabled ? `$${formatNumber(clampMoney(s.maxPayPerVideoUsd, 0))}` : "Off"}
                  </strong>
                  <br />
                  • Min eligibility:{" "}
                  <strong style={{ opacity: 0.92 }}>
                    {s.minViewsEnabled ? `${formatNumber(clampInt(s.minViewCountEligibility, 0))} views` : "Off"}
                  </strong>
                  <br />
                  • Monthly retainer:{" "}
                  <strong style={{ opacity: 0.92 }}>
                    {s.monthlyRetainerEnabled ? `$${formatNumber(clampMoney(s.monthlyRetainerUsd, 0))}` : "Off"}
                  </strong>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Integrations (placeholder) */}
        <div style={{ marginTop: 18 }}>
          <Card>
            <SectionTitle
              title="Integrations"
              subtitle="Connect payout providers (Stripe / Revolut / Wise). Placeholder for now — you’ll design the flow next."
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {[
                {
                  name: "Stripe",
                  desc: "Connect Stripe for automated payouts & balance tracking.",
                  badge: "COMING SOON",
                },
                {
                  name: "Revolut",
                  desc: "Send payouts via Revolut (business) integration.",
                  badge: "COMING SOON",
                },
                {
                  name: "Wise",
                  desc: "International payouts through Wise.",
                  badge: "COMING SOON",
                },
              ].map((x) => (
                <div
                  key={x.name}
                  style={{
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    minHeight: 120,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>{x.name}</div>
                    <div
                      style={{
                        fontSize: 10,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "1px solid rgba(251,146,60,0.35)",
                        background: "rgba(251,146,60,0.10)",
                        color: "rgba(255,237,213,0.95)",
                        fontWeight: 900,
                        letterSpacing: 0.2,
                      }}
                    >
                      {x.badge}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.45 }}>{x.desc}</div>

                  <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
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
              Next step: when you’re ready, we’ll add OAuth/Connect flows + store account IDs in BigQuery.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
