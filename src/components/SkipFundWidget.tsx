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

  // This version of the web component ignores the `apiUrl` prop and calls
  // go.skip.build directly (CORS-blocked from our domain). So we patch fetch on
  // this page and reroute those calls to our same-origin proxy at /api/skip.
  // Installed before the widget script loads so its first request is caught.
  useEffect(() => {
    const SKIP_PREFIX = "https://go.skip.build/api/skip";
    const proxyBase = `${window.location.origin}/api/skip`;
    const orig = window.fetch.bind(window);

    const rewrite = (u: string) =>
      u.startsWith(SKIP_PREFIX) ? proxyBase + u.slice(SKIP_PREFIX.length) : u;

    window.fetch = (input: any, init?: any) => {
      try {
        if (typeof input === "string" || input instanceof URL) {
          const u = String(input);
          if (u.startsWith(SKIP_PREFIX)) return orig(rewrite(u), init);
        } else if (input && typeof input === "object" && "url" in input) {
          // Request object
          if (input.url.startsWith(SKIP_PREFIX)) {
            return orig(new Request(rewrite(input.url), input), init);
          }
        }
      } catch {
        /* fall through to original */
      }
      return orig(input, init);
    };

    return () => {
      window.fetch = orig;
    };
  }, []);

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

  // Set props on the element. apiUrl FIRST so Skip's API client is configured to
  // hit our same-origin proxy (avoids the go.skip.build CORS block). We re-apply
  // on an interval for a few seconds so the value is in place both before and
  // after the web component upgrades — otherwise it can start fetching the
  // default (CORS-blocked) endpoint before our override lands.
  useEffect(() => {
    const apply = () => {
      const el = ref.current;
      if (!el) return;
      el.apiUrl = `${window.location.origin}/api/skip`;
      el.theme = widgetTheme;
      el.defaultRoute = { destChainId: CHAIN_ID, destAssetDenom: "uatom" };
      const connected: Record<string, string> = { [CHAIN_ID]: cosmosAddress };
      if (evmAddress) connected["1"] = evmAddress;
      el.connectedAddresses = connected;
    };
    apply();
    let n = 0;
    const id = setInterval(() => {
      apply();
      if (++n > 30) clearInterval(id); // ~6s of coverage during script load/upgrade
    }, 200);
    return () => clearInterval(id);
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
