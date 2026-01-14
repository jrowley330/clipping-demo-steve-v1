// src/ContentApprovalPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useBranding } from "./branding/BrandingContext";

const API_BASE_URL = "https://clipper-payouts-api-810712855216.us-central1.run.app";

const unwrapValue = (v) => (v && typeof v === "object" && "value" in v ? v.value : v);

const formatNum = (v) => {
  const n = Number(unwrapValue(v));
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString();
};

const formatDate = (v) => {
  const raw = unwrapValue(v);
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function ContentApprovalPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { headingText, watermarkText, defaults } = useBranding();
  const brandText = headingText || defaults.headingText;
  const wmText = watermarkText || defaults.watermarkText;

  const [bucket, setBucket] = useState("THIS_WEEK"); // THIS_WEEK | OVERDUE | DONE | ALL
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ pending_this_week: 0, pending_overdue: 0, pending_total: 0 });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // selection + editing
  const [selected, setSelected] = useState(() => new Set());
  const [draftFeedback, setDraftFeedback] = useState({}); // key -> text
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const keyOf = (r) => `${r.platform}__${r.account_key}__${r.video_id}`;

  const fetchQueue = async () => {
    setLoading(true);
    setErr("");
    try {
      const url = new URL(`${API_BASE_URL}/content-review-queue`);
      url.searchParams.set("clientId", "default");
      url.searchParams.set("bucket", bucket);

      const resp = await fetch(url.toString());
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || "Failed to load review queue");

      setRows(Array.isArray(json.rows) ? json.rows : []);
      setCounts(json.counts || { pending_this_week: 0, pending_overdue: 0, pending_total: 0 });

      // init feedback drafts for visible rows (don’t overwrite if user already typed)
      setDraftFeedback((prev) => {
        const next = { ...prev };
        for (const r of (json.rows || [])) {
          const k = keyOf(r);
          if (next[k] === undefined) next[k] = r.feedback_text || "";
        }
        return next;
      });

      setSelected(new Set());
    } catch (e) {
      setErr(e.message || "Failed to load review queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);

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
  const goSettings = () => navigate("/settings");
  const goContentApproval = () => navigate("/content-approval");

  const visibleRows = useMemo(() => rows, [rows]);

  const allSelected = useMemo(() => {
    if (!visibleRows.length) return false;
    return visibleRows.every((r) => selected.has(keyOf(r)));
  }, [visibleRows, selected]);

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const shouldSelectAll = !allSelected;
      next.clear();
      if (shouldSelectAll) {
        for (const r of visibleRows) next.add(keyOf(r));
      }
      return next;
    });
  };

  const toggleOne = (k) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const upsertBulk = async (reviewStatus, onlyOneRow = null) => {
    setSaving(true);
    setSaveErr("");
    try {
      const session = (await supabase.auth.getSession())?.data?.session;
      const reviewedBy = session?.user?.email || session?.user?.id || "";

      const targets = onlyOneRow
        ? [onlyOneRow]
        : visibleRows.filter((r) => selected.has(keyOf(r)));

      if (!targets.length) throw new Error("Select at least one video.");

      // Require feedback on reject (recommended)
      if (reviewStatus === "REJECTED") {
        const missing = targets.find((r) => !(draftFeedback[keyOf(r)] || "").trim());
        if (missing) throw new Error("Reject requires feedback text (at least for each selected video).");
      }

      const items = targets.map((r) => ({
        clientId: r.client_id || "default",
        platform: r.platform,
        accountKey: r.account_key,
        videoId: r.video_id,
        reviewStatus,
        feedbackText: (draftFeedback[keyOf(r)] || "").trim(),
        reviewedBy,
      }));

      const resp = await fetch(`${API_BASE_URL}/content-reviews/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || "Failed to save reviews");

      await fetchQueue();
    } catch (e) {
      setSaveErr(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const openVideo = (r) => {
    const url = r.url || "";
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg0)", color: "var(--text)" }}>
      {/* Watermark */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.06,
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: 2,
          transform: "rotate(-16deg)",
          zIndex: 0,
        }}
      >
        {wmText}
      </div>

      <div style={{ display: "flex", position: "relative", zIndex: 1 }}>
        {/* Sidebar */}
        <div
          style={{
            width: sidebarOpen ? 250 : 72,
            transition: "width .2s ease",
            background: "var(--panel2)",
            borderRight: "1px solid var(--line)",
            minHeight: "100dvh",
            padding: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <button
              onClick={() => setSidebarOpen((s) => !s)}
              style={{
                background: "transparent",
                border: "1px solid var(--line)",
                color: "var(--text)",
                borderRadius: 12,
                width: 40,
                height: 40,
                cursor: "pointer",
              }}
              title="Toggle"
            >
              ☰
            </button>
            {sidebarOpen && (
              <div style={{ fontWeight: 800, letterSpacing: 0.4, lineHeight: 1.1 }}>
                {brandText}
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Manager</div>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <NavBtn label="Dashboard" open={sidebarOpen} onClick={goDashV2} />
            <NavBtn label="Payouts" open={sidebarOpen} onClick={goPayouts} />
            <NavBtn label="Content Approval" open={sidebarOpen} onClick={goContentApproval} badge={counts.pending_overdue > 0 ? "!" : ""} />
            <NavBtn label="Clippers" open={sidebarOpen} onClick={goClippers} />
            <NavBtn label="AI Performance" open={sidebarOpen} onClick={goPerformance} />
            <NavBtn label="Leaderboards" open={sidebarOpen} onClick={goLeaderboards} />
            <NavBtn label="Gallery" open={sidebarOpen} onClick={goGallery} />
            <NavBtn label="Settings" open={sidebarOpen} onClick={goSettings} />
            <div style={{ height: 8 }} />
            <NavBtn label="Logout" open={sidebarOpen} onClick={handleLogout} danger />
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 0.2 }}>Content Approval</div>
              <div style={{ color: "var(--muted)", marginTop: 4 }}>
                Pending this week: <b>{counts.pending_this_week || 0}</b> • Overdue:{" "}
                <b style={{ color: counts.pending_overdue > 0 ? "var(--text)" : "var(--muted)" }}>{counts.pending_overdue || 0}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Segment value={bucket} onChange={setBucket} counts={counts} />
              <button
                onClick={fetchQueue}
                disabled={loading}
                style={btn()}
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {err && <div style={alertBox()}>{err}</div>}
          {saveErr && <div style={alertBox()}>{saveErr}</div>}

          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden" }}>
            <div style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                <div style={{ color: "var(--muted)" }}>
                  {selected.size} selected
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button disabled={saving} onClick={() => upsertBulk("APPROVED")} style={btnPrimary()}>
                  {saving ? "Saving…" : "Approve Selected"}
                </button>
                <button disabled={saving} onClick={() => upsertBulk("REJECTED")} style={btnDanger()}>
                  Reject Selected
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                    <th style={th()}></th>
                    <th style={th()}>Bucket</th>
                    <th style={th()}>Clipper</th>
                    <th style={th()}>Platform</th>
                    <th style={th()}>Video</th>
                    <th style={th()}>Published</th>
                    <th style={th()}>Total Views</th>
                    <th style={th()}>Payable Δ</th>
                    <th style={th()}>Status</th>
                    <th style={th()}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => {
                    const k = keyOf(r);
                    const isChecked = selected.has(k);
                    const status = r.review_status || "PENDING";

                    return (
                      <tr key={k} style={{ borderTop: "1px solid var(--line)" }}>
                        <td style={td()}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleOne(k)} />
                        </td>
                        <td style={td()}>
                          <span style={pill(r.queue_bucket, r.is_overdue)}>{r.queue_bucket}</span>
                        </td>
                        <td style={td()}>{r.clipper_name}</td>
                        <td style={td()}>{r.platform}</td>
                        <td style={td()}>
                          <div style={{ fontWeight: 700 }}>{r.title || r.video_id}</div>
                          <div style={{ color: "var(--muted)", fontSize: 12 }}>{r.account || r.account_key}</div>
                          <div style={{ marginTop: 8 }}>
                            <textarea
                              value={draftFeedback[k] ?? ""}
                              onChange={(e) => setDraftFeedback((p) => ({ ...p, [k]: e.target.value }))}
                              placeholder="Feedback (required for reject)"
                              rows={2}
                              style={{
                                width: "100%",
                                resize: "vertical",
                                background: "var(--bg1)",
                                border: "1px solid var(--line)",
                                borderRadius: 12,
                                color: "var(--text)",
                                padding: 10,
                                outline: "none",
                              }}
                            />
                          </div>
                        </td>
                        <td style={td()}>{formatDate(r.published_at)}</td>
                        <td style={td()}>{formatNum(r.total_views_video)}</td>
                        <td style={td()}>{formatNum(r.payable_delta_views)}</td>
                        <td style={td()}>
                          <span style={statusPill(status)}>{status}</span>
                        </td>
                        <td style={td()}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={() => openVideo(r)} disabled={!r.url} style={btn()}>
                              View
                            </button>
                            <button disabled={saving} onClick={() => upsertBulk("APPROVED", r)} style={btnPrimary()}>
                              Approve
                            </button>
                            <button disabled={saving} onClick={() => upsertBulk("REJECTED", r)} style={btnDanger()}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && !visibleRows.length && (
                    <tr>
                      <td colSpan={10} style={{ padding: 18, color: "var(--muted)" }}>
                        No rows for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {loading && (
              <div style={{ padding: 18, color: "var(--muted)" }}>
                Loading…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ label, onClick, open, danger, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: open ? "space-between" : "center",
        gap: 10,
        padding: open ? "10px 12px" : "10px 0",
        background: danger ? "transparent" : "var(--btnDark)",
        border: "1px solid var(--line)",
        color: danger ? "#ffb4b4" : "var(--text)",
        borderRadius: 14,
        cursor: "pointer",
      }}
      title={label}
    >
      <span style={{ fontWeight: 700, fontSize: 14 }}>{open ? label : label[0]}</span>
      {open && badge && (
        <span style={{ background: "#b33", color: "white", borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 900 }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Segment({ value, onChange, counts }) {
  const items = [
    { v: "THIS_WEEK", label: `This Week (${counts.pending_this_week || 0})` },
    { v: "OVERDUE", label: `Overdue (${counts.pending_overdue || 0})` },
    { v: "DONE", label: "Done" },
    { v: "ALL", label: "All" },
  ];

  return (
    <div style={{ display: "flex", gap: 8, background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 14, padding: 6 }}>
      {items.map((it) => {
        const active = value === it.v;
        return (
          <button
            key={it.v}
            onClick={() => onChange(it.v)}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: "8px 10px",
              cursor: "pointer",
              background: active ? "var(--blue1)" : "transparent",
              color: active ? "white" : "var(--text)",
              fontWeight: 800,
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// styles
const th = () => ({ padding: "10px 12px" });
const td = () => ({ padding: "12px 12px", verticalAlign: "top" });

const btn = () => ({
  background: "transparent",
  border: "1px solid var(--line)",
  color: "var(--text)",
  borderRadius: 12,
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 800,
});

const btnPrimary = () => ({
  background: "var(--blue1)",
  border: "1px solid var(--blue2)",
  color: "white",
  borderRadius: 12,
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 900,
});

const btnDanger = () => ({
  background: "transparent",
  border: "1px solid #7a2c2c",
  color: "#ffb4b4",
  borderRadius: 12,
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 900,
});

const alertBox = () => ({
  marginBottom: 12,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid var(--line)",
  borderRadius: 14,
  padding: 12,
  color: "var(--text)",
});

function pill(bucket, overdue) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid var(--line)",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 900,
  };
  if (bucket === "OVERDUE" || overdue) return { ...base, color: "#ffb4b4", borderColor: "#7a2c2c" };
  if (bucket === "THIS_WEEK") return { ...base, color: "white" };
  return { ...base, color: "var(--muted)" };
}

function statusPill(status) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid var(--line)",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 900,
  };
  if (status === "APPROVED") return { ...base, borderColor: "rgba(45,183,168,.5)", color: "rgba(175,255,245,.95)" };
  if (status === "REJECTED") return { ...base, borderColor: "rgba(179,51,51,.6)", color: "#ffb4b4" };
  return { ...base, color: "white" };
}
