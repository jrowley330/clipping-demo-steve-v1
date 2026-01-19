import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

import { useBranding } from "./branding/BrandingContext";

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

const platformMeta = {
  youtube: {
    label: 'YouTube',
    pillBg: 'rgba(239,68,68,0.18)',
    pillBorder: 'rgba(239,68,68,0.55)',
    pillText: 'rgba(248,113,113,0.95)',
    icon: '▶',
  },
  tiktok: {
    label: 'TikTok',
    pillBg: 'rgba(94,234,212,0.14)',
    pillBorder: 'rgba(94,234,212,0.55)',
    pillText: 'rgba(94,234,212,0.95)',
    icon: '♪',
  },
  instagram: {
    label: 'Instagram',
    pillBg: 'rgba(168,85,247,0.14)',
    pillBorder: 'rgba(168,85,247,0.55)',
    pillText: 'rgba(216,180,254,0.95)',
    icon: '◎',
  },
};

const placeholderThumb = (seed = 1) =>
  // lightweight placeholder thumbs (swap with real thumbnail_url later)
  `https://picsum.photos/seed/clipper_gallery_${seed}/800/1200`;

export default function Gallery() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  //BRANDING
  const { headingText, watermarkText, defaults } = useBranding();
  const brandText = headingText || defaults.headingText;
  const wmText = watermarkText || defaults.watermarkText;

  // UI filters (placeholder — you’ll wire to BigQuery view later)
  const [platformFilter, setPlatformFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Placeholder gallery rows
  const videos = useMemo(
    () => [
      {
        id: 'yt_1',
        platform: 'youtube',
        title: '“WE NEED TO HOP IN THE RING”',
        videoUrl: 'https://www.youtube.com/shorts/VP9tP-zlVtw',
        thumbnailUrl: placeholderThumb(1),
        views: 1332213,
        likes: 97526,
        comments: 331,
        daysAgo: 7,
        account: 'spideringrybest',
      },
      {
        id: 'ig_1',
        platform: 'instagram',
        title: 'would be perfect together 💍',
        videoUrl: 'https://www.instagram.com/reel/DFq6d0Bx7XW/',
        thumbnailUrl: placeholderThumb(2),
        views: 761451,
        likes: 73087,
        comments: 60,
        daysAgo: 3,
        account: 'spideringrybest',
      },
      {
        id: 'tt_1',
        platform: 'tiktok',
        title: 'Quick roast + punchline cut',
        videoUrl: 'https://www.tiktok.com/@somehandle/video/1234567890',
        thumbnailUrl: placeholderThumb(3),
        views: 542118,
        likes: 41220,
        comments: 410,
        daysAgo: 2,
        account: 'fakepagefolder',
      },
      {
        id: 'yt_2',
        platform: 'youtube',
        title: 'This is why the first 2 seconds matter',
        videoUrl: 'https://www.youtube.com/watch?v=Mhwwp8hX0Dg',
        thumbnailUrl: placeholderThumb(4),
        views: 2099912,
        likes: 120004,
        comments: 884,
        daysAgo: 12,
        account: 'realstevewilldoit',
      },
      {
        id: 'ig_2',
        platform: 'instagram',
        title: 'Bedroom reveal → instant hook',
        videoUrl: 'https://www.instagram.com/reel/AAAAAAAAAAA/',
        thumbnailUrl: placeholderThumb(5),
        views: 318902,
        likes: 22881,
        comments: 112,
        daysAgo: 1,
        account: 'fakepagefolder',
      },
      {
        id: 'tt_2',
        platform: 'tiktok',
        title: 'Hot take: stop over-editing captions',
        videoUrl: 'https://www.tiktok.com/@somehandle/video/9999999999',
        thumbnailUrl: placeholderThumb(6),
        views: 1104921,
        likes: 88401,
        comments: 932,
        daysAgo: 9,
        account: 'spideringrybest',
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return videos.filter((v) => {
      if (platformFilter !== 'all' && v.platform !== platformFilter) return false;
      if (!q) return true;
      return (
        (v.title || '').toLowerCase().includes(q) ||
        (v.account || '').toLowerCase().includes(q)
      );
    });
  }, [videos, platformFilter, search]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const goDashV2 = () => navigate("/dashboard-v2");
  const goPayouts = () => navigate("/payouts");
  const goClippers = () => navigate("/clippers");
  const goPerformance = () => navigate("/performance");
  const goLeaderboards = () => navigate("/leaderboards");
  const goGallery = () => navigate("/gallery");
  const goSettings = () => navigate("/settings");
  const goContentApproval = () => navigate('/content-approval');

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
                onClick={goDashV2}
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
                  marginTop: 2,
                }}
              >
                Payouts
              </button>

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
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 2,
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
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 2,
                }}
              >
                Leaderboards
              </button>

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
                    'linear-gradient(135deg, rgba(249,115,22,0.95), rgba(250,204,21,0.95))',
                  color: '#020617',
                  fontWeight: 600,
                  marginTop: 2,
                  marginBottom: 2,
                }}
              >
                Gallery
              </button>

              <button
                onClick={() => navigate('/settings')}
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
                Video gallery hub
              </div>
            </>
          )}
        </div>
      </div>

      {/* MAIN */}
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
      
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 18,
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>
              Gallery
            </h1>
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              All posted videos · thumbnails + stats
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              style={{
                fontSize: 12,
                padding: '7px 10px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(0,0,0,0.6)',
                color: 'rgba(255,255,255,0.9)',
              }}
            >
              <option value="all">All platforms</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
            </select>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or account…"
              style={{
                width: 260,
                maxWidth: '50vw',
                fontSize: 12,
                padding: '7px 12px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(0,0,0,0.6)',
                color: 'rgba(255,255,255,0.92)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Content card */}
        <div
          style={{
            borderRadius: 20,
            background:
              'radial-gradient(circle at top left, rgba(255,255,255,0.04), transparent 55%)',
            padding: 18,
            boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}
          >
            {filtered.map((v) => {
              const meta = platformMeta[v.platform] || {
                label: v.platform,
                pillBg: 'rgba(148,163,184,0.12)',
                pillBorder: 'rgba(148,163,184,0.35)',
                pillText: 'rgba(148,163,184,0.95)',
                icon: '•',
              };

              return (
                <div
                  key={v.id}
                  style={{
                    borderRadius: 18,
                    overflow: 'hidden',
                    background: 'rgba(0,0,0,0.55)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 18px 45px rgba(0,0,0,0.75)',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 420,
                  }}
                >
                  {/* Top bar */}
                  <div
                    style={{
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      background:
                        'linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.3))',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 11,
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: meta.pillBg,
                          border: `1px solid ${meta.pillBorder}`,
                          color: meta.pillText,
                        }}
                      >
                        <span style={{ opacity: 0.9 }}>{meta.icon}</span>
                        {meta.label}
                      </span>

                      {v.account && (
                        <span style={{ fontSize: 11, opacity: 0.65 }}>
                          @{v.account}
                        </span>
                      )}
                    </div>

                    <a
                      href={v.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.78)',
                        textDecoration: 'none',
                        border: '1px solid rgba(255,255,255,0.16)',
                        padding: '5px 10px',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.06)',
                      }}
                    >
                      View ↗
                    </a>
                  </div>

                  {/* Thumb */}
                  <div style={{ position: 'relative', flex: 1, background: '#000' }}>
                    <img
                      src={v.thumbnailUrl}
                      alt={v.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        filter: 'contrast(1.02) saturate(1.05)',
                      }}
                      loading="lazy"
                    />

                    {/* Play overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          width: 62,
                          height: 62,
                          borderRadius: 999,
                          background: 'rgba(0,0,0,0.55)',
                          border: '1px solid rgba(255,255,255,0.18)',
                          boxShadow: '0 18px 50px rgba(0,0,0,0.8)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backdropFilter: 'blur(6px)',
                        }}
                      >
                        <span style={{ fontSize: 22, opacity: 0.9 }}>▶</span>
                      </div>
                    </div>

                    {/* Title gradient */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        padding: 12,
                        background:
                          'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.85))',
                      }}
                    >
                      <div
                        title={v.title}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          lineHeight: 1.25,
                          textShadow: '0 6px 18px rgba(0,0,0,0.9)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {v.title}
                      </div>
                    </div>
                  </div>

                  {/* Bottom stats */}
                  <div
                    style={{
                      padding: 12,
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(0,0,0,0.55)',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <Stat label="Views" value={formatNumber(v.views)} />
                      <Stat label="Likes" value={formatNumber(v.likes)} />
                      <Stat label="Comments" value={formatNumber(v.comments)} />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 11,
                        opacity: 0.65,
                      }}
                    >
                      <span>Posted {daysAgoLabel(v.daysAgo)}</span>
                      <span style={{ opacity: 0.85 }}>
                        ID: <span style={{ fontFamily: 'monospace' }}>{v.id}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 14, opacity: 0.75, fontSize: 13 }}>
              No videos match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
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
      <div style={{ fontSize: 10, opacity: 0.65, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
