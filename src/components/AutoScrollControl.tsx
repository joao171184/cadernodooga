import { useEffect, useRef, useState } from "react";
import { ChevronsDown, Pause, Play } from "lucide-react";

const STORAGE_KEY = "auto-scroll-prefs";

type Prefs = { enabled: boolean; speed: number };

const loadPrefs = (): Prefs => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) return JSON.parse(v);
  } catch {}
  return { enabled: false, speed: 1 };
};

export function AutoScrollControl() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [open, setOpen] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const accRef = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    if (!prefs.enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      // px por segundo: 30 * speed (speed 0.5 → 15px/s, speed 3 → 90px/s)
      accRef.current += (30 * prefs.speed * dt) / 1000;
      if (accRef.current >= 1) {
        const px = Math.floor(accRef.current);
        accRef.current -= px;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const next = Math.min(window.scrollY + px, max);
        window.scrollTo(0, next);
        if (next >= max) {
          setPrefs((p) => ({ ...p, enabled: false }));
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    lastTsRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
    };
  }, [prefs.enabled, prefs.speed]);

  return (
    <div
      className="fixed right-3 sm:right-4 z-40 flex flex-col items-end gap-2 max-w-[calc(100vw-1.5rem)]"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
    >
      {open && (
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 w-[min(16rem,calc(100vw-1.5rem))] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Auto-scroll
            </span>
            <button
              onClick={() => setPrefs((p) => ({ ...p, enabled: !p.enabled }))}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                prefs.enabled
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {prefs.enabled ? "ON" : "OFF"}
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">Velocidade</span>
              <span className="text-[11px] font-bold text-foreground">{prefs.speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.1}
              value={prefs.speed}
              onChange={(e) => setPrefs((p) => ({ ...p, speed: parseFloat(e.target.value) }))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Lento</span>
              <span>Rápido</span>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => {
          if (open) setPrefs((p) => ({ ...p, enabled: !p.enabled }));
          else setOpen(true);
        }}
        onDoubleClick={() => setOpen((o) => !o)}
        title={open ? (prefs.enabled ? "Pausar rolagem" : "Iniciar rolagem") : "Abrir auto-scroll"}
        aria-label="Auto-scroll"
        className={`w-12 h-12 rounded-full shadow-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
          prefs.enabled
            ? "bg-accent text-accent-foreground border-accent animate-pulse"
            : "bg-card text-foreground border-border hover:border-accent/50"
        }`}
      >
        {open ? (
          prefs.enabled ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />
        ) : (
          <ChevronsDown size={20} />
        )}
      </button>
      {open && (
        <button
          onClick={() => setOpen(false)}
          className="text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wider"
        >
          Fechar
        </button>
      )}
    </div>
  );
}
