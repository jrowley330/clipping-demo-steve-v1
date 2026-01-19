// ContentApprovalPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useBranding } from "./branding/BrandingContext";

const API_BASE_URL =
  "https://clipper-payouts-api-810712855216.us-central1.run.app";

// ---------- TUNING KNOBS (edit these) ----------
const VIDEO_TITLE_FONT_PX = 11;      // smaller text in VIDEO title
const VIDEO_TITLE_MAX_CHARS = 18;    // more aggressive truncation
const VIDEO_SUB_FONT_PX = 10;        // "open" row smaller too

// tighter table / left columns
const COL_W_CHECK = 30;
const COL_W_BUCKET = 108;
const COL_W_CLIPPER = 140;
const COL_W_PLATFORM = 96;
const COL_W_VIDEO = 140;
const COL_W_PUBLISHED = 110;
const COL_W_ELIGIBLE = 110;
const COL_W_TOTALV = 112;
const COL_W_STATUS = 110;

// ---------- helpers ----------
const unwrapValue = (v) => {
  if (v && typeof v === "object" && "value" in v) return v.value;
  return v;
};

const formatNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString();
};

const formatDate = (value) => {
  const raw = unwrapValue(value);
  if (!raw) return "—";

  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return raw;
    return dt.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return String(raw);
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const toBool = (v) => {
  const raw = unwrapValue(v);
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (["true", "t", "yes", "y", "1"].includes(s)) return true;
    if (["false", "f", "no", "n", "0"].includes(s)) return false;
  }
  return false;
};

const safeStr = (v) => String(unwrapValue(v) ?? "").trim();

const truncateWords = (text, maxWords = 5) => {
  if (!text) return "";
  const words = String(text).trim().split(/\s+/);
  if (words.length <= maxWords) return String(text);
  return words.slice(0, maxWords).join(" ") + "…";
};

const truncateChars = (text, maxChars = 28) => {
  if (!text) return "";
  const s = String(text).trim();
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars).trimEnd() + "…";
};

