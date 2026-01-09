// src/branding/BrandHeader.jsx
import React from "react";
import { useBranding } from "./BrandingContext";

export default function BrandHeader({ className = "", style = {} }) {
  const { headingText, loading, defaults } = useBranding();

  // while loading, show default so layout doesn't jump
  const text = (loading ? defaults.headingText : headingText) || defaults.headingText;

  return (
    <h1 className={className} style={style}>
      {text}
    </h1>
  );
}
