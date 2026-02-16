import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

import { useBranding } from './branding/BrandingContext';

import { useEnvironment } from "./EnvironmentContext.jsx";

const API_BASE_URL =
  'https://clipper-payouts-api-810712855216.us-central1.run.app';

const unwrapValue = (v) => {
  if (v && typeof v === 'object' && 'value' in v) return v.value;
  return v;
};

const PAYMENT_PROCESSOR_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'revolut', label: 'Revolut' },
  { value: 'wise', label: 'Wise' },
  { value: 'manual', label: 'Manual (No Integration)' },
];

// UUID fallback
const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'clipper_' + Math.random().toString(36).slice(2);
};

const normPlatform = (p) => {
  const v = String(p || '').trim().toLowerCase();
  if (v === 'ig') return 'instagram';
  if (v === 'tt') return 'tiktok';
  if (v === 'yt') return 'youtube';
  return v;
};

const normUsername = (platform, username) => {
  const u = String(username || '').trim();
  if (!u) return '';
  const p = normPlatform(platform);
  // normalize IG/TT to lowercase (YouTube channel_id: keep as-is)
  if (p === 'instagram' || p === 'tiktok') return u.toLowerCase();
  return u;
};

const emptySet = () => ({
  tiktokUsername: '',
  instagramUsername: '',
  youtubeUsername: '',
});

const buildAccountSetsFromAccounts = (accounts) => {
  const list = Array.isArray(accounts) ? accounts : [];
  const tt = [];
  const ig = [];
  const yt = [];

  for (const a of list) {
    const platform = normPlatform(a.platform);
    const username = String(a.username || '').trim();
    if (!username) continue;

    if (platform === 'tiktok') tt.push(username);
    else if (platform === 'instagram') ig.push(username);
    else if (platform === 'youtube') yt.push(username);
  }

  const maxLen = Math.max(tt.length, ig.length, yt.length);
  if (maxLen === 0) return [emptySet()];

  const sets = [];
  for (let i = 0; i < maxLen; i++) {
    sets.push({
      tiktokUsername: tt[i] || '',
      instagramUsername: ig[i] || '',
      youtubeUsername: yt[i] || '',
    });
  }
  return sets;
};

