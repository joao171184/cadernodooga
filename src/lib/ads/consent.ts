export type AdConsent = "granted" | "denied";

const KEY = "parceiro-preferencia";
const LEGACY_KEY = "ads-consent";
const EVENT = "parceiro-preferencia-change";

export function getAdConsent(): AdConsent | null {
  try {
    const v = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (v === "granted" || v === "denied") {
      if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, v);
      return v;
    }
    return null;
  } catch {
    return null;
  }
}

export function setAdConsent(value: AdConsent | null) {
  try {
    if (value) {
      localStorage.setItem(KEY, value);
      localStorage.removeItem(LEGACY_KEY);
    } else {
      localStorage.removeItem(KEY);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    /* modo privado */
  }
  window.dispatchEvent(new Event(EVENT));
  window.dispatchEvent(new Event("ads-consent-change"));
}

export function onAdConsentChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("ads-consent-change", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("ads-consent-change", cb);
  };
}
