// src/components/EnvironmentSwitcher.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEnvironment } from "../EnvironmentContext";

const ENVS = [
  { id: "ARAFTA", label: "ARAFTA" },
  { id: "BONGINO", label: "BONGINO" },
  { id: "DEMOV2", label: "DEMOV2" },
];

export default function EnvironmentSwitcher() {
  const { clientId, setClientId } = useEnvironment();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const current = useMemo(
    () => ENVS.find((e) => e.id === clientId) || ENVS[0],
    [clientId]
  );

  // click outside closes
  useEffect(() => {
    const onDown = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (id) => {
    setClientId(id);
    setOpen(false);

    // If you want HARD refresh, uncomment:
    // window.location.reload();
  };

  return (
    <div
      ref={wrapRef}
      style={{
        position: "fixed",
        top: 10,
        left: 10,
        zIndex: 9999,
        pointerEvents: "auto",
        userSelect: "none",
        fontFamily: "inherit", // match app font
      }}
    >
      {/* tiny button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          height: 22,                 // smaller
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 10px",          // smaller
          borderRadius: 11,
          border: "1px solid rgba(249,115,22,0.30)",
          background:
            "linear-gradient(180deg, rgba(249,115,22,0.92), rgba(161,98,7,0.86))",
          boxShadow:
            "0 10px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.22)",
          cursor: "pointer",
          color: "rgba(0,0,0,0.88)",
          fontSize: 10,               // smaller
          fontWeight: 900,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          lineHeight: 1,
        }}
        title={`Environment: ${current.label}`}
      >
        <span style={{ opacity: 0.95 }}>Environment</span>

        {/* tiny status dot */}
        <span
          style={{
            marginLeft: 2,
            width: 7,                 // smaller
            height: 7,                // smaller
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            boxShadow:
              "0 0 0 2px rgba(255,255,255,0.14), 0 0 12px rgba(249,115,22,0.25)",
          }}
        />

        {/* caret */}
        <span
          style={{
            marginLeft: 2,
            color: "rgba(0,0,0,0.75)",
            fontSize: 11,             // smaller
            lineHeight: 1,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 140ms ease",
          }}
        >
          ▾
        </span>
      </button>

      {/* popover */}
      {open && (
        <div
          style={{
            marginTop: 8,
            width: 160,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.92)",
            overflow: "hidden",
            boxShadow: "0 22px 60px rgba(0,0,0,0.85)",
            fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  fontWeight: 700,
                }}
              >
                Select Client
              </div>

              {/* removed "Current: BONGINO" line (redundant) */}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                height: 32,
                padding: "4 4px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.80)",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 900,
                fontFamily: "inherit",
              }}
            >
              x
            </button>
          </div>

          {ENVS.map((e) => {
            const active = e.id === clientId;

            return (
              <div
                key={e.id}
                onClick={() => pick(e.id)}
                style={{
                  padding: "14px 14px",
                  cursor: "pointer",
                  fontSize: 10, // keep big + readable inside dropdown
                  fontWeight: 900,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  fontFamily: "inherit",
                  color: active ? "rgba(0,0,0,0.92)" : "rgba(255,255,255,0.92)",
                  background: active
                    ? "linear-gradient(135deg, rgba(249,115,22,0.98), rgba(250,204,21,0.92))"
                    : "transparent",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(ev) => {
                  if (active) return;
                  ev.currentTarget.style.background = "rgba(249,115,22,0.12)";
                }}
                onMouseLeave={(ev) => {
                  if (active) return;
                  ev.currentTarget.style.background = "transparent";
                }}
              >
                <span>{e.label}</span>
                {active && (
                  <span style={{ fontSize: 18, fontWeight: 900 }}>✓</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
