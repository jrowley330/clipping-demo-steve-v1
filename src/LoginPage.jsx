import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

// IMPORTANT — correct background import
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
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
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
          background: 'rgba(0,0,0,0.65)',
          boxShadow: '0 0 50px rgba(0,0,0,0.7)',
          borderRadius: 20,
          backdropFilter: 'blur(6px)',
          textAlign: 'center',
          animation: 'fadeIn 0.8s ease-out',
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
            textShadow: '0 0 18px rgba(255,255,255,0.8)',
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
          }}
        >
          CLIPPING DASHBOARD ACCESS
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ textAlign: 'left', marginBottom: 12 }}>
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
                borderRadius: 10,
                border: '1px solid #444',
                background: '#111',
                color: 'white',
                fontSize: 15,
              }}
            />
          </div>

          <div style={{ textAlign: 'left', marginBottom: 20 }}>
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
                borderRadius: 10,
                border: '1px solid #444',
                background: '#111',
                color: 'white',
                fontSize: 15,
              }}
            />
          </div>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 0',
              marginTop: 10,
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(180deg,#ffffff 0%,#cccccc 100%)',
              color: '#000',
              fontSize: 17,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 25px rgba(255,255,255,0.4)',
            }}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>

      {/* Fade animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
