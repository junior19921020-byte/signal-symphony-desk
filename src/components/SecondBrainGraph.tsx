import { useEffect, useRef, useState } from "react";
import { MemoryEngine, type GraphNode, type MemoryNote } from "@/lib/memoryEngine";

interface SimNode extends GraphNode { x: number; y: number; vx: number; vy: number }

const COLORS: Record<string, string> = { asset: "#d4af37", agent: "#22c55e", note: "#60a5fa", ghost: "#64748b" };
const colorOf = (n: GraphNode) => (n.kind === "trade" ? ((n.pnl ?? 0) >= 0 ? "#4ade80" : "#f87171") : COLORS[n.kind] ?? "#94a3b8");

export function SecondBrainGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [picked, setPicked] = useState<string>("");
  const [draft, setDraft] = useState("");

  useEffect(() => { setNotes(MemoryEngine.list()); return MemoryEngine.subscribe(() => setNotes(MemoryEngine.list())); }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = 380;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const g = MemoryEngine.buildGraph(notes);
    const nodes: SimNode[] = g.nodes.map((n, i) => ({ ...n, x: W / 2 + Math.cos(i) * 80 + (i % 7) * 3, y: H / 2 + Math.sin(i) * 80, vx: 0, vy: 0 }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const deg = new Map<string, number>();
    g.links.forEach((l) => { deg.set(l.source, (deg.get(l.source) ?? 0) + 1); deg.set(l.target, (deg.get(l.target) ?? 0) + 1); });
    const radius = (n: SimNode) => 4 + Math.min(10, Math.sqrt(deg.get(n.id) ?? 0) * 2.5);

    let drag: SimNode | null = null, hover: SimNode | null = null, raf = 0;
    const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const hit = (x: number, y: number) => nodes.find((n) => (n.x - x) ** 2 + (n.y - y) ** 2 < (radius(n) + 6) ** 2) ?? null;
    const down = (e: PointerEvent) => { const p = pos(e); drag = hit(p.x, p.y); if (drag) { setPicked(drag.id); cv.setPointerCapture(e.pointerId); } };
    const move = (e: PointerEvent) => { const p = pos(e); if (drag) { drag.x = p.x; drag.y = p.y; drag.vx = drag.vy = 0; } else hover = hit(p.x, p.y); };
    const up = () => { drag = null; };
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up);

    const tick = () => {
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]!;
          const dx = a.x - b.x, dy = a.y - b.y, d2 = Math.max(dx * dx + dy * dy, 25);
          const f = 900 / d2, d = Math.sqrt(d2);
          a.vx += (dx / d) * f; a.vy += (dy / d) * f; b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
        }
        a.vx += (W / 2 - a.x) * 0.002; a.vy += (H / 2 - a.y) * 0.002;
      }
      g.links.forEach((l) => {
        const a = byId.get(l.source), b = byId.get(l.target);
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - 70) * 0.01;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f; b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      });
      nodes.forEach((n) => {
        if (n === drag) return;
        n.vx *= 0.85; n.vy *= 0.85; n.x += n.vx; n.y += n.vy;
        n.x = Math.max(10, Math.min(W - 10, n.x)); n.y = Math.max(10, Math.min(H - 10, n.y));
      });

      ctx.clearRect(0, 0, W, H);
      const focus = hover ?? drag;
      const linked = new Set<string>();
      if (focus) g.links.forEach((l) => { if (l.source === focus.id) linked.add(l.target); if (l.target === focus.id) linked.add(l.source); });
      g.links.forEach((l) => {
        const a = byId.get(l.source), b = byId.get(l.target);
        if (!a || !b) return;
        const on = focus && (a === focus || b === focus);
        ctx.strokeStyle = on ? "rgba(212,175,55,0.9)" : "rgba(148,163,184,0.25)";
        ctx.lineWidth = on ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      nodes.forEach((n) => {
        const dim = focus && n !== focus && !linked.has(n.id);
        ctx.globalAlpha = dim ? 0.25 : 1;
        ctx.fillStyle = colorOf(n);
        ctx.beginPath(); ctx.arc(n.x, n.y, radius(n), 0, Math.PI * 2); ctx.fill();
        if (!dim && (n.kind !== "trade" || n === focus || nodes.length < 25)) {
          ctx.fillStyle = "#cbd5e1"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label, n.x, n.y + radius(n) + 11);
        }
        ctx.globalAlpha = 1;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); };
  }, [notes]);

  const sel = notes.find((n) => n.title === picked);
  const backlinks = picked ? notes.filter((n) => n.body.includes(`[[${picked}]]`)) : [];

  return (
    <section className="mt-4 space-y-3">
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-1">
        <canvas ref={canvasRef} className="block h-[380px] w-full touch-none" />
      </div>
      {notes.length === 0 && <p className="text-center text-sm text-slate-400">Nenhuma memória ainda. Feche uma ordem na conta demo para criar o primeiro nó.</p>}
      <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
        <span><b className="text-[#4ade80]">●</b> Gain</span><span><b className="text-[#f87171]">●</b> Loss</span>
        <span><b className="text-[#d4af37]">●</b> Ativo</span><span><b className="text-[#22c55e]">●</b> Agente</span><span><b className="text-[#60a5fa]">●</b> Nota</span>
      </div>
      {picked && (
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm">
          <p className="font-bold text-[#d4af37]">{picked}</p>
          {sel && <p className="mt-1 text-slate-300">{sel.body}</p>}
          <p className="mt-2 text-xs text-slate-400">Backlinks: {backlinks.length ? backlinks.slice(-20).map((b) => b.title).join(", ") : "nenhum"}</p>
        </div>
      )}
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Nova nota com [[wikilinks]]..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
        <button onClick={() => { const t = draft.trim(); if (!t) return; MemoryEngine.addNote(t.replace(/\[\[|\]\]/g, "").slice(0, 40), t); setDraft(""); }}
          className="rounded-lg bg-[#d4af37] px-3 text-sm font-bold text-slate-900">Salvar</button>
      </div>
    </section>
  );
}
