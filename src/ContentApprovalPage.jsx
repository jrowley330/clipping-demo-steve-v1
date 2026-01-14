import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useBranding } from "./BrandingContext";

const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "") || "";

function fmtDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(d);
  }
}

function fmtNum(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString();
}

function pillStyle(kind) {
  // reuse the "soft pill" vibe used across the app
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.2,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.85)",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };

  if (kind === "APPROVED")
    return {
      ...base,
      border: "1px solid rgba(34,197,94,0.35)",
      background: "rgba(34,197,94,0.10)",
      color: "rgba(255,255,255,0.92)",
    };

  if (kind === "REJECTED")
    return {
      ...base,
      border: "1px solid rgba(239,68,68,0.35)",
      background: "rgba(239,68,68,0.10)",
      color: "rgba(255,255,255,0.92)",
    };

  if (kind === "PENDING")
    return {
      ...base,
      border: "1px solid rgba(250,204,21,0.30)",
      background: "rgba(250,204,21,0.10)",
      color: "rgba(255,255,255,0.92)",
    };

  if (kind === "OVERDUE")
    return {
      ...base,
      border: "1px solid rgba(251,113,133,0.35)",
      background: "rgba(251,113,133,0.10)",
      color: "rgba(255,255,255,0.92)",
    };

  return base;
}

