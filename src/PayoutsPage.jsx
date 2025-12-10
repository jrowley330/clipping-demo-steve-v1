// PayoutsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
  'https://clipper-payouts-api-810712855216.us-central1.run.app';

// ---------- helpers ----------

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const unwrapValue = (v) => {
  if (v && typeof v === 'object' && 'value' in v) {
    return v.value;
  }
  return v;
};

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  return currencyFormatter.format(n);
}

function formatDateTime(dateLike) {
  const raw = unwrapValue(dateLike);
  if (!raw) return '-';
  const d = new Date(raw);
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

// ---------- component -----------

export default function PayoutsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'due' | 'history'

  const [monthlyBalances, setMonthlyBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState('');

  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [historyClipper, setHistoryClipper] = useState('all');
  const [historyMonth, setHistoryMonth] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalClipper, setModalClipper] = useState(null);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [payResult, setPayResult] = useState(null); // will hold API response later

  // amount the user will pay in this payout (can be partial)
  const [payAmount, setPayAmount] = useState(0);

  // ---------- navigation handlers (match other pages) ----------

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleGoDashV2 = () => {
    navigate('/dashboard-v2');
  };

  const handleGoPayouts = () => {
    navigate('/payouts');
  };

  const handleGoDashV1 = () => {
    navigate('/dashboard');
  };

  const handleGoClippers = () => {
    navigate('/clippers');
  };

  // ---------- fetch monthly balances ----------

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
        setBalancesError(err.message || 'Failed to load monthly balances');
      } finally {
        setBalancesLoading(false);
      }
    };
    fetchBalances();
  }, []);

  // ---------- fetch payout history ----------

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

  // ---------- derived datasets ----------

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

  const overdueTotal = useMemo(
    () =>
      dueRows.reduce((sum, row) => sum + Number(row.outstanding_usd || 0), 0),
    [dueRows]
  );
  const overdueCount = dueRows.length;

  // history filters
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
    );
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

  // ---------- modal handlers ----------

    const handlePayClick = (row) => {
    setModalClipper(row);

    // default to the full outstanding amount for this row
    const outstanding = Number(row.outstanding_usd || 0) || 0;
    setPayAmount(outstanding);

    setPayError('');
    setPayResult(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalClipper(null);
    setPayError('');
    setPayResult(null);
    setPayAmount(0);
  };


    const handleConfirmPay = async () => {
    if (!modalClipper || paying) return;

    const maxOutstanding = Number(modalClipper.outstanding_usd || 0) || 0;
    let desiredAmount = Number(payAmount);

    if (!Number.isFinite(desiredAmount)) {
      desiredAmount = 0;
    }

    // basic validations
    if (desiredAmount <= 0) {
      setPayError('Amount must be greater than 0.');
      return;
    }

    if (desiredAmount > maxOutstanding + 0.000001) {
      setPayError(
        `Amount cannot exceed outstanding balance of ${formatCurrency(
          maxOutstanding
        )}.`
      );
      return;
    }

    try {
      setPayError('');
      setPayResult(null);
      setPaying(true);

      const body = {
        clipperId: modalClipper.clipper_id,
        month: modalClipper.month_label, // e.g. "December 2025"
        amountUsd: desiredAmount,
        initiatedByUserId: 'demo-admin', // TODO: replace with real user id
      };

      console.log('Sending payout request', body);

      const res = await fetch(`${API_BASE_URL}/pay-clipper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Pay API ${res.status}`);
      }

      setPayResult(data);
      alert('Payout successful!'); // we'll replace this later with nicer UI
      window.location.reload();    // and replace this with a state refresh later
    } catch (err) {
      console.error('Error paying clipper:', err);
      setPayError(err.message || 'Failed to send payout');
    } finally {
      setPaying(false);
    }
  };


  // ---------- table render for Upcoming / Due ----------

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
          borderRadius: 18,
          overflow: 'hidden',
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(148,163,184,0.35)',
          boxShadow: '0 18px 45px rgba(0,0,0,0.9)',
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
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
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
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
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
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
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
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
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
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
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
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
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
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
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
                      ? '1px solid rgba(148,163,184,0.18)'
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
                        (row.payment_processor || '').toLowerCase() === 'stripe'
                          ? 'rgba(59,130,246,0.18)'
                          : 'rgba(15,23,42,0.85)',
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

  // ---------- layout (match Dashboards / Clippers) ----------

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

              {/* Dashboards V2 */}
              <button
                onClick={handleGoDashV2}
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
                Dashboards V2
              </button>

              {/* Payouts (current) */}
              <button
                onClick={handleGoPayouts}
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
                Payouts
              </button>

              {/* Clippers */}
              <button
                onClick={handleGoClippers}
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

              {/* Settings */}
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

              <div style={{ flexGrow: 1 }} />

              {/* Dashboards V1 at bottom */}
              <button
                onClick={handleGoDashV1}
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
                Clipper payouts hub
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
        {/* Header / title */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 22,
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

          {/* Summary pill with Upcoming + Overdue */}
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.4)',
              background:
                'radial-gradient(circle at top, rgba(15,23,42,0.9), rgba(15,23,42,0.8))',
              fontSize: 13,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              alignItems: 'flex-end',
              minWidth: 260,
            }}
          >
            <div>
              <span style={{ opacity: 0.8 }}>
                {upcomingCount} clippers with upcoming payouts
              </span>
              <span> · </span>
              <span>
                Upcoming total:{' '}
                <strong>{formatCurrency(upcomingTotal)}</strong>
              </span>
            </div>

            {overdueCount > 0 && (
              <div style={{ fontSize: 12, color: '#fecaca' }}>
                {overdueCount} clippers with overdue payouts · Overdue total:{' '}
                <strong>{formatCurrency(overdueTotal)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            marginBottom: 18,
            display: 'inline-flex',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.55)',
            padding: 3,
            backdropFilter: 'blur(8px)',
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
                  padding: '6px 16px',
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

        {/* Content card */}
        {activeTab === 'upcoming' && renderUpcomingOrDueTable(upcomingRows)}
        {activeTab === 'due' && renderUpcomingOrDueTable(dueRows)}

        {activeTab === 'history' && (
          <div
            style={{
              borderRadius: 18,
              padding: 16,
              background: 'rgba(15,23,42,0.96)',
              border: '1px solid rgba(148,163,184,0.45)',
              boxShadow: '0 18px 45px rgba(0,0,0,0.9)',
            }}
          >
            {/* Filters row */}
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
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                {/* Filter by clipper */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.75,
                      marginBottom: 4,
                    }}
                  >
                    Filter by clipper
                  </div>
                  <select
                    value={historyClipper}
                    onChange={(e) => setHistoryClipper(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(148,163,184,0.7)',
                      background: 'rgba(15,23,42,0.95)',
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
                    style={{
                      fontSize: 11,
                      opacity: 0.75,
                      marginBottom: 4,
                    }}
                  >
                    Filter by month
                  </div>
                  <select
                    value={historyMonth}
                    onChange={(e) => setHistoryMonth(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(148,163,184,0.7)',
                      background: 'rgba(15,23,42,0.95)',
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

            {!historyLoading &&
              !historyError &&
              filteredHistory.length === 0 && (
                <div style={{ fontSize: 14, opacity: 0.8 }}>
                  No payments found for the selected filters.
                </div>
              )}

            {!historyLoading &&
              !historyError &&
              filteredHistory.length > 0 && (
                <div
                  style={{
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: '1px solid rgba(148,163,184,0.4)',
                    background: 'rgba(15,23,42,0.98)',
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
                            {formatDateTime(
                              row.completed_at ||
                                row.initiated_at ||
                                row.created_at
                            )}
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
                                  (row.processor || '').toLowerCase() ===
                                  'stripe'
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

      {/* Payout modal */}
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
                  This will trigger a test payout via Stripe for this clipper.
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
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span style={{ opacity: 0.7 }}>Clipper</span>
                <strong>{modalClipper.clipper_name}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span style={{ opacity: 0.7 }}>Month</span>
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

            {payError && (
              <div
                style={{
                  marginBottom: 8,
                  fontSize: 13,
                  color: '#fecaca',
                }}
              >
                {payError}
              </div>
            )}

            <button
              onClick={handleConfirmPay}
              disabled={paying}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: 999,
                border: 'none',
                cursor: paying ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600,
                background:
                  'linear-gradient(135deg, #22c55e, #4ade80, #bbf7d0)',
                color: '#022c22',
                boxShadow: '0 15px 35px rgba(34,197,94,0.5)',
                opacity: paying ? 0.7 : 1,
              }}
            >
              {paying ? 'Processing payout…' : 'Confirm payout'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
