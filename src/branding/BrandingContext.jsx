import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const BrandingContext = createContext(null);

const DEFAULTS = {
  headingText: "Loading...",
  watermarkText: "Loading...",
};

const API_BASE = "https://clipper-payouts-api-810712855216.us-central1.run.app";

export function BrandingProvider({ clientId = "default", children }) {
  const [headingText, setHeadingText] = useState("");
  const [watermarkText, setWatermarkText] = useState("");
  const [loadingBranding, setLoadingBranding] = useState(false);
  const [brandingError, setBrandingError] = useState("");

  const refresh = async () => {
    setLoadingBranding(true);
    setBrandingError("");

    try {
      const url = `${API_BASE}/settings?clientId=${encodeURIComponent(clientId)}`;
      const res = await fetch(url);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GET /settings failed: ${res.status} ${text}`);
      }

      const raw = await res.json();
      const data = Array.isArray(raw) ? raw[0] : raw;

      // Support BOTH camelCase (current API) and snake_case (if you ever switch)
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
  }, [clientId]);

  const value = useMemo(
    () => ({
      headingText,
      watermarkText,
      defaults: DEFAULTS,
      loadingBranding,
      brandingError,
      refresh,
      clientId,
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
