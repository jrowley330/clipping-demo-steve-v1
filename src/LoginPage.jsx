import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

import bgImage from './assets/sick_background.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) setError(error.message);
    else navigate('/dashboard');
  };

  return (
    <div
      style={{
        position: 'fixed',           // lock to viewport
        inset: 0,                    // top/right/bottom/left = 0
        margin: 0,
        padding: 0,
        overflow: 'hidden',          // no scrollbars
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* LOGIN CARD */}
      <div
        style={{
          width: 480,
          padding: '50px 40px',
          background: 'rgba(0,0,0,0.75)',
          borderRadius: 24,
          boxShadow:
            '0 40px 80px rgba(0,0,0,0.95), 0 0 35px rgba(255,255,255,0.18)',
          backdropFilter: 'blur(8px)',
          textAlign: 'center',
          animation: 'dropIn 0.85s cubic-bezier(0.22, 1.02, 0.24, 1)', // “breaking through ceiling”
        }}
      >
        {/* Logo / Title */}
        <h1
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 38,
            letterSpacing: 2,
            color: 'white',
            fontWeight: 700,
            textShadow:
              '0 0 30px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.8)',
          }}
        >
          STEVEWILLDOIT
        </h1>

        <p
          style={{
            color: '#ccc',
            letterSpacing: 4,
            marginBottom: 30,
            fontSize: 14,
            textTransform: 'uppercase',
          }}
        >
          Clipping Dashboard Access
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ textAlign: 'left', marginBottom: 14 }}>
            <label style={{ color: '#ddd', fontSize: 14 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                marginTop: 4,
                borderRadius: 12,
                border: '1px solid #444',
                background: '#111',
                color: 'white',
                fontSize: 15,
              }}
            />
          </div>

          <div style={{ textAlign: 'left', marginBottom: 22 }}>
            <label style={{ color: '#ddd', fontSize: 14 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                marginTop: 4,
                borderRadius: 12,
                border: '1px solid #444',
                background: '#111',
                color: 'white',
                fontSize: 15,
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#ff7070', marginBottom: 10, fontSize: 13 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 0',
              marginTop: 4,
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(180deg,#ffffff 0%,#dcdcdc 100%)',
              color: '#000',
              fontSize: 17,
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              boxShadow: '0 0 30px rgba(255,255,255,0.6)',
              transition: 'transform 0.12s ease, box-shadow 0.12s ease',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(1px) scale(0.98)';
              e.currentTarget.style.boxShadow =
                '0 0 18px rgba(255,255,255,0.4)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow =
                '0 0 30px rgba(255,255,255,0.6)';
            }}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>

      {/* Drop-in animation keyframes */}
      <style>{`
        @keyframes dropIn {
          0% {
            opacity: 0;
            transform: translateY(-140px) scale(0.9);
            box-shadow: 0 0 0 rgba(0,0,0,0);
          }
          60% {
            opacity: 1;
            transform: translateY(18px) scale(1.03);
            box-shadow: 0 50px 90px rgba(0,0,0,1);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            box-shadow: 0 40px 80px rgba(0,0,0,0.95), 0 0 35px rgba(255,255,255,0.18);
          }
        }
      `}</style>
    </div>
  );
}

