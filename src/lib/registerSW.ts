import { purgeLegacyApiCaches } from "./pwaCachePolicy";

const SW_URL = "/sw.js";
const UPDATE_INTERVAL_MS = 30 * 60 * 1000;

function isBlockedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  }
  return false;
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => r.active?.scriptURL?.endsWith(SW_URL) || r.installing?.scriptURL?.endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

export function registerServiceWorker() {
  void purgeLegacyApiCaches();
  if (!("serviceWorker" in navigator)) return;
  if (isBlockedContext()) {
    void unregisterAppSW();
    return;
  }
  // Com skipWaiting/clientsClaim o SW novo assume a aba, mas o JS antigo continua em memória.
  // Recarrega uma única vez para o visitante já usar o deploy novo.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(SW_URL, { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        const check = () => void reg.update().catch(() => {});
        setInterval(check, UPDATE_INTERVAL_MS);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
      })
      .catch(() => {
        /* ignore */
      });
  });
}
