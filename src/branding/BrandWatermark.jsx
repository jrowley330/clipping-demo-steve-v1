// src/branding/BrandWatermark.jsx
import React from "react";
import { useBranding } from "./BrandingContext";

export default function BrandWatermark() {
  const { watermarkText, preview } = useBranding();

  // if preview exists (Settings typing), use it — otherwise saved value
  const text = preview?.watermarkText ?? watermarkText;

  if (!text) return null;

  return (
    <div
      data-wm="global"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        opacity: 0.035,
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
      {String(text)}
    </div>
  );
}
