import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

// FIX: rename file to remove space OR ensure exact filename
import bgImage from './assets/sick_background.png'; // <-- use your correct filename here

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        backgroundImage: `
          radial-gradient(circle at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.9) 70%, #000 100%),
          url(${bgImage})
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        color: '#fff',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          padding: '40px 32px',
          borderRadius: 18,
          background: 'rgba(0,0,0,0.85)',
          boxShadow:
            '0 0 30px rgba(0,0,0,0.9), 0 0 25px rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(10px)',
          opacity: mounted ? 1 : 0,
          transform: mounted
            ? 'translateY(0) scale(1)'
            : 'translateY(18px) scale(0.97)',
          transition: 'opacity 0.45s ease, transform 0.45s ease',
        }}
      >
        {/* Brand Title */}
        <h1
          style={{
            textAlign: 'center',
            marginBottom: 8,
            fontSize: 30,
            letterSpacing: 2,
            fontWeight: 700,
            textTransform: 'uppercase',
            fontFamily: 'Impact, "Anton", system-ui, sans-serif',
            textShadow:
              '0 0 14px rgba(0,0,0,0.9), 0 0 10px rgba(255,255,255,0.25)',
          }}
        >
          SteveWillDoIt
        </h1>

        <p
          style={{
            textAlign: 'center',
            marginBottom: 28,
            fontSize: 14,
            letterSpacing: 2,
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          Clipping Dashboard Access
        </p>

        <form onSubmit={handleLogin}>
          <label style={{ fontSize: 13, opacity: 0.85 }}>Email</label>
          <input
            style={{
              width: '100%',
              maxWidth: 280,       // <— NEW
              display: 'block',    // <— NEW
              margin: '4px auto',  // <— NEW
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.06)',
              color: 'white',
              fontSize: 15,
              outline: 'none',
            }}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label style={{ fontSize: 13, opacity: 0.85 }}>Password</label>
          <input
            style={{
              width: '100%',
              maxWidth: 280,       // <— NEW
              display: 'block',    // <— NEW
              margin: '4px auto',  // <— NEW
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.06)',
              color: 'white',
              fontSize: 15,
              outline: 'none',
            }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p
              style={{
                color: '#ff6b6b',
                marginBottom: 10,
                fontSize: 13,
              }}
            >
              {error}
            </p>
          )}

          <button
            disabled={loading}
            type="submit"
            style={{
              width: 280,             // <— MATCH WIDTH
              margin: '12px auto 0',  // <— CENTER BUTTON
              display: 'block',
              padding: '12px 0',
              borderRadius: 999,
              border: 'none',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              color: '#000',
              background:
                'linear-gradient(90deg, #ffffff, #d9d9d9, #ffffff)',
              boxShadow: '0 0 14px rgba(255,255,255,0.5)',
              transition: '0.2s ease',
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
