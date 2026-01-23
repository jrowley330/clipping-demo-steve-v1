import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

import instagramIcon from "./assets/instagram.png";
import tiktokIcon from "./assets/tiktok.png";
import youtubeIcon from "./assets/youtube.png";

import { useBranding } from './branding/BrandingContext';

const API_BASE_URL =
  'https://clipper-payouts-api-810712855216.us-central1.run.app';

// Keep consistent with your other pages
const formatNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString();
};

const daysAgoLabel = (daysAgo) => {
  const d = Number(daysAgo);
  if (!Number.isFinite(d)) return '—';
  if (d === 0) return 'today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
};

const platformMeta = (platform) => {
  const p = String(platform || '').toLowerCase();

  if (p === 'youtube')
    return {
      key: 'youtube',
      label: 'YouTube',
      tone: 'rgba(239,68,68,0.18)',
      glow: 'rgba(239,68,68,0.55)',
      img: PLATFORM_ICONS.youtube,
    };

  if (p === 'instagram')
    return {
      key: 'instagram',
      label: 'Instagram',
      tone: 'rgba(236,72,153,0.16)',
      glow: 'rgba(236,72,153,0.55)',
      img: PLATFORM_ICONS.instagram,
    };

  if (p === 'tiktok')
    return {
      key: 'tiktok',
      label: 'TikTok',
      tone: 'rgba(34,211,238,0.14)',
      glow: 'rgba(34,211,238,0.55)',
      img: PLATFORM_ICONS.tiktok,
    };

  return {
    key: p || 'unknown',
    label: p || '—',
    tone: 'rgba(255,255,255,0.10)',
    glow: 'rgba(255,255,255,0.25)',
    img: null,
  };
};


const placeholderThumb = (seed = 1) =>
  `https://picsum.photos/seed/clipper_gallery_${seed}/600/900`;

const PLATFORM_ICONS = {
  instagram: instagramIcon,
  tiktok: tiktokIcon,
  youtube: youtubeIcon,
};


