import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

// 🔗 Real Cloud Run base URL (used for upcoming payouts demo)
const API_BASE_URL =
  'https://clipper-payouts-api-810712855216.us-central1.run.app';

// ---- Demo placeholder data ----

const MOCK_UPCOMING = [
  {
    clipper_id: 'clipper_1',
    clipper_name: 'Editor One',
    total_earned_usd: 250.5,
    last_payout_date: '2025-11-19',
    processor: 'Stripe',
  },
  {
    clipper_id: 'clipper_2',
    clipper_name: 'Editor Two',
    total_earned_usd: 120.0,
    last_payout_date: '2025-11-17',
    processor: 'PayPal',
  },
  {
    clipper_id: 'clipper_3',
    clipper_name: 'Editor Three',
    total_earned_usd: 480.75,
    last_payout_date: '2025-11-10',
    processor: 'Wise',
  },
];

const MOCK_HISTORY = [
  {
    id: 'tx_001',
    clipper_id: 'clipper_1',
    clipper_name: 'Editor One',
    amount_usd: 250.5,
    processor: 'Stripe',
    ts: '2025-11-19T15:24:00Z',
    invoice_url: '#',
  },
  {
    id: 'tx_002',
    clipper_id: 'clipper_2',
    clipper_name: 'Editor Two',
    amount_usd: 120.0,
    processor: 'PayPal',
    ts: '2025-11-17T18:10:00Z',
    invoice_url: '#',
  },
  {
    id: 'tx_003',
    clipper_id: 'clipper_3',
    clipper_name: 'Editor Three',
    amount_usd: 310.25,
    processor: 'Wise',
    ts: '2025-10-30T12:00:00Z',
    invoice_url: '#',
  },
  {
    id: 'tx_004',
    clipper_id: 'clipper_1',
    clipper_name: 'Editor One',
    amount_usd: 220.0,
    processor: 'Stripe',
    ts: '2025-10-15T09:42:00Z',
    invoice_url: '#',
  },
];

// ---- Small helpers ----

const formatCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// simple chip for processor
function ProcessorBadge({ processor }) {
  const base = {
    Stripe: { bg: 'rgba(88, 101, 242, 0.16)', border: 'rgba(88, 101, 242, 0.6)' },
    PayPal: { bg: 'rgba(0, 119, 181, 0.16)', border: 'rgba(0, 119, 181, 0.6)' },
    Wise: { bg: 'rgba(0, 184, 128, 0.16)', border: 'rgba(0, 184, 128, 0.6)' },
  }[processor] || { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.24)' };

  return (
    <span
      style={{
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 999,
        border: `1px solid ${base.border}`,
        background: base.bg,
        textTransform: 'uppercase',
        letterSpacing: 0.04,
      }}
    >
      {processor}
    </span>
  );
}

