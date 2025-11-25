import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

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

    if (error) {
      setError(error.message);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',          // lock to viewport
        inset: 0,                   // top/right/bottom/left = 0
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        color: 'white',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: 'hidden',         // no scroll
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '40px 32px',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.05)',
          boxShadow: '0 0 25px rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {/* Brand Title */}
        <h1
          style={{
            textAlign: 'center',
            marginBottom: 30,
            fontSize: 28,
            letterSpacing: 1.5,
            fontWeight: 600,
            textShadow: '0px 0px 10px rgba(255,255,255,0.25)',
          }}
        >
          SteveWillDoIt Clipping
        </h1>

        <form onSubmit={handleLogin}>
          <label style={{ fontSize: 14 }}>Email</label>
          <input
            style={{
              width: '100%',
              padding: '10px 12px',
              marginTop: 4,
              marginBottom: 16,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: 15,
            }}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label style={{ fontSize: 14 }}>Password</label>
          <input
            style={{
              width: '100%',
              padding: '10px 12px',
              marginTop: 4,
              marginBottom: 16,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: 15,
            }}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p style={{ color: '#ff6b6b', marginBottom: 12, fontSize: 14 }}>
              {error}
            </p>
          )}

          <button
            disabled={loading}
            type="submit"
            style={{
              width: '100%',
              padding: '12px 0',
              marginTop: 8,
              borderRadius: 10,
              border: 'none',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#000',
              background:
                'linear-gradient(90deg, #ffffff, #d8d8d8, #ffffff)',
              boxShadow: '0 0 12px rgba(255,255,255,0.4)',
              transition: '0.2s ease',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
