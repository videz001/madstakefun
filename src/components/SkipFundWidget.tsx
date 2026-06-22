"use client";

import { useEffect, useRef } from "react";

// Skip:Go as a pre-bundled WEB COMPONENT loaded from a CDN. This avoids the
// @skip-go/widget npm import (whose ESM-only exports break the Next 14 build)
// while giving us the real, themeable widget WITH its own wallet-connect UI.
// Props are set on the element via JS (objects can't be HTML attributes).
// Docs: https://docs.skip.build/go/widget/web-component

const SCRIPT_SRC =
  "https://unpkg.com/@skip-go/widget-web-component/build/index.js";
const CHAIN_ID = process.env.NEXT_PUBLIC_COSMOS_CHAIN_ID || "cosmoshub-4";

// Dark theme matched to the app's lab palette.
const widgetTheme = {
  brandColor: "#b6ff3a",
  brandTextColor: "#07080b",
  borderRadius: 12,
  primary: {
    background: { normal: "#0e1118" },
    text: {
      normal: "#e9edf2",
      lowContrast: "#9aa3b2",
      ultraLowContrast: "#7e8798",
    },
    ghostButtonHover: "#151823",
  },
  secondary: {
    background: {
      normal: "#11151d",
      transparent: "rgba(255,255,255,0.04)",
      hover: "#1a1f2b",
    },
  },
  success: { background: "#10391a", text: "#b6ff3a" },
  warning: { background: "#3a2f10", text: "#ffd166" },
  error: { background: "#3a1416", text: "#ff6b6b" },
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "skip-widget": any;
    }
  }
}

export function SkipFundWidget({
  cosmosAddress,
  evmAddress,
}: {
  cosmosAddress: string;
  evmAddress?: string;
}) {
  const ref = useRef<any>(null);

  // Load the web-component script once.
  useEffect(() => {
    if (!document.querySelector("script[data-skip-widget]")) {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.type = "module";
      s.setAttribute("data-skip-widget", "true");
      document.body.appendChild(s);
    }
  }, []);

  // Set props once the custom element is defined (and whenever addresses change).
  useEffect(() => {
    let cancelled = false;
    const apply = () => {
      const el = ref.current;
      if (!el) return;
      el.theme = widgetTheme;
      // Route Skip's API calls through our own backend proxy to avoid CORS
      // (go.skip.build's API is locked to Skip's own origin).
      el.apiUrl = `${window.location.origin}/api/skip`;
      el.defaultRoute = { destChainId: CHAIN_ID, destAssetDenom: "uatom" };
      const connected: Record<string, string> = { [CHAIN_ID]: cosmosAddress };
      if (evmAddress) connected["1"] = evmAddress;
      el.connectedAddresses = connected;
    };
    if (typeof window !== "undefined" && window.customElements) {
      window.customElements.whenDefined("skip-widget").then(() => {
        if (!cancelled) apply();
      });
      apply(); // in case it's already defined
    }
    return () => {
      cancelled = true;
    };
  }, [cosmosAddress, evmAddress]);

  return (
    <div>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto" }}>
        <skip-widget ref={ref} style={{ display: "block", width: "100%" }} />
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12, textAlign: "center" }}>
        Loads the Skip:Go widget. If it doesn't appear,{" "}
        <a href="https://go.skip.build" target="_blank" rel="noreferrer" style={{ color: "var(--acid)" }}>
          open Skip:Go in a new tab ↗
        </a>{" "}
        — ATOM still lands in the same Cosmos wallet.
      </p>
    </div>
  );
}
