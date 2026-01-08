import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
  'https://clipper-payouts-api-810712855216.us-central1.run.app';

const unwrapValue = (v) => {
  if (v && typeof v === 'object' && 'value' in v) {
    return v.value;
  }
  return v;
};

// simple UUID fallback if crypto.randomUUID isn't available
const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'clipper_' + Math.random().toString(36).slice(2);
};

export default function ClippersPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    tiktokUsername: '',
    instagramUsername: '',
    youtubeUsername: '',
    paymentProcessor: '',
    processorKey: '',
    isActive: true,
  });

  const [savingEdit, setSavingEdit] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);

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

  const handleGoPerformance = () => {
    navigate('/performance');
  };

    const goLeaderboards = () => {
    navigate('/leaderboards');
  };

    const goGallery = () => {
    navigate('/gallery');
};

  // -------------------------------------------------------
  // FETCH CLIPPERS FROM API
  // -------------------------------------------------------
  useEffect(() => {
    const fetchClippers = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch(`${API_BASE_URL}/clippers`);
        if (!res.ok) {
          throw new Error(`Clippers API ${res.status}`);
        }

        const data = await res.json();

        const normalized = (Array.isArray(data) ? data : []).map((row, i) => {
          const id = row.id || `clipper_${i}`;
          return {
            id, // internal only
            clipperName:
              unwrapValue(row.clipper_name ?? row.clipperName) ||
              `Clipper ${i + 1}`,
            clientId: unwrapValue(row.client_id ?? row.clientId) || '',
            tiktokUsername: unwrapValue(
              row.tiktok_username ?? row.tiktokUsername
            ) || '',
            instagramUsername: unwrapValue(
              row.instagram_username ?? row.instagramUsername
            ) || '',
            youtubeUsername: unwrapValue(
              row.youtube_username ?? row.youtubeUsername
            ) || '',
            isActive:
              typeof row.is_active === 'boolean'
                ? row.is_active
                : !!row.isActive,
            paymentProcessor: unwrapValue(
              row.payment_processor ?? row.paymentProcessor
            ) || '',
            processorKey:
              unwrapValue(row.processor_key ?? row.processorKey) || '',
            createdAt: unwrapValue(row.created_at ?? row.createdAt),
            updatedAt: unwrapValue(row.updated_at ?? row.updatedAt),
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
  }, []);

  const toggleExpanded = (id) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  // -------------------------------------------------------
  // EDIT / SAVE / CANCEL (local state only for now)
  // -------------------------------------------------------
  const startEdit = (clipper) => {
    setEditingId(clipper.id);
    setExpandedId(clipper.id); // auto-expand when editing
    setEditDraft({
      clipperName: clipper.clipperName || '',
      tiktokUsername: clipper.tiktokUsername || '',
      instagramUsername: clipper.instagramUsername || '',
      youtubeUsername: clipper.youtubeUsername || '',
      paymentProcessor: clipper.paymentProcessor || '',
      processorKey: clipper.processorKey || '',
      isActive: !!clipper.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async () => {
  if (!editingId || !editDraft) return;
  try {
    setSavingEdit(true);

    const payload = {
      clipperName: editDraft.clipperName.trim(),
      clientId: '', // you removed client ID logic
      tiktokUsername: editDraft.tiktokUsername.trim(),
      instagramUsername: editDraft.instagramUsername.trim(),
      youtubeUsername: editDraft.youtubeUsername.trim(),
      isActive: !!editDraft.isActive,
      paymentProcessor: editDraft.paymentProcessor.trim(),
      processorKey: editDraft.processorKey.trim(),
    };

    const res = await fetch(`${API_BASE_URL}/clippers/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Update failed: ${res.status}`);
    }

    // Update locally on success
    setClippers((prev) =>
      prev.map((c) =>
        c.id === editingId
          ? {
              ...c,
              ...payload,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );

    setEditingId(null);
    setEditDraft(null);
  } catch (err) {
    console.error('PUT failed:', err);
    alert('Failed to save changes');
  } finally {
    setSavingEdit(false);
  }
};


  const updateEditDraftField = (field, value) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  // -------------------------------------------------------
  // ADD CLIPPER (local state only for now)
  // -------------------------------------------------------
  const openAdd = () => {
    setAddOpen(true);
    setAddDraft({
      clipperName: '',
      tiktokUsername: '',
      instagramUsername: '',
      youtubeUsername: '',
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


  
  const submitAdd = async () => {
  if (!addDraft.clipperName.trim()) {
    alert('Please enter a clipper name.');
    return;
  }

  try {
    setSavingAdd(true);

    const newId = crypto.randomUUID();

    const payload = {
      id: newId,
      clipperName: addDraft.clipperName.trim(),
      clientId: '',
      tiktokUsername: addDraft.tiktokUsername.trim(),
      instagramUsername: addDraft.instagramUsername.trim(),
      youtubeUsername: addDraft.youtubeUsername.trim(),
      isActive: !!addDraft.isActive,
      paymentProcessor: addDraft.paymentProcessor.trim(),
      processorKey: addDraft.processorKey.trim(),
    };

    const res = await fetch(`${API_BASE_URL}/clippers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Create failed: ${res.status}`);
    }

    // Update UI locally after success
    setClippers((prev) => [
      ...prev,
      {
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    setAddOpen(false);
    setAddDraft({
      clipperName: '',
      tiktokUsername: '',
      instagramUsername: '',
      youtubeUsername: '',
      paymentProcessor: '',
      processorKey: '',
      isActive: true,
    });
  } catch (err) {
    console.error('POST failed:', err);
    alert('Failed to create clipper');
  } finally {
    setSavingAdd(false);
  }
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
          {/* Collapse button */}
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
                Dashboards
              </button>

              {/* Payouts */}
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

              {/* Clippers – active page (3rd) */}
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
              
              {/* Performance */}
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
                  color: 'rgba(255,255,255,0.7)',
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

              {/* push bottom cluster down */}
              <div style={{ flexGrow: 1 }} />


              {/* Logout – same style as other pages */}
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
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>
              Clippers
            </h1>
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

        {/* Clipper list with dropdowns */}
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
            <div style={{ color: '#fecaca' }}>
              Error loading clippers: {error}
            </div>
          ) : clippers.length === 0 ? (
            <div style={{ opacity: 0.8 }}>
              No clippers configured yet. Use <strong>+ Add clipper</strong> to
              create your first one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {clippers.map((clipper) => {
                const isExpanded = expandedId === clipper.id;
                const isEditing = editingId === clipper.id;
                const draft = isEditing ? editDraft : null;

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
                    {/* Row header: name + status + dropdown arrow */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      {/* Left side: arrow + clipper name + quick summary */}
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
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              letterSpacing: 0.1,
                            }}
                          >
                            {clipper.clipperName}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              opacity: 0.75,
                            }}
                          >
                            TikTok:{' '}
                            <span style={{ opacity: 0.9 }}>
                              {clipper.tiktokUsername || <em>none</em>}
                            </span>{' '}
                            · Instagram:{' '}
                            <span style={{ opacity: 0.9 }}>
                              {clipper.instagramUsername || <em>none</em>}
                            </span>{' '}
                            · YouTube:{' '}
                            <span style={{ opacity: 0.9 }}>
                              {clipper.youtubeUsername || <em>none</em>}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Right side: status pill */}
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
                          <span
                            style={{
                              fontSize: 10,
                              opacity: 0.6,
                            }}
                          >
                            Created:{' '}
                            {String(clipper.createdAt).slice(0, 10)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded section */}
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
                        {/* Row 0: clipper name inline editable */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                          }}
                        >
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
                              onChange={(e) =>
                                updateEditDraftField(
                                  'clipperName',
                                  e.target.value
                                )
                              }
                              placeholder=""
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

                        {/* Row 1: accounts */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: 12,
                          }}
                        >
                          {/* TikTok */}
                          <div>
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
                              TikTok username
                            </div>
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft?.tiktokUsername ?? ''}
                                onChange={(e) =>
                                  updateEditDraftField(
                                    'tiktokUsername',
                                    e.target.value
                                  )
                                }
                                placeholder=""
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border:
                                    '1px solid rgba(148,163,184,0.85)',
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
                                  opacity: clipper.tiktokUsername ? 0.95 : 0.6,
                                }}
                              >
                                {clipper.tiktokUsername || 'none'}
                              </div>
                            )}
                          </div>

                          {/* Instagram */}
                          <div>
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
                              Instagram username
                            </div>
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft?.instagramUsername ?? ''}
                                onChange={(e) =>
                                  updateEditDraftField(
                                    'instagramUsername',
                                    e.target.value
                                  )
                                }
                                placeholder=""
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border:
                                    '1px solid rgba(148,163,184,0.85)',
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
                                  opacity: clipper.instagramUsername
                                    ? 0.95
                                    : 0.6,
                                }}
                              >
                                {clipper.instagramUsername || 'none'}
                              </div>
                            )}
                          </div>

                          {/* YouTube */}
                          <div>
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
                              YouTube channel ID
                            </div>
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft?.youtubeUsername ?? ''}
                                onChange={(e) =>
                                  updateEditDraftField(
                                    'youtubeUsername',
                                    e.target.value
                                  )
                                }
                                placeholder=""
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border:
                                    '1px solid rgba(148,163,184,0.85)',
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
                                  opacity: clipper.youtubeUsername ? 0.95 : 0.6,
                                }}
                              >
                                {clipper.youtubeUsername || 'none'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Row 2: payment + key + status */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 12,
                            alignItems: 'flex-start',
                          }}
                        >
                          {/* Payment processor */}
                          <div
                            style={{
                              flex: '1 1 180px',
                              minWidth: 0,
                            }}
                          >
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
                              <input
                                type="text"
                                value={draft?.paymentProcessor ?? ''}
                                onChange={(e) =>
                                  updateEditDraftField(
                                    'paymentProcessor',
                                    e.target.value
                                  )
                                }
                                placeholder=""
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border:
                                    '1px solid rgba(148,163,184,0.85)',
                                  background: 'rgba(15,23,42,0.9)',
                                  color: '#e5e7eb',
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
                                  fontSize: 12,
                                  opacity: clipper.paymentProcessor
                                    ? 0.95
                                    : 0.6,
                                }}
                              >
                                {clipper.paymentProcessor || 'none'}
                              </div>
                            )}
                          </div>

                          {/* Processor key */}
                          <div
                            style={{
                              flex: '2 1 260px',
                              minWidth: 0,
                            }}
                          >
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
                                  updateEditDraftField(
                                    'processorKey',
                                    e.target.value
                                  )
                                }
                                placeholder=""
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border:
                                    '1px solid rgba(148,163,184,0.85)',
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
                          <div
                            style={{
                              flex: '0 0 auto',
                              minWidth: 120,
                            }}
                          >
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
                                  updateEditDraftField(
                                    'isActive',
                                    !draft?.isActive
                                  )
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
                                    transition:
                                      'background 120ms ease, box-shadow 120ms ease',
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
                                      transition:
                                        'left 120ms ease, background 120ms ease',
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

                        {/* Row 3: Edit / Save / Cancel buttons */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 8,
                            marginTop: 6,
                          }}
                        >
                          {!isEditing ? (
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
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={savingEdit}
                                style={{
                                  borderRadius: 999,
                                  padding: '6px 12px',
                                  border:
                                    '1px solid rgba(148,163,184,0.65)',
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
              maxWidth: 520,
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
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  Add clipper
                </div>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.7,
                  }}
                >
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
                  onChange={(e) =>
                    updateAddDraftField('clipperName', e.target.value)
                  }
                  placeholder=""
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

              {/* Accounts row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 10,
                }}
              >
                {/* TikTok */}
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
                    TikTok username
                  </div>
                  <input
                    type="text"
                    value={addDraft.tiktokUsername}
                    onChange={(e) =>
                      updateAddDraftField('tiktokUsername', e.target.value)
                    }
                    placeholder=""
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

                {/* Instagram */}
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
                    Instagram username
                  </div>
                  <input
                    type="text"
                    value={addDraft.instagramUsername}
                    onChange={(e) =>
                      updateAddDraftField(
                        'instagramUsername',
                        e.target.value
                      )
                    }
                    placeholder=""
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

                {/* YouTube */}
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
                    YouTube channel ID
                  </div>
                  <input
                    type="text"
                    value={addDraft.youtubeUsername}
                    onChange={(e) =>
                      updateAddDraftField('youtubeUsername', e.target.value)
                    }
                    placeholder=""
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
                <div
                  style={{
                    flex: '1 1 160px',
                    minWidth: 0,
                  }}
                >
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
                  <input
                    type="text"
                    value={addDraft.paymentProcessor}
                    onChange={(e) =>
                      updateAddDraftField('paymentProcessor', e.target.value)
                    }
                    placeholder=""
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '7px 9px',
                      borderRadius: 9,
                      border: '1px solid rgba(148,163,184,0.85)',
                      background: 'rgba(15,23,42,0.9)',
                      color: '#e5e7eb',
                      fontSize: 12,
                    }}
                  />
                </div>

                <div
                  style={{
                    flex: '2 1 230px',
                    minWidth: 0,
                  }}
                >
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
                    onChange={(e) =>
                      updateAddDraftField('processorKey', e.target.value)
                    }
                    placeholder=""
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
                <div
                  style={{
                    flex: '0 0 auto',
                    minWidth: 120,
                  }}
                >
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
                    onClick={() =>
                      updateAddDraftField('isActive', !addDraft.isActive)
                    }
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
                        transition:
                          'background 120ms ease, box-shadow 120ms ease',
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
                          transition:
                            'left 120ms ease, background 120ms ease',
                        }}
                      />
                    </span>
                    {addDraft.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              {/* Footer buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 8,
                }}
              >
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
    </div>
  );
}
