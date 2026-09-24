import { useCallback, useEffect, useRef, useState } from "react";
import { NotebookPen, Minus, X, GripHorizontal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Win = { open: boolean; minimized: boolean; x: number; y: number; w: number; h: number };
const MIN_W = 240;
const MIN_H = 200;

const clampWin = (s: Win): Win => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.max(MIN_W, Math.min(s.w, vw - 16));
  const h = Math.max(MIN_H, Math.min(s.h, vh - 16));
  const x = Math.max(8, Math.min(s.x, vw - w - 8));
  const y = Math.max(8, Math.min(s.y, vh - Math.min(h, 48) - 8));
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
    if (allowed && prefKey) localStorage.setItem(prefKey, JSON.stringify(win));
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
    const sx = e.clientX, sy = e.clientY;
    const start = { ...win };
    document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let n = { ...start };
      if (mode === "move") { n.x = start.x + dx; n.y = start.y + dy; }
      if (mode.includes("e")) n.w = start.w + dx;
      if (mode.includes("s")) n.h = start.h + dy;
      if (mode.includes("w")) {
        const w = Math.max(MIN_W, start.w - dx);
        n.x = start.x + (start.w - w); n.w = w;
      }
      setWin(clampWin(n));
    };
    const up = () => {
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

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
              className="w-full h-full resize-none bg-transparent p-3 pr-10 text-base text-foreground placeholder:text-muted-foreground focus:outline-none leading-7"
              style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, hsl(var(--border)) 28px)", backgroundPositionY: "12px" }}
            />
            {content && (
              <button
                onClick={() => setConfirm(true)}
                className="absolute right-2 bottom-2 p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Apagar todas as notas"
                title="Apagar todas as notas"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* alças de redimensionamento */}
          <div onPointerDown={(e) => startPointer(e, "e")} className="absolute right-0 top-10 bottom-4 w-2 cursor-ew-resize touch-none" />
          <div onPointerDown={(e) => startPointer(e, "w")} className="absolute left-0 top-10 bottom-4 w-2 cursor-ew-resize touch-none" />
          <div onPointerDown={(e) => startPointer(e, "s")} className="absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize touch-none" />
          <div onPointerDown={(e) => startPointer(e, "sw")} className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize touch-none" />
          <div onPointerDown={(e) => startPointer(e, "se")} className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize touch-none" />
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
