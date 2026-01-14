import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/login", { replace: true });
        return;
      }
      setLoading(false);
    })();
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (pw1.length < 8) return setError("Password must be at least 8 characters.");
    if (pw1 !== pw2) return setError("Passwords do not match.");

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: pw1,
      data: { password_set: true },
    });

    setSaving(false);

    if (error) return setError(error.message);

    // ✅ only clear after success
    window.localStorage.removeItem("force_set_password");
    navigate("/dashboard-v2", { replace: true });
  };

  if (loading) {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.loadingText}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={styles.fullscreen}>
      <div style={styles.card}>
        <h1 style={styles.title}>CREATE PASSWORD</h1>
        <p style={styles.subtitle}>
          Set your password to finish account setup.
        </p>

        <form onSubmit={onSubmit} style={{ width: "100%", marginTop: 18 }}>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              placeholder="Enter a password"
              style={styles.input}
              autoComplete="new-password"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Confirm password</label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Re-enter your password"
              style={styles.input}
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <div style={styles.errorWrap}>
              <div style={styles.errorText}>{error}</div>
            </div>
          )}

          <button type="submit" disabled={saving} style={styles.button}>
            {saving ? "Saving…" : "Set password"}
          </button>

          <div style={styles.hint}>
            Minimum 8 characters.
          </div>
        </form>
      </div>

      <style>{`
        /* soft “spotlight” + subtle grain vibe */
        .pw-bg::before{
          content:"";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(900px 500px at 50% 10%, rgba(255,255,255,0.12), rgba(0,0,0,0) 60%),
            radial-gradient(800px 500px at 50% 110%, rgba(255,255,255,0.06), rgba(0,0,0,0) 55%);
          mix-blend-mode: screen;
          opacity: 0.9;
        }
      `}</style>
      <div className="pw-bg" />
    </div>
  );
}

const styles = {
  fullscreen: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background: "#070707",
    overflow: "hidden",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },

  card: {
    width: 520,
    maxWidth: "92vw",
    padding: "46px 44px",
    borderRadius: 24,
    background: "rgba(0,0,0,0.78)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow:
      "0 40px 90px rgba(0,0,0,0.90), 0 0 40px rgba(255,255,255,0.14)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    textAlign: "center",
    position: "relative",
    zIndex: 2,
    animation: "dropIn 0.75s cubic-bezier(0.22, 1.02, 0.24, 1)",
  },

  title: {
    margin: 0,
    fontSize: 30,
    letterSpacing: 2,
    fontWeight: 800,
    color: "#fff",
    textShadow:
      "0 0 26px rgba(255,255,255,0.55), 0 0 10px rgba(255,255,255,0.40)",
  },

  subtitle: {
    margin: "10px 0 0",
    fontSize: 13,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.65)",
  },

  field: {
    textAlign: "left",
    marginBottom: 16,
  },

  label: {
    display: "block",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 6,
    letterSpacing: 0.2,
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(17,17,17,0.92)",
    color: "#fff",
    outline: "none",
    fontSize: 15,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
  },

  errorWrap: {
    marginTop: 6,
    marginBottom: 14,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,120,120,0.25)",
    background: "rgba(255,80,80,0.08)",
    textAlign: "left",
  },

  errorText: {
    color: "rgba(255,150,150,0.95)",
    fontSize: 13,
    lineHeight: 1.35,
  },

  button: {
    width: "100%",
    padding: "14px 0",
    borderRadius: 999,
    border: "none",
    background: "linear-gradient(180deg,#ffffff 0%,#cfcfcf 100%)",
    color: "#000",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 0 26px rgba(255,255,255,0.35)",
    marginTop: 6,
    opacity: 1,
  },

  hint: {
    marginTop: 12,
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.2,
  },

  loadingText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    letterSpacing: 1,
  },
};

/* inject keyframes once */
if (typeof document !== "undefined" && !document.getElementById("pw-dropin-style")) {
  const s = document.createElement("style");
  s.id = "pw-dropin-style";
  s.innerHTML = `
    @keyframes dropIn {
      0% { opacity: 0; transform: translateY(-120px) scale(0.92); }
      60% { opacity: 1; transform: translateY(14px) scale(1.02); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    input:focus {
      border-color: rgba(255,255,255,0.35) !important;
      box-shadow: 0 0 0 3px rgba(255,255,255,0.10) !important;
    }
    button:disabled {
      opacity: 0.65 !important;
      cursor: not-allowed !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(s);
}