const flattenSetsToAccountsPayload = (accountSets) => {
  const sets = Array.isArray(accountSets) ? accountSets : [];
  const out = [];

  for (const s of sets) {
    const tt = normUsername('tiktok', s?.tiktokUsername);
    const ig = normUsername('instagram', s?.instagramUsername);
    const yt = normUsername('youtube', s?.youtubeUsername);

    if (tt) out.push({ platform: 'tiktok', username: tt });
    if (ig) out.push({ platform: 'instagram', username: ig });
    if (yt) out.push({ platform: 'youtube', username: yt });
  }

  // de-dupe within payload
  const seen = new Set();
  const deduped = [];
  for (const a of out) {
    const key = `${a.platform}::${a.username.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(a);
  }
  return deduped;
};

const formatAccountsInline = (accounts) => {
  const list = Array.isArray(accounts) ? accounts : [];
  const by = { tiktok: [], instagram: [], youtube: [] };

  for (const a of list) {
    const platform = normPlatform(a.platform);
    const username = String(a.username || '').trim();
    if (!username) continue;
    if (platform === 'tiktok') by.tiktok.push(username);
    if (platform === 'instagram') by.instagram.push(username);
    if (platform === 'youtube') by.youtube.push(username);
  }

  const short = (arr) => {
    if (!arr.length) return '<none>';
    if (arr.length <= 2) return arr.join(', ');
    return `${arr.slice(0, 2).join(', ')} +${arr.length - 2}`;
  };

  return {
    tiktok: short(by.tiktok),
    instagram: short(by.instagram),
    youtube: short(by.youtube),
  };
};

export default function ClippersPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { clientId } = useEnvironment(); // will be "ARAFTA" or "BONGINO"

  // BRANDING
  const { headingText, watermarkText, defaults } = useBranding();
  const brandText = headingText || defaults.headingText;
  const wmText = watermarkText || defaults.watermarkText;

  const [clippers, setClippers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // which clipper is expanded
  const [expandedId, setExpandedId] = useState(null);

  // which clipper is being edited + its draft
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  // add clipper modal
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState({
    clipperName: '',
    accountSets: [emptySet()],
    paymentProcessor: '',
    processorKey: '',
    isActive: true,
  });

  const [savingEdit, setSavingEdit] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);

  // delete state
  const [deletingId, setDeletingId] = useState(null);

  // ✅ Delete confirmation modal (replaces window.confirm)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleGoDashV2 = () => navigate('/dashboard-v2');
  const handleGoPayouts = () => navigate('/payouts');
  const handleGoPerformance = () => navigate('/performance');
  const goLeaderboards = () => navigate('/leaderboards');
  const goGallery = () => navigate('/gallery');
  const goSettings = () => navigate('/settings');
  const goContentApproval = () => navigate('/content-approval');

  // -------------------------------------------------------
  // FETCH CLIPPERS FROM API
  // -------------------------------------------------------
  useEffect(() => {
    const fetchClippers = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`${API_BASE_URL}/clippers?clientId=${encodeURIComponent(clientId)}`);
        if (!res.ok) throw new Error(`Clippers API ${res.status}`);

        const data = await res.json();

        const normalized = (Array.isArray(data) ? data : []).map((row, i) => {
          const id = row.id || row.clipper_id || `clipper_${i}`;
          const accounts = Array.isArray(row.accounts) ? row.accounts : [];

          return {
            id,
            clipperName:
              unwrapValue(row.clipper_name ?? row.clipperName) || `Clipper ${i + 1}`,
            clientId: unwrapValue(row.client_id ?? row.clientId) || 'default',
            isActive:
              typeof row.is_active === 'boolean' ? row.is_active : !!row.isActive,
            paymentProcessor:
              unwrapValue(row.payment_processor ?? row.paymentProcessor) || '',
            processorKey: unwrapValue(row.processor_key ?? row.processorKey) || '',
            createdAt: unwrapValue(row.created_at ?? row.createdAt),
            updatedAt: unwrapValue(row.updated_at ?? row.updatedAt),

            // NEW
            accounts: accounts.map((a) => ({
              accountId: a.accountId || a.account_id,
              platform: normPlatform(a.platform),
              username: String(a.username || '').trim(),
              isActive: typeof a.is_active === 'boolean' ? a.is_active : !!a.isActive,
              maxVideos:
                a.maxVideos != null ? Number(a.maxVideos) : (a.max_videos != null ? Number(a.max_videos) : null),
            })),
          };
        });

        setClippers(normalized);
      } catch (err) {
        console.error('Error loading clippers:', err);
        setError(err.message || 'Failed to load clippers');
      } finally {
        setLoading(false);
      }
    };

    fetchClippers();
  }, [clientId]);

  const toggleExpanded = (id) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  // -------------------------------------------------------
  // EDIT / SAVE / CANCEL
  // -------------------------------------------------------
  const startEdit = (clipper) => {
    setEditingId(clipper.id);
    setExpandedId(clipper.id);

    setEditDraft({
      clipperName: clipper.clipperName || '',
      accountSets: buildAccountSetsFromAccounts(clipper.accounts),
      paymentProcessor: clipper.paymentProcessor || '',
      processorKey: clipper.processorKey || '',
      isActive: !!clipper.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const updateEditDraftField = (field, value) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateEditSet = (idx, field, value) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const sets = Array.isArray(prev.accountSets) ? [...prev.accountSets] : [];
      sets[idx] = { ...(sets[idx] || emptySet()), [field]: value };
      return { ...prev, accountSets: sets };
    });
  };

  const addEditSetRow = () => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const sets = Array.isArray(prev.accountSets) ? [...prev.accountSets] : [];
      sets.push(emptySet());
      return { ...prev, accountSets: sets };
    });
  };

  const removeEditSetRow = (idx) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const sets = Array.isArray(prev.accountSets) ? [...prev.accountSets] : [];
      sets.splice(idx, 1);
      return { ...prev, accountSets: sets.length ? sets : [emptySet()] };
    });
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft) return;

    if (!editDraft.clipperName.trim()) {
      alert('Please enter a clipper name.');
      return;
    }

    try {
      setSavingEdit(true);

      const accountsPayload = flattenSetsToAccountsPayload(editDraft.accountSets);

      const payload = {
        clipperName: editDraft.clipperName.trim(),
        clientId, // ✅ use selected env
        isActive: !!editDraft.isActive,
        paymentProcessor: editDraft.paymentProcessor.trim(),
        processorKey: editDraft.processorKey.trim(),
        accounts: accountsPayload,
      };

      const res = await fetch(`${API_BASE_URL}/clippers/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Update failed: ${res.status}`);

      // update local UI
      setClippers((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? {
                ...c,
                clipperName: payload.clipperName,
                clientId,
                isActive: payload.isActive,
                paymentProcessor: payload.paymentProcessor,
                processorKey: payload.processorKey,
                accounts: payload.accounts.map((a) => ({
                  platform: a.platform,
                  username: a.username,
                  isActive: true,
                  maxVideos: null,
                })),
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );

      setEditingId(null);
      setEditDraft(null);
    } catch (err) {
      console.error('PUT failed:', err);
      alert(err.message || 'Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  };

  // -------------------------------------------------------
  // DELETE (UI confirm modal)
  // -------------------------------------------------------
  const requestDelete = (clipper) => {
    if (!clipper?.id) return;
    if (savingEdit || savingAdd) return;

    setDeleteTarget(clipper);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    if (deletingId) return; // don’t close while deleting
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      setDeletingId(deleteTarget.id);

      const res = await fetch(
        `${API_BASE_URL}/clippers/${deleteTarget.id}?clientId=${encodeURIComponent(clientId)}`,
        { method: 'DELETE' }
      );

      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);

      setClippers((prev) => prev.filter((c) => c.id !== deleteTarget.id));

      // clean up UI state
      if (expandedId === deleteTarget.id) setExpandedId(null);
      if (editingId === deleteTarget.id) {
        setEditingId(null);
        setEditDraft(null);
      }

      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error('DELETE failed:', err);
      alert(err.message || 'Failed to delete clipper');
    } finally {
      setDeletingId(null);
    }
  };

  // -------------------------------------------------------
  // ADD CLIPPER
  // -------------------------------------------------------
  const openAdd = () => {
    setAddOpen(true);
    setAddDraft({
      clipperName: '',
      accountSets: [emptySet()],
      paymentProcessor: '',
      processorKey: '',
      isActive: true,
    });
  };

  const closeAdd = () => {
    if (savingAdd) return;
    setAddOpen(false);
  };

  const updateAddDraftField = (field, value) => {
    setAddDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updateAddSet = (idx, field, value) => {
    setAddDraft((prev) => {
      const sets = Array.isArray(prev.accountSets) ? [...prev.accountSets] : [];
      sets[idx] = { ...(sets[idx] || emptySet()), [field]: value };
      return { ...prev, accountSets: sets };
    });
  };

  const addAddSetRow = () => {
    setAddDraft((prev) => {
      const sets = Array.isArray(prev.accountSets) ? [...prev.accountSets] : [];
      sets.push(emptySet());
      return { ...prev, accountSets: sets };
    });
  };

  const removeAddSetRow = (idx) => {
    setAddDraft((prev) => {
      const sets = Array.isArray(prev.accountSets) ? [...prev.accountSets] : [];
      sets.splice(idx, 1);
      return { ...prev, accountSets: sets.length ? sets : [emptySet()] };
    });
  };

  const submitAdd = async () => {
    if (!addDraft.clipperName.trim()) {
      alert('Please enter a clipper name.');
      return;
    }

    try {
      setSavingAdd(true);

      const newId = makeId();
      const accountsPayload = flattenSetsToAccountsPayload(addDraft.accountSets);

      const payload = {
        id: newId,
        clipperName: addDraft.clipperName.trim(),
        clientId,
        isActive: !!addDraft.isActive,
        paymentProcessor: addDraft.paymentProcessor.trim(),
        processorKey: addDraft.processorKey.trim(),
        accounts: accountsPayload,
      };

      const res = await fetch(`${API_BASE_URL}/clippers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });


      if (!res.ok) throw new Error(`Create failed: ${res.status}`);

      setClippers((prev) => [
        ...prev,
        {
          id: newId,
          clipperName: payload.clipperName,
          clientId,
          isActive: payload.isActive,
          paymentProcessor: payload.paymentProcessor,
          processorKey: payload.processorKey,
          accounts: payload.accounts.map((a) => ({
            platform: a.platform,
            username: a.username,
            isActive: true,
            maxVideos: null,
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      setAddOpen(false);
      setAddDraft({
        clipperName: '',
        accountSets: [emptySet()],
        paymentProcessor: '',
        processorKey: '',
        isActive: true,
      });
    } catch (err) {
      console.error('POST failed:', err);
      alert(err.message || 'Failed to create clipper');
    } finally {
      setSavingAdd(false);
    }
  };

  const renderAccountSetsEditor = ({
    sets,
    isEditing,
    onChangeSet,
    onAddRow,
    onRemoveRow,
  }) => {
    const rows = Array.isArray(sets) ? sets : [emptySet()];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, idx) => (
          <div
            key={`set_${idx}`}
            style={{
              borderRadius: 12,
              border: '1px solid rgba(148,163,184,0.35)',
              background: 'rgba(15,23,42,0.62)',
              padding: 10,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 10,
                alignItems: 'start',
              }}
            >
              {[
                ['TikTok username', 'tiktokUsername'],
                ['Instagram username', 'instagramUsername'],
                ['YouTube channel ID', 'youtubeUsername'],
              ].map(([label, field]) => (
                <div key={`${field}_${idx}`}>
                  <div
                    style={{
                      opacity: 0.65,
                      marginBottom: 3,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.04,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {label}
                  </div>

                  <input
                    type="text"
                    value={row?.[field] ?? ''}
                    onChange={(e) => onChangeSet(idx, field, e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '7px 9px',
                      borderRadius: 9,
                      border: '1px solid rgba(148,163,184,0.85)',
                      background: 'rgba(15,23,42,0.9)',
                      color: '#e5e7eb',
                      fontSize: 12,
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => onRemoveRow(idx)}
                disabled={rows.length <= 1}
                style={{
                  borderRadius: 999,
                  padding: '6px 12px',
                  border: '1px solid rgba(148,163,184,0.6)',
                  background: 'rgba(15,23,42,0.95)',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 11,
                  cursor: rows.length <= 1 ? 'default' : 'pointer',
                  opacity: rows.length <= 1 ? 0.5 : 1,
                }}
              >
                Remove row
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddRow}
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            padding: '7px 12px',
            border: '1px solid rgba(148,163,184,0.7)',
            background: 'rgba(15,23,42,0.95)',
            color: '#e5e7eb',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          + Add more accounts
        </button>
      </div>
    );
  };

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
                  padding: '7px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 12,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 2,
                }}
              >
                Payouts
              </button>

              <button
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
                  marginTop: 2,
                  marginBottom: 2,
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
                Clipper accounts hub
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, position: 'relative', zIndex: 3 }}>
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
            {brandText}
          </span>
        </div>

        {/* Header / title */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 22,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Clippers</h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              Configure clipper accounts & payment routing
            </span>
          </div>

          <button
            onClick={openAdd}
            style={{
              borderRadius: 999,
              padding: '8px 14px',
              border: '1px solid rgba(248,250,252,0.35)',
              background:
                'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.95))',
              color: '#e5e7eb',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            + Add clipper
          </button>
        </div>

        {/* List */}
        <div
          style={{
            borderRadius: 18,
            border: '1px solid rgba(148,163,184,0.3)',
            background:
              'radial-gradient(circle at top left, rgba(148,163,184,0.25), rgba(15,23,42,1))',
            padding: 18,
            fontSize: 13,
            opacity: 0.95,
          }}
        >
          {loading ? (
            <div style={{ opacity: 0.85 }}>Loading clippers…</div>
          ) : error ? (
            <div style={{ color: '#fecaca' }}>Error loading clippers: {error}</div>
          ) : clippers.length === 0 ? (
            <div style={{ opacity: 0.8 }}>
              No clippers configured yet. Use <strong>+ Add clipper</strong> to create
              your first one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clippers.map((clipper) => {
                const isExpanded = expandedId === clipper.id;
                const isEditing = editingId === clipper.id;
                const draft = isEditing ? editDraft : null;

                const inline = formatAccountsInline(clipper.accounts);

                return (
                  <div
                    key={clipper.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: 'rgba(15,23,42,0.92)',
                      border: '1px solid rgba(148,163,184,0.5)',
                      boxShadow: '0 14px 30px rgba(15,23,42,0.9)',
                    }}
                  >
                    {/* Row header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <button
                        onClick={() => toggleExpanded(clipper.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'inherit',
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 16,
                            opacity: 0.9,
                            transform: isExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 120ms ease',
                          }}
                        >
                          ▶
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: 0.1 }}>
                            {clipper.clipperName}
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.75 }}>
                            TikTok:{' '}
                            <span style={{ opacity: 0.9 }}>
                              {inline.tiktok}
                            </span>{' '}
                            · Instagram:{' '}
                            <span style={{ opacity: 0.9 }}>
                              {inline.instagram}
                            </span>{' '}
                            · YouTube:{' '}
                            <span style={{ opacity: 0.9 }}>
                              {inline.youtube}
                            </span>
                          </div>
                        </div>
                      </button>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            borderRadius: 999,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 500,
                            background: clipper.isActive
                              ? 'rgba(34,197,94,0.2)'
                              : 'rgba(148,163,184,0.2)',
                            color: clipper.isActive
                              ? 'rgb(74,222,128)'
                              : 'rgba(148,163,184,0.95)',
                            border: clipper.isActive
                              ? '1px solid rgba(74,222,128,0.7)'
                              : '1px solid rgba(148,163,184,0.7)',
                          }}
                        >
                          {clipper.isActive ? 'Active' : 'Inactive'}
                        </span>

                        {clipper.createdAt && (
                          <span style={{ fontSize: 10, opacity: 0.6 }}>
                            Created: {String(clipper.createdAt).slice(0, 10)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: '1px solid rgba(148,163,184,0.35)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          fontSize: 12,
                        }}
                      >
                        {/* Clipper name */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div
                            style={{
                              opacity: 0.65,
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: 0.04,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            Clipper name
                          </div>
                          {isEditing ? (
                            <input
                              type="text"
                              value={draft?.clipperName ?? ''}
                              onChange={(e) => updateEditDraftField('clipperName', e.target.value)}
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '6px 8px',
                                borderRadius: 8,
                                border: '1px solid rgba(148,163,184,0.8)',
                                background: 'rgba(15,23,42,0.9)',
                                color: '#e5e7eb',
                                fontSize: 13,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                padding: '6px 8px',
                                borderRadius: 8,
                                background: 'rgba(15,23,42,0.9)',
                                border: '1px solid rgba(51,65,85,0.9)',
                                fontSize: 13,
                                opacity: 0.95,
                              }}
                            >
                              {clipper.clipperName}
                            </div>
                          )}
                        </div>

                        {/* Accounts editor (NEW) */}
                        <div>
                          <div
                            style={{
                              opacity: 0.65,
                              marginBottom: 6,
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: 0.04,
                            }}
                          >
                            Accounts
                          </div>

                          {isEditing ? (
                            renderAccountSetsEditor({
                              sets: draft?.accountSets,
                              isEditing: true,
                              onChangeSet: updateEditSet,
                              onAddRow: addEditSetRow,
                              onRemoveRow: removeEditSetRow,
                            })
                          ) : (
                            <div
                              style={{
                                borderRadius: 12,
                                border: '1px solid rgba(148,163,184,0.35)',
                                background: 'rgba(15,23,42,0.62)',
                                padding: 10,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: 10,
                              }}
                            >
                              {['tiktok', 'instagram', 'youtube'].map((p) => {
                                const items = (clipper.accounts || [])
                                  .filter((a) => normPlatform(a.platform) === p)
                                  .map((a) => a.username);

                                return (
                                  <div key={p}>
                                    <div
                                      style={{
                                        opacity: 0.65,
                                        marginBottom: 3,
                                        fontSize: 11,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.04,
                                      }}
                                    >
                                      {p === 'tiktok'
                                        ? 'TikTok'
                                        : p === 'instagram'
                                        ? 'Instagram'
                                        : 'YouTube'}
                                    </div>
                                    <div
                                      style={{
                                        padding: '6px 8px',
                                        borderRadius: 8,
                                        background: 'rgba(15,23,42,0.9)',
                                        border: '1px solid rgba(51,65,85,0.9)',
                                        fontFamily: 'monospace',
                                        fontSize: 12,
                                        opacity: items.length ? 0.95 : 0.6,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                      }}
                                    >
                                      {items.length ? items.join('\n') : 'none'}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Payment + key + status */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 12,
                            alignItems: 'flex-start',
                          }}
                        >
                          {/* Payment processor */}
                          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                            <div
                              style={{
                                opacity: 0.65,
                                marginBottom: 3,
                                fontSize: 11,
                                textTransform: 'uppercase',
                                letterSpacing: 0.04,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              Payment processor
                            </div>
                            {isEditing ? (
                              <select
                                value={draft?.paymentProcessor ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateEditDraftField('paymentProcessor', v);
                                  updateEditDraftField('processorKey', ''); // clear key when processor changes
                                }}
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border: '1px solid rgba(148,163,184,0.85)',
                                  background: 'rgba(15,23,42,0.9)',
                                  color: '#e5e7eb',
                                  fontSize: 12,
                                  appearance: 'none',
                                }}
                              >
                                {PAYMENT_PROCESSOR_OPTIONS.map((opt) => (
                                  <option
                                    key={opt.value}
                                    value={opt.value}
                                    style={{ color: '#c8cace' }}
                                  >
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  background: 'rgba(15,23,42,0.9)',
                                  border: '1px solid rgba(51,65,85,0.9)',
                                  fontSize: 12,
                                  opacity: clipper.paymentProcessor ? 0.95 : 0.6,
                                }}
                              >
                                {PAYMENT_PROCESSOR_OPTIONS.find(
                                  (o) => o.value === clipper.paymentProcessor
                                )?.label ||
                                  clipper.paymentProcessor ||
                                  'none'}
                              </div>
                            )}
                          </div>

                          {/* Processor key */}
                          <div style={{ flex: '2 1 260px', minWidth: 0 }}>
                            <div
                              style={{
                                opacity: 0.65,
                                marginBottom: 3,
                                fontSize: 11,
                                textTransform: 'uppercase',
                                letterSpacing: 0.04,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              Processor key / customer ID
                            </div>
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft?.processorKey ?? ''}
                                onChange={(e) =>
                                  updateEditDraftField('processorKey', e.target.value)
                                }
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border: '1px solid rgba(148,163,184,0.85)',
                                  background: 'rgba(15,23,42,0.9)',
                                  color: '#e5e7eb',
                                  fontFamily: 'monospace',
                                  fontSize: 12,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  background: 'rgba(15,23,42,0.9)',
                                  border: '1px solid rgba(51,65,85,0.9)',
                                  fontFamily: 'monospace',
                                  fontSize: 12,
                                  opacity: clipper.processorKey ? 0.95 : 0.6,
                                  wordBreak: 'break-all',
                                }}
                              >
                                {clipper.processorKey || 'none'}
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <div style={{ flex: '0 0 auto', minWidth: 120 }}>
                            <div
                              style={{
                                opacity: 0.65,
                                marginBottom: 3,
                                fontSize: 11,
                                textTransform: 'uppercase',
                                letterSpacing: 0.04,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              Status
                            </div>
                            {isEditing ? (
                              <button
                                type="button"
                                onClick={() =>
                                  updateEditDraftField('isActive', !draft?.isActive)
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '6px 10px',
                                  borderRadius: 999,
                                  border: '1px solid rgba(148,163,184,0.8)',
                                  background: draft?.isActive
                                    ? 'rgba(34,197,94,0.2)'
                                    : 'rgba(148,163,184,0.2)',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  fontWeight: 500,
                                  color: draft?.isActive
                                    ? 'rgb(74,222,128)'
                                    : 'rgba(148,163,184,0.95)',
                                }}
                              >
                                <span
                                  style={{
                                    width: 18,
                                    height: 10,
                                    borderRadius: 999,
                                    background: draft?.isActive
                                      ? 'rgba(34,197,94,0.3)'
                                      : 'rgba(148,163,184,0.4)',
                                    position: 'relative',
                                  }}
                                >
                                  <span
                                    style={{
                                      position: 'absolute',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      left: draft?.isActive ? 9 : 2,
                                      width: 6,
                                      height: 6,
                                      borderRadius: '999px',
                                      background: draft?.isActive
                                        ? 'rgb(74,222,128)'
                                        : 'rgba(148,163,184,0.95)',
                                      transition: 'left 120ms ease',
                                    }}
                                  />
                                </span>
                                {draft?.isActive ? 'Active' : 'Inactive'}
                              </button>
                            ) : (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 10px',
                                  borderRadius: 999,
                                  background: clipper.isActive
                                    ? 'rgba(34,197,94,0.2)'
                                    : 'rgba(148,163,184,0.2)',
                                  border: clipper.isActive
                                    ? '1px solid rgba(74,222,128,0.7)'
                                    : '1px solid rgba(148,163,184,0.7)',
                                  fontSize: 11,
                                  fontWeight: 500,
                                  color: clipper.isActive
                                    ? 'rgb(74,222,128)'
                                    : 'rgba(148,163,184,0.95)',
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: 999,
                                    background: clipper.isActive
                                      ? 'rgb(74,222,128)'
                                      : 'rgba(148,163,184,0.9)',
                                  }}
                                />
                                {clipper.isActive ? 'Active' : 'Inactive'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 8,
                            marginTop: 6,
                          }}
                        >
                          {!isEditing ? (
                            <>
                              {/* Delete (opens modal) */}
                              <button
                                type="button"
                                onClick={() => requestDelete(clipper)}
                                disabled={deletingId === clipper.id}
                                style={{
                                  borderRadius: 999,
                                  padding: '6px 12px',
                                  border: '1px solid rgba(248,113,113,0.65)',
                                  background: 'rgba(15,23,42,0.95)',
                                  color: 'rgba(248,113,113,0.95)',
                                  fontSize: 11,
                                  cursor:
                                    deletingId === clipper.id ? 'default' : 'pointer',
                                  opacity: deletingId === clipper.id ? 0.7 : 1,
                                }}
                              >
                                {deletingId === clipper.id ? 'Deleting…' : 'Delete'}
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => startEdit(clipper)}
                                style={{
                                  borderRadius: 999,
                                  padding: '6px 12px',
                                  border: '1px solid rgba(148,163,184,0.9)',
                                  background: 'rgba(15,23,42,0.95)',
                                  color: '#e5e7eb',
                                  fontSize: 11,
                                  cursor: 'pointer',
                                }}
                              >
                                Edit
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={savingEdit}
                                style={{
                                  borderRadius: 999,
                                  padding: '6px 12px',
                                  border: '1px solid rgba(148,163,184,0.65)',
                                  background: 'rgba(15,23,42,0.95)',
                                  color: '#e5e7eb',
                                  fontSize: 11,
                                  cursor: savingEdit ? 'default' : 'pointer',
                                  opacity: savingEdit ? 0.6 : 1,
                                }}
                              >
                                Cancel
                              </button>

                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={savingEdit}
                                style={{
                                  borderRadius: 999,
                                  padding: '6px 16px',
                                  border: 'none',
                                  background:
                                    'linear-gradient(135deg, rgba(34,197,94,0.95), rgba(52,211,153,0.95))',
                                  color: '#022c22',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: savingEdit ? 'default' : 'pointer',
                                  boxShadow:
                                    '0 0 0 1px rgba(22,163,74,0.4), 0 12px 30px rgba(22,163,74,0.55)',
                                  opacity: savingEdit ? 0.8 : 1,
                                }}
                              >
                                {savingEdit ? 'Saving…' : 'Save'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ADD CLIPPER MODAL */}
      {addOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 620,
              borderRadius: 20,
              padding: 18,
              background:
                'radial-gradient(circle at top left, rgba(15,23,42,1), rgba(15,23,42,0.96))',
              border: '1px solid rgba(148,163,184,0.6)',
              boxShadow: '0 24px 80px rgba(15,23,42,0.9)',
              color: '#e5e7eb',
              fontSize: 13,
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
                <div style={{ fontSize: 16, fontWeight: 600 }}>Add clipper</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  Create a new clipper and map their accounts & payout routing.
                </div>
              </div>
              <button
                type="button"
                onClick={closeAdd}
                disabled={savingAdd}
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(148,163,184,0.7)',
                  background: 'rgba(15,23,42,0.9)',
                  color: '#e5e7eb',
                  fontSize: 11,
                  padding: '4px 10px',
                  cursor: savingAdd ? 'default' : 'pointer',
                  opacity: savingAdd ? 0.6 : 1,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginTop: 4,
              }}
            >
              {/* Clipper name */}
              <div>
                <div
                  style={{
                    opacity: 0.7,
                    marginBottom: 3,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 0.04,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Clipper name
                </div>
                <input
                  type="text"
                  value={addDraft.clipperName}
                  onChange={(e) => updateAddDraftField('clipperName', e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '7px 9px',
                    borderRadius: 9,
                    border: '1px solid rgba(148,163,184,0.85)',
                    background: 'rgba(15,23,42,0.9)',
                    color: '#e5e7eb',
                    fontSize: 13,
                  }}
                />
              </div>

              {/* Accounts sets */}
              <div>
                <div
                  style={{
                    opacity: 0.7,
                    marginBottom: 6,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 0.04,
                  }}
                >
                  Accounts
                </div>

                {renderAccountSetsEditor({
                  sets: addDraft.accountSets,
                  isEditing: true,
                  onChangeSet: updateAddSet,
                  onAddRow: addAddSetRow,
                  onRemoveRow: removeAddSetRow,
                })}
              </div>

              {/* Payment row */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <div
                    style={{
                      opacity: 0.7,
                      marginBottom: 3,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.04,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Payment processor
                  </div>
                  <select
                    value={addDraft.paymentProcessor}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateAddDraftField('paymentProcessor', v);
                      updateAddDraftField('processorKey', '');
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '7px 9px',
                      borderRadius: 9,
                      border: '1px solid rgba(148,163,184,0.85)',
                      background: 'rgba(15,23,42,0.9)',
                      color: '#ffffff',
                      fontSize: 12,
                      appearance: 'none',
                    }}
                  >
                    {PAYMENT_PROCESSOR_OPTIONS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        style={{ color: '#c8cace' }}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: '2 1 230px', minWidth: 0 }}>
                  <div
                    style={{
                      opacity: 0.7,
                      marginBottom: 3,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.04,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Processor key / customer ID
                  </div>
                  <input
                    type="text"
                    value={addDraft.processorKey}
                    onChange={(e) => updateAddDraftField('processorKey', e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '7px 9px',
                      borderRadius: 9,
                      border: '1px solid rgba(148,163,184,0.85)',
                      background: 'rgba(15,23,42,0.9)',
                      color: '#e5e7eb',
                      fontSize: 12,
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                {/* Active toggle */}
                <div style={{ flex: '0 0 auto', minWidth: 120 }}>
                  <div
                    style={{
                      opacity: 0.7,
                      marginBottom: 3,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.04,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Status
                  </div>
                  <button
                    type="button"
                    onClick={() => updateAddDraftField('isActive', !addDraft.isActive)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(148,163,184,0.8)',
                      background: addDraft.isActive
                        ? 'rgba(34,197,94,0.2)'
                        : 'rgba(148,163,184,0.2)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 500,
                      color: addDraft.isActive
                        ? 'rgb(74,222,128)'
                        : 'rgba(148,163,184,0.95)',
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 10,
                        borderRadius: 999,
                        background: addDraft.isActive
                          ? 'rgba(34,197,94,0.3)'
                          : 'rgba(148,163,184,0.4)',
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          left: addDraft.isActive ? 9 : 2,
                          width: 6,
                          height: 6,
                          borderRadius: '999px',
                          background: addDraft.isActive
                            ? 'rgb(74,222,128)'
                            : 'rgba(148,163,184,0.95)',
                          transition: 'left 120ms ease',
                        }}
                      />
                    </span>
                    {addDraft.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={closeAdd}
                  disabled={savingAdd}
                  style={{
                    borderRadius: 999,
                    padding: '6px 12px',
                    border: '1px solid rgba(148,163,184,0.7)',
                    background: 'rgba(15,23,42,0.95)',
                    color: '#e5e7eb',
                    fontSize: 11,
                    cursor: savingAdd ? 'default' : 'pointer',
                    opacity: savingAdd ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitAdd}
                  disabled={savingAdd}
                  style={{
                    borderRadius: 999,
                    padding: '6px 16px',
                    border: 'none',
                    background:
                      'linear-gradient(135deg, rgba(59,130,246,0.95), rgba(129,140,248,0.95))',
                    color: '#e5e7eb',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: savingAdd ? 'default' : 'pointer',
                    boxShadow:
                      '0 0 0 1px rgba(59,130,246,0.55), 0 14px 40px rgba(30,64,175,0.7)',
                    opacity: savingAdd ? 0.85 : 1,
                  }}
                >
                  {savingAdd ? 'Creating…' : 'Create clipper'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.72)',
            backdropFilter: 'blur(7px)',
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDelete();
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              borderRadius: 20,
              padding: 18,
              background:
                'radial-gradient(circle at top left, rgba(15,23,42,1), rgba(15,23,42,0.96))',
              border: '1px solid rgba(148,163,184,0.6)',
              boxShadow: '0 24px 80px rgba(15,23,42,0.92)',
              color: '#e5e7eb',
              fontSize: 13,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 650, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: 'rgba(248,113,113,0.9)',
                      boxShadow: '0 0 0 4px rgba(248,113,113,0.18)',
                      display: 'inline-block',
                    }}
                  />
                  Delete clipper
                </div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
                  This will remove the clipper from BigQuery. This action cannot be undone.
                </div>
              </div>

              <button
                type="button"
                onClick={closeDelete}
                disabled={!!deletingId}
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(148,163,184,0.7)',
                  background: 'rgba(15,23,42,0.9)',
                  color: '#e5e7eb',
                  fontSize: 11,
                  padding: '4px 10px',
                  cursor: deletingId ? 'default' : 'pointer',
                  opacity: deletingId ? 0.6 : 1,
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 14,
                border: '1px solid rgba(248,113,113,0.28)',
                background: 'rgba(248,113,113,0.08)',
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.06 }}>
                You are deleting
              </div>
              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600 }}>
                {deleteTarget?.clipperName || 'This clipper'}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.78 }}>
                {(() => {
                  const inline = formatAccountsInline(deleteTarget?.accounts || []);
                  return (
                    <>
                      TikTok: <span style={{ fontFamily: 'monospace' }}>{inline.tiktok}</span> · Instagram:{' '}
                      <span style={{ fontFamily: 'monospace' }}>{inline.instagram}</span> · YouTube:{' '}
                      <span style={{ fontFamily: 'monospace' }}>{inline.youtube}</span>
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={closeDelete}
                disabled={!!deletingId}
                style={{
                  borderRadius: 999,
                  padding: '6px 12px',
                  border: '1px solid rgba(148,163,184,0.7)',
                  background: 'rgba(15,23,42,0.95)',
                  color: '#e5e7eb',
                  fontSize: 11,
                  cursor: deletingId ? 'default' : 'pointer',
                  opacity: deletingId ? 0.7 : 1,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={!!deletingId}
                style={{
                  borderRadius: 999,
                  padding: '6px 16px',
                  border: 'none',
                  background:
                    'linear-gradient(135deg, rgba(248,113,113,0.95), rgba(239,68,68,0.95))',
                  color: '#2a0b0b',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: deletingId ? 'default' : 'pointer',
                  boxShadow:
                    '0 0 0 1px rgba(248,113,113,0.35), 0 14px 40px rgba(239,68,68,0.35)',
                  opacity: deletingId ? 0.85 : 1,
                }}
              >
                {deletingId ? 'Deleting…' : 'Delete clipper'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