export default function Gallery() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { headingText, watermarkText } = useBranding();
  const defaults = { headingText: 'Your Clipping Campaign', watermarkText: 'CLIPPING' };
  const brandText = headingText || defaults.headingText;
  const wmText = watermarkText || defaults.watermarkText;

  // UI filters (wired to API)
  const [platformFilter, setPlatformFilter] = useState('all'); // all|youtube|instagram|tiktok
  const [clipperFilter, setClipperFilter] = useState('all'); // all|<clipper_id>
  const [sortBy, setSortBy] = useState('published_at'); // published_at|view_count|like_count
  const [search, setSearch] = useState('');

  // Data
  const [clippers, setClippers] = useState([]); // [{id, name}]
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // NAV
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const goDashV2 = () => navigate('/dashboard-v2');
  const goPayouts = () => navigate('/payouts');
  const goClippers = () => navigate('/clippers');
  const goPerformance = () => navigate('/performance');
  const goLeaderboards = () => navigate('/leaderboards');

  // Load clippers for dropdown (once)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/clippers`);
        if (!res.ok) throw new Error(`Clippers API ${res.status}`);
        const data = await res.json();
        const list = (Array.isArray(data) ? data : [])
          .map((c) => ({
            id: String(c.clipper_id || c.id || '').trim(),
            name: String(c.clipperName || c.clipper_name || '').trim(),
          }))
          .filter((x) => x.id && x.name)
          .sort((a, b) => a.name.localeCompare(b.name));

        if (mounted) setClippers(list);
      } catch (e) {
        // Don't hard-fail the page just because the dropdown can't load
        console.warn('Failed to load clippers list:', e);
        if (mounted) setClippers([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch gallery rows when filters change (debounce search a bit)
  useEffect(() => {
    let mounted = true;
    const t = window.setTimeout(async () => {
      setLoading(true);
      setErr('');

      try {
        const params = new URLSearchParams();
        params.set('limit', '250');
        params.set('offset', '0');
        params.set('platform', platformFilter || 'all');
        params.set('sort', sortBy || 'published_at');
        params.set('order', 'desc');

        if (clipperFilter && clipperFilter !== 'all') params.set('clipper_id', clipperFilter);
        if (search && search.trim()) params.set('q', search.trim());

        const url = `${API_BASE_URL}/video-gallery?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Gallery API ${res.status}`);
        const json = await res.json();

        const raw = Array.isArray(json?.rows) ? json.rows : [];

        const normalized = raw.map((r, i) => {
          const platform = String(r.platform || '').toLowerCase();
          return {
            key: `${platform}:${String(r.video_id || i)}`,
            platform,
            title: String(r.title || '').trim() || 'Untitled',
            videoUrl: String(r.url || '').trim(),
            thumbnailUrl: String(r.thumbnail_url || '').trim() || placeholderThumb(i + 1),
            views: Number(r.view_count ?? 0),
            likes: Number(r.like_count ?? 0),
            comments: Number(r.comment_count ?? 0),
            daysAgo: Number(r.days_ago ?? null),
            publishedAt: r.published_at || null,
            account:
              platform === 'youtube'
                ? String(r.channel_title || r.channel_id || '').trim()
                : String(r.username || '').trim(),
            clipperId: String(r.clipper_id || '').trim(),
            clipperName: String(r.clipper_name || '').trim(),
          };
        });

        if (mounted) setRows(normalized);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setErr(e?.message || 'Failed to load gallery');
          setRows([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(t);
    };
  }, [platformFilter, clipperFilter, sortBy, search]);

  const clipperOptions = useMemo(() => {
    return [{ id: 'all', name: 'All clippers' }, ...clippers];
  }, [clippers]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background:
          'radial-gradient(circle at top, rgba(223,223,223,0.02) 0, rgba(2,2,2,1) 45%)',
        display: 'flex',
        overflowX: 'hidden',
        overflowY: 'auto',
        color: '#fff',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: 32,
        paddingTop: 40,
        paddingBottom: 40,
      }}
    >
      {/* Watermark */}
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

              <NavBtn onClick={goDashV2} label="Dashboards" />
              <NavBtn onClick={goPayouts} label="Payouts" />
              <NavBtn onClick={goClippers} label="Clippers" />
              <NavBtn onClick={goPerformance} label="Performance" />
              <NavBtn onClick={goLeaderboards} label="Leaderboards" />

              {/* Active */}
              <button
                onClick={() => navigate('/gallery')}
                style={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: 12,
                  padding: '8px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 13,
                  background:
                    'linear-gradient(135deg, rgba(96,165,250,0.95), rgba(34,211,238,0.95))',
                  color: '#020617',
                  fontWeight: 800,
                  marginTop: 2,
                  marginBottom: 2,
                }}
              >
                Gallery
              </button>

              <NavBtn label="Settings" muted />

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
                Video tile gallery
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, position: 'relative', zIndex: 3 }}>
        {/* Brand */}
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

        {/* Header */}
        <div
          style={{
            marginBottom: 14,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Gallery</h1>
            <span style={{ fontSize: 13, opacity: 0.72 }}>
              Recent videos across platforms
            </span>
          </div>

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {loading ? 'Loading…' : `${rows.length.toLocaleString()} videos`}
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            borderRadius: 18,
            border: '1px solid rgba(148,163,184,0.25)',
            background: 'rgba(0,0,0,0.45)',
            padding: 14,
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            marginBottom: 16,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.75)',
          }}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <FilterSelect
              label="Platform"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              options={[
                { v: 'all', t: 'All' },
                { v: 'instagram', t: 'Instagram' },
                { v: 'tiktok', t: 'TikTok' },
                { v: 'youtube', t: 'YouTube' },
              ]}
            />

            <FilterSelect
              label="Clipper"
              value={clipperFilter}
              onChange={(e) => setClipperFilter(e.target.value)}
              options={clipperOptions.map((c) => ({ v: c.id, t: c.name }))}
            />

            <FilterSelect
              label="Sort by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { v: 'published_at', t: 'Publish date' },
                { v: 'view_count', t: 'View count' },
                { v: 'like_count', t: 'Like count' },
              ]}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>Search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="title, account, clipper…"
                style={{
                  fontSize: 12,
                  padding: '7px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'rgba(255,255,255,0.92)',
                  minWidth: 240,
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Pill>
              <span style={{ opacity: 0.75 }}>Showing</span>
              <span style={{ fontWeight: 900 }}>{rows.length.toLocaleString()}</span>
            </Pill>
            {err && (
              <Pill tone="danger">
                <span style={{ fontWeight: 900 }}>Error:</span>
                <span style={{ opacity: 0.9 }}>{err}</span>
              </Pill>
            )}
          </div>
        </div>

        {/* Grid */}
        <div
          style={{
            borderRadius: 22,
            background:
              'radial-gradient(circle at top left, rgba(255,255,255,0.06), rgba(0,0,0,0.55) 55%)',
            padding: 16,
            border: '1px solid rgba(148,163,184,0.22)',
            boxShadow: '0 26px 70px rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {loading && rows.length === 0 ? (
            <div style={{ padding: 14, opacity: 0.75, fontSize: 13 }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 14, opacity: 0.75, fontSize: 13 }}>
              No videos match your filters.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 14,
              }}
            >
              {rows.map((v, idx) => {
                const meta = platformMeta(v.platform);

                return (
                  <div
                    key={v.key || idx}
                    style={{
                      borderRadius: 18,
                      overflow: 'hidden',
                      border: '1px solid rgba(148,163,184,0.22)',
                      background: 'rgba(0,0,0,0.48)',
                      boxShadow: '0 18px 55px rgba(0,0,0,0.75)',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 340,
                    }}
                  >
                    {/* Top bar */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 10,
                        gap: 10,
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(0,0,0,0.35)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 10,        // ← change to 13 for perfect circle
                            overflow: 'hidden',      // ← THIS is the crop
                            display: 'grid',
                            placeItems: 'center',
                            background: meta.tone,
                            border: '1px solid rgba(255,255,255,0.12)',
                            boxShadow: `0 0 18px ${meta.glow}`,
                          }}
                          title={meta.label}
                        >
                          <img
                            src={meta.img}
                            alt={meta.label}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',     // ← important
                              padding: 4,             // ← trims edges of logo
                              background: '#000',     // optional: ensures clean background
                            }}
                          />
                        </span>

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={v.clipperName || v.account || ''}
                          >
                            {v.clipperName || v.account || '—'}
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.65 }}>
                            {v.account ? `@${v.account}` : meta.label}
                          </div>
                        </div>
                      </div>

                      <a
                        href={v.videoUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 12,
                          textDecoration: 'none',
                          padding: '6px 10px',
                          borderRadius: 999,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.92)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        View
                      </a>
                    </div>

                    {/* Thumbnail */}
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '9 / 16',
                        background: 'rgba(255,255,255,0.04)',
                        position: 'relative',
                      }}
                    >
                      <img
                        src={v.thumbnailUrl}
                        alt={v.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                        onError={(e) => {
                          // avoid infinite loop
                          if (e.currentTarget.dataset.fallbackApplied) return;
                          e.currentTarget.dataset.fallbackApplied = '1';
                          e.currentTarget.src = placeholderThumb(idx + 1);
                        }}
                      />
                    </div>

                    {/* Body */}
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flexGrow: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          lineHeight: 1.25,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                        title={v.title}
                      >
                        {v.title}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                        <Stat label="Views" value={formatNumber(v.views)} />
                        <Stat label="Likes" value={formatNumber(v.likes)} />
                        <Stat label="Comms" value={formatNumber(v.comments)} />
                      </div>

                      <div style={{ marginTop: 'auto', fontSize: 11, opacity: 0.65 }}>
                        Posted {daysAgoLabel(v.daysAgo)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavBtn({ onClick, label, muted }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: 'none',
        outline: 'none',
        borderRadius: 12,
        padding: '7px 10px',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        fontSize: 12,
        background: 'transparent',
        color: muted ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)',
        marginTop: 2,
      }}
    >
      {label}
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <select
        value={value}
        onChange={onChange}
        style={{
          fontSize: 12,
          padding: '6px 10px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.16)',
          background: 'rgba(0,0,0,0.6)',
          color: 'rgba(255,255,255,0.9)',
          minWidth: 170,
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.t}
          </option>
        ))}
      </select>
    </div>
  );
}

function Pill({ children, tone = 'neutral' }) {
  const t =
    tone === 'danger'
      ? {
          bg: 'rgba(239,68,68,0.16)',
          bd: 'rgba(239,68,68,0.30)',
          tx: 'rgba(254,202,202,0.95)',
        }
      : {
          bg: 'rgba(255,255,255,0.06)',
          bd: 'rgba(255,255,255,0.12)',
          tx: 'rgba(255,255,255,0.92)',
        };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 999,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.tx,
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div
      style={{
        borderRadius: 12,
        padding: 10,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ fontSize: 10, opacity: 0.65, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 900 }}>{value}</div>
    </div>
  );
}
