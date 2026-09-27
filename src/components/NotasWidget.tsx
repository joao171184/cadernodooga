import { useCallback, useEffect, useRef, useState } from "react";
import { NotebookPen, Minus, X, GripHorizontal, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Win = { open: boolean; minimized: boolean; x: number; y: number; w: number; h: number };
const MIN_W = 260;
const MIN_H = 180;
const HINT_KEY = "notas-resize-hint";

const clampWin = (s: Win): Win => {
  const vv = window.visualViewport;
  const vw = vv?.width ?? window.innerWidth, vh = vv?.height ?? window.innerHeight;
  const w = Math.max(Math.min(MIN_W, vw - 16), Math.min(s.w, vw - 16));
  const h = Math.max(Math.min(MIN_H, vh - 16), Math.min(s.h, vh - 16));
  const x = Math.max(8, Math.min(s.x, vw - w - 8));
  const y = Math.max(8, Math.min(s.y, vh - h - 8));
  return { ...s, w, h, x, y };
};

const defaultWin = (): Win => {
  const w = Math.min(340, window.innerWidth - 24);
  const h = Math.min(380, window.innerHeight - 200);
  return { open: false, minimized: false, w, h, x: window.innerWidth - w - 12, y: Math.max(70, window.innerHeight - h - 160) };
};

/** Botão redondo (mesmo padrão do auto-scroll). Retorna null se não tiver permissão. */
export function NotasWidget() {
  const { user, role, isAdmin } = useAuth();
  const allowed = !!user && (role === "oga" || isAdmin);
  const prefKey = user ? `notas-win:${user.id}` : "";

  const [win, setWin] = useState<Win>(() => defaultWin());
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const gesturing = useRef(false);
  const [hint, setHint] = useState(false);

  // carrega prefs + conteúdo
  useEffect(() => {
    if (!allowed || !user) return;
    try {
      const raw = localStorage.getItem(prefKey);
      if (raw) setWin(clampWin({ ...defaultWin(), ...JSON.parse(raw) }));
    } catch {}
    setLoaded(false);
    supabase.from("user_notas").select("content").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { setContent(data?.content ?? ""); setLoaded(true); });
  }, [allowed, user, prefKey]);

  useEffect(() => {
    if (allowed && prefKey && !gesturing.current) localStorage.setItem(prefKey, JSON.stringify(win));
  }, [win, allowed, prefKey]);

  useEffect(() => {
    const onResize = () => setWin((s) => clampWin(s));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const persist = useCallback(async (text: string) => {
    if (!user) return;
    setSaving(true);
    await supabase.from("user_notas").upsert({ user_id: user.id, content: text }, { onConflict: "user_id" });
    setSaving(false);
  }, [user]);

  const onChange = (text: string) => {
    setContent(text);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => persist(text), 600);
  };

  // arrastar / redimensionar
  const startPointer = (e: React.PointerEvent, mode: "move" | "e" | "s" | "w" | "se" | "sw") => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    try { el.setPointerCapture(e.pointerId); } catch {}
    gesturing.current = true;
    if (mode !== "move" && hint) { setHint(false); localStorage.setItem(HINT_KEY, "1"); }
    const sx = e.clientX, sy = e.clientY;
    const start = { ...win };
    document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      ev.preventDefault();
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let n = { ...start };
      if (mode === "move") { n.x = start.x + dx; n.y = start.y + dy; }
      if (mode.includes("e")) n.w = start.w + dx;
      if (mode.includes("s")) n.h = start.h + dy;
      if (mode.includes("w")) {
        const w = Math.max(MIN_W, start.w - dx);
        n.x = start.x + (start.w - w); n.w = w;
      }
      if (mode !== "move") {
        // não deixa o redimensionamento empurrar a janela
        const c = clampWin(n);
        if (!mode.includes("w")) c.x = start.x;
        c.y = start.y;
        const vv = window.visualViewport;
        const vw = vv?.width ?? window.innerWidth, vh = vv?.height ?? window.innerHeight;
        c.w = Math.min(c.w, vw - c.x - 8);
        c.h = Math.min(c.h, vh - c.y - 8);
        setWin(c);
        return;
      }
      setWin(clampWin(n));
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      document.body.style.userSelect = "";
      try { el.releasePointerCapture(e.pointerId); } catch {}
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      gesturing.current = false;
      setWin((s) => { if (prefKey) localStorage.setItem(prefKey, JSON.stringify(s)); return s; });
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  useEffect(() => {
    if (win.open && !win.minimized && !localStorage.getItem(HINT_KEY)) setHint(true);
  }, [win.open, win.minimized]);

  if (!allowed) return null;

  const btnCls = (active: boolean) =>
    `w-12 h-12 rounded-full shadow-2xl border-2 flex items-center justify-center transition-all active:scale-95 ${
      active ? "bg-accent text-accent-foreground border-accent" : "bg-card text-foreground border-border hover:border-accent/50"
    }`;

  return (
    <>
      <button
        onClick={() => setWin((s) => clampWin(s.open && !s.minimized ? { ...s, open: false } : { ...s, open: true, minimized: false }))}
        aria-label="Notas"
        title={win.open && win.minimized ? "Restaurar notas" : "Notas"}
        className={btnCls(win.open)}
      >
        <NotebookPen size={20} />
      </button>

      {win.open && !win.minimized && (
        <div
          className="fixed z-50 flex flex-col bg-card border-2 border-border rounded-2xl shadow-2xl overflow-hidden"
          style={{ left: win.x, top: win.y, width: win.w, height: win.h }}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40 select-none">
            <div
              onPointerDown={(e) => startPointer(e, "move")}
              className="p-1 -ml-1 rounded cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
              aria-label="Arrastar janela"
              title="Arrastar"
            >
              <GripHorizontal size={18} />
            </div>
            <span className="font-display font-bold uppercase text-sm tracking-wider text-foreground flex-1">Notas</span>
            {content && (
              <button onClick={() => setConfirm(true)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground" aria-label="Apagar todas as notas" title="Apagar todas as notas">
                <Trash2 size={15} />
              </button>
            )}
            {saving && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            <button onClick={() => setWin((s) => ({ ...s, minimized: true }))} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground" aria-label="Minimizar" title="Minimizar">
              <Minus size={16} />
            </button>
            <button onClick={() => setWin((s) => ({ ...s, open: false }))} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground" aria-label="Fechar" title="Fechar">
              <X size={16} />
            </button>
          </div>

          <div className="relative flex-1 min-h-0">
            <textarea
              value={content}
              onChange={(e) => onChange(e.target.value)}
              disabled={!loaded}
              placeholder={loaded ? "Escreva suas anotações..." : "Carregando..."}
              className="w-full h-full resize-none bg-transparent px-4 pt-3 pb-6 text-base text-foreground placeholder:text-muted-foreground focus:outline-none leading-7"
              style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, hsl(var(--border)) 28px)", backgroundPositionY: "12px" }}
            />
          </div>

          {hint && (
            <div className="absolute bottom-8 right-8 max-w-[70%] rounded-lg bg-foreground text-background text-xs px-2.5 py-1.5 shadow-lg pointer-events-none">
              Arraste o canto da janela para alterar o tamanho.
            </div>
          )}

          {/* alças de redimensionamento (área de toque ≥ 24px) */}
          <div onPointerDown={(e) => startPointer(e, "e")} className="absolute right-0 top-12 bottom-7 cursor-ew-resize touch-none" style={{ width: 14 }} />
          <div onPointerDown={(e) => startPointer(e, "w")} className="absolute left-0 top-12 bottom-7 cursor-ew-resize touch-none" style={{ width: 14 }} />
          <div onPointerDown={(e) => startPointer(e, "s")} className="absolute bottom-0 left-7 right-7 cursor-ns-resize touch-none" style={{ height: 16 }} />
          <div onPointerDown={(e) => startPointer(e, "sw")} className="absolute bottom-0 left-0 w-7 h-7 cursor-nesw-resize touch-none" />
          <div onPointerDown={(e) => startPointer(e, "se")} className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize touch-none flex items-end justify-end p-1 text-muted-foreground" aria-label="Redimensionar" title="Redimensionar">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="13" y1="4" x2="4" y2="13" /><line x1="13" y1="8" x2="8" y2="13" /><line x1="13" y1="12" x2="12" y2="13" />
            </svg>
          </div>
        </div>
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar notas</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja apagar todas as suas notas? Essa ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (saveTimer.current) window.clearTimeout(saveTimer.current); setContent(""); persist(""); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar notas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
