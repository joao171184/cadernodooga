import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-2 rounded-full border border-border/60 bg-card/90 px-4 py-2 text-xs font-bold uppercase tracking-wide text-foreground shadow-lg backdrop-blur"
    >
      <WifiOff size={14} className="text-primary" />
      MODO OFFLINE
    </div>
  );
}
