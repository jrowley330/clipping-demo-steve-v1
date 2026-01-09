// src/branding/BrandingContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = "https://clipper-payouts-api-810712855216.us-central1.run.app";

// sensible defaults (used during loading + if API returns blanks)
const DEFAULTS = {
  headingText: "YOUR CLIPPING CAMPAIGN",
  watermarkText: "CLIPPING",
};

const BrandingContext = createContext(null);

function safeJsonParse(v) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

export function BrandingProvider({ clientId, children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branding, setBranding] = useState(DEFAULTS);

  const clientIdRef = useRef(clientId || "default");
  clientIdRef.current = clientId || "default";

  const storageKey = useMemo(() => `branding:${clientIdRef.current}`, [clientIdRef.current]);

  // load cached immediately (fast paint), then refresh in background
  useEffect(() => {
    const cached = safeJsonParse(localStorage.getItem(storageKey));
    if (cached?.headingText || cached?.watermarkText) {
      setBranding({
        headingText: String(cached.headingText || DEFAULTS.headingText),
        watermarkText: String(cached.watermarkText || DEFAULTS.watermarkText),
      });
      setLoading(false);
    }
    // always refresh at least once on mount/client change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const refresh = async () => {
    const cid = clientIdRef.current;

    setError("");
    setLoading(true);

    try {
      const qs = new URLSearchParams({ clientId: cid });
      const res = await fetch(`${API_BASE_URL}/settings?${qs.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error(`Settings API ${res.status}`);

      const data = await res.json().catch(() => null);

      const next = {
        headingText: String(data?.headingText || DEFAULTS.headingText),
        watermarkText: String(data?.watermarkText || DEFAULTS.watermarkText),
      };

      setBranding(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      setError(e?.message || "Failed to load branding");
      // fall back to whatever we already had (cached or defaults)
      setBranding((prev) => prev || DEFAULTS);
    } finally {
      setLoading(false);
    }
  };

  // run refresh once per clientId change
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // lets Settings.jsx update instantly after save (no wait)
  const updateBranding = (partial) => {
    setBranding((prev) => {
      const next = {
        headingText: String(partial?.headingText ?? prev?.headingText ?? DEFAULTS.headingText),
        watermarkText: String(partial?.watermarkText ?? prev?.watermarkText ?? DEFAULTS.watermarkText),
      };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({
      clientId: clientIdRef.current,
      loading,
      error,
      headingText: loading
        ? "Loading..."
        : branding?.headingText || DEFAULTS.headingText,

      watermarkText: loading
        ? "Loading..."
        : branding?.watermarkText || DEFAULTS.watermarkText,
      updateBranding,
      defaults: DEFAULTS,
    }),
    [loading, error, branding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    // fail-safe so app doesn't crash if you forget the provider
    return {
      clientId: "default",
      loading: false,
      error: "",
      ...DEFAULTS,
      refresh: async () => {},
      updateBranding: () => {},
      defaults: DEFAULTS,
    };
  }
  return ctx;
}