export default function PayoutsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'history'
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [upcomingError, setUpcomingError] = useState('');
  const [upcomingRows, setUpcomingRows] = useState([]);

  // history filter
  const [historyClipper, setHistoryClipper] = useState('all');
  const [historyMonth, setHistoryMonth] = useState('all');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleReturnToDashboards = () => {
    navigate('/'); // adjust route if your dashboards live elsewhere
  };

  // Fetch upcoming payouts from API (with fallback to mock)
  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        setLoadingUpcoming(true);
        setUpcomingError('');

        const res = await fetch(`${API_BASE_URL}/payouts`);

        if (!res.ok) {
          throw new Error(`API responded with ${res.status}`);
        }

        const data = await res.json();
        const normalized = (Array.isArray(data) ? data : []).map((r, i) => ({
          clipper_id: r.clipper_id || `clipper_${i + 1}`,
          clipper_name: r.clipper_name || `Clipper ${i + 1}`,
          total_earned_usd: Number(r.total_earned_usd) || 0,
          last_payout_date: r.last_payout_date,
          // demo: just cycle processors
          processor: ['Stripe', 'PayPal', 'Wise'][i % 3],
        }));

        if (!normalized.length) {
          // if API returns empty, still show demo data
          setUpcomingRows(MOCK_UPCOMING);
        } else {
          setUpcomingRows(normalized);
        }
      } catch (err) {
        console.error('Error fetching payouts:', err);
        setUpcomingError('Using demo data (API unavailable).');
        setUpcomingRows(MOCK_UPCOMING);
      } finally {
        setLoadingUpcoming(false);
      }
    };

    fetchPayouts();
  }, []);

  const totalAllEarned = useMemo(
    () =>
      upcomingRows.reduce(
        (sum, r) => sum + (Number(r.total_earned_usd) || 0),
        0
      ),
    [upcomingRows]
  );

  // history filters
  const clipperOptions = useMemo(() => {
    const names = Array.from(
      new Set(MOCK_HISTORY.map((h) => h.clipper_name))
    ).sort();
    return ['all', ...names];
  }, []);

  const monthOptions = useMemo(() => {
    const months = Array.from(
      new Set(
        MOCK_HISTORY.map((h) => {
          const d = new Date(h.ts);
          if (Number.isNaN(d.getTime())) return null;
          const yy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          return `${yy}-${mm}`; // YYYY-MM
        }).filter(Boolean)
      )
    ).sort((a, b) => (a > b ? -1 : 1)); // newest first
    return ['all', ...months];
  }, []);

  const filteredHistory = useMemo(() => {
    return MOCK_HISTORY.filter((h) => {
      if (historyClipper !== 'all' && h.clipper_name !== historyClipper) {
        return false;
      }
      if (historyMonth !== 'all') {
        const d = new Date(h.ts);
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${yy}-${mm}`;
        if (key !== historyMonth) return false;
      }
      return true;
    }).sort((a, b) => (a.ts > b.ts ? -1 : 1));
  }, [historyClipper, historyMonth]);

  const totalHistoryPaid = useMemo(
    () =>
      filteredHistory.reduce(
        (sum, h) => sum + (Number(h.amount_usd) || 0),
        0
      ),
    [filteredHistory]
  );

  // demo pay handler
  const handleDemoPayClick = (clipper) => {
    alert(
      `Demo only:\nWould trigger payout for ${clipper.clipper_name} via ${clipper.processor} for ${formatCurrency(
        clipper.total_earned_usd
      )}`
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at top, #141414 0, #020202 55%)',
        color: '#fff',
        padding: '32px 32px 80px 32px',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: 'relative',
      }}
    >
      {/* Bottom-left controls */}
      <div
        style={{
          position: 'fixed',
          left: 16,
          bottom: 14,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <button
          onClick={handleReturnToDashboards}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.18)',
            background:
              'linear-gradient(120deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
            color: 'rgba(255,255,255,0.9)',
            cursor: 'pointer',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backdropFilter: 'blur(8px)',
          }}
        >
          ← Return to dashboards
        </button>

        <button
          onClick={handleLogout}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            backdropFilter: 'blur(4px)',
          }}
        >
          <span style={{ fontSize: 12 }}>⏻</span>
          Logout
        </button>
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
          <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Payouts</h1>
          <span style={{ fontSize: 13, opacity: 0.7 }}>
            Clipper earnings & payment history
          </span>
        </div>

        {/* Summary pill */}
        {upcomingRows.length > 0 && (
          <div
            style={{
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.04)',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <span style={{ opacity: 0.8 }}>
              {upcomingRows.length} clippers with upcoming payouts
            </span>
            <span
              style={{
                width: 1,
                height: 16,
                background: 'rgba(255,255,255,0.15)',
              }}
            />
            <span style={{ opacity: 0.9 }}>
              Upcoming total:{' '}
              <strong>{formatCurrency(totalAllEarned)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          marginBottom: 20,
          display: 'inline-flex',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(0,0,0,0.4)',
          padding: 3,
        }}
      >
        {[
          { key: 'upcoming', label: 'Upcoming payouts' },
          { key: 'history', label: 'Payment history' },
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

      {/* Content card */}
      <div
        style={{
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.06)',
          background:
            'radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 55%)',
          padding: 20,
          boxShadow: '0 18px 50px rgba(0,0,0,0.75)',
        }}
      >
        {activeTab === 'upcoming' && (
          <>
            {loadingUpcoming && (
              <div style={{ padding: 12, fontSize: 14, opacity: 0.8 }}>
                Loading upcoming payouts…
              </div>
            )}

            {!loadingUpcoming && upcomingError && (
              <div
                style={{
                  padding: 10,
                  marginBottom: 8,
                  fontSize: 12,
                  borderRadius: 10,
                  background: 'rgba(252, 165, 0, 0.08)',
                  border: '1px solid rgba(252, 211, 77, 0.4)',
                  color: '#fed7aa',
                }}
              >
                {upcomingError}
              </div>
            )}

            {!loadingUpcoming && upcomingRows.length === 0 && (
              <div style={{ padding: 12, fontSize: 14, opacity: 0.8 }}>
                No upcoming payouts yet.
              </div>
            )}

            {!loadingUpcoming && upcomingRows.length > 0 && (
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
                        Total earned
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
                        Last payout
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
                        Processor
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
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingRows.map((row) => (
                      <tr key={row.clipper_id}>
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
                            <span>{row.clipper_name || row.clipper_id}</span>
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
                            fontWeight: 500,
                          }}
                        >
                          {formatCurrency(row.total_earned_usd)}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.06)',
                            opacity: 0.8,
                          }}
                        >
                          {formatDate(row.last_payout_date)}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <ProcessorBadge processor={row.processor} />
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.06)',
                            textAlign: 'right',
                          }}
                        >
                          <button
                            onClick={() => handleDemoPayClick(row)}
                            style={{
                              borderRadius: 999,
                              border: 'none',
                              padding: '6px 14px',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 500,
                              background:
                                'linear-gradient(135deg, #22c55e, #4ade80)',
                              color: '#03240c',
                              boxShadow:
                                '0 10px 25px rgba(34,197,94,0.45)',
                            }}
                          >
                            Pay
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
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
                    value={historyClipper}
                    onChange={(e) => setHistoryClipper(e.target.value)}
                    style={{
                      fontSize: 12,
                      padding: '6px 8px',
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    {clipperOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt === 'all' ? 'All clippers' : opt}
                      </option>
                    ))}
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
                  <span style={{ opacity: 0.7 }}>Filter by month</span>
                  <select
                    value={historyMonth}
                    onChange={(e) => setHistoryMonth(e.target.value)}
                    style={{
                      fontSize: 12,
                      padding: '6px 8px',
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    {monthOptions.map((opt) => {
                      if (opt === 'all') {
                        return (
                          <option key={opt} value={opt}>
                            All months
                          </option>
                        );
                      }
                      const [yy, mm] = opt.split('-');
                      const label = formatDate(`${yy}-${mm}-01`).slice(0, 8);
                      return (
                        <option key={opt} value={opt}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                Showing {filteredHistory.length} payments · Total:{' '}
                <strong>{formatCurrency(totalHistoryPaid)}</strong>
              </div>
            </div>

            {/* History table */}
            {filteredHistory.length === 0 ? (
              <div style={{ padding: 12, fontSize: 14, opacity: 0.8 }}>
                No payments match the selected filters.
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
                        Amount paid
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
                        Transaction time
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
                        Processor
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
                        Invoice / receipt
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((row) => (
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
                            fontWeight: 500,
                          }}
                        >
                          {formatCurrency(row.amount_usd)}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.06)',
                            opacity: 0.85,
                          }}
                        >
                          {formatDateTime(row.ts)}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <ProcessorBadge processor={row.processor} />
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            borderBottom:
                              '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <a
                            href={row.invoice_url}
                            style={{
                              fontSize: 12,
                              color: '#facc15',
                              textDecoration: 'none',
                              borderBottom:
                                '1px dashed rgba(250,204,21,0.7)',
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              alert('Demo only: invoice viewer coming soon.');
                            }}
                          >
                            View invoice
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
