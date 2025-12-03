// DashboardsPageV2.jsx
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
  // expects 'YYYY-MM'
  if (!monthStr || typeof monthStr !== 'string') return String(monthStr || '');
  const [year, month] = monthStr.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(d.getTime())) return monthStr;
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

export default function DashboardsPageV2() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedClipper, setSelectedClipper] = useState('all');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const goDashV1 = () => {
    // your existing PowerBI page
    navigate('/dashboard'); // adjust if your route is different
  };

  const goPayouts = () => {
    navigate('/payouts');
  };

  const goDashV2 = () => {
    // staying on this page, but keeps API same style
    navigate('/dashboard-v2');
  };

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`${API_BASE_URL}/dashboard-v2`);

        if (!res.ok) {
          throw new Error(`API responded with ${res.status}`);
        }

        const data = await res.json();

        const normalized = (Array.isArray(data) ? data : []).map((row, i) => {
          const views = Number(row.views_generated || 0);
          return {
            id: `${row.clipper_id || 'row'}_${row.month || i}`,
            clipper_id: row.clipper_id || `clipper_${i + 1}`,
            clipper_name: row.clipper_name || `Clipper ${i + 1}`,
            month: row.month || 'Unknown',
            videos_posted: Number(row.videos_posted || 0),
            views_generated: views,
            payout_usd: views / 1000, // $1 per 1,000 views
          };
        });

        setRows(normalized);
      } catch (err) {
        console.error('Error fetching dashboard-v2 data:', err);
        setError(
          'Unable to load dashboard data. Check the API /dashboard-v2 endpoint or BigQuery view.'
        );
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter options
  const monthOptions = useMemo(() => {
    const distinct = new Set();
    rows.forEach((r) => {
      if (r.month) distinct.add(r.month);
    });
    return ['all', ...Array.from(distinct).sort().reverse()];
  }, [rows]);

  const clipperOptions = useMemo(() => {
    const distinct = new Set();
    rows.forEach((r) => {
      if (r.clipper_name) distinct.add(r.clipper_name);
    });
    return ['all', ...Array.from(distinct).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (selectedMonth !== 'all' && r.month !== selectedMonth) return false;
      if (selectedClipper !== 'all' && r.clipper_name !== selectedClipper)
        return false;
      return true;
    });
  }, [rows, selectedMonth, selectedClipper]);

  // KPI totals
  const totalViews = useMemo(
    () =>
      filteredRows.reduce(
        (sum, r) => sum + Number(r.views_generated || 0),
        0
      ),
    [filteredRows]
  );

  const totalPayout = useMemo(
    () =>
      filteredRows.reduce((sum, r) => sum + Number(r.payout_usd || 0), 0),
    [filteredRows]
  );

  const totalVideos = useMemo(
    () =>
      filteredRows.reduce(
        (sum, r) => sum + Number(r.videos_posted || 0),
        0
      ),
    [filteredRows]
  );

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
                Dashboards V2
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

              {/* Settings (placeholder) */}
              <button
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

              {/* push bottom cluster down */}
              <div style={{ flexGrow: 1 }} />

              {/* Dashboards V1 at bottom */}
              <button
                onClick={goDashV1}
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
                  marginBottom: 4,
                }}
              >
                Dashboards V1
              </button>

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
        {/* Branding */}
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

        {/* Header */}
        <div
          style={{
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>
              Dashboards V2
            </h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              Monthly clipper performance (BigQuery-powered)
            </span>
          </div>

          {filteredRows.length > 0 && (
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
                {filteredRows.length} rows · {monthOptions.length - 1} months ·{' '}
                {clipperOptions.length - 1} clippers
              </span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {/* Month filter */}
            <div
              style={{
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={{ opacity: 0.7 }}>Filter by month</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  fontSize: 12,
                  padding: '6px 8px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                {monthOptions.map((opt) =>
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

            {/* Clipper filter */}
            <div
              style={{
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={{ opacity: 0.7 }}>Filter by clipper</span>
              <select
                value={selectedClipper}
                onChange={(e) => setSelectedClipper(e.target.value)}
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
                {clipperOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'all' ? 'All clippers' : opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading / error */}
          <div style={{ minHeight: 24 }}>
            {loading && (
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                Loading dashboard data…
              </span>
            )}
            {!loading && error && (
              <span style={{ fontSize: 12, color: '#fed7aa' }}>{error}</span>
            )}
          </div>
        </div>

        {/* KPI row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 20,
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
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
              Total views (filtered)
            </div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>
              {formatNumber(totalViews)}
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
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
              Payout @ $1 / 1k views
            </div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>
              {formatCurrency(totalPayout)}
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
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
              Total videos posted
            </div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>
              {formatNumber(totalVideos)}
            </div>
          </div>
        </div>

        {/* Table card */}
        <div
          style={{
            borderRadius: 20,
            background:
              'radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 55%)',
            padding: 20,
            boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
          }}
        >
          {filteredRows.length === 0 && !loading ? (
            <div style={{ padding: 12, fontSize: 14, opacity: 0.8 }}>
              No rows match the selected filters.
            </div>
          ) : (
            <div
              style={{
                overflowX: 'auto',
                marginTop: 4,
              }}
            >
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
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td
                        style={{
                          padding: '10px 6px',
                          borderBottom:
                            '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <span>{row.clipper_name}</span>
                          <span
                            style={{
                              fontSize: 11,
                              opacity: 0.6,
                              marginTop: 1,
                            }}
                          >
                            ID: {row.clipper_id}
                          </span>
                        </div>
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
                        {formatNumber(row.videos_posted)}
                      </td>
                      <td
                        style={{
                          padding: '10px 6px',
                          borderBottom:
                            '1px solid rgba(255,255,255,0.06)',
                          textAlign: 'right',
                        }}
                      >
                        {formatNumber(row.views_generated)}
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
                        {formatCurrency(row.payout_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

