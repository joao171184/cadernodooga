export type AdConsent = "granted" | "denied";

const KEY = "ads-consent";
const EVENT = "ads-consent-change";

export function getAdConsent(): AdConsent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setAdConsent(value: AdConsent | null) {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    /* modo privado */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function onAdConsentChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
