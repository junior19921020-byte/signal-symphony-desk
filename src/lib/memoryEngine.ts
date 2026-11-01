export interface MemoryNote { id: string; title: string; body: string; kind: "trade" | "asset" | "agent" | "note"; createdAt: number }
export interface GraphNode { id: string; label: string; kind: MemoryNote["kind"] | "ghost"; pnl?: number | undefined }
export interface GraphLink { source: string; target: string }

const KEY = "td_second_brain";
const MAX_NOTES = 200;
const listeners = new Set<() => void>();

export function extractWikilinks(text: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const t = (m[1] ?? "").trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

function read(): MemoryNote[] {
  if (typeof window === "undefined") return [];
  try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as MemoryNote[]) : []; } catch { return []; }
}
function write(n: MemoryNote[]) {
  try { localStorage.setItem(KEY, JSON.stringify(n.slice(-MAX_NOTES))); } catch { /* */ }
  listeners.forEach((l) => l());
}

function ensure(notes: MemoryNote[], title: string, kind: MemoryNote["kind"], body: string) {
  if (!notes.some((n) => n.title === title)) notes.push({ id: `${kind}-${title}`, title, body, kind, createdAt: Date.now() });
}

export interface TradeMemoryInput { id: string; symbol: string; side: string; entry: number; exit: number; pnl: number; result: string; agent?: string }

export const MemoryEngine = {
  list: read,
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  addNote(title: string, body: string, kind: MemoryNote["kind"] = "note") {
    const notes = read();
    notes.push({ id: `${kind}-${Date.now()}-${notes.length}`, title, body, kind, createdAt: Date.now() });
    write(notes);
  },
  recordTradeMemory(t: TradeMemoryInput) {
    const notes = read();
    const agent = t.agent || "Max Trader";
    ensure(notes, t.symbol, "asset", `Ativo negociado na mesa. Executor: [[${agent}]]`);
    ensure(notes, agent, "agent", "Agente Executor de Ordens.");
    const gain = t.pnl >= 0;
    const title = `${gain ? "Gain" : "Loss"} ${t.side} ${t.symbol} #${t.id.slice(-4)}`;
    if (notes.some((n) => n.title === title)) return;
    notes.push({
      id: `trade-${t.id}`, title, kind: "trade", createdAt: Date.now(),
      body: `${gain ? "Gain" : "Loss"} de ${t.pnl.toFixed(2)} USDT em [[${t.symbol}]] executado por [[${agent}]]. Entrada ${t.entry.toFixed(2)} → saída ${t.exit.toFixed(2)} (${t.result}). [[${gain ? "Gains" : "Losses"}]]`,
    });
    write(notes);
  },
  clear() { write([]); },
  buildGraph(notes: MemoryNote[]): { nodes: GraphNode[]; links: GraphLink[] } {
    const nodes = new Map<string, GraphNode>();
    const links: GraphLink[] = [];
    notes.forEach((n) => {
      const pnl = n.kind === "trade" ? Number(/de (-?[\d.]+) USDT/.exec(n.body)?.[1] ?? 0) : undefined;
      nodes.set(n.title, { id: n.title, label: n.title, kind: n.kind, pnl });
    });
    notes.forEach((n) => extractWikilinks(n.body).forEach((t) => {
      if (!nodes.has(t)) nodes.set(t, { id: t, label: t, kind: "ghost" });
      if (t !== n.title) links.push({ source: n.title, target: t });
    }));
    return { nodes: [...nodes.values()], links };
  },
};
