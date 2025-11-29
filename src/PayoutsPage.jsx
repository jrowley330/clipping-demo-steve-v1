import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

// 🔗 Your real Cloud Run base URL
const API_BASE_URL = 'https://clipper-payouts-api-810712855216.us-central1.run.app';

export default function PayoutsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // helpers for formatting
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

  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`${API_BASE_URL}/payouts`);

        if (!res.ok) {
          throw new Error(`API responded with ${res.status}`);
        }

        const data = await res.json();

        // 🔁 Normalize BigQuery-style objects -> plain values
        const normalized = (Array.isArray(data) ? data : []).map((r) => ({
          clipper_id:
            r.clipper_id && typeof r.clipper_id === 'object'
              ? r.clipper_id.value
              : r.clipper_id,
          clipper_name:
            r.clipper_name && typeof r.clipper_name === 'object'
              ? r.clipper_name.value
              : r.clipper_name,
          total_earned_usd:
            r.total_earned_usd && typeof r.total_earned_usd === 'object'
              ? Number(r.total_earned_usd.value)
              : Number(r.total_earned_usd),
          last_payout_date:
            r.last_payout_date && typeof r.last_payout_date === 'object'
              ? r.last_payout_date.value
              : r.last_payout_date,
        }));

        setRows(normalized);
      } catch (err) {
        console.error('Error fetching payouts:', err);
        setError('Failed to load payouts. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
  }, []);

  // optional: compute total across all clippers for the little “summary” vibe
  const totalAllEarned = rows.reduce(
    (sum, r) => sum + (Number(r.total_earned_usd) || 0),
    0
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050505',
        color: '#fff',
        padding: '32px 32px 80px 32px',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        position: 'relative',
      }}
    >
      {/* Logout – subtle bottom-left */}
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          bottom: 12,
          left: 16,
          padding: '6px 12px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.18)',
          background: 'rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          backdropFilter: 'blur(4px)',
          opacity: 0.7,
        }}
      >
        <span style={{ fontSize: 12 }}>⏻</span>
        Logout
      </button>

      {/* Header */}
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Payouts</h1>
          <span style={{ fontSize: 13, opacity: 0.7 }}>
            Clipper earnings overview
          </span>
        </div>

        {/* Small summary pill */}
        {!loading && !error && rows.length > 0 && (
          <div
            style={{
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              opacity: 0.85,
            }}
          >
            {rows.length} clippers · Total paid:{' '}
            <span style={{ fontWeight: 600 }}>
              {formatCurrency(totalAllEarned)}
            </span>
          </div>
        )}
      </div>

      {/* Content card */}
      <div
        style={{
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          background:
            'radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 55%)',
          padding: 20,
          boxShadow: '0 14px 40px rgba(0,0,0,0.7)',
        }}
      >
        {loading && (
          <div style={{ padding: 12, fontSize: 14, opacity: 0.8 }}>
            Loading payouts…
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: 12,
              fontSize: 14,
              color: '#ff8080',
              background: 'rgba(255,0,0,0.08)',
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div style={{ padding: 12, fontSize: 14, opacity: 0.8 }}>
            No payout data found yet.
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
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
                      padding: '8px 6px',
                      borderBottom: '1px solid rgba(255,255,255,0.12)',
                      fontWeight: 500,
                      opacity: 0.7,
                    }}
                  >
                    Clipper
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 6px',
                      borderBottom: '1px solid rgba(255,255,255,0.12)',
                      fontWeight: 500,
                      opacity: 0.7,
                    }}
                  >
                    Total Earned
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 6px',
                      borderBottom: '1px solid rgba(255,255,255,0.12)',
                      fontWeight: 500,
                      opacity: 0.7,
                    }}
                  >
                    Last Payout
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.clipper_id}>
                    <td
                      style={{
                        padding: '8px 6px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {row.clipper_name || row.clipper_id}
                    </td>
                    <td
                      style={{
                        padding: '8px 6px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        fontWeight: 500,
                      }}
                    >
                      {formatCurrency(row.total_earned_usd)}
                    </td>
                    <td
                      style={{
                        padding: '8px 6px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        opacity: 0.8,
                      }}
                    >
                      {formatDate(row.last_payout_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
