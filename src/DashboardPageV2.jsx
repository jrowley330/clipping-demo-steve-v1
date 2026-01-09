// DashboardPageV2.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const API_BASE_URL =
  'https://clipper-payouts-api-810712855216.us-central1.run.app';

// Helpers
const formatNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString();
};

const formatCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '$0.00';
  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatMonthLabel = (monthStr) => {
  if (!monthStr || typeof monthStr !== 'string') return String(monthStr || '');
  const [year, month] = monthStr.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(d.getTime())) return monthStr;
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

const formatDate = (value) => {
  if (!value) return '—';

  // If it's a plain 'YYYY-MM-DD' string, parse manually as local date
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yearStr, monthStr, dayStr] = value.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr); // 1–12
    const day = Number(dayStr);

    const d = new Date(year, month - 1, day); // local time, no UTC shift
    if (Number.isNaN(d.getTime())) return value;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }

  // Fallback for other formats (Date objects, timestamps, etc.)
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};


const unwrapValue = (v) => {
  // BigQuery sometimes returns { value: '2025-11-01' } or similar
  if (v && typeof v === 'object' && 'value' in v) {
    return v.value;
  }
  return v;
};


export default function DashboardsPageV2() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'details'

  // SUMMARY DATA (CLIPPER_SUMMARY)
  const [summaryRows, setSummaryRows] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [summaryMonth, setSummaryMonth] = useState('all');
  const [summaryClipper, setSummaryClipper] = useState('all');

  // DETAILS DATA (CLIPPER_DETAILS)
  const [detailsRows, setDetailsRows] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState('');
  const [detailsMonth, setDetailsMonth] = useState('all');
  const [detailsWeekOf, setDetailsWeekOf] = useState('all');
  const [detailsClipper, setDetailsClipper] = useState('all');

  // NAV HANDLERS
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const goDashV2 = () => {
    navigate('/dashboard-v2');
  };

  const goPayouts = () => {
    navigate('/payouts');
  };

  const goClippers = () => {
    navigate('/clippers');
  };

  const goPerformance = () => {
    navigate('/performance');
};

  const goLeaderboards = () => {
    navigate('/leaderboards');
};

  const goGallery = () => {
    navigate('/gallery');
};

  const goSettings = () => {
    navigate('/settings');
};


  // FETCH SUMMARY
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setSummaryLoading(true);
        setSummaryError('');
        const res = await fetch(`${API_BASE_URL}/clipper-summary`);
        if (!res.ok) throw new Error(`Summary API ${res.status}`);
        const data = await res.json();

        const normalized = (Array.isArray(data) ? data : []).map((row, i) => {
        const rawName = unwrapValue(row.NAME ?? row.name);
        const rawMonth = unwrapValue(row.MONTH ?? row.month);

        const views = Number(unwrapValue(row.VIEWS_GENERATED ?? row.views_generated) ?? 0);
        const videos = Number(unwrapValue(row.VIDEOS_POSTED ?? row.videos_posted) ?? 0);
        const payout =
          unwrapValue(row.PAYOUT_USD ?? row.payout_usd) ?? views / 1000;

        return {
          id: `${rawName || 'name'}_${rawMonth || 'month'}_${i}`,
          name: rawName || `Clipper ${i + 1}`,
          month: rawMonth || 'Unknown',
          videosPosted: videos,
          viewsGenerated: views,
          payoutUsd: Number(payout || 0),
  };
});

        setSummaryRows(normalized);
      } catch (err) {
        console.error('Error fetching summary:', err);
        setSummaryError('Unable to load summary data from BigQuery.');
        setSummaryRows([]);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchSummary();
  }, []);

  // FETCH DETAILS
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setDetailsLoading(true);
        setDetailsError('');
        const res = await fetch(`${API_BASE_URL}/clipper-details`);
        if (!res.ok) throw new Error(`Details API ${res.status}`);
        const data = await res.json();

        const normalized = (Array.isArray(data) ? data : []).map((row, i) => {
        const rawName = unwrapValue(row.NAME ?? row.name);
        const rawAccount = unwrapValue(row.ACCOUNT ?? row.account);
        const rawPlatform = unwrapValue(row.PLATFORM ?? row.platform);
        const rawWeekOf = unwrapValue(row.WEEK_OF ?? row.week_of);
        const rawMonth = unwrapValue(row.MONTH ?? row.month);
        const rawSnapshot = unwrapValue(row.SNAPSHOT_TS ?? row.snapshot_ts);

        return {
          id: `${rawName || 'name'}_${rawAccount || 'acct'}_${rawWeekOf || i}_${i}`,
          name: rawName || `Clipper ${i + 1}`,
          account: rawAccount || '',
          platform: rawPlatform || '',
          weekOf: rawWeekOf || null,        // now a plain string like '2025-11-01'
          month: rawMonth || 'Unknown',
          snapshotTs: rawSnapshot || null,
          videosPosted: Number(unwrapValue(row.VIDEOS_POSTED ?? row.videos_posted) ?? 0),
          totalViews: Number(unwrapValue(row.TOTAL_VIEWS ?? row.total_views) ?? 0),
          weeklyViews: Number(unwrapValue(row.WEEKLY_VIEWS ?? row.weekly_views) ?? 0),
      };
      });


        setDetailsRows(normalized);
      } catch (err) {
        console.error('Error fetching details:', err);
        setDetailsError('Unable to load details data from BigQuery.');
        setDetailsRows([]);
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchDetails();
  }, []);

  // SUMMARY FILTER OPTIONS
  const summaryMonthOptions = useMemo(() => {
    const set = new Set();
    summaryRows.forEach((r) => {
      if (r.month) set.add(r.month);
    });
    return ['all', ...Array.from(set).sort().reverse()];
  }, [summaryRows]);

  const summaryClipperOptions = useMemo(() => {
  const set = new Set();
  summaryRows.forEach((r) => {
    if (typeof r.name === 'string') {
      const trimmed = r.name.trim();
      if (trimmed) set.add(trimmed);
    }
  });
  return ['all', ...Array.from(set).sort()];
}, [summaryRows]);

  const filteredSummaryRows = useMemo(() => {
    return summaryRows.filter((r) => {
      if (summaryMonth !== 'all' && r.month !== summaryMonth) return false;
      if (summaryClipper !== 'all' && r.name !== summaryClipper) return false;
      return true;
    });
  }, [summaryRows, summaryMonth, summaryClipper]);

  // SUMMARY KPIs
  const summaryTotalViews = useMemo(
    () =>
      filteredSummaryRows.reduce(
        (sum, r) => sum + Number(r.viewsGenerated || 0),
        0
      ),
    [filteredSummaryRows]
  );

  const summaryTotalPayout = useMemo(
    () =>
      filteredSummaryRows.reduce(
        (sum, r) => sum + Number(r.payoutUsd || 0),
        0
      ),
    [filteredSummaryRows]
  );

  const summaryTotalVideos = useMemo(
    () =>
      filteredSummaryRows.reduce(
        (sum, r) => sum + Number(r.videosPosted || 0),
        0
      ),
    [filteredSummaryRows]
  );

  // DETAILS FILTER OPTIONS
  const detailsMonthOptions = useMemo(() => {
    const rows = Array.isArray(detailsRows) ? detailsRows : [];
    const set = new Set();

    rows.forEach((r) => {
      const m = unwrapValue(r.month);
      if (m) set.add(m);
    });

    return ["all", ...Array.from(set).sort().reverse()];
  }, [detailsRows]);

  const detailsRowsForWeekOptions = useMemo(() => {
    const rows = Array.isArray(detailsRows) ? detailsRows : [];

    return rows.filter((r) => {
      const month = unwrapValue(r.month);
      const clipper = unwrapValue(r.name);

      // IMPORTANT: use your actual state vars: detailsMonth / detailsClipper
      if (detailsMonth !== "all" && month !== detailsMonth) return false;
      if (detailsClipper !== "all" && clipper !== detailsClipper) return false;

      return true;
    });
  }, [detailsRows, detailsMonth, detailsClipper]);

  const detailsWeekOfOptions = useMemo(() => {
    const rows = Array.isArray(detailsRowsForWeekOptions)
      ? detailsRowsForWeekOptions
      : [];

    const endByWeek = new Map(); // weekOf -> max snapshotTs

    rows.forEach((r) => {
      const week = unwrapValue(r.weekOf);
      const ts = unwrapValue(r.snapshotTs);
      if (!week) return;

      const d = ts ? new Date(ts) : null;
      const prev = endByWeek.get(week);
      if (!prev || (d && d > prev)) endByWeek.set(week, d);
    });

    const weeks = Array.from(endByWeek.keys()).sort((a, b) => {
      const da = endByWeek.get(a);
      const db = endByWeek.get(b);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da; // newest first
    });

    return ["all", ...weeks];
  }, [detailsRowsForWeekOptions]);

  // If selected week isn't available under current Month/Clipper, reset to "all"
  useEffect(() => {
    if (!detailsWeekOfOptions || detailsWeekOfOptions.length === 0) return;
    if (detailsWeekOf === "all") return;

    if (!detailsWeekOfOptions.includes(detailsWeekOf)) {
      setDetailsWeekOf("all");
    }
  }, [detailsWeekOfOptions, detailsWeekOf]);


  const detailsClipperOptions = useMemo(() => {
    const set = new Set();
    detailsRows.forEach((r) => {
      if (r.name) set.add(r.name);
    });
    return ['all', ...Array.from(set).sort()];
  }, [detailsRows]);

  const filteredDetailsRows = useMemo(() => {
    return detailsRows.filter((r) => {
      if (detailsMonth !== 'all' && r.month !== detailsMonth) return false;
      if (detailsWeekOf !== 'all' && r.weekOf !== detailsWeekOf) return false;
      if (detailsClipper !== 'all' && r.name !== detailsClipper) return false;
      return true;
    });
  }, [detailsRows, detailsMonth, detailsWeekOf, detailsClipper]);

  //added to sort detail rows most recent at top
  const sortedFilteredDetailsRows = useMemo(() => {
    const rows = Array.isArray(filteredDetailsRows)
      ? [...filteredDetailsRows]
      : [];

    rows.sort((a, b) => {
      const ta = unwrapValue(a.snapshotTs)
        ? new Date(unwrapValue(a.snapshotTs)).getTime()
        : 0;
      const tb = unwrapValue(b.snapshotTs)
        ? new Date(unwrapValue(b.snapshotTs)).getTime()
        : 0;

      // newest first
      return tb - ta;
    });

    return rows;
  }, [filteredDetailsRows]);


  // DETAILS KPIs
  const detailsViewsGenerated = useMemo(
    () =>
      filteredDetailsRows.reduce(
        (sum, r) => sum + Number(r.weeklyViews || 0),
        0
      ),
    [filteredDetailsRows]
  );

  // Total views = lifetime as of the MOST RECENT snapshot in the filtered set
  const detailsTotalViews = useMemo(() => {
    if (!Array.isArray(filteredDetailsRows) || filteredDetailsRows.length === 0) return 0;

    const latestByAccount = new Map(); // account+platform+clipper -> row

    filteredDetailsRows.forEach((r) => {
      const key = `${r.name}||${r.platform}||${r.account}`;
      const ts = r.snapshotTs ? new Date(r.snapshotTs).getTime() : 0;

      const prev = latestByAccount.get(key);
      const prevTs = prev?.snapshotTs ? new Date(prev.snapshotTs).getTime() : 0;

      if (!prev || ts > prevTs) {
        latestByAccount.set(key, r);
      }
    });

    let total = 0;
    latestByAccount.forEach((r) => {
      total += Number(r.totalViews || 0);
    });

    return total;
  }, [filteredDetailsRows]);


  const detailsVideosPosted = useMemo(
    () =>
      filteredDetailsRows.reduce(
        (sum, r) => sum + Number(r.videosPosted || 0),
        0
      ),
    [filteredDetailsRows]
  );

  ///end KPI calcs ^

  const showSummaryLoading = summaryLoading && !summaryError;
  const showDetailsLoading = detailsLoading && !detailsError;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at top, #141414 0, #020202 55%)',
        display: 'flex',
        overflowX: 'hidden',
        overflowY: 'auto',
        color: '#fff',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '32px',
        paddingTop: '40px',
        paddingBottom: '40px',
      }}
    >
      {/* WATERMARK */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: 0.03,
          fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
          fontSize: 140,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#ffffff',
          transform: 'rotate(-18deg)',
          textShadow: '0 0 60px rgba(0,0,0,1)',
        }}
      >
        STEVEWILLDOIT
      </div>

      {/* SIDEBAR */}
      <div
        style={{
          width: sidebarOpen ? 190 : 54,
          transition: 'width 180ms ease',
          marginRight: 22,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          style={{
            borderRadius: 18,
            background: 'rgba(0,0,0,0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 18px 45px rgba(0,0,0,0.8)',
            padding: 10,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              alignSelf: sidebarOpen ? 'flex-end' : 'center',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 11,
              padding: '4px 7px',
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>

          {sidebarOpen && (
            <>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.1,
                  opacity: 0.6,
                  marginTop: 4,
                  marginBottom: 4,
                }}
              >
                Navigation
              </div>

              {/* Dashboards V2 (current) */}
              <button
                onClick={goDashV2}
                style={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: 12,
                  padding: '8px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 13,
                  background:
                    'linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))',
                  color: '#020617',
                  fontWeight: 600,
                  marginBottom: 2,
                }}
              >
                Dashboards
              </button>

              {/* Payouts */}
              <button
                onClick={goPayouts}
                style={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: 12,
                  padding: '7px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 12,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Payouts
              </button>


              {/* Clippers */}
              <button
                onClick={goClippers}
                style={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: 12,
                  padding: '7px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 12,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 2,
                }}
              >
                Clippers
              </button>
              
              {/* Performance */}
              <button
                  onClick={goPerformance}
                  style={{
                    border: 'none',
                    outline: 'none',
                    borderRadius: 12,
                    padding: '7px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 12,
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.55)',
                    marginTop: 2,
                    marginBottom: 2,
                  }}
                >
                  Performance
              </button>

              {/* Leaderboards */}
              <button
                  onClick={goLeaderboards}
                  style={{
                    border: 'none',
                    outline: 'none',
                    borderRadius: 12,
                    padding: '7px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 12,
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.55)',
                    marginTop: 2,
                    marginBottom: 2,
                  }}
                >
                  Leaderboards
              </button>

              {/* Gallery */}
              <button
                  onClick={goGallery}
                  style={{
                    border: 'none',
                    outline: 'none',
                    borderRadius: 12,
                    padding: '7px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 12,
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.55)',
                    marginTop: 2,
                    marginBottom: 2,
                  }}
                >
                  Gallery
              </button>

              {/* Settings */}
              <button
                onClick={goSettings}
                style={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: 12,
                  padding: '7px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 12,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                Settings
              </button>

              <div style={{ flexGrow: 1 }} />


              {/* Logout */}
              <button
                onClick={handleLogout}
                style={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: 999,
                  padding: '7px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 12,
                  background: 'rgba(248,250,252,0.06)',
                  color: 'rgba(255,255,255,0.85)',
                  display: 'flex',
                  alignItems: 'center',
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
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  paddingTop: 8,
                }}
              >
                Clipper dashboards hub
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          zIndex: 3,
        }}
      >
        {/* HARDCODED BRANDING *
        <div
          style={{
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
              fontSize: 34,
              letterSpacing: 0.5,
              color: '#ffffff',
              textTransform: 'uppercase',
              textShadow: '0 3px 12px rgba(0,0,0,0.7)',
            }}
          >
            STEVEWILLDOIT, LLC
          </span>
        </div> 
        */}

        {/* Header */}
        <div
          style={{
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>
              Dashboards
            </h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              BigQuery-powered clipper performance
            </span>
          </div>

          {/* Quick stats */}
          <div
            style={{
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ opacity: 0.85 }}>
              {summaryRows.length} summary rows · {detailsRows.length} detail
              rows
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            marginBottom: 20,
            display: 'inline-flex',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.55)',
            padding: 3,
            backdropFilter: 'blur(8px)',
          }}
        >
          {[
            { key: 'summary', label: 'Summary' },
            { key: 'details', label: 'Details' },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: 12,
                  background: active
                    ? 'linear-gradient(135deg, #f97316, #facc15)'
                    : 'transparent',
                  color: active ? '#000' : 'rgba(255,255,255,0.7)',
                  fontWeight: active ? 600 : 400,
                  boxShadow: active
                    ? '0 0 0 1px rgba(0,0,0,0.25), 0 10px 25px rgba(0,0,0,0.7)'
                    : 'none',
                  transition: 'all 150ms ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* CONTENT CARD */}
        <div
          style={{
            borderRadius: 20,
            background:
              'radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 55%)',
            padding: 20,
            boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
          }}
        >
          {activeTab === 'summary' ? (
            <>
              {/* Summary filters */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 18,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      fontSize: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>Month</span>
                    <select
                      value={summaryMonth}
                      onChange={(e) => setSummaryMonth(e.target.value)}
                      style={{
                        fontSize: 12,
                        padding: '6px 8px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.16)',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'rgba(255,255,255,0.9)',
                      }}
                    >
                      {summaryMonthOptions.map((opt) =>
                        opt === 'all' ? (
                          <option key={opt} value={opt}>
                            All months
                          </option>
                        ) : (
                          <option key={opt} value={opt}>
                            {formatMonthLabel(opt)}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>Clipper</span>
                    <select
                      value={summaryClipper}
                      onChange={(e) => setSummaryClipper(e.target.value)}
                      style={{
                        fontSize: 12,
                        padding: '6px 8px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.16)',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'rgba(255,255,255,0.9)',
                        minWidth: 160,
                      }}
                    >
                      {summaryClipperOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt === 'all' ? 'All clippers' : opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ minHeight: 24, fontSize: 12 }}>
                  {showSummaryLoading && (
                    <span style={{ opacity: 0.8 }}>Loading summary…</span>
                  )}
                  {!showSummaryLoading && summaryError && (
                    <span style={{ color: '#fed7aa' }}>{summaryError}</span>
                  )}
                </div>
              </div>

              {/* Summary KPIs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background:
                      'radial-gradient(circle at top left, rgba(250,204,21,0.18), rgba(15,23,42,1))',
                    border: '1px solid rgba(250,204,21,0.4)',
                  }}
                >
                  <div
                    style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}
                  >
                    Total views (filtered)
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>
                    {formatNumber(summaryTotalViews)}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background:
                      'radial-gradient(circle at top left, rgba(34,197,94,0.20), rgba(15,23,42,1))',
                    border: '1px solid rgba(34,197,94,0.5)',
                  }}
                >
                  <div
                    style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}
                  >
                    Payout (USD)
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>
                    {formatCurrency(summaryTotalPayout)}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background:
                      'radial-gradient(circle at top left, rgba(96,165,250,0.20), rgba(15,23,42,1))',
                    border: '1px solid rgba(96,165,250,0.5)',
                  }}
                >
                  <div
                    style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}
                  >
                    Videos posted
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>
                    {formatNumber(summaryTotalVideos)}
                  </div>
                </div>
              </div>

              {/* Summary table */}
              <div
                style={{
                  overflowX: 'auto',
                  marginTop: 4,
                }}
              >
                {filteredSummaryRows.length === 0 && !showSummaryLoading ? (
                  <div style={{ padding: 12, fontSize: 14, opacity: 0.8 }}>
                    No rows match the selected filters.
                  </div>
                ) : (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Clipper
                        </th>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Month
                        </th>
                        <th
                          style={{
                            textAlign: 'right',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Videos posted
                        </th>
                        <th
                          style={{
                            textAlign: 'right',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Views generated
                        </th>
                        <th
                          style={{
                            textAlign: 'right',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Payout (USD)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSummaryRows.map((row) => (
                        <tr key={row.id}>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            {row.name}
                          </td>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                              opacity: 0.85,
                            }}
                          >
                            {formatMonthLabel(row.month)}
                          </td>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                              textAlign: 'right',
                            }}
                          >
                            {formatNumber(row.videosPosted)}
                          </td>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                              textAlign: 'right',
                            }}
                          >
                            {formatNumber(row.viewsGenerated)}
                          </td>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                              textAlign: 'right',
                              fontWeight: 500,
                            }}
                          >
                            {formatCurrency(row.payoutUsd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Details filters */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 18,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {/* Month */}
                  <div
                    style={{
                      fontSize: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>Month</span>
                    <select
                      value={detailsMonth}
                      onChange={(e) => setDetailsMonth(e.target.value)}
                      style={{
                        fontSize: 12,
                        padding: '6px 8px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.16)',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'rgba(255,255,255,0.9)',
                      }}
                    >
                      {detailsMonthOptions.map((opt) =>
                        opt === 'all' ? (
                          <option key={opt} value={opt}>
                            All months
                          </option>
                        ) : (
                          <option key={opt} value={opt}>
                            {formatMonthLabel(opt)}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Week of */}
                  <div
                    style={{
                      fontSize: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>Week of</span>
                    <select
                      value={detailsWeekOf}
                      onChange={(e) => setDetailsWeekOf(e.target.value)}
                      style={{
                        fontSize: 12,
                        padding: '6px 8px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.16)',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'rgba(255,255,255,0.9)',
                        minWidth: 160,
                      }}
                    >
                      {detailsWeekOfOptions.map((opt) =>
                        opt === 'all' ? (
                          <option key={opt} value={opt}>
                            All weeks
                          </option>
                        ) : (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Clipper */}
                  <div
                    style={{
                      fontSize: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>Clipper</span>
                    <select
                      value={detailsClipper}
                      onChange={(e) => setDetailsClipper(e.target.value)}
                      style={{
                        fontSize: 12,
                        padding: '6px 8px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.16)',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'rgba(255,255,255,0.9)',
                        minWidth: 160,
                      }}
                    >
                      {detailsClipperOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt === 'all' ? 'All clippers' : opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ minHeight: 24, fontSize: 12 }}>
                  {showDetailsLoading && (
                    <span style={{ opacity: 0.8 }}>Loading details…</span>
                  )}
                  {!showDetailsLoading && detailsError && (
                    <span style={{ color: '#fed7aa' }}>{detailsError}</span>
                  )}
                </div>
              </div>

              {/* Details KPIs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background:
                      'radial-gradient(circle at top left, rgba(96,165,250,0.20), rgba(15,23,42,1))',
                    border: '1px solid rgba(96,165,250,0.5)',
                  }}
                >
                  <div
                    style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}
                  >
                    Views Generated (filtered)
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>
                    {formatNumber(detailsViewsGenerated)}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background:
                      'radial-gradient(circle at top left, rgba(250,204,21,0.18), rgba(15,23,42,1))',
                    border: '1px solid rgba(250,204,21,0.4)',
                  }}
                >
                  <div
                    style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}
                  >
                    Total views (as of latest pull)
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>
                    {formatNumber(detailsTotalViews)}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background:
                      'radial-gradient(circle at top left, rgba(34,197,94,0.20), rgba(15,23,42,1))',
                    border: '1px solid rgba(34,197,94,0.5)',
                  }}
                >
                  <div
                    style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}
                  >
                    Videos posted (filtered)
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>
                    {formatNumber(detailsVideosPosted)}
                  </div>
                </div>
              </div>

              {/* Details table */}
              <div
                style={{
                  overflowX: 'auto',
                  marginTop: 4,
                }}
              >
                {filteredDetailsRows.length === 0 && !showDetailsLoading ? (
                  <div style={{ padding: 12, fontSize: 14, opacity: 0.8 }}>
                    No rows match the selected filters.
                  </div>
                ) : (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Clipper
                        </th>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Account
                        </th>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Platform
                        </th>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Week of
                        </th>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Month
                        </th>
                        <th
                          style={{
                            textAlign: 'right',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Videos posted
                        </th>
                        <th
                          style={{
                            textAlign: 'right',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Views Generated
                        </th>
                        <th
                          style={{
                            textAlign: 'right',
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.12)',
                            fontWeight: 500,
                            opacity: 0.7,
                          }}
                        >
                          Total views
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFilteredDetailsRows.map((row) => (
                        <tr key={row.id}>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            {row.name}
                          </td>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                              opacity: 0.9,
                            }}
                          >
                            {row.account}
                          </td>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                              opacity: 0.85,
                            }}
                          >
                            {row.platform}
                          </td>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                              opacity: 0.85,
                            }}
                          >
                            {row.weekOf}
                          </td>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                              opacity: 0.85,
                            }}
                          >
                            {formatMonthLabel(row.month)}
                          </td>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                              textAlign: 'right',
                            }}
                          >
                            {formatNumber(row.videosPosted)}
                          </td>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                              textAlign: 'right',
                            }}
                          >
                            {formatNumber(row.weeklyViews)}
                          </td>
                          <td
                            style={{
                              padding: '10px 6px',
                              borderBottom:
                                '1px solid rgba(255,255,255,0.06)',
                              textAlign: 'right',
                            }}
                          >
                            {formatNumber(row.totalViews)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
