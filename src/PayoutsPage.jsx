import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
  'https://clipper-payouts-api-810712855216.us-central1.run.app';

// ---- Helpers -------------------------------------------------

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  return currencyFormatter.format(n);
}

function formatDate(dateLike) {
  if (!dateLike) return '-';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateLike) {
  if (!dateLike) return '-';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const CURRENT_MONTH_LABEL = new Date().toLocaleString('en-US', {
  month: 'long',
});

// ---- Main component -------------------------------------------

function PayoutsPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'due' | 'history'

  const [monthlyBalances, setMonthlyBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState('');

  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [historyClipper, setHistoryClipper] = useState('all');
  const [historyMonth, setHistoryMonth] = useState('all');

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClipper, setModalClipper] = useState(null);

  // ---- Navigation ------------------------------------------------

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleGoDashV2 = () => {
    navigate('/dashboard-v2');
  };

  const handleGoDashV1 = () => {
    navigate('/dashboard');
  };

  const handleGoClippers = () => {
    navigate('/clippers');
  };

  // ---- Fetch monthly balances ------------------------------------

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        setBalancesLoading(true);
        setBalancesError('');
        const res = await fetch(`${API_BASE_URL}/clipper-monthly-balances`);
        if (!res.ok) throw new Error(`Balances API ${res.status}`);
        const data = await res.json();
        setMonthlyBalances(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching monthly balances:', err);
        setBalancesError(err.message || 'Failed to load balances');
      } finally {
        setBalancesLoading(false);
      }
    };
    fetchBalances();
  }, []);

  // ---- Fetch payout history --------------------------------------

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        setHistoryError('');
        const res = await fetch(`${API_BASE_URL}/clipper-payout-history`);
        if (!res.ok) throw new Error(`History API ${res.status}`);
        const data = await res.json();
        setHistoryRows(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching payout history:', err);
        setHistoryError(err.message || 'Failed to load payout history');
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // ---- Derived datasets ------------------------------------------

  const upcomingRows = useMemo(
    () =>
      monthlyBalances.filter(
        (row) =>
          row.month_label === CURRENT_MONTH_LABEL &&
          Number(row.outstanding_usd) > 0
      ),
    [monthlyBalances]
  );

  const dueRows = useMemo(
    () =>
      monthlyBalances.filter(
        (row) =>
          row.month_label !== CURRENT_MONTH_LABEL &&
          Number(row.outstanding_usd) > 0
      ),
    [monthlyBalances]
  );

  const upcomingTotal = useMemo(
    () =>
      upcomingRows.reduce(
        (sum, row) => sum + Number(row.outstanding_usd || 0),
        0
      ),
    [upcomingRows]
  );

  const upcomingCount = upcomingRows.length;

  // history filter options
  const historyClipperOptions = useMemo(() => {
    const names = Array.from(
      new Set(historyRows.map((h) => h.clipper_name).filter(Boolean))
    ).sort();
    return ['all', ...names];
  }, [historyRows]);

  const historyMonthOptions = useMemo(() => {
    const months = Array.from(
      new Set(
        historyRows
          .map((h) => h.earnings_month_label)
          .filter((m) => m && typeof m === 'string')
      )
    ).sort((a, b) => {
      // naive but fine: compare by parsed date
      const parse = (label) => {
        const d = new Date(label);
        return d.getTime() || 0;
      };
      return parse(a) - parse(b);
    });
    return ['all', ...months];
  }, [historyRows]);

  const filteredHistory = useMemo(
    () =>
      historyRows.filter((row) => {
        if (historyClipper !== 'all' && row.clipper_name !== historyClipper) {
          return false;
        }
        if (
          historyMonth !== 'all' &&
          row.earnings_month_label !== historyMonth
        ) {
          return false;
        }
        return true;
      }),
    [historyRows, historyClipper, historyMonth]
  );

  const historySummary = useMemo(
    () => ({
      count: filteredHistory.length,
      total: filteredHistory.reduce(
        (sum, row) => sum + Number(row.amount_usd || 0),
        0
      ),
    }),
    [filteredHistory]
  );

  // ---- Modal handlers (still demo; later we'll call Stripe/PayPal) ----

  const handlePayClick = (row) => {
    setModalClipper(row);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalClipper(null);
  };

  // ---- Render helpers --------------------------------------------

  const renderUpcomingOrDueTable = (rows) => {
    if (balancesLoading) {
      return (
        <div style={{ padding: 12, fontSize: 14, opacity: 0.8 }}>
          Loading payouts...
        </div>
      );
    }

    if (balancesError) {
      return (
        <div
          style={{
            padding: 12,
            fontSize: 14,
            color: '#fecaca',
          }}
        >
          {balancesError}
        </div>
      );
    }

    if (!rows.length) {
      return (
        <div style={{ padding: 12, fontSize: 14, opacity: 0.8 }}>
          No payouts found for this section.
        </div>
      );
    }

    return (
      <div
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          background:
            'radial-gradient(circle at top left, rgba(148,163,184,0.12), transparent 60%)',
          border: '1px solid rgba(148,163,184,0.2)',
        }}
      >
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
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                  fontWeight: 500,
                  opacity: 0.7,
                }}
              >
                Clipper
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '10px 8px',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                  fontWeight: 500,
                  opacity: 0.7,
                }}
              >
                Month
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '10px 8px',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                  fontWeight: 500,
                  opacity: 0.7,
                }}
              >
                Earned
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '10px 8px',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                  fontWeight: 500,
                  opacity: 0.7,
                }}
              >
                Paid
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '10px 8px',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                  fontWeight: 500,
                  opacity: 0.7,
                }}
              >
                Outstanding
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '10px 8px',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                  fontWeight: 500,
                  opacity: 0.7,
                }}
              >
                Processor
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.12)',
                  fontWeight: 500,
                  opacity: 0.7,
                }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={`${row.clipper_id}_${row.month_label}_${idx}`}
                style={{
                  borderBottom:
                    idx !== rows.length - 1
                      ? '1px solid rgba(148,163,184,0.15)'
                      : 'none',
                }}
              >
                <td
                  style={{
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  <div>{row.clipper_name || 'Clipper'}</div>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.6,
                      marginTop: 2,
                    }}
                  >
                    ID: {row.clipper_id || '—'}
                  </div>
                </td>

                <td
                  style={{
                    padding: '12px 8px',
                    fontSize: 13,
                    textAlign: 'right',
                    opacity: 0.85,
                  }}
                >
                  {row.month_label}
                </td>

                <td
                  style={{
                    padding: '12px 8px',
                    fontSize: 13,
                    textAlign: 'right',
                  }}
                >
                  {formatCurrency(row.earned_usd)}
                </td>

                <td
                  style={{
                    padding: '12px 8px',
                    fontSize: 13,
                    textAlign: 'right',
                  }}
                >
                  {formatCurrency(row.paid_usd)}
                </td>

                <td
                  style={{
                    padding: '12px 8px',
                    fontSize: 13,
                    textAlign: 'right',
                    color:
                      Number(row.outstanding_usd) > 0 ? '#4ade80' : '#e5e7eb',
                  }}
                >
                  {formatCurrency(row.outstanding_usd)}
                </td>

                <td
                  style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      border: '1px solid rgba(148,163,184,0.4)',
                      background:
                        row.payment_processor === 'stripe'
                          ? 'rgba(59,130,246,0.18)'
                          : 'rgba(15,23,42,0.8)',
                    }}
                  >
                    {(row.payment_processor || 'Unknown').toUpperCase()}
                  </span>
                </td>

                <td
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                  }}
                >
                  <button
                    onClick={() => handlePayClick(row)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                      background:
                        'radial-gradient(circle at 0 0, #22c55e, #16a34a)',
                      color: '#022c22',
                      fontSize: 13,
                      fontWeight: 600,
                      boxShadow: '0 10px 25px rgba(34,197,94,0.45)',
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
    );
  };

  // ---- Layout ----------------------------------------------------

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        boxSizing: 'border-box',
        background: 'radial-gradient(circle at top, #141414 0, #020202 55%)',
        color: '#fff',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: 'relative',
        display: 'flex',
        padding: 0,
        overflowX: 'hidden',
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: sidebarOpen ? 220 : 72,
          transition: 'width 0.25s ease',
          borderRight: '1px solid rgba(148,163,184,0.25)',
          background:
            'radial-gradient(circle at top left, #111827 0, #000000 60%)',
          padding: '16px 14px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            fontWeight: 800,
            letterSpacing: 1,
            fontSize: 18,
            marginBottom: 20,
          }}
        >
          CLIPPER PAY
        </div>

        <button
          onClick={() => setSidebarOpen((v) => !v)}
          style={{
            marginBottom: 16,
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid rgba(148,163,184,0.4)',
            background: 'transparent',
            color: '#e5e7eb',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          {sidebarOpen ? 'Collapse' : 'Expand'}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Dashboards */}
          <button
            onClick={handleGoDashV2}
            style={{
              padding: '8px 10px',
              borderRadius: 999,
              border: 'none',
              background: 'transparent',
              color: '#e5e7eb',
              textAlign: 'left',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Dashboard v2
          </button>

          <button
            onClick={handleGoDashV1}
            style={{
              padding: '8px 10px',
              borderRadius: 999,
              border: 'none',
              background: 'transparent',
              color: '#e5e7eb',
              textAlign: 'left',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Dashboard v1
          </button>

          {/* Payouts (active) */}
          <button
            style={{
              padding: '8px 10px',
              borderRadius: 999,
              border: 'none',
              background:
                'linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))',
              color: '#020617',
              fontWeight: 600,
              fontSize: 13,
              textAlign: 'left',
              marginTop: 8,
            }}
          >
            Payouts
          </button>

          {/* Clippers */}
          <button
            onClick={handleGoClippers}
            style={{
              padding: '8px 10px',
              borderRadius: 999,
              border: 'none',
              background: 'transparent',
              color: '#e5e7eb',
              textAlign: 'left',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Clippers
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 10px',
              borderRadius: 999,
              border: 'none',
              background: 'transparent',
              color: '#fca5a5',
              textAlign: 'left',
              fontSize: 13,
              cursor: 'pointer',
              marginTop: 16,
            }}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          padding: '24px 32px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 0.5,
              }}
            >
              Payouts
            </div>
            <div
              style={{
                fontSize: 13,
                opacity: 0.75,
                marginTop: 4,
              }}
            >
              Clipper earnings &amp; payment history
            </div>
          </div>

          {/* Summary pill */}
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.4)',
              background:
                'radial-gradient(circle at top, rgba(15,23,42,0.9), rgba(15,23,42,0.5))',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ opacity: 0.8 }}>
              {upcomingCount} clippers with upcoming payouts
            </span>
            <span>·</span>
            <span>
              Upcoming total:{' '}
              <strong>{formatCurrency(upcomingTotal)}</strong>
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(15,23,42,0.85)',
            borderRadius: 999,
            padding: 4,
            border: '1px solid rgba(148,163,184,0.5)',
            marginBottom: 12,
          }}
        >
          {[
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'due', label: 'Payments due' },
            { id: 'history', label: 'Payment history' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '6px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                  background: active
                    ? 'radial-gradient(circle at top, #fbbf24, #f97316)'
                    : 'transparent',
                  color: active ? '#020617' : '#e5e7eb',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        <div style={{ marginTop: 8 }}>
          {activeTab === 'upcoming' && renderUpcomingOrDueTable(upcomingRows)}

          {activeTab === 'due' && renderUpcomingOrDueTable(dueRows)}

          {activeTab === 'history' && (
            <div
              style={{
                borderRadius: 24,
                padding: 16,
                background:
                  'radial-gradient(circle at top left, rgba(30,64,175,0.22), rgba(15,23,42,0.9))',
                border: '1px solid rgba(148,163,184,0.4)',
              }}
            >
              {/* Filters */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Filter by clipper */}
                  <div>
                    <div
                      style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}
                    >
                      Filter by clipper
                    </div>
                    <select
                      value={historyClipper}
                      onChange={(e) => setHistoryClipper(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        border: '1px solid rgba(148,163,184,0.6)',
                        background: 'rgba(15,23,42,0.9)',
                        color: '#e5e7eb',
                        fontSize: 12,
                      }}
                    >
                      {historyClipperOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt === 'all' ? 'All clippers' : opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by month */}
                  <div>
                    <div
                      style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}
                    >
                      Filter by month
                    </div>
                    <select
                      value={historyMonth}
                      onChange={(e) => setHistoryMonth(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        border: '1px solid rgba(148,163,184,0.6)',
                        background: 'rgba(15,23,42,0.9)',
                        color: '#e5e7eb',
                        fontSize: 12,
                      }}
                    >
                      {historyMonthOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt === 'all' ? 'All months' : opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Summary */}
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.9,
                  }}
                >
                  Showing {historySummary.count} payments · Total:{' '}
                  <strong>{formatCurrency(historySummary.total)}</strong>
                </div>
              </div>

              {/* History table */}
              {historyLoading && (
                <div style={{ fontSize: 14, opacity: 0.8 }}>
                  Loading payment history...
                </div>
              )}

              {historyError && (
                <div style={{ fontSize: 14, color: '#fecaca' }}>
                  {historyError}
                </div>
              )}

              {!historyLoading && !historyError && filteredHistory.length === 0 && (
                <div style={{ fontSize: 14, opacity: 0.8 }}>
                  No payments found for the selected filters.
                </div>
              )}

              {!historyLoading && !historyError && filteredHistory.length > 0 && (
                <div
                  style={{
                    borderRadius: 18,
                    overflow: 'hidden',
                    border: '1px solid rgba(148,163,184,0.4)',
                    background:
                      'radial-gradient(circle at top, rgba(15,23,42,0.95), rgba(15,23,42,0.9))',
                    marginTop: 8,
                  }}
                >
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
                            padding: '10px 16px',
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
                            textAlign: 'right',
                            padding: '10px 8px',
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
                            padding: '10px 8px',
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
                            textAlign: 'right',
                            padding: '10px 8px',
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
                            textAlign: 'center',
                            padding: '10px 8px',
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
                            textAlign: 'center',
                            padding: '10px 16px',
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
                      {filteredHistory.map((row, idx) => (
                        <tr
                          key={row.payout_id || idx}
                          style={{
                            borderBottom:
                              idx !== filteredHistory.length - 1
                                ? '1px solid rgba(148,163,184,0.18)'
                                : 'none',
                          }}
                        >
                          <td
                            style={{
                              padding: '10px 16px',
                              fontSize: 14,
                              fontWeight: 500,
                            }}
                          >
                            <div>{row.clipper_name || 'Clipper'}</div>
                            <div
                              style={{
                                fontSize: 11,
                                opacity: 0.6,
                                marginTop: 2,
                              }}
                            >
                              ID: {row.clipper_id || '—'}
                            </div>
                          </td>

                          <td
                            style={{
                              padding: '10px 8px',
                              fontSize: 13,
                              textAlign: 'right',
                              opacity: 0.85,
                            }}
                          >
                            {row.earnings_month_label || '-'}
                          </td>

                          <td
                            style={{
                              padding: '10px 8px',
                              fontSize: 13,
                              textAlign: 'right',
                            }}
                          >
                            {formatCurrency(row.amount_usd)}
                          </td>

                          <td
                            style={{
                              padding: '10px 8px',
                              fontSize: 13,
                              textAlign: 'right',
                              opacity: 0.9,
                            }}
                          >
                            {formatDateTime(row.completed_at || row.initiated_at)}
                          </td>

                          <td
                            style={{
                              padding: '10px 8px',
                              textAlign: 'center',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-flex',
                                padding: '4px 10px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 600,
                                border: '1px solid rgba(148,163,184,0.4)',
                                background:
                                  row.processor === 'stripe'
                                    ? 'rgba(59,130,246,0.18)'
                                    : 'rgba(15,23,42,0.8)',
                              }}
                            >
                              {(row.processor || 'Unknown').toUpperCase()}
                            </span>
                          </td>

                          <td
                            style={{
                              padding: '10px 16px',
                              fontSize: 13,
                              textAlign: 'center',
                            }}
                          >
                            {row.invoice_url ? (
                              <a
                                href={row.invoice_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: '#facc15',
                                  textDecoration: 'underline dotted',
                                }}
                              >
                                View invoice
                              </a>
                            ) : (
                              <span style={{ opacity: 0.5 }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Demo payout modal (for now) */}
      {modalOpen && modalClipper && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 40,
          }}
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 360,
              maxWidth: '90vw',
              borderRadius: 24,
              padding: 20,
              background:
                'radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(15,23,42,0.95))',
              border: '1px solid rgba(148,163,184,0.6)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  Confirm payout
                </div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.7,
                    marginTop: 2,
                  }}
                >
                  This is still a demo modal – wiring Stripe/PayPal is next.
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  border: 'none',
                  background: 'rgba(15,23,42,0.9)',
                  borderRadius: 999,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 16,
                  color: '#e5e7eb',
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              <div
                style={{
                  marginBottom: 4,
                }}
              >
                <span style={{ opacity: 0.7 }}>Clipper</span>
                <br />
                <strong>{modalClipper.clipper_name}</strong>
              </div>
              <div
                style={{
                  marginBottom: 4,
                }}
              >
                <span style={{ opacity: 0.7 }}>Month</span>
                <br />
                <strong>{modalClipper.month_label}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 4,
                }}
              >
                <span style={{ opacity: 0.7 }}>Outstanding amount</span>
                <span>
                  {formatCurrency(modalClipper.outstanding_usd || 0)}
                </span>
              </div>
            </div>

            <button
              onClick={closeModal}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                background:
                  'linear-gradient(135deg, #22c55e, #4ade80, #bbf7d0)',
                color: '#022c22',
                boxShadow: '0 15px 35px rgba(34,197,94,0.5)',
              }}
            >
              Confirm demo payout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PayoutsPage;
