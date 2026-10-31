import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { OfficeMap, ROOMS, statusFor, type Agent } from "@/components/OfficeMap";
import { buildMarket, fmt, localAnswer, type Market, type Side } from "@/lib/trading";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TRADING DESK - Escritório de Agentes" },
      { name: "description", content: "Escritório isométrico de agentes de trading com dados reais da Binance e conta demo." },
      { property: "og:title", content: "TRADING DESK - Escritório de Agentes" },
      { property: "og:description", content: "Agentes de IA analisam a Binance ao vivo e operam numa conta demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

interface Msg { from: "user" | "agent"; text: string }
interface Position { id: string; symbol: string; side: Side; entry: number; sl: number; tp: number; qty: number }
interface Trade { id: string; side: Side; entry: number; exit: number; pnl: number; result: "TP" | "SL" }
interface Settings { apiKey: string; symbol: string; bank: number }

const DEFAULT_AGENTS: Agent[] = [
  { id: "ana", name: "Ana News", role: "Analista de Notícias", room: 0, color: "#3b82f6", hair: "#7c2d12", prompt: "Você é Ana News, analista de notícias e contexto de mercado cripto." },
  { id: "sofia", name: "Sofia Quant", role: "Analista Gráfica", room: 1, color: "#a855f7", hair: "#111827", prompt: "Você é Sofia Quant, analista gráfica especialista em RSI e EMAs." },
  { id: "rita", name: "Rita Risk", role: "Diretora de Risco", room: 2, color: "#ef4444", hair: "#eab308", prompt: "Você é Rita Risk, diretora de risco. Sempre arrisque no máximo 1% da banca." },
  { id: "max", name: "Max Trader", role: "Executor de Ordens", room: 3, color: "#22c55e", hair: "#451a03", prompt: "Você é Max Trader, executor de ordens disciplinado." },
];
const ROLES = ["Analista de Notícias", "Analista Gráfica", "Diretora de Risco", "Executor de Ordens"];
const COLORS = ["#f97316", "#06b6d4", "#ec4899", "#84cc16", "#eab308", "#6366f1"];
const NAMES = ["Leo", "Bia", "Caio", "Duda", "Enzo", "Lara", "Theo", "Nina", "Rafa", "Iris", "Gabi", "Hugo"];
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];
const AUTO: Record<string, number> = { manual: 0, "1m": 60, "5m": 300, "15m": 900 };

function load<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
}
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } }

