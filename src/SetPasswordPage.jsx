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
    
    window.localStorage.removeItem("force_set_password");

    setSaving(false);

    if (error) return setError(error.message);

    // go to dashboards
    window.localStorage.removeItem("force_set_password");
    navigate("/dashboard-v2", { replace: true });
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div style={{ padding: 24, color: "white" }}>
      <h2 style={{ marginTop: 0 }}>Set your password</h2>
      <p style={{ opacity: 0.8 }}>
        This is required the first time you accept an invite.
      </p>

      <form onSubmit={onSubmit} style={{ maxWidth: 420 }}>
        <div style={{ marginBottom: 12 }}>
          <label>New password</label>
          <input
            type="password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Confirm password</label>
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </div>

        {error && <div style={{ color: "salmon", marginBottom: 12 }}>{error}</div>}

        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Set password"}
        </button>
      </form>
    </div>
  );
}
