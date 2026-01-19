// PayoutsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useBranding } from "./branding/BrandingContext";

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
  if (v && typeof v === 'object' && 'value' in v) return v.value;
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
  year: 'numeric',
});

const MANUAL_METHOD_OPTIONS = [
  'Cash',
  'Zelle',
  'PayPal',
  'Wise',
  'Revolut',
  'Bank transfer',
  'Other',
];

// ---------- component -----------

export default function PayoutsPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // BRANDING
  const { headingText, watermarkText, defaults } = useBranding();
  const brandText = headingText || defaults.headingText;
  const wmText = watermarkText || defaults.watermarkText;

  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'due' | 'history'

  const [monthlyBalances, setMonthlyBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState('');

  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [historyClipper, setHistoryClipper] = useState('all');
  const [historyMonth, setHistoryMonth] = useState('all');

  // payout modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClipper, setModalClipper] = useState(null);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [payResult, setPayResult] = useState(null);

  const [payAmount, setPayAmount] = useState('0.00');
  const [editingAmount, setEditingAmount] = useState(false);

  // manual fields (notes allowed for any processor)
  const [paymentMethod, setPaymentMethod] = useState(''); // manual dropdown only
  const [paymentNotes, setPaymentNotes] = useState('');

  // history details modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState(null);

  // ---------- navigation handlers ----------

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleGoDashV2 = () => navigate('/dashboard-v2');
  const handleGoPayouts = () => navigate('/payouts');
  const handleGoClippers = () => navigate('/clippers');
  const handleGoPerformance = () => navigate('/performance');
  const goLeaderboards = () => navigate('/leaderboards');
  const goGallery = () => navigate('/gallery');
  const goSettings = () => navigate('/settings');
  const goContentApproval = () => {navigate('/content-approval');};

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

  const prettyProc = (p) => {
    const s = String(p || '').trim().toLowerCase();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  };

  const modalProcRaw = String(modalClipper?.payment_processor || '')
    .trim()
    .toLowerCase();
  const modalProc = prettyProc(modalProcRaw);
  const isManualModal = modalProcRaw === 'manual';

  // ---------- modal handlers ----------

  const handlePayClick = (row) => {
    setModalClipper(row);

    const outstanding = Number(row.outstanding_usd || 0) || 0;
    setPayAmount(outstanding.toFixed(2));
    setEditingAmount(false);

    const procRaw = String(row.payment_processor || '').trim().toLowerCase();

    // ✅ Manual: start EMPTY (user must choose)
    if (procRaw === 'manual') {
      setPaymentMethod('');
    } else {
      // not used for UI (read-only), but keep state clean
      setPaymentMethod('');
    }

    setPaymentNotes('');
    setPayError('');
    setPayResult(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    const hadSuccess = !!payResult;

    setModalOpen(false);
    setModalClipper(null);
    setPayError('');
    setPayResult(null);
    setPayAmount('0.00');
    setEditingAmount(false);

    setPaymentMethod('');
    setPaymentNotes('');

    if (hadSuccess) window.location.reload();
  };

  const openDetails = (row) => {
    setDetailsRow(row);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsRow(null);
  };

  const handleConfirmPay = async () => {
    if (!modalClipper || paying) return;

    const maxOutstanding = Number(modalClipper.outstanding_usd || 0) || 0;
    let desiredAmount = Number(payAmount);

    if (!Number.isFinite(desiredAmount)) desiredAmount = 0;

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

    // manual requires a method
    if (isManualModal && !String(paymentMethod || '').trim()) {
      setPayError('Please select how this manual payment was completed.');
      return;
    }

    try {
      setPayError('');
      setPayResult(null);
      setPaying(true);

      const body = {
        clipperId: modalClipper.clipper_id,
        month: modalClipper.month_label, // "January 2026"
        amountUsd: desiredAmount,
        initiatedByUserId: 'demo-admin', // TODO: replace with real user id
        // ✅ manual: user dropdown, else: use row processor (wise/revolut/stripe/etc)
        paymentMethod: isManualModal ? paymentMethod : modalProc,
        paymentNotes: paymentNotes || '',
      };

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
        <div style={{ padding: 12, fontSize: 14, color: '#fecaca' }}>
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
              <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 500, opacity: 0.7 }}>
                Clipper
              </th>
              <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 500, opacity: 0.7 }}>
                Month
              </th>
              <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 500, opacity: 0.7 }}>
                Earned
              </th>
              <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 500, opacity: 0.7 }}>
                Paid
              </th>
              <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 500, opacity: 0.7 }}>
                Outstanding
              </th>
              <th style={{ textAlign: 'center', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 500, opacity: 0.7 }}>
                Processor
              </th>
              <th style={{ textAlign: 'right', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 500, opacity: 0.7 }}>
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
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500 }}>
                  <div>{row.clipper_name || 'Clipper'}</div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                    ID: {row.clipper_id || '—'}
                  </div>
                </td>

                <td style={{ padding: '12px 8px', fontSize: 13, textAlign: 'right', opacity: 0.85 }}>
                  {row.month_label}
                </td>

                <td style={{ padding: '12px 8px', fontSize: 13, textAlign: 'right' }}>
                  {formatCurrency(row.earned_usd)}
                </td>

                <td style={{ padding: '12px 8px', fontSize: 13, textAlign: 'right' }}>
                  {formatCurrency(row.paid_usd)}
                </td>

                <td
                  style={{
                    padding: '12px 8px',
                    fontSize: 13,
                    textAlign: 'right',
                    color: Number(row.outstanding_usd) > 0 ? '#4ade80' : '#e5e7eb',
                  }}
                >
                  {formatCurrency(row.outstanding_usd)}
                </td>

                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
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
                          : (row.payment_processor || '').toLowerCase() === 'manual'
                            ? 'rgba(249,115,22,0.14)'
                            : 'rgba(15,23,42,0.85)',
                    }}
                  >
                    {(row.payment_processor || 'Unknown').toUpperCase()}
                  </span>
                </td>

                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => handlePayClick(row)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                      background: 'radial-gradient(circle at 0 0, #22c55e, #16a34a)',
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

  // ---------- layout ----------

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
        {wmText}
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
                Dashboards
              </button>

              {/* Content Approval */}
              <button
                onClick={goContentApproval}
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
                Review Content
              </button>

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

              <button
                onClick={handleGoPerformance}
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
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Gallery
              </button>

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
      <div style={{ flex: 1, position: 'relative', zIndex: 3 }}>
        {/* Branding */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
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
            {brandText}
          </span>
        </div>

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
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Payouts</h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              Clipper earnings & payment history
            </span>
          </div>

          {/* Summary pill */}
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
                Upcoming total: <strong>{formatCurrency(upcomingTotal)}</strong>
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

        {/* Content */}
        {activeTab === 'upcoming' && renderUpcomingOrDueTable(upcomingRows)}
        {activeTab === 'due' && renderUpcomingOrDueTable(dueRows)}

        {/* History tab (unchanged from your version except it supports manual details) */}
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
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4 }}>
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

                <div>
                  <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4 }}>
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

              <div style={{ fontSize: 12, opacity: 0.9 }}>
                Showing {historySummary.count} payments · Total:{' '}
                <strong>{formatCurrency(historySummary.total)}</strong>
              </div>
            </div>

            {historyLoading && (
              <div style={{ fontSize: 14, opacity: 0.8 }}>
                Loading payment history...
              </div>
            )}

            {historyError && (
              <div style={{ fontSize: 14, color: '#fecaca' }}>{historyError}</div>
            )}

            {!historyLoading && !historyError && filteredHistory.length === 0 && (
              <div style={{ fontSize: 14, opacity: 0.8 }}>
                No payments found for the selected filters.
              </div>
            )}

            {!historyLoading && !historyError && filteredHistory.length > 0 && (
              <div
                style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '1px solid rgba(148,163,184,0.4)',
                  background: 'rgba(15,23,42,0.98)',
                  marginTop: 8,
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)', fontWeight: 500, opacity: 0.7 }}>
                        Clipper
                      </th>
                      <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.12)', fontWeight: 500, opacity: 0.7 }}>
                        Month
                      </th>
                      <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.12)', fontWeight: 500, opacity: 0.7 }}>
                        Amount paid
                      </th>
                      <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.12)', fontWeight: 500, opacity: 0.7 }}>
                        Transaction time
                      </th>
                      <th style={{ textAlign: 'center', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.12)', fontWeight: 500, opacity: 0.7 }}>
                        Processor
                      </th>
                      <th style={{ textAlign: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)', fontWeight: 500, opacity: 0.7 }}>
                        Invoice / receipt
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((row, idx) => {
                      const proc = String(row.processor || '').toLowerCase();
                      const hasManualDetails =
                        proc !== 'stripe' &&
                        (String(row.payment_method || '').trim() ||
                          String(row.payment_notes || '').trim());

                      return (
                        <tr
                          key={row.payout_id || idx}
                          style={{
                            borderBottom:
                              idx !== filteredHistory.length - 1
                                ? '1px solid rgba(148,163,184,0.18)'
                                : 'none',
                          }}
                        >
                          <td style={{ padding: '10px 16px', fontSize: 14, fontWeight: 500 }}>
                            <div>{row.clipper_name || 'Clipper'}</div>
                            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                              ID: {row.clipper_id || '—'}
                            </div>
                          </td>

                          <td style={{ padding: '10px 8px', fontSize: 13, textAlign: 'right', opacity: 0.85 }}>
                            {row.earnings_month_label || '-'}
                          </td>

                          <td style={{ padding: '10px 8px', fontSize: 13, textAlign: 'right' }}>
                            {formatCurrency(row.amount_usd)}
                          </td>

                          <td style={{ padding: '10px 8px', fontSize: 13, textAlign: 'right', opacity: 0.9 }}>
                            {formatDateTime(row.completed_at || row.initiated_at || row.created_at)}
                          </td>

                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                padding: '4px 10px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 600,
                                border: '1px solid rgba(148,163,184,0.4)',
                                background:
                                  proc === 'stripe'
                                    ? 'rgba(59,130,246,0.18)'
                                    : proc === 'manual'
                                      ? 'rgba(249,115,22,0.14)'
                                      : 'rgba(15,23,42,0.8)',
                              }}
                            >
                              {(row.processor || 'Unknown').toUpperCase()}
                            </span>
                          </td>

                          <td style={{ padding: '10px 16px', fontSize: 13, textAlign: 'center' }}>
                            {row.invoice_url ? (
                              <a
                                href={row.invoice_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#facc15', textDecoration: 'underline dotted' }}
                              >
                                View invoice
                              </a>
                            ) : hasManualDetails ? (
                              <button
                                onClick={() => openDetails(row)}
                                style={{
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: 'rgba(248,250,252,0.06)',
                                  color: '#facc15',
                                  padding: '6px 10px',
                                  borderRadius: 999,
                                  fontSize: 12,
                                  border: '1px solid rgba(148,163,184,0.35)',
                                }}
                              >
                                View details
                              </button>
                            ) : (
                              <span style={{ opacity: 0.5 }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
              width: 420,
              maxWidth: '92vw',
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
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  Confirm payout
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                  {isManualModal
                    ? 'This will record a manual payout (no integration).'
                    : `This will record a payout via ${modalProc || 'processor'} for this clipper.`}
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

            <div style={{ marginBottom: 12, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ opacity: 0.7 }}>Clipper</span>
                <strong>{modalClipper.clipper_name}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ opacity: 0.7 }}>Month</span>
                <strong>{modalClipper.month_label}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ opacity: 0.7 }}>Outstanding amount</span>
                <span>{formatCurrency(modalClipper.outstanding_usd || 0)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <div><span style={{ opacity: 0.7 }}>This payout</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {editingAmount ? (
                    <input
                      type="text"
                      value={payAmount}
                      onChange={(e) => {
                        const raw = e.target.value || '';
                        const cleaned = raw.replace(/[^0-9.]/g, '');
                        const validPattern = /^(\d+(\.\d{0,2})?)?$/;
                        if (cleaned === '' || validPattern.test(cleaned)) {
                          setPayAmount(cleaned);
                        }
                      }}
                      style={{
                        width: 90,
                        padding: '4px 8px',
                        borderRadius: 999,
                        border: '1px solid rgba(148,163,184,0.7)',
                        background: 'rgba(15,23,42,0.9)',
                        color: '#e5e7eb',
                        fontSize: 13,
                        textAlign: 'right',
                      }}
                    />
                  ) : (
                    <strong>{formatCurrency(Number(payAmount || 0))}</strong>
                  )}

                  <button
                    type="button"
                    onClick={() => setEditingAmount((prev) => !prev)}
                    style={{
                      border: 'none',
                      borderRadius: 999,
                      padding: '4px 8px',
                      fontSize: 11,
                      cursor: 'pointer',
                      background: 'rgba(15,23,42,0.9)',
                      color: '#9ca3af',
                    }}
                  >
                    {editingAmount ? 'Done' : 'Edit'}
                  </button>
                </div>
              </div>
            </div>

            {/* Paid with + notes */}
            <div
              style={{
                borderRadius: 16,
                border: '1px solid rgba(148,163,184,0.25)',
                background: 'rgba(2,6,23,0.35)',
                padding: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <div style={{ opacity: 0.7, marginBottom: 3, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.04, whiteSpace: 'nowrap' }}>
                    Paid with
                  </div>

                  {isManualModal ? (
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '7px 9px',
                        borderRadius: 9,
                        border: '1px solid rgba(148,163,184,0.85)',
                        background: 'rgba(15,23,42,0.9)',
                        color: '#e5e7eb',
                        fontSize: 12,
                        appearance: 'none',
                      }}
                    >
                      {/* ✅ placeholder forces user choice */}
                      <option value="" disabled style={{ color: '#94a3b8' }}>
                        Select method…
                      </option>

                      {MANUAL_METHOD_OPTIONS.map((m) => (
                        <option key={m} value={m} style={{ color: '#cbd5e1' }}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '7px 9px',
                        borderRadius: 9,
                        border: '1px solid rgba(148,163,184,0.35)',
                        background: 'rgba(15,23,42,0.55)',
                        color: '#e5e7eb',
                        fontSize: 12,
                        opacity: 0.9,
                      }}
                    >
                      {/* ✅ THIS is the fix for Wise showing Stripe */}
                      {modalProc || '—'}
                    </div>
                  )}
                </div>

                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ opacity: 0.7, marginBottom: 3, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.04, whiteSpace: 'nowrap' }}>
                    Payment notes (optional)
                  </div>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder={isManualModal ? 'e.g. Paid via Wise to joey@email…' : 'e.g. Partial payout, adjustment, etc.'}
                    rows={3}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 10px',
                      borderRadius: 12,
                      border: '1px solid rgba(148,163,184,0.35)',
                      background: 'rgba(15,23,42,0.75)',
                      color: '#e5e7eb',
                      fontSize: 12,
                      resize: 'none',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {payError && (
              <div style={{ marginBottom: 12, fontSize: 12, color: '#f97373' }}>
                {payError}
              </div>
            )}

            {payResult && (
              <div
                style={{
                  marginBottom: 12,
                  padding: '8px 10px',
                  borderRadius: 12,
                  background: 'rgba(22,163,74,0.12)',
                  border: '1px solid rgba(34,197,94,0.6)',
                  fontSize: 12,
                  color: '#bbf7d0',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  Payout successful
                </div>
                <div style={{ opacity: 0.9 }}>
                  Recorded{' '}
                  <strong>{formatCurrency(Number(payAmount || 0))}</strong> for{' '}
                  <strong>{modalClipper.clipper_name}</strong> ·{' '}
                  <strong>{modalClipper.month_label}</strong>
                  {isManualModal ? (
                    <>
                      {' '}· <span style={{ opacity: 0.9 }}>Paid with <strong>{paymentMethod}</strong></span>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {payResult ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
                {!isManualModal && payResult.invoice_url && (
                  <a
                    href={payResult.invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      textDecoration: 'none',
                      padding: '8px 12px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 500,
                      border: '1px solid rgba(148,163,184,0.7)',
                      background: 'rgba(15,23,42,0.9)',
                      color: '#e5e7eb',
                    }}
                  >
                    View receipt
                  </a>
                )}

                <button
                  onClick={closeModal}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #22c55e, #4ade80, #bbf7d0)',
                    color: '#022c22',
                    boxShadow: '0 15px 35px rgba(34,197,94,0.5)',
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <button
                onClick={handleConfirmPay}
                disabled={paying}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: paying ? 'default' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #22c55e, #4ade80, #bbf7d0)',
                  color: '#022c22',
                  boxShadow: '0 15px 35px rgba(34,197,94,0.5)',
                  opacity: paying ? 0.7 : 1,
                }}
              >
                {paying ? (isManualModal ? 'Recording…' : 'Processing…') : (isManualModal ? 'Confirm manual payout' : 'Confirm payout')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual details modal */}
      {detailsOpen && detailsRow && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={closeDetails}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 420,
              maxWidth: '92vw',
              borderRadius: 24,
              padding: 18,
              background:
                'radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(15,23,42,0.95))',
              border: '1px solid rgba(148,163,184,0.6)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Payment details</div>
              <button
                onClick={closeDetails}
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

            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ opacity: 0.7 }}>Clipper</span>
                <strong>{detailsRow.clipper_name || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ opacity: 0.7 }}>Month</span>
                <strong>{detailsRow.earnings_month_label || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ opacity: 0.7 }}>Amount</span>
                <strong>{formatCurrency(detailsRow.amount_usd || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ opacity: 0.7 }}>Paid with</span>
                <strong>{detailsRow.payment_method || detailsRow.processor || '—'}</strong>
              </div>
            </div>

            <div
              style={{
                borderRadius: 16,
                border: '1px solid rgba(148,163,184,0.25)',
                background: 'rgba(2,6,23,0.35)',
                padding: 12,
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 6 }}>
                Notes
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.35, opacity: 0.95, whiteSpace: 'pre-wrap' }}>
                {detailsRow.payment_notes ? detailsRow.payment_notes : '—'}
              </div>
            </div>

            <button
              onClick={closeDetails}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid rgba(148,163,184,0.45)',
                background: 'rgba(15,23,42,0.85)',
                color: '#e5e7eb',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