function Index() {
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [settings, setSettings] = useState<Settings>({ apiKey: "", symbol: "BTCUSDT", bank: 10000 });
  const [balance, setBalance] = useState<number>(10000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [market, setMarket] = useState<Market | null>(null);
  const [live, setLive] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [auto, setAuto] = useState("manual");
  const [count, setCount] = useState(0);
  const [chart, setChart] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [chats, setChats] = useState<Record<string, Msg[]>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAgents(load("td_agents", DEFAULT_AGENTS));
    const s = load<Settings>("td_settings", { apiKey: "", symbol: "BTCUSDT", bank: 10000 });
    setSettings(s);
    setBalance(load("td_balance", s.bank));
    setPositions(load("td_positions", []));
    setTrades(load("td_trades", []));
    setReady(true);
  }, []);
  useEffect(() => { if (ready) save("td_agents", agents); }, [agents, ready]);
  useEffect(() => { if (ready) save("td_balance", balance); }, [balance, ready]);
  useEffect(() => { if (ready) save("td_positions", positions); }, [positions, ready]);
  useEffect(() => { if (ready) save("td_trades", trades); }, [trades, ready]);

  const runCycle = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${settings.symbol}&interval=15m&limit=40`);
      const data = (await r.json()) as unknown;
      if (Array.isArray(data)) {
        const closes = data.map((k: unknown) => Number((k as unknown[])[4] || 0));
        const m = buildMarket(settings.symbol, closes, settings.bank);
        setMarket(m);
        setLive(m.price);
      } else setError("Resposta inválida da Binance.");
    } catch {
      setError("Não foi possível acessar a Binance agora.");
    }
    setLoading(false);
  }, [settings.symbol, settings.bank]);

  const runRef = useRef(runCycle);
  useEffect(() => { runRef.current = runCycle; }, [runCycle]);

  // Piloto automático
  useEffect(() => {
    const total = AUTO[auto] || 0;
    setCount(total);
    if (!total) return;
    const id = setInterval(() => {
      setCount((c) => {
        if (c <= 1) { void runRef.current(); return total; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [auto]);

  // Preço ao vivo a cada 5s
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${settings.symbol}`);
        const d = (await r.json()) as { price?: string };
        const p = Number(d.price || 0);
        if (alive && p > 0) setLive(p);
      } catch { /* silencioso */ }
    };
    void tick();
    const id = setInterval(() => void tick(), 5000);
    return () => { alive = false; clearInterval(id); };
  }, [settings.symbol]);

  // Fechamento automático TP/SL
  useEffect(() => {
    if (!live) return;
    const closing: Trade[] = [];
    const keep: Position[] = [];
    for (const p of positions) {
      if (p.symbol !== settings.symbol) { keep.push(p); continue; }
      const hitTp = p.side === "COMPRA" ? live >= p.tp : live <= p.tp;
      const hitSl = p.side === "COMPRA" ? live <= p.sl : live >= p.sl;
      if (hitTp || hitSl) {
        const exit = hitTp ? p.tp : p.sl;
        const pnl = (p.side === "COMPRA" ? exit - p.entry : p.entry - exit) * p.qty;
        closing.push({ id: p.id, side: p.side, entry: p.entry, exit, pnl, result: hitTp ? "TP" : "SL" });
      } else keep.push(p);
    }
    if (closing.length) {
      setPositions(keep);
      setTrades((t) => [...t, ...closing].slice(-20));
      setBalance((b) => b + closing.reduce((s, c) => s + c.pnl, 0));
    }
  }, [live, positions, settings.symbol]);

  const execute = () => {
    if (!market) return;
    const qty = market.risk / (market.price * 0.0032);
    setPositions((ps) => [...ps, { id: String(Date.now()), symbol: market.symbol, side: market.signal, entry: market.price, sl: market.sl, tp: market.tp, qty }].slice(-20));
  };

  const hire = () => {
    const room = [0, 1, 2, 3].find((r) => agents.filter((a) => a.room === r).length < 4);
    if (room === undefined) return;
    const n = agents.length;
    const name = `${NAMES[n % NAMES.length]} ${(ROOMS[room] ?? "").split(" ")[0]}`;
    setAgents((as) => [...as, { id: `a${Date.now()}`, name, role: ROLES[room] ?? "", room, color: COLORS[n % COLORS.length] ?? "#f97316", hair: n % 2 ? "#1c1917" : "#a16207", prompt: `Você é ${name}, ${ROLES[room]} da mesa de operações.` }]);
  };

  const floating = positions.filter((p) => p.symbol === settings.symbol).reduce((s, p) => s + (p.side === "COMPRA" ? live - p.entry : p.entry - live) * p.qty, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;
  const full = agents.length >= 16;

  return (
    <div className="w-full max-w-md mx-auto px-3 pt-4 pb-24 overflow-x-hidden bg-[#0b0e14] text-slate-100 min-h-screen">
      <header className="text-center">
        <h1 className="text-3xl font-black tracking-widest text-[#d4af37]">TRADING DESK</h1>
        <p className="text-lg font-semibold">Escritório de Agentes</p>
        <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900 py-2 text-sm text-slate-300">18º Andar • Mesa de Operações</div>
      </header>

      <section className="mt-4 space-y-2">
        {ROOMS.map((r, i) => {
          const list = agents.filter((a) => a.room === i);
          return (
            <div key={r} className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
              <div className="flex justify-between text-sm font-bold"><span>{i + 1}) {r}</span><span className="text-[#d4af37]">{list.length}/4</span></div>
              <div className="mt-1 flex flex-wrap gap-1">
                {list.map((a) => (
                  <button key={a.id} onClick={() => setSelected(a)} className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700">
                    <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: a.color }} />{a.name} — {a.role}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <button onClick={hire} disabled={full} className="w-full rounded-lg bg-yellow-400 py-2 font-bold text-slate-900 disabled:opacity-50">
          {full ? "Escritório lotado" : "+ Contratar Funcionário"}
        </button>
      </section>

      <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-1">
        <OfficeMap agents={agents} market={market} onSelect={setSelected} />
      </section>

      <section className="mt-4 space-y-2">
        <button onClick={() => void runCycle()} disabled={loading} className="w-full rounded-lg bg-green-500 py-3 font-bold text-slate-900 disabled:opacity-60">
          {loading ? "Buscando dados..." : "▶ Rodar Ciclo de Operação"}
        </button>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)} className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2 text-sm">⚙ Configurações Globais</button>
          <select value={auto} onChange={(e) => setAuto(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-2 text-sm">
            <option value="manual">Piloto: Manual</option><option value="1m">Piloto: 1m</option><option value="5m">Piloto: 5m</option><option value="15m">Piloto: 15m</option>
          </select>
        </div>
        {auto !== "manual" && <p className="text-center text-xs text-slate-400">Próximo ciclo em {Math.floor(count / 60)}:{String(count % 60).padStart(2, "0")}</p>}
        {error && <p className="text-center text-xs text-red-400">{error}</p>}
      </section>

      {market && (
        <section className={`mt-4 rounded-xl border-2 p-3 ${market.signal === "COMPRA" ? "border-green-500 bg-green-950/40" : "border-red-500 bg-red-950/40"}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#d4af37]">SINAL APROVADO • {market.symbol}</span>
            <span className={`rounded px-2 py-0.5 text-sm font-black ${market.signal === "COMPRA" ? "bg-green-500 text-slate-900" : "bg-red-500"}`}>{market.signal}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Preço {fmt(market.price)} • Variação {fmt(market.change)}%</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>Entrada: <b>{fmt(market.price)}</b></div><div>RSI14: <b>{fmt(market.rsi, 1)}</b></div>
            <div className="text-red-400">Stop: <b>{fmt(market.sl)}</b></div><div className="text-green-400">Take: <b>{fmt(market.tp)}</b></div>
            <div>EMA9: <b>{fmt(market.ema9)}</b></div><div>EMA21: <b>{fmt(market.ema21)}</b></div>
            <div className="col-span-2">Risco: <b>{fmt(market.risk)} USDT</b> (1% da banca)</div>
          </div>
          <p className="mt-2 text-xs text-slate-300">
            {market.signal === "COMPRA"
              ? `EMA9 (${fmt(market.ema9)}) ≥ EMA21 (${fmt(market.ema21)}) indica tendência de alta e RSI ${fmt(market.rsi, 1)} < 70 mostra espaço para subir. Stop 0.32% e alvo 0.64% (2:1).`
              : `${market.ema9 < market.ema21 ? `EMA9 (${fmt(market.ema9)}) < EMA21 (${fmt(market.ema21)}) indica tendência de baixa` : `RSI ${fmt(market.rsi, 1)} ≥ 70 indica sobrecompra`}. Operação vendida com stop 0.32% e alvo 0.64% (2:1).`}
          </p>
          <button onClick={execute} className="mt-3 w-full rounded-lg bg-[#d4af37] py-2 font-bold text-slate-900">Executar na Conta Demo ✓</button>
        </section>
      )}

      <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <h2 className="font-bold text-[#d4af37]">Posições Abertas & Histórico de Trades</h2>
        <p className="text-xs text-slate-400">{settings.symbol} ao vivo: {fmt(live)}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded bg-slate-800 p-2">Saldo Realizado<br /><b>{fmt(balance)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">Patrimônio<br /><b>{fmt(balance + floating)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">P&L Flutuante<br /><b className={floating >= 0 ? "text-green-400" : "text-red-400"}>{fmt(floating)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">Win Rate<br /><b>{fmt(winRate, 1)}%</b> ({trades.length})</div>
        </div>
        <div className="mt-3 space-y-1">
          {positions.length === 0 && <p className="text-xs text-slate-500">Nenhuma posição aberta.</p>}
          {positions.map((p) => {
            const pnl = p.symbol === settings.symbol ? (p.side === "COMPRA" ? live - p.entry : p.entry - live) * p.qty : 0;
            return (
              <div key={p.id} className="rounded border border-slate-700 p-2 text-xs">
                <div className="flex justify-between"><b className={p.side === "COMPRA" ? "text-green-400" : "text-red-400"}>{p.side} {p.symbol}</b><b className={pnl >= 0 ? "text-green-400" : "text-red-400"}>{fmt(pnl)} USDT</b></div>
                <div className="text-slate-400">Entrada {fmt(p.entry)} • SL {fmt(p.sl)} • TP {fmt(p.tp)} • Qtd {fmt(p.qty, 5)}</div>
              </div>
            );
          })}
        </div>
        {trades.length > 0 && (
          <div className="mt-3 space-y-1">
            {trades.slice().reverse().map((t) => (
              <div key={t.id} className="flex justify-between text-xs text-slate-300">
                <span>{t.side} {fmt(t.entry)} → {fmt(t.exit)} ({t.result})</span>
                <b className={t.pnl >= 0 ? "text-green-400" : "text-red-400"}>{fmt(t.pnl)}</b>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-4">
        <button onClick={() => setChart((c) => !c)} className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 text-sm">
          {chart ? "▲ Fechar Gráfico" : "▼ Abrir Gráfico TradingView"}
        </button>
        {chart && (
          <iframe title="TradingView" className="mt-2 h-80 w-full rounded-lg border-0"
            src={`https://s.tradingview.com/widgetembed/?symbol=BINANCE:${settings.symbol}&interval=15&theme=dark&style=1&locale=br`} />
        )}
      </section>

      {showSettings && (
        <SettingsModal settings={settings} onClose={() => setShowSettings(false)} onSave={(s) => {
          setSettings(s); save("td_settings", s);
          if (s.bank !== settings.bank) setBalance(s.bank);
          setShowSettings(false);
        }} />
      )}

      {selected && (
        <ChatModal
          agent={agents.find((a) => a.id === selected.id) || selected}
          market={market}
          apiKey={settings.apiKey}
          messages={chats[selected.id] || []}
          setMessages={(fn) => setChats((c) => ({ ...c, [selected.id]: fn(c[selected.id] || []).slice(-20) }))}
          onPrompt={(prompt) => setAgents((as) => as.map((a) => (a.id === selected.id ? { ...a, prompt } : a)))}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function SettingsModal({ settings, onSave, onClose }: { settings: Settings; onSave: (s: Settings) => void; onClose: () => void }) {
  const [s, setS] = useState<Settings>(settings);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-slate-900 p-4 pb-16 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-[#d4af37]">⚙ Configurações Globais</h3>
        <label className="mt-3 block text-xs text-slate-400">API Key do Gemini (AQ... ou AIza...)</label>
        <input value={s.apiKey} onChange={(e) => setS({ ...s, apiKey: e.target.value.trim() })} className="w-full rounded bg-slate-800 p-2 text-sm" placeholder="Opcional" />
        <label className="mt-3 block text-xs text-slate-400">Ativo</label>
        <select value={s.symbol} onChange={(e) => setS({ ...s, symbol: e.target.value })} className="w-full rounded bg-slate-800 p-2 text-sm">
          {SYMBOLS.map((x) => <option key={x}>{x}</option>)}
        </select>
        <label className="mt-3 block text-xs text-slate-400">Banca Inicial (USDT)</label>
        <input type="number" value={s.bank} onChange={(e) => setS({ ...s, bank: Number(e.target.value || 0) })} className="w-full rounded bg-slate-800 p-2 text-sm" />
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded bg-slate-700 py-2">Cancelar</button>
          <button onClick={() => onSave(s)} className="flex-1 rounded bg-yellow-400 py-2 font-bold text-slate-900">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function ChatModal({ agent, market, apiKey, messages, setMessages, onPrompt, onClose }: {
  agent: Agent; market: Market | null; apiKey: string; messages: Msg[];
  setMessages: (fn: (m: Msg[]) => Msg[]) => void; onPrompt: (p: string) => void; onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async () => {
    const q = text.trim();
    if (!q || busy) return;
    setText("");
    setMessages((m) => [...m, { from: "user", text: q }]);
    setBusy(true);
    let answer = "";
    if (apiKey) {
      try {
        const ctx = market
          ? `Dados ao vivo ${market.symbol}: preço ${fmt(market.price)}, variação ${fmt(market.change)}%, RSI14 ${fmt(market.rsi, 1)}, EMA9 ${fmt(market.ema9)}, EMA21 ${fmt(market.ema21)}, sinal ${market.signal}, stop ${fmt(market.sl)}, take ${fmt(market.tp)}, risco ${fmt(market.risk)} USDT.`
          : "Sem dados de mercado ainda.";
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: `${agent.prompt}\n${ctx}\nResponda em português, curto e objetivo.\nPergunta: ${q}` }] }] }),
        });
        if (r.ok) {
          const d = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
          answer = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      } catch { /* fallback local */ }
    }
    if (!answer) answer = localAnswer(q, agent.name, agent.role, market);
    setMessages((m) => [...m, { from: "agent", text: answer }]);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-2xl bg-slate-900 p-4 pb-16 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold" style={{ color: agent.color }}>{agent.name}</h3>
            <p className="text-xs text-slate-400">{agent.role} • {statusFor(agent, market)}</p>
          </div>
          <button onClick={onClose} className="rounded bg-slate-800 px-3 py-1">✕</button>
        </div>
        <label className="mt-2 text-xs text-slate-400">System Prompt</label>
        <textarea value={agent.prompt} onChange={(e) => onPrompt(e.target.value)} rows={2} className="rounded bg-slate-800 p-2 text-xs" />
        <div className="mt-2 min-h-32 flex-1 space-y-2 overflow-y-auto rounded bg-slate-950 p-2">
          {messages.length === 0 && <p className="text-xs text-slate-500">Pergunte: "Posso comprar?", "Qual o stop?", "Como está o mercado?"</p>}
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-lg p-2 text-sm ${m.from === "user" ? "ml-auto bg-yellow-400 text-slate-900" : "bg-slate-800"}`}>{m.text}</div>
          ))}
          {busy && <p className="text-xs text-slate-400">{agent.name} está digitando...</p>}
          <div ref={endRef} />
        </div>
        <div className="mt-2 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
            className="min-w-0 flex-1 rounded bg-slate-800 p-2 text-sm" placeholder="Digite sua pergunta..." />
          <button onClick={() => void send()} disabled={busy} className="rounded bg-green-500 px-4 font-bold text-slate-900 disabled:opacity-60">Enviar</button>
        </div>
      </div>
    </div>
  );
}
