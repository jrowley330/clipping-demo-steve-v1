import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const DEFAULT_CLIENT_ID = "default";

const fmtInt = (n) => {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const fmtDate = (v) => {
  if (!v) return "—";
  // BigQuery can come back as { value: "..." } or string
  const s = typeof v === "object" && v?.value ? v.value : v;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s).slice(0, 10);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const keyOf = (r) => `${r.client_id}|${r.platform}|${r.account_key}|${r.video_id}`;

export default function ContentApprovalPage() {
  const nav = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [clientId, setClientId] = useState(
    String(localStorage.getItem("clientId") || DEFAULT_CLIENT_ID).trim() || DEFAULT_CLIENT_ID
  );

  const [headingText, setHeadingText] = useState("");
  const [watermarkText, setWatermarkText] = useState("");

  const [bucket, setBucket] = useState("THIS_WEEK"); // THIS_WEEK | OVERDUE | DONE | ALL
  const [platform, setPlatform] = useState("all"); // all | instagram | tiktok | youtube
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ pending_this_week: 0, pending_overdue: 0, pending_total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  const [selected, setSelected] = useState(new Set());
  const [draftFeedback, setDraftFeedback] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saveOk, setSaveOk] = useState("");

  // --------- session guard ----------
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        nav("/login", { replace: true });
        return;
      }
    })();
  }, [nav]);

  // --------- load settings (heading/watermark) ----------
  useEffect(() => {
    (async () => {
      try {
        const cid = String(localStorage.getItem("clientId") || DEFAULT_CLIENT_ID).trim() || DEFAULT_CLIENT_ID;
        setClientId(cid);

        const resp = await fetch(`${API_BASE_URL}/settings?clientId=${encodeURIComponent(cid)}`);
        if (resp.ok) {
          const j = await resp.json().catch(() => null);
          const ht = (j?.headingText ?? j?.heading_text ?? "").toString();
          const wt = (j?.watermarkText ?? j?.watermark_text ?? "").toString();
          setHeadingText(ht);
          setWatermarkText(wt);
        } else {
          setHeadingText("");
          setWatermarkText("");
        }
      } catch {
        setHeadingText("");
        setWatermarkText("");
      }
    })();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    setLoadErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("clientId", clientId || DEFAULT_CLIENT_ID);
      qs.set("bucket", bucket);
      if (platform && platform !== "all") qs.set("platform", platform);

      const resp = await fetch(`${API_BASE_URL}/content-review-queue?${qs.toString()}`);
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `Failed (${resp.status})`);
      }
      const j = await resp.json().catch(() => null);
      const r = Array.isArray(j?.rows) ? j.rows : [];
      setRows(r);
      setCounts(j?.counts || { pending_this_week: 0, pending_overdue: 0, pending_total: 0 });

      // prune selections that no longer exist
      setSelected((prev) => {
        const next = new Set();
        const keys = new Set(r.map(keyOf));
        for (const k of prev) if (keys.has(k)) next.add(k);
        return next;
      });
    } catch (e) {
      setLoadErr(e?.message || "Failed to load");
      setRows([]);
      setCounts({ pending_this_week: 0, pending_overdue: 0, pending_total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, bucket, platform]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.clipper_name,
        r.platform,
        r.account,
        r.account_key,
        r.video_id,
        r.title,
        r.url,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const selectedCount = useMemo(() => selected.size, [selected]);

  const selectAllVisible = () => {
    const next = new Set(selected);
    visibleRows.forEach((r) => next.add(keyOf(r)));
    setSelected(next);
  };

  const clearSelection = () => setSelected(new Set());

  const toggleOne = (r) => {
    const k = keyOf(r);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const setFeedback = (r, txt) => {
    const k = keyOf(r);
    setDraftFeedback((prev) => ({ ...prev, [k]: txt }));
  };

  const openVideo = (r) => {
    const url = r.url || r.ai_url || "";
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const saveReviews = async (reviewStatus, onlyOneRow = null) => {
    if (saving) return;
    setSaving(true);
    setSaveErr("");
    setSaveOk("");

    try {
      const session = (await supabase.auth.getSession())?.data?.session;
      const reviewedBy = session?.user?.email || session?.user?.id || "";

      const targets = onlyOneRow ? [onlyOneRow] : visibleRows.filter((r) => selected.has(keyOf(r)));
      if (!targets.length) throw new Error("Select at least one video.");

      if (reviewStatus === "REJECTED") {
        const missing = targets.find((r) => !(draftFeedback[keyOf(r)] || "").trim());
        if (missing) throw new Error("Reject requires feedback text for each selected video.");
      }

      const items = targets.map((r) => ({
        clientId: r.client_id || DEFAULT_CLIENT_ID,
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

      const j = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(j?.error || "Failed to save reviews");

      setSaveOk(reviewStatus === "APPROVED" ? "Approved." : "Rejected.");
      setTimeout(() => setSaveOk(""), 1500);

      clearSelection();
      await fetchQueue();
    } catch (e) {
      setSaveErr(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // --------- navigation ----------
  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav("/login", { replace: true });
  };

  const go = (path) => nav(path);

  // --------- UI helpers ----------
  const Pill = ({ active, children, onClick, tint = "rgba(148,163,184,0.12)" }) => (
    <button
      onClick={onClick}
      type="button"
      style={{
        borderRadius: 999,
        padding: "8px 12px",
        border: active ? "1px solid rgba(251,191,36,0.55)" : "1px solid rgba(148,163,184,0.35)",
        background: active ? "rgba(251,191,36,0.18)" : tint,
        color: active ? "rgba(255,255,255,0.95)" : "rgba(229,231,235,0.9)",
        fontSize: 13,
        fontWeight: 800,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );

  const NavBtn = ({ label, onClick, active, badge, danger }) => (
    <button
      onClick={onClick}
      type="button"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: sidebarOpen ? "space-between" : "center",
        gap: 10,
        padding: sidebarOpen ? "10px 12px" : "10px 0",
        borderRadius: 14,
        border: active ? "1px solid rgba(251,191,36,0.55)" : "1px solid rgba(148,163,184,0.22)",
        background: active ? "rgba(251,191,36,0.14)" : "rgba(15,23,42,0.30)",
        color: danger ? "rgba(255,180,180,0.95)" : "rgba(229,231,235,0.92)",
        cursor: "pointer",
      }}
      title={label}
    >
      <span style={{ fontWeight: 800, fontSize: 13 }}>{sidebarOpen ? label : label[0]}</span>
      {sidebarOpen && badge ? (
        <span
          style={{
            background: "rgba(239,68,68,0.20)",
            border: "1px solid rgba(239,68,68,0.45)",
            color: "rgba(255,220,220,0.95)",
            borderRadius: 999,
            padding: "2px 8px",
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );

  const btn = (variant) => {
    const base = {
      borderRadius: 999,
      padding: "9px 14px",
      border: "1px solid rgba(148,163,184,0.45)",
      background: "rgba(15,23,42,0.65)",
      color: "rgba(229,231,235,0.95)",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 800,
      whiteSpace: "nowrap",
      opacity: saving ? 0.6 : 1,
      pointerEvents: saving ? "none" : "auto",
    };

    if (variant === "primary") {
      return {
        ...base,
        border: "1px solid rgba(34,197,94,0.55)",
        background: "rgba(34,197,94,0.16)",
        color: "rgba(220,255,236,0.98)",
      };
    }

    if (variant === "danger") {
      return {
        ...base,
        border: "1px solid rgba(239,68,68,0.55)",
        background: "rgba(239,68,68,0.14)",
        color: "rgba(255,230,230,0.98)",
      };
    }

    if (variant === "ghost") {
      return {
        ...base,
        background: "rgba(255,255,255,0.04)",
      };
    }

    return base;
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
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.06,
          fontSize: 82,
          fontWeight: 900,
          letterSpacing: 2,
          transform: "rotate(-16deg)",
          zIndex: 0,
          color: "rgba(255,255,255,0.9)",
          textTransform: "uppercase",
        }}
      >
        {String(watermarkText || headingText || "CONTENT").slice(0, 28)}
      </div>

      {/* Shell */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", gap: 18 }}>
        {/* Sidebar */}
        <div
          style={{
            width: sidebarOpen ? 250 : 74,
            transition: "width .2s ease",
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.20)",
            background: "rgba(2,6,23,0.50)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            padding: 14,
            height: "fit-content",
            position: "sticky",
            top: 28,
            alignSelf: "flex-start",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button
              onClick={() => setSidebarOpen((s) => !s)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.25)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(229,231,235,0.95)",
                cursor: "pointer",
                fontWeight: 900,
              }}
              title="Toggle"
            >
              {sidebarOpen ? "◀" : "▶"}
            </button>

            {sidebarOpen && (
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ fontWeight: 900, letterSpacing: 0.6, fontSize: 14 }}>
                  {(headingText || "HEADING TEXT FROM SETTINGS").toUpperCase()}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Manager</div>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <NavBtn label="Dashboards" active={false} onClick={() => go("/dashboard-v2")} />
            <NavBtn label="Payouts" active={false} onClick={() => go("/payouts")} />
            <NavBtn
              label="Content Approval"
              active={true}
              onClick={() => go("/content-approval")}
              badge={counts?.pending_overdue > 0 ? "!" : ""}
            />
            <NavBtn label="Clippers" active={false} onClick={() => go("/clippers")} />
            <NavBtn label="Performance" active={false} onClick={() => go("/performance")} />
            <NavBtn label="Leaderboards" active={false} onClick={() => go("/leaderboards")} />
            <NavBtn label="Gallery" active={false} onClick={() => go("/gallery")} />
            <NavBtn label="Settings" active={false} onClick={() => go("/settings")} />
            <div style={{ height: 8 }} />
            <NavBtn label="Logout" danger onClick={handleLogout} />
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 44, fontWeight: 950, letterSpacing: 0.6, lineHeight: 0.95 }}>
                Content Approval
              </div>
              <div style={{ marginTop: 8, fontSize: 14, opacity: 0.78 }}>
                Pending this week: <strong>{counts?.pending_this_week || 0}</strong> · Overdue:{" "}
                <strong style={{ color: counts?.pending_overdue > 0 ? "rgb(251,113,133)" : "rgba(229,231,235,0.95)" }}>
                  {counts?.pending_overdue || 0}
                </strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Pill active={bucket === "THIS_WEEK"} onClick={() => setBucket("THIS_WEEK")}>
                This week ({counts?.pending_this_week || 0})
              </Pill>
              <Pill active={bucket === "OVERDUE"} onClick={() => setBucket("OVERDUE")} tint="rgba(239,68,68,0.10)">
                Past due ({counts?.pending_overdue || 0})
              </Pill>
              <Pill active={bucket === "DONE"} onClick={() => setBucket("DONE")}>
                Done
              </Pill>
              <Pill active={bucket === "ALL"} onClick={() => setBucket("ALL")}>
                All
              </Pill>

              <button onClick={fetchQueue} style={btn("ghost")}>
                Refresh
              </button>
            </div>
          </div>

          {/* Controls */}
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.22)",
              background: "rgba(2,6,23,0.45)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  style={{
                    padding: "9px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(15,23,42,0.75)",
                    color: "rgba(229,231,235,0.95)",
                    fontSize: 13,
                    fontWeight: 800,
                    outline: "none",
                  }}
                >
                  <option value="all">All platforms</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                </select>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clipper / account / title / video id…"
                  style={{
                    minWidth: 320,
                    flex: "1 1 320px",
                    padding: "9px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(15,23,42,0.65)",
                    color: "rgba(229,231,235,0.95)",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  <strong>{selectedCount}</strong> selected
                </div>
                <button onClick={selectAllVisible} style={btn("ghost")}>
                  Select all loaded
                </button>
                <button onClick={clearSelection} style={btn("ghost")}>
                  Clear
                </button>
                <button onClick={() => saveReviews("APPROVED")} style={btn("primary")}>
                  Approve selected
                </button>
                <button onClick={() => saveReviews("REJECTED")} style={btn("danger")}>
                  Reject selected
                </button>
              </div>
            </div>

            {(loadErr || saveErr || saveOk) && (
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {loadErr && (
                  <div style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)" }}>
                    {loadErr}
                  </div>
                )}
                {saveErr && (
                  <div style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.12)" }}>
                    {saveErr}
                  </div>
                )}
                {saveOk && (
                  <div style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.12)" }}>
                    {saveOk}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.22)",
              background: "rgba(2,6,23,0.45)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                <thead>
                  <tr style={{ background: "rgba(15,23,42,0.55)" }}>
                    <th style={th()}> </th>
                    <th style={th()}>Bucket</th>
                    <th style={th()}>Clipper</th>
                    <th style={th()}>Platform</th>
                    <th style={th()}>Video</th>
                    <th style={th()}>Eligible</th>
                    <th style={th()}>Published</th>
                    <th style={th()}>Total views</th>
                    <th style={th()}>Status</th>
                    <th style={th()}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.map((r) => {
                    const k = keyOf(r);
                    const isChecked = selected.has(k);

                    const bucketLabel =
                      r.queue_bucket === "THIS_WEEK" ? "THIS WEEK" : r.queue_bucket === "OVERDUE" ? "OVERDUE" : "DONE";

                    const overdue = !!r.is_overdue;

                    const status = String(r.review_status || "").toUpperCase();

                    return (
                      <tr key={k} style={{ borderTop: "1px solid rgba(148,163,184,0.12)" }}>
                        <td style={td()}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleOne(r)} />
                        </td>

                        <td style={td()}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "6px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 900,
                              letterSpacing: 0.6,
                              border: overdue ? "1px solid rgba(239,68,68,0.45)" : "1px solid rgba(148,163,184,0.28)",
                              background: overdue ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
                              color: overdue ? "rgba(255,220,220,0.95)" : "rgba(229,231,235,0.92)",
                            }}
                          >
                            {bucketLabel}
                          </span>
                        </td>

                        <td style={td()}>
                          <div style={{ fontWeight: 900, marginBottom: 4 }}>{r.clipper_name || "—"}</div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>{r.account || r.account_key || "—"}</div>
                        </td>

                        <td style={td()}>
                          <div style={{ fontWeight: 900, textTransform: "capitalize" }}>{r.platform || "—"}</div>
                        </td>

                        <td style={td()}>
                          <div style={{ fontWeight: 800, lineHeight: 1.25, maxWidth: 520 }}>
                            {r.title ? String(r.title).slice(0, 140) : r.video_id || "—"}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>{r.video_id}</div>
                        </td>

                        <td style={td()}>
                          <div style={{ fontWeight: 900 }}>{fmtDate(r.snapshot_date)}</div>
                          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                            {r.became_eligible_this_snapshot ? (
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: 999,
                                  border: "1px solid rgba(34,197,94,0.55)",
                                  background: "rgba(34,197,94,0.14)",
                                  color: "rgba(220,255,236,0.98)",
                                  fontWeight: 900,
                                }}
                              >
                                NEW
                              </span>
                            ) : (
                              <span style={{ opacity: 0.65 }}>eligible</span>
                            )}
                          </div>
                        </td>

                        <td style={td()}>{fmtDate(r.published_at)}</td>

                        <td style={td()}>
                          <div style={{ fontWeight: 950, fontSize: 16 }}>{fmtInt(r.total_views_video ?? r.latest_view_count ?? 0)}</div>
                          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                            min: {fmtInt(r.min_view_count_eligibility ?? 0)}
                          </div>
                        </td>

                        <td style={td()}>
                          <div style={{ fontWeight: 950 }}>
                            {status === "PENDING" ? (
                              <span style={{ color: "rgba(251,191,36,0.95)" }}>PENDING</span>
                            ) : status === "APPROVED" ? (
                              <span style={{ color: "rgb(74,222,128)" }}>APPROVED</span>
                            ) : (
                              <span style={{ color: "rgb(251,113,133)" }}>REJECTED</span>
                            )}
                          </div>

                          <div style={{ marginTop: 8 }}>
                            <textarea
                              value={draftFeedback[k] ?? r.feedback_text ?? ""}
                              onChange={(e) => setFeedback(r, e.target.value)}
                              placeholder="Feedback (required for reject)"
                              style={{
                                width: 260,
                                minHeight: 44,
                                resize: "vertical",
                                padding: "8px 10px",
                                borderRadius: 12,
                                border: "1px solid rgba(148,163,184,0.28)",
                                background: "rgba(15,23,42,0.55)",
                                color: "rgba(229,231,235,0.95)",
                                outline: "none",
                                fontSize: 12,
                              }}
                            />
                          </div>
                        </td>

                        <td style={td()}>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button onClick={() => openVideo(r)} style={btn("ghost")}>
                              View
                            </button>
                            <button onClick={() => saveReviews("APPROVED", r)} style={btn("primary")}>
                              Approve
                            </button>
                            <button onClick={() => saveReviews("REJECTED", r)} style={btn("danger")}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && !visibleRows.length && (
                    <tr>
                      <td colSpan={10} style={{ padding: 18, opacity: 0.7 }}>
                        No rows for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {loading && <div style={{ padding: 18, opacity: 0.7 }}>Loading…</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const th = () => ({
  padding: "12px 12px",
  textAlign: "left",
  fontSize: 12,
  letterSpacing: 0.08,
  textTransform: "uppercase",
  opacity: 0.75,
});

const td = () => ({
  padding: "14px 12px",
  verticalAlign: "top",
  fontSize: 13,
});