export default function ContentApprovalPage() {
  const navigate = useNavigate();
  const { headingText, watermarkText, clientId } = useBranding();

  const [authed, setAuthed] = useState(false);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState("THIS_WEEK"); // THIS_WEEK | OVERDUE | DONE | ALL
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");

  // data state
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ this_week: 0, overdue: 0, done: 0, all: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // selection + feedback drafts (for rejections)
  const [selected, setSelected] = useState(() => new Set());
  const [feedbackDraft, setFeedbackDraft] = useState({}); // key -> text

  // ---- auth gate (same pattern you use everywhere) ----
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        navigate("/login", { replace: true });
        return;
      }
      setAuthed(true);
    })();
  }, [navigate]);

  const effectiveClientId = (clientId || "default").trim() || "default";

  async function fetchQueue() {
    if (!API_BASE) {
      setError("Missing VITE_API_BASE_URL");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/content-review-queue`);
      url.searchParams.set("client_id", effectiveClientId);

      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const json = await res.json();

      setRows(Array.isArray(json?.rows) ? json.rows : []);
      setCounts(
        json?.counts || { this_week: 0, overdue: 0, done: 0, all: 0 }
      );

      // Keep selections only if they still exist
      setSelected((prev) => {
        const next = new Set();
        const rowKeys = new Set((json?.rows || []).map((r) => rowKey(r)));
        for (const k of prev) if (rowKeys.has(k)) next.add(k);
        return next;
      });
    } catch (e) {
      setError(e?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authed) return;
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, effectiveClientId]);

  function rowKey(r) {
    return [
      r?.client_id || "default",
      r?.platform || "",
      r?.account_key || "",
      r?.video_id || "",
    ].join("|");
  }

  const filteredRows = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return (rows || [])
      .filter((r) => {
        if (tab === "THIS_WEEK") return r.queue_bucket === "THIS_WEEK";
        if (tab === "OVERDUE") return r.queue_bucket === "OVERDUE";
        if (tab === "DONE") return r.queue_bucket === "DONE";
        return true; // ALL
      })
      .filter((r) => {
        if (platformFilter === "all") return true;
        return (r.platform || "").toLowerCase() === platformFilter;
      })
      .filter((r) => {
        if (!q) return true;
        const blob = [
          r.clipper_name,
          r.platform,
          r.account,
          r.account_key,
          r.video_id,
          r.title,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });
  }, [rows, tab, platformFilter, search]);

  const selectedCount = selected.size;

  function toggleSelected(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllLoaded() {
    setSelected(new Set(filteredRows.map((r) => rowKey(r))));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function openVideo(r) {
    const url = r?.url || r?.ai_url;
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function bulkUpdate(status) {
    setError("");
    if (!API_BASE) return setError("Missing VITE_API_BASE_URL");
    if (!selectedCount) return;

    // if rejecting, feedback is required for each selected row
    if (status === "REJECTED") {
      for (const k of selected) {
        const t = (feedbackDraft[k] || "").trim();
        if (!t) {
          setError("Feedback is required for every rejected video (selected).");
          return;
        }
      }
    }

    // build items from selected keys
    const keyToRow = new Map(filteredRows.map((r) => [rowKey(r), r]));
    const items = [];
    for (const k of selected) {
      const r = keyToRow.get(k) || rows.find((x) => rowKey(x) === k);
      if (!r) continue;

      items.push({
        client_id: r.client_id || effectiveClientId,
        platform: r.platform,
        account_key: r.account_key,
        video_id: r.video_id,
        review_status: status,
        feedback_text: status === "REJECTED" ? (feedbackDraft[k] || "").trim() : "",
        reviewed_by: "manager", // you can wire this later to real user/email
      });
    }

    if (!items.length) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/content-reviews/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Save failed (${res.status}) ${msg}`.trim());
      }

      // refresh
      await fetchQueue();
      setSelected(new Set());
    } catch (e) {
      setError(e?.message || "Failed to save review status");
    } finally {
      setSaving(false);
    }
  }

  async function updateSingle(r, status) {
    const k = rowKey(r);
    if (status === "REJECTED") {
      const t = (feedbackDraft[k] || "").trim();
      if (!t) {
        setError("Feedback is required to reject a video.");
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        items: [
          {
            client_id: r.client_id || effectiveClientId,
            platform: r.platform,
            account_key: r.account_key,
            video_id: r.video_id,
            review_status: status,
            feedback_text: status === "REJECTED" ? (feedbackDraft[k] || "").trim() : "",
            reviewed_by: "manager",
          },
        ],
      };

      const res = await fetch(`${API_BASE}/content-reviews/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Save failed (${res.status}) ${msg}`.trim());
      }

      await fetchQueue();
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    } catch (e) {
      setError(e?.message || "Failed to save review status");
    } finally {
      setSaving(false);
    }
  }

  // ---- nav handlers (match other pages) ----
  const goDash = () => navigate("/dashboard-v2");
  const goPayouts = () => navigate("/payouts");
  const goClippers = () => navigate("/clippers");
  const goPerformance = () => navigate("/performance");
  const goLeaderboards = () => navigate("/leaderboards");
  const goGallery = () => navigate("/gallery");
  const goSettings = () => navigate("/settings");
  const goContentApproval = () => navigate("/content-approval");

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  // ---- styles (copied “vibe” from your other pages) ----
  const pageWrap = {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 700px at 50% 0%, rgba(255,255,255,0.07), rgba(0,0,0,0) 60%), radial-gradient(900px 520px at 70% 40%, rgba(249,115,22,0.10), rgba(0,0,0,0) 55%), #05070b",
    color: "rgba(255,255,255,0.92)",
    position: "relative",
    overflow: "hidden",
  };

  const watermark = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    opacity: 0.06,
    fontSize: 140,
    fontWeight: 900,
    letterSpacing: 2,
    transform: "rotate(-14deg)",
    userSelect: "none",
    color: "rgba(255,255,255,1)",
    textTransform: "uppercase",
  };

  const layout = {
    display: "grid",
    gridTemplateColumns: sidebarOpen ? "260px 1fr" : "70px 1fr",
    gap: 18,
    padding: 18,
  };

  const sidebarCard = {
    borderRadius: 18,
    background: "rgba(0,0,0,0.80)",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.8)",
    padding: 10,
    height: "calc(100vh - 36px)",
    position: "sticky",
    top: 18,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  const main = {
    borderRadius: 18,
    background: "rgba(0,0,0,0.45)",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.55)",
    padding: 18,
    minHeight: "calc(100vh - 36px)",
  };

  const topHeader = {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 14,
  };

  const headingBlock = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };

  const headingTop = {
    fontSize: 44,
    fontWeight: 900,
    letterSpacing: -0.6,
    lineHeight: 1.05,
    margin: 0,
  };

  const subRow = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    opacity: 0.85,
    fontSize: 13,
  };

  const tabsRow = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  };

  const tabBtn = (active, accent = "neutral") => ({
    border: "1px solid rgba(255,255,255,0.14)",
    background: active
      ? accent === "gold"
        ? "linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))"
        : accent === "red"
        ? "linear-gradient(135deg, rgba(239,68,68,0.30), rgba(251,113,133,0.22))"
        : "rgba(255,255,255,0.10)"
      : "rgba(255,255,255,0.06)",
    color: active
      ? accent === "gold"
        ? "#020617"
        : "rgba(255,255,255,0.95)"
      : "rgba(255,255,255,0.78)",
    borderRadius: 999,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: active ? "0 10px 30px rgba(0,0,0,0.35)" : "none",
  });

  const panel = {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    padding: 14,
    marginTop: 10,
  };

  const controls = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  };

  const select = {
    height: 40,
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.9)",
    padding: "0 12px",
    outline: "none",
    minWidth: 160,
  };

  const input = {
    height: 40,
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.9)",
    padding: "0 14px",
    outline: "none",
    minWidth: 360,
    flex: 1,
  };

  const btn = (variant) => {
    const base = {
      borderRadius: 999,
      height: 40,
      padding: "0 14px",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 13,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.9)",
    };

    if (variant === "approve")
      return {
        ...base,
        border: "1px solid rgba(34,197,94,0.35)",
        background: "rgba(34,197,94,0.16)",
      };

    if (variant === "reject")
      return {
        ...base,
        border: "1px solid rgba(239,68,68,0.35)",
        background: "rgba(239,68,68,0.14)",
      };

    if (variant === "gold")
      return {
        ...base,
        border: "none",
        background:
          "linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))",
        color: "#020617",
      };

    return base;
  };

  const tableWrap = {
    marginTop: 14,
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.35)",
  };

  const th = {
    textAlign: "left",
    fontSize: 11,
    letterSpacing: 0.25,
    textTransform: "uppercase",
    opacity: 0.70,
    padding: "12px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    whiteSpace: "nowrap",
  };

  const td = {
    padding: "12px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    verticalAlign: "top",
    fontSize: 13,
    color: "rgba(255,255,255,0.88)",
  };

  const tiny = { fontSize: 11, opacity: 0.7 };

  // ---- render ----
  return (
    <div style={pageWrap}>
      <div style={watermark}>{(watermarkText || "CONTENT")}</div>

      <div style={layout}>
        {/* Sidebar */}
        <div style={sidebarCard}>
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
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>

          {sidebarOpen && (
            <>
              <div style={{ padding: "6px 8px 2px 8px" }}>
                <div
                  style={{
                    fontWeight: 900,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    fontSize: 14,
                    lineHeight: 1.1,
                  }}
                >
                  {headingText || "HEADING TEXT FROM SETTINGS"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  Manager
                </div>
              </div>

              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.1,
                  opacity: 0.55,
                  marginTop: 8,
                  marginBottom: 2,
                  padding: "0 8px",
                }}
              >
                Navigation
              </div>

              <button onClick={goDash} style={navBtn(false)}>
                Dashboards
              </button>

              <button onClick={goContentApproval} style={navBtn(true)}>
                Content Approval
              </button>

              <button onClick={goPayouts} style={navBtn(false)}>
                Payouts
              </button>

              <button onClick={goClippers} style={navBtn(false)}>
                Clippers
              </button>

              <button onClick={goPerformance} style={navBtn(false)}>
                Performance
              </button>

              <button onClick={goLeaderboards} style={navBtn(false)}>
                Leaderboards
              </button>

              <button onClick={goGallery} style={navBtn(false)}>
                Gallery
              </button>

              <button onClick={goSettings} style={navBtn(false)}>
                Settings
              </button>

              <div style={{ flex: 1 }} />

              <button
                onClick={onLogout}
                style={{
                  border: "none",
                  outline: "none",
                  borderRadius: 12,
                  padding: "10px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 13,
                  background: "transparent",
                  color: "rgba(251,113,133,0.95)",
                  fontWeight: 700,
                }}
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* Main */}
        <div style={main}>
          <div style={topHeader}>
            <div style={headingBlock}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  opacity: 0.9,
                }}
              >
                {headingText || "HEADING TEXT FROM SETTINGS"}
              </div>

              <h1 style={headingTop}>Content Approval</h1>

              <div style={subRow}>
                <span style={{ opacity: 0.85 }}>
                  Pending this week: <b>{counts.this_week || 0}</b>
                </span>
                <span style={{ opacity: 0.55 }}>•</span>
                <span style={{ opacity: 0.85 }}>
                  Overdue: <b>{counts.overdue || 0}</b>
                </span>
                {saving && (
                  <>
                    <span style={{ opacity: 0.55 }}>•</span>
                    <span style={{ opacity: 0.75 }}>Saving…</span>
                  </>
                )}
                {loading && (
                  <>
                    <span style={{ opacity: 0.55 }}>•</span>
                    <span style={{ opacity: 0.75 }}>Loading…</span>
                  </>
                )}
              </div>

              <div style={{ ...tiny, marginTop: 2 }}>
                Client: <b>{effectiveClientId}</b>
              </div>
            </div>

            <div style={tabsRow}>
              <button
                style={tabBtn(tab === "THIS_WEEK", "gold")}
                onClick={() => setTab("THIS_WEEK")}
              >
                This week ({counts.this_week || 0})
              </button>
              <button
                style={tabBtn(tab === "OVERDUE", "red")}
                onClick={() => setTab("OVERDUE")}
              >
                Past due ({counts.overdue || 0})
              </button>
              <button
                style={tabBtn(tab === "DONE")}
                onClick={() => setTab("DONE")}
              >
                Done
              </button>
              <button
                style={tabBtn(tab === "ALL")}
                onClick={() => setTab("ALL")}
              >
                All
              </button>
              <button style={tabBtn(false)} onClick={fetchQueue}>
                Refresh
              </button>
            </div>
          </div>

          <div style={panel}>
            <div style={controls}>
              <select
                style={select}
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
              >
                <option value="all">All platforms</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>

              <input
                style={input}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clipper / account / title / video id…"
              />

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  <b>{selectedCount}</b> selected
                </div>
                <button style={btn()} onClick={selectAllLoaded}>
                  Select all loaded
                </button>
                <button style={btn()} onClick={clearSelection}>
                  Clear
                </button>
                <button
                  style={btn("approve")}
                  onClick={() => bulkUpdate("APPROVED")}
                  disabled={!selectedCount || saving}
                >
                  Approve selected
                </button>
                <button
                  style={btn("reject")}
                  onClick={() => bulkUpdate("REJECTED")}
                  disabled={!selectedCount || saving}
                >
                  Reject selected
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "rgba(255,255,255,0.92)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            )}
          </div>

          <div style={tableWrap}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                <thead>
                  <tr>
                    <th style={th}></th>
                    <th style={th}>Bucket</th>
                    <th style={th}>Clipper</th>
                    <th style={th}>Platform</th>
                    <th style={th}>Video</th>
                    <th style={th}>Eligible</th>
                    <th style={th}>Published</th>
                    <th style={th}>Total views</th>
                    <th style={th}>Payable views</th>
                    <th style={th}>Status</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td style={td} colSpan={11}>
                        <div style={{ opacity: 0.65 }}>No rows for this filter.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => {
                      const k = rowKey(r);
                      const isSel = selected.has(k);

                      const bucket = r.queue_bucket || "—";
                      const bucketPill =
                        bucket === "OVERDUE"
                          ? "OVERDUE"
                          : bucket === "THIS_WEEK"
                          ? "PENDING"
                          : bucket === "DONE"
                          ? (r.review_status || "DONE")
                          : (r.review_status || "—");

                      // eligible_for_review_date = snapshot_date where became eligible
                      const eligibleDate =
                        r.became_eligible_this_snapshot ? r.snapshot_date : null;

                      const status = (r.review_status || "PENDING").toUpperCase();

                      const showFeedback =
                        status === "PENDING" || status === "REJECTED"; // allow edit while pending; show reason if rejected

                      return (
                        <React.Fragment key={k}>
                          <tr>
                            <td style={{ ...td, width: 40 }}>
                              <input
                                type="checkbox"
                                checked={isSel}
                                onChange={() => toggleSelected(k)}
                              />
                            </td>

                            <td style={td}>
                              <span style={pillStyle(bucketPill)}>
                                {bucket === "THIS_WEEK"
                                  ? "THIS WEEK"
                                  : bucket === "OVERDUE"
                                  ? "OVERDUE"
                                  : "DONE"}
                              </span>
                            </td>

                            <td style={td}>
                              <div style={{ fontWeight: 800 }}>{r.clipper_name || "—"}</div>
                              <div style={tiny}>{r.account || r.account_key || ""}</div>
                            </td>

                            <td style={td}>
                              <span style={pillStyle((r.platform || "").toUpperCase())}>
                                {(r.platform || "—").toUpperCase()}
                              </span>
                            </td>

                            <td style={td}>
                              <div style={{ fontWeight: 800, maxWidth: 420 }}>
                                {r.title || "—"}
                              </div>
                              <div style={tiny}>{r.video_id}</div>
                            </td>

                            <td style={td}>
                              <div style={{ fontWeight: 800 }}>
                                {eligibleDate ? fmtDate(eligibleDate) : "—"}
                              </div>
                              <div style={tiny}>
                                {eligibleDate ? "Became eligible" : ""}
                              </div>
                            </td>

                            <td style={td}>{fmtDate(r.published_at)}</td>

                            <td style={td}>{fmtNum(r.total_views_video)}</td>

                            <td style={td}>
                              <div style={{ fontWeight: 800 }}>
                                {fmtNum(r.payable_total_views)}
                              </div>
                              <div style={tiny}>
                                Min: {fmtNum(r.min_view_count_eligibility)}
                              </div>
                            </td>

                            <td style={td}>
                              <span style={pillStyle(status)}>
                                {status}
                              </span>
                              {r.reviewed_at && (
                                <div style={tiny}>at {fmtDate(r.reviewed_at)}</div>
                              )}
                            </td>

                            <td style={td}>
                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                  style={btn()}
                                  onClick={() => openVideo(r)}
                                  disabled={!r.url && !r.ai_url}
                                >
                                  View
                                </button>

                                <button
                                  style={btn("approve")}
                                  onClick={() => updateSingle(r, "APPROVED")}
                                  disabled={saving}
                                >
                                  Approve
                                </button>

                                <button
                                  style={btn("reject")}
                                  onClick={() => updateSingle(r, "REJECTED")}
                                  disabled={saving}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>

                          {showFeedback && (
                            <tr>
                              <td style={td} colSpan={11}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  <div style={{ minWidth: 210, opacity: 0.8, fontWeight: 800 }}>
                                    Feedback{" "}
                                    <span style={{ opacity: 0.7 }}>
                                      (required for reject)
                                    </span>
                                  </div>

                                  <textarea
                                    value={feedbackDraft[k] ?? (r.feedback_text || "")}
                                    onChange={(e) =>
                                      setFeedbackDraft((prev) => ({
                                        ...prev,
                                        [k]: e.target.value,
                                      }))
                                    }
                                    placeholder="Explain why this is rejected (quality, watermark, wrong client, not original, etc.)"
                                    style={{
                                      flex: 1,
                                      minHeight: 48,
                                      borderRadius: 14,
                                      padding: 12,
                                      border: "1px solid rgba(255,255,255,0.12)",
                                      background: "rgba(255,255,255,0.05)",
                                      color: "rgba(255,255,255,0.92)",
                                      outline: "none",
                                      resize: "vertical",
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 12, opacity: 0.6, fontSize: 12 }}>
            Tip: Use “Select all loaded” + “Approve selected” to clear backlog fast.
          </div>
        </div>
      </div>
    </div>
  );

  function navBtn(active) {
    if (active) {
      return {
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
      };
    }
    return {
      border: "none",
      outline: "none",
      borderRadius: 12,
      padding: "7px 10px",
      textAlign: "left",
      cursor: "pointer",
      fontSize: 12,
      background: "transparent",
      color: "rgba(255,255,255,0.7)",
      marginTop: 2,
      marginBottom: 2,
    };
  }
}
