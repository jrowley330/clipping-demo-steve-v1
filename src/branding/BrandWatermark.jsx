// src/branding/BrandWatermark.jsx
import React from "react";
import { useBranding } from "./BrandingContext";

export default function BrandWatermark() {
  const { watermarkText, defaults } = useBranding();

  // IMPORTANT: BrandingContext already returns "Loading..." while loading.
  // So do NOT override with defaults based on loading here.
  const text = watermarkText || defaults.watermarkText;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        opacity: 0.03,
        fontFamily: "Impact, Haettenschweiler, Arial Black, sans-serif",
        fontSize: 140,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: "#ffffff",
        transform: "rotate(-18deg)",
        textShadow: "0 0 60px rgba(0,0,0,1)",
        zIndex: 1,
      }}
    >
      {text}
    </div>
  );
}
