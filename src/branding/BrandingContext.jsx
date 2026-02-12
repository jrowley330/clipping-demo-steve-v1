import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useEnvironment } from "../EnvironmentContext"; // adjust path if needed

const BrandingContext = createContext(null);

const DEFAULTS = {
  headingText: "Loading...",
  watermarkText: "Loading...",
};

const API_BASE = "https://clipper-payouts-api-810712855216.us-central1.run.app";

export function BrandingProvider({ clientId = "default", children }) {
  const { clientId: envClientId } = useEnvironment(); // ✅ ARAFTA / BONGINO

  const [headingText, setHeadingText] = useState("");
  const [watermarkText, setWatermarkText] = useState("");
  const [loadingBranding, setLoadingBranding] = useState(false);
  const [brandingError, setBrandingError] = useState("");

  const refresh = async () => {
    setLoadingBranding(true);
    setBrandingError("");

    try {
      const url = `${API_BASE}/settings?clientId=${encodeURIComponent(envClientId)}`; // ✅ single clientId now
      const res = await fetch(url);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GET /settings failed: ${res.status} ${text}`);
      }

      const raw = await res.json();
      const data = Array.isArray(raw) ? raw[0] : raw;

      const h = data?.headingText ?? data?.heading_text ?? "";
      const w = data?.watermarkText ?? data?.watermark_text ?? "";

      setHeadingText(String(h || ""));
      setWatermarkText(String(w || ""));
    } catch (e) {
      setBrandingError(e?.message || "Failed to load branding");
    } finally {
      setLoadingBranding(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envClientId]); // ✅ reload branding when env changes

  const value = useMemo(
    () => ({
      headingText,
      watermarkText,
      defaults: DEFAULTS,
      loadingBranding,
      brandingError,
      refresh,
      clientId, // (not used for fetch anymore, but fine to keep)
      setBrandingLocal: ({ headingText: h, watermarkText: w }) => {
        if (h !== undefined) setHeadingText(String(h ?? ""));
        if (w !== undefined) setWatermarkText(String(w ?? ""));
      },
    }),
    [headingText, watermarkText, loadingBranding, brandingError, clientId]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used inside <BrandingProvider>");
  return ctx;
}