// ---------- component ----------
export default function ContentApprovalPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // BRANDING
  const { headingText, watermarkText, defaults } = useBranding();
  const brandText = headingText || defaults.headingText;
  const wmText = watermarkText || defaults.watermarkText;

  // DATA
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [apiCounts, setApiCounts] = useState({
    pending_this_week: 0,
    pending_overdue: 0,
    pending_total: 0,
    done_total: 0,
    all_total: 0,
  });

  // UI STATE
  const [activeTab, setActiveTab] = useState("this_week"); // this_week | past_due | done | all
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [acting, setActing] = useState(false);
  const [actionMsg, setActionMsg] = useState("");


  // --- single-item review modal ---
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRow, setReviewRow] = useState(null);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);


  const clientId =
    safeStr(localStorage.getItem("client_id")) ||
    safeStr(sessionStorage.getItem("client_id")) ||
    "default";

  // ---------- navigation handlers ----------
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const goDashV2 = () => navigate("/dashboard-v2");
  const goContentApproval = () => navigate("/content-approval");
  const goPayouts = () => navigate("/payouts");
  const goClippers = () => navigate("/clippers");
  const goPerformance = () => navigate("/performance");
  const goLeaderboards = () => navigate("/leaderboards");
  const goGallery = () => navigate("/gallery");
  const goSettings = () => navigate("/settings");

  // ---------- fetch ----------
  const fetchRows = async () => {
    try {
      setLoading(true);
      setErr("");
      setActionMsg("");

      const bucketMap = {
        this_week: "THIS_WEEK",
        past_due: "OVERDUE",
        done: "DONE",
        all: "ALL",
      };
      const bucket = bucketMap[activeTab] || "ALL";

      const qs = new URLSearchParams({
        clientId,
        bucket,
      });
      if (platformFilter !== "all") qs.set("platform", platformFilter);

      const res = await fetch(
        `${API_BASE_URL}/content-review-queue?${qs.toString()}`
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
          `Content Review Queue API ${res.status}${
            txt ? ` — ${txt.slice(0, 140)}` : ""
          }`
        );
      }

      const data = await res.json();
      const apiRows = Array.isArray(data?.rows) ? data.rows : [];
      const counts =
        data?.counts || {
          pending_this_week: 0,
          pending_overdue: 0,
          pending_total: 0,
        };

      setApiCounts(counts);

      const normalized = apiRows.map((r, i) => {
        const id = safeStr(r.id) || safeStr(r.video_id) || `${i}`;

        const clipper = safeStr(r.clipper_name) || safeStr(r.clipper) || "—";

        const account =
          safeStr(r.account_name) ||
          safeStr(r.account) ||
          safeStr(r.creator) ||
          "";

        const accountKey = safeStr(r.account_key || r.accountKey || "");
        const platform = safeStr(r.platform).toLowerCase();

        const title = safeStr(r.video_title) || safeStr(r.title) || "";
        const videoId = safeStr(r.video_id || r.videoId || "");
        const videoUrl = safeStr(r.video_url) || safeStr(r.url) || "";

        const publishedAt = unwrapValue(r.published_at ?? r.publishedAt ?? r.published_date ?? "");
        const eligibleAt = unwrapValue(r.eligible_at ?? r.eligibleAt ?? r.eligible_date ?? "");

        const status =
          safeStr(r.review_status) || safeStr(r.status) || "PENDING";

        const dueDate = safeStr(r.due_date || r.deadline || "");
        const weekStart = safeStr(r.week_start || r.week_of || "");

        const totalViews = Number(
          unwrapValue(
            r.total_views_video ?? r.latest_view_count ?? r.latest_view_count_video ?? r.total_views ?? 0
          )
        );

        const reviewStatusUpper = safeStr(r.review_status).toUpperCase();
        const approved = reviewStatusUpper === "APPROVED";
        const rejected = reviewStatusUpper === "REJECTED";

        return {
          id,
          clipper,
          account,
          accountKey, // hidden but required for bulk endpoint
          platform,
          title,
          videoId, // hidden but required for bulk endpoint
          videoUrl,
          publishedAt,
          eligibleAt,
          status,
          dueDate,
          weekStart,
          totalViews,
          approved,
          rejected,
          queue_bucket: safeStr(r.queue_bucket || ""),
          is_overdue: toBool(r.is_overdue),
          raw: r,
        };
      });

      setRows(normalized);
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to load content review queue.");
      setRows([]);
      setSelectedIds(new Set());
      setApiCounts({
        pending_this_week: 0,
        pending_overdue: 0,
        pending_total: 0,
        done_total: 0,
        all_total: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, platformFilter, clientId]);

  // ---------- derived views ----------
  const platformOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const p = safeStr(r.platform);
      if (p) set.add(p);
    });
    return ["all", ...Array.from(set).sort()];
  }, [rows]);

  const now = Date.now();

  const enhancedRows = useMemo(() => {
    return rows.map((r) => {
      const qb = safeStr(r.queue_bucket).toUpperCase();
      const apiOverdue = toBool(r.is_overdue);

      const due = r.dueDate ? new Date(r.dueDate).getTime() : NaN;
      const computedOverdue = Number.isFinite(due) ? due < now : false;
      const isOverdue = qb === "OVERDUE" ? true : apiOverdue || computedOverdue;

      const ws = r.weekStart ? new Date(r.weekStart).getTime() : NaN;
      const isThisWeek = (() => {
        if (qb === "THIS_WEEK") return true;
        if (qb === "OVERDUE") return false;
        if (qb === "DONE") return false;

        if (Number.isFinite(ws)) {
          const start = new Date(ws);
          const end = new Date(ws);
          end.setDate(end.getDate() + 7);
          return now >= start.getTime() && now < end.getTime();
        }

        if (Number.isFinite(due)) {
          const d = new Date(due);
          const today = new Date();
          const day = (x) => (x.getDay() + 6) % 7; // monday=0
          const start = new Date(today);
          start.setDate(today.getDate() - day(today));
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 7);
          return d.getTime() >= start.getTime() && d.getTime() < end.getTime();
        }

        return true;
      })();

      const isDone =
        r.approved ||
        safeStr(r.status).toLowerCase() === "approved" ||
        safeStr(r.status).toLowerCase() === "done";

      const isRejected =
        r.rejected || safeStr(r.status).toLowerCase() === "rejected";

      return { ...r, isOverdue, isThisWeek, isDone, isRejected };
    });
  }, [rows, now]);

  const filteredRows = useMemo(() => {
    const s = search.trim().toLowerCase();

    return enhancedRows.filter((r) => {
      if (activeTab === "this_week" && !r.isThisWeek) return false;
      if (activeTab === "past_due" && !r.isOverdue) return false;
      if (activeTab === "done" && !r.isDone) return false;

      if (platformFilter !== "all" && r.platform !== platformFilter)
        return false;

      if (s) {
        const hay = [r.clipper, r.account, r.title, r.platform, r.status]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }

      return true;
    });
  }, [enhancedRows, activeTab, platformFilter, search]);

  const localCounts = useMemo(() => {
    const done = enhancedRows.filter((r) => r.isDone).length;
    const all = enhancedRows.length;
    return { done, all };
  }, [enhancedRows]);

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelected = () => setSelectedIds(new Set());

  const selectAllLoaded = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredRows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  // ---------- actions ----------
  const openReviewModal = (row) => {
    setReviewRow(row);
    // prefill if existing feedback exists
    const existing =
      safeStr(row?.feedbackText) ||
      safeStr(row?.feedback_text) ||
      safeStr(row?.feedback_text) ||
      "";
    setReviewFeedback(existing);
    setReviewOpen(true);
  };

  const closeReviewModal = () => {
    if (reviewSaving) return;
    setReviewOpen(false);
    setReviewRow(null);
    setReviewFeedback("");
  };

  const submitSingleReview = async (reviewStatus) => {
    if (!reviewRow || reviewSaving) return;

    try {
      setReviewSaving(true);
      setErr("");
      setActionMsg("");

      const { data: sessionData } = await supabase.auth.getSession();
      const reviewedBy =
        sessionData?.session?.user?.email ||
        sessionData?.session?.user?.id ||
        "";

      const item = {
        clientId,
        platform: reviewRow.platform,
        accountKey: reviewRow.accountKey,
        videoId: reviewRow.videoId,
        reviewStatus, // "APPROVED" | "REJECTED"
        feedbackText: reviewFeedback || "",
        reviewedBy,
      };

      if (!item.platform || !item.accountKey || !item.videoId) {
        throw new Error("This row is missing platform/accountKey/videoId.");
      }

      const res = await fetch(`${API_BASE_URL}/content-reviews/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [item] }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Review API ${res.status}`);

      setActionMsg(
        reviewStatus === "APPROVED" ? "Approved 1 item." : "Rejected 1 item."
      );

      closeReviewModal();
      await fetchRows();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to submit review.");
    } finally {
      setReviewSaving(false);
    }
  };

  
  const bulkAction = async (action) => {
    if (acting) return;
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    try {
      setActing(true);
      setActionMsg("");
      setErr("");

      const { data: sessionData } = await supabase.auth.getSession();
      const reviewedBy =
        sessionData?.session?.user?.email ||
        sessionData?.session?.user?.id ||
        "";

      const reviewStatus = action === "approve" ? "APPROVED" : "REJECTED";

      const selectedRows = rows.filter((r) => selectedIds.has(r.id));

      const items = selectedRows.map((r) => ({
        clientId,
        platform: r.platform,
        accountKey: r.accountKey,
        videoId: r.videoId,
        reviewStatus,
        feedbackText: "",
        reviewedBy,
      }));

      const bad = items.find((x) => !x.platform || !x.accountKey || !x.videoId);
      if (bad)
        throw new Error(
          "Some selected rows are missing platform/accountKey/videoId."
        );

      const res = await fetch(`${API_BASE_URL}/content-reviews/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || `Bulk review API ${res.status}`);

      setActionMsg(
        reviewStatus === "APPROVED"
          ? `Approved ${items.length} item(s).`
          : `Rejected ${items.length} item(s).`
      );

      await fetchRows();
    } catch (e) {
      console.error(e);
      setErr(e.message || "Action failed.");
    } finally {
      setActing(false);
      clearSelected();
    }
  };

  // ---------- UI bits ----------
  const pillWrapStyle = {
    display: "inline-flex",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.55)",
    padding: 3,
    backdropFilter: "blur(8px)",
    gap: 0,
    maxWidth: "100%",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  };

  const pillBtnStyle = (active) => ({
    border: "none",
    outline: "none",
    cursor: "pointer",
    padding: "7px 14px",
    borderRadius: 999,
    fontSize: 13,
    background: active
      ? "radial-gradient(circle at top, #fbbf24, #f97316)"
      : "transparent",
    color: active ? "#020617" : "rgba(255,255,255,0.85)",
    fontWeight: active ? 700 : 500,
    transition: "all 150ms ease",
    whiteSpace: "nowrap",
  });

  const actionBtn = (kind) => {
    const base = {
      borderRadius: 999,
      padding: "8px 14px",
      border: "1px solid rgba(148,163,184,0.45)",
      background: "rgba(15,23,42,0.75)",
      color: "#e5e7eb",
      cursor: acting ? "default" : "pointer",
      fontSize: 13,
      fontWeight: 600,
      opacity: acting ? 0.7 : 1,
      whiteSpace: "nowrap",
    };

    if (kind === "approve") {
      return {
        ...base,
        border: "1px solid rgba(34,197,94,0.55)",
        background: "rgba(34,197,94,0.12)",
        color: "#bbf7d0",
      };
    }
    if (kind === "reject") {
      return {
        ...base,
        border: "1px solid rgba(248,113,113,0.55)",
        background: "rgba(248,113,113,0.10)",
        color: "#fecaca",
      };
    }
    return base;
  };

  const bucketPillStyle = (label) => {
    const base = {
      display: "inline-flex",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      border: "1px solid rgba(148,163,184,0.40)",
      background: "rgba(2,6,23,0.45)",
      color: "rgba(255,255,255,0.86)",
      letterSpacing: 0.2,
      whiteSpace: "nowrap",
    };
    if (label === "PAST DUE") {
      return {
        ...base,
        border: "1px solid rgba(248,113,113,0.55)",
        background: "rgba(248,113,113,0.12)",
        color: "#fecaca",
      };
    }
    if (label === "THIS WEEK") {
      return {
        ...base,
        border: "1px solid rgba(250,204,21,0.45)",
        background: "rgba(250,204,21,0.10)",
        color: "#fde68a",
      };
    }
    if (label === "DONE") {
      return {
        ...base,
        border: "1px solid rgba(34,197,94,0.55)",
        background: "rgba(34,197,94,0.10)",
        color: "#bbf7d0",
      };
    }
    return base;
  };

  const boolChip = (val) => {
    const yes = !!val;
    const base = {
      display: "inline-flex",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      border: "1px solid rgba(148,163,184,0.35)",
      background: "rgba(2,6,23,0.35)",
      color: "rgba(255,255,255,0.78)",
      whiteSpace: "nowrap",
    };

    if (yes) {
      return {
        ...base,
        border: "1px solid rgba(96,165,250,0.55)",
        background: "rgba(96,165,250,0.12)",
        color: "#bfdbfe",
      };
    }
    return base;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        minHeight: "100vh",
        boxSizing: "border-box",
        background: "radial-gradient(circle at top, #141414 0, #020202 55%)",
        display: "flex",
        overflowX: "hidden",
        overflowY: "auto",
        color: "#fff",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "32px 24px",
        paddingTop: "40px",
        paddingBottom: "40px",
        margin: 0,
        border: "none",
        outline: "none",
      }}
    >
      {/* WATERMARK */}
      <div
        style={{
          position: "absolute",
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
                onClick={goContentApproval}
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
                  fontWeight: 700,
                  marginBottom: 2,
                }}
              >
                Review Clips
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
                  marginTop: 2,
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

              <button
                onClick={goSettings}
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
                Content approval hub
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, position: "relative", zIndex: 3, minWidth: 0 }}>
        {/* Branding */}
        <div
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
          style={{
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            paddingRight: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>
              Content Approval
            </h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              Review and approve scheduled content
            </span>
          </div>

          <div style={pillWrapStyle}>
            <button
              onClick={() => setActiveTab("this_week")}
              style={pillBtnStyle(activeTab === "this_week")}
            >
              This week ({apiCounts.pending_this_week})
            </button>
            <button
              onClick={() => setActiveTab("past_due")}
              style={pillBtnStyle(activeTab === "past_due")}
            >
              Past due ({apiCounts.pending_overdue})
            </button>
            <button
              onClick={() => setActiveTab("done")}
              style={pillBtnStyle(activeTab === "done")}
            >
              Done ({apiCounts.done_total})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              style={pillBtnStyle(activeTab === "all")}
            >
              All ({apiCounts.all_total})
            </button>
            <button
              onClick={fetchRows}
              style={{
                ...pillBtnStyle(false),
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(15,23,42,0.55)",
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Sub header line */}
        <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 14 }}>
          Pending this week: <strong>{apiCounts.pending_this_week}</strong> ·
          Overdue: <strong>{apiCounts.pending_overdue}</strong>
          <span style={{ marginLeft: 12, opacity: 0.6 }}>
            Client: <strong style={{ opacity: 0.95 }}>{clientId}</strong>
          </span>
        </div>

        {/* CONTENT CARD */}
        <div
          style={{
            borderRadius: 20,
            background:
              "radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 55%)",
            padding: 14,
            boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
          }}
        >
          {/* Filters + actions row */}
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                style={{
                  fontSize: 13,
                  padding: "9px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(0,0,0,0.6)",
                  color: "rgba(255,255,255,0.9)",
                  minWidth: 170,
                  appearance: "none",
                }}
              >
                <option value="all">All platforms</option>
                {platformOptions
                  .filter((p) => p !== "all")
                  .map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
              </select>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clipper / account / title..."
                style={{
                  fontSize: 13,
                  padding: "9px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(0,0,0,0.45)",
                  color: "rgba(255,255,255,0.9)",
                  minWidth: 380,
                  maxWidth: "58vw",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ minHeight: 22, fontSize: 12, textAlign: "right" }}>
              {loading && !err && <span style={{ opacity: 0.8 }}>Loading…</span>}
              {!loading && err && <span style={{ color: "#fecaca" }}>{err}</span>}
              {!loading && !err && actionMsg && (
                <span style={{ color: "#bbf7d0" }}>{actionMsg}</span>
              )}
            </div>
          </div>

          {/* Selection + action buttons */}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.85, marginRight: 6 }}>
              {selectedIds.size} selected
            </div>

            <button onClick={selectAllLoaded} style={actionBtn("neutral")}>
              Select all loaded
            </button>

            <button onClick={clearSelected} style={actionBtn("neutral")}>
              Clear
            </button>

            <div style={{ flexGrow: 1 }} />

            <button
              disabled={acting || selectedIds.size === 0}
              onClick={() => bulkAction("approve")}
              style={actionBtn("approve")}
            >
              {acting ? "Working…" : "Approve selected"}
            </button>

            <button
              disabled={acting || selectedIds.size === 0}
              onClick={() => bulkAction("reject")}
              style={actionBtn("reject")}
            >
              {acting ? "Working…" : "Reject selected"}
            </button>
          </div>

          {/* Table */}
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(148,163,184,0.35)",
              boxShadow: "0 18px 45px rgba(0,0,0,0.9)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 860,
                  borderCollapse: "collapse",
                  fontSize: 13,
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: COL_W_CHECK }} />
                  <col style={{ width: COL_W_BUCKET }} />
                  <col style={{ width: COL_W_CLIPPER }} />
                  <col style={{ width: COL_W_PLATFORM }} />
                  <col style={{ width: COL_W_VIDEO }} />
                  <col style={{ width: COL_W_PUBLISHED }} />
                  <col style={{ width: COL_W_ELIGIBLE }} />
                  <col style={{ width: COL_W_TOTALV }} />
                  <col style={{ width: COL_W_STATUS }} />
                </colgroup>

                <thead>
                  <tr>
                    <th
                      style={{
                        padding: "10px 6px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        opacity: 0.7,
                      }}
                    />
                    {["BUCKET", "CLIPPER", "PLATFORM", "VIDEO", "PUBLISHED", "ELIGIBLE", "TOTAL VIEWS", "STATUS"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "10px 8px",
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            fontWeight: 600,
                            opacity: 0.7,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {!loading && filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 14, opacity: 0.8 }}>
                        No rows for this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, idx) => {
                      const isSelected = selectedIds.has(r.id);

                      const bucket = r.isDone
                        ? "DONE"
                        : r.isOverdue
                        ? "PAST DUE"
                        : "THIS WEEK";

                      const rowBorder =
                        idx !== filteredRows.length - 1
                          ? "1px solid rgba(148,163,184,0.18)"
                          : "none";

                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: rowBorder,
                            background: isSelected
                              ? "rgba(250,204,21,0.06)"
                              : "transparent",
                          }}
                        >
                          <td style={{ padding: "12px 6px" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelected(r.id)}
                              style={{
                                width: 16,
                                height: 16,
                                cursor: "pointer",
                                accentColor: "#fbbf24",
                              }}
                            />
                          </td>

                          <td style={{ padding: "12px 8px" }}>
                            <span style={bucketPillStyle(bucket)}>{bucket}</span>
                            <div
                              style={{
                                fontSize: 10,
                                opacity: 0.6,
                                marginTop: 4,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {r.dueDate ? `Due: ${formatDate(r.dueDate)}` : " "}
                            </div>
                          </td>

                          <td style={{ padding: "12px 8px", fontWeight: 650 }}>
                            <div
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={r.clipper}
                            >
                              {r.clipper}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                opacity: 0.65,
                                marginTop: 2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontWeight: 500,
                              }}
                              title={r.account || ""}
                            >
                              {r.account ? r.account : "—"}
                            </div>
                          </td>

                          <td style={{ padding: "12px 8px", opacity: 0.9 }}>
                            <span style={{ whiteSpace: "nowrap" }}>
                              {r.platform || "—"}
                            </span>
                          </td>

                          {/* VIDEO (smaller + tighter) */}
                          <td style={{ padding: "12px 8px" }}>
                            <div
                              style={{
                                fontWeight: 650,
                                fontSize: VIDEO_TITLE_FONT_PX,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={r.title || ""}
                            >
                              {truncateChars(r.title || "Untitled", VIDEO_TITLE_MAX_CHARS)}
                              {/* if you prefer word-based instead:
                                  {truncateWords(r.title || "Untitled", 3)}
                              */}
                            </div>

                            <div
                              style={{
                                fontSize: VIDEO_SUB_FONT_PX,
                                opacity: 0.75,
                                marginTop: 3,
                              }}
                            >
                              {r.videoUrl ? (
                                <a
                                  href={r.videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    color: "#facc15",
                                    textDecoration: "underline dotted",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  open
                                </a>
                              ) : (
                                <span style={{ opacity: 0.6 }}> </span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: "12px 8px", opacity: 0.9 }}>
                            {formatDate(r.publishedAt)}
                          </td>

                          <td style={{ padding: "12px 8px", opacity: 0.9 }}>
                            {formatDate(r.eligibleAt)}
                          </td>

                          <td style={{ padding: "12px 8px", opacity: 0.9 }}>
                            {formatNumber(r.totalViews)}
                          </td>

                          <td style={{ padding: "12px 8px" }}>
                          <button
                            onClick={() => openReviewModal(r)}
                            title="Click to review (approve / reject)"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 800,
                              whiteSpace: "nowrap",

                              border: "1px solid rgba(148,163,184,0.45)",
                              background: r.isDone
                                ? "rgba(34,197,94,0.14)"
                                : r.isRejected
                                ? "rgba(248,113,113,0.14)"
                                : "rgba(2,6,23,0.45)",

                              color: r.isDone
                                ? "#bbf7d0"
                                : r.isRejected
                                ? "#fecaca"
                                : "rgba(255,255,255,0.9)",

                              cursor: "pointer",
                              transition: "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "translateY(-1px)";
                              e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.35)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <span>{safeStr(r.status).toUpperCase() || "PENDING"}</span>
                            {!r.isDone && !r.isRejected && (
                              <span style={{ opacity: 0.6 }}>✎</span>
                            )}
                          </button>

                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
            Tip: Use <strong>Select all loaded</strong> +{" "}
            <strong>Approve selected</strong> to clear backlog fast.
          </div>
        </div>



        {reviewOpen && (
          <div
            onClick={closeReviewModal}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(720px, 94vw)",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(10,15,25,0.92)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.65)",
                padding: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>
                    Review clip
                  </div>
                  <div style={{ marginTop: 6, color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
                    {safeStr(reviewRow?.clipperName)} • {safeStr(reviewRow?.platform)} •{" "}
                    {safeStr(reviewRow?.title || reviewRow?.videoTitle || reviewRow?.videoId)}
                  </div>
                </div>

                <button
                  onClick={closeReviewModal}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "rgba(255,255,255,0.8)",
                    cursor: reviewSaving ? "default" : "pointer",
                    fontSize: 20,
                    padding: "4px 8px",
                  }}
                  disabled={reviewSaving}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                  Feedback (optional)
                </div>

                <textarea
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder="Add feedback for the clipper"
                  style={{
                    marginTop: 8,
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                    display: "block",

                    minHeight: 120,
                    resize: "vertical",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(2,6,23,0.55)",
                    color: "rgba(255,255,255,0.92)",
                    padding: 12,
                    outline: "none",
                    fontSize: 14,
                    lineHeight: 1.35,
                  }}
                />

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                  Tip: click the status pill anytime to review.
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => submitSingleReview("REJECTED")}
                    disabled={reviewSaving}
                    style={{
                      borderRadius: 999,
                      padding: "10px 14px",
                      border: "1px solid rgba(239,68,68,0.35)",
                      background: "rgba(127,29,29,0.22)",
                      color: "rgba(255,255,255,0.92)",
                      fontWeight: 800,
                      cursor: reviewSaving ? "default" : "pointer",
                    }}
                  >
                    {reviewSaving ? "Saving..." : "Reject"}
                  </button>

                  <button
                    onClick={() => submitSingleReview("APPROVED")}
                    disabled={reviewSaving}
                    style={{
                      borderRadius: 999,
                      padding: "10px 14px",
                      border: "1px solid rgba(34,197,94,0.35)",
                      background: "rgba(20,83,45,0.30)",
                      color: "rgba(255,255,255,0.92)",
                      fontWeight: 900,
                      cursor: reviewSaving ? "default" : "pointer",
                    }}
                  >
                    {reviewSaving ? "Saving..." : "Approve"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
