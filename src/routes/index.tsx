import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { OfficeMap, statusFor, type Agent } from "@/components/OfficeMap";
import { fetchMarket, fmt, levels, marketContext, parseIntent, pnlOf, type Market, type Side } from "@/lib/trading";
import { agentChat } from "@/lib/agent.functions";
import { demoOrderRejection } from "@/lib/demoRisk";
import { fetchDemoQuote } from "@/lib/demoQuote";
import { evaluateDemoExits } from "@/lib/demoExits";
import { demoPerformance } from "@/lib/demoPerformance";
import { auditDecision, appendAudit, parseAuditHistory, type DecisionAudit } from "@/lib/decisionAudit";
import { MemoryEngine } from "@/lib/memoryEngine";
import { SecondBrainGraph } from "@/components/SecondBrainGraph";

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
interface Position { id: string; symbol: string; side: Side; entry: number; sl: number; tp: number; qty: number; provenance?: TradeProvenance }
interface TradeProvenance { openedBy: string; openedVia: "MANUAL" | "CHAT" | "AUTOMATICO"; openedAt: number; approvedBy: "Rita Risk"; plannedRisk: number; riskPercent: number; decision: Side }

interface Trade { id: string; side: Side; entry: number; exit: number; pnl: number; result: "TP" | "SL" | "IA" | "MANUAL"; closedAt?: number; provenance?: TradeProvenance }
interface Settings { apiKey: string; symbol: string; bank: number }

const DEFAULT_AGENTS: Agent[] = [
  { id: "ana", name: "Ana News", role: "Analista de Notícias", room: 0, color: "#3b82f6", hair: "#7c2d12", prompt: "Você é Ana News, analista de notícias e contexto de mercado cripto." },
  { id: "sofia", name: "Sofia Quant", role: "Analista Gráfica", room: 1, color: "#a855f7", hair: "#111827", prompt: "Você é Sofia Quant, analista gráfica especialista em RSI e EMAs." },
  { id: "rita", name: "Rita Risk", role: "Diretora de Risco", room: 2, color: "#ef4444", hair: "#eab308", prompt: "Você é Rita Risk, diretora de risco. Sempre arrisque no máximo 1% da banca." },
  { id: "max", name: "Max Trader", role: "Executor de Ordens", room: 3, color: "#22c55e", hair: "#451a03", prompt: "Você é Max Trader, executor de ordens disciplinado." },
];
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
  const [quoteAt, setQuoteAt] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [auto, setAuto] = useState("manual");
  const [count, setCount] = useState(0);
  const [chart, setChart] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [chats, setChats] = useState<Record<string, Msg[]>>({});
  const [ready, setReady] = useState(false);
  const [nextRunAt, setNextRunAt] = useState<number>(0);
  const [log, setLog] = useState<string>("");
  const [audit, setAudit] = useState<DecisionAudit[]>([]);
  const [tab, setTab] = useState<"desk" | "brain">("desk");
  const posRef = useRef<Position[]>([]);
  const liveRef = useRef<number>(0);
  const stopRef = useRef(false);

  useEffect(() => {
    setAgents(load("td_agents", DEFAULT_AGENTS));
    const s = load<Settings>("td_settings", { apiKey: "", symbol: "BTCUSDT", bank: 10000 });
    setSettings(s);
    setBalance(load("td_balance", s.bank));
    setPositions(load("td_positions", []));
    setTrades(load("td_trades", []));
    setAuto(load("td_auto", "manual"));
    setNextRunAt(load("td_next_run", 0));
    try { setAudit(parseAuditHistory(localStorage.getItem("td_decision_audit_v1"))); } catch { setAudit([]); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) save("td_agents", agents); }, [agents, ready]);
  useEffect(() => { if (ready) save("td_balance", balance); }, [balance, ready]);
  useEffect(() => { if (ready) save("td_positions", positions); }, [positions, ready]);
  useEffect(() => { if (ready) save("td_trades", trades); }, [trades, ready]);
  useEffect(() => { if (ready) save("td_auto", auto); }, [auto, ready]);
  useEffect(() => { if (ready) save("td_next_run", nextRunAt); }, [nextRunAt, ready]);
  useEffect(() => { if (ready) save("td_decision_audit_v1", audit); }, [audit, ready]);
  useEffect(() => { posRef.current = positions; }, [positions]);
  useEffect(() => { liveRef.current = live; }, [live]);

  const closePositions = useCallback((ids: string[], price: number, result: Trade["result"]) => {
    if (!ids.length || price <= 0) return;
    const cur = posRef.current;
    const closing = cur.filter((p) => ids.includes(p.id));
    if (!closing.length) return;
    const done: Trade[] = closing.map((p) => ({
      id: p.id, side: p.side, entry: p.entry, exit: price, result, closedAt: Date.now(), provenance: p.provenance,
      pnl: (p.side === "COMPRA" ? price - p.entry : p.entry - price) * p.qty,
    }));
    const keep = cur.filter((p) => !ids.includes(p.id));
    posRef.current = keep;
    setPositions(keep);
    setTrades((t) => [...t, ...done].slice(-50));
    setBalance((b) => b + done.reduce((x, c) => x + c.pnl, 0));
    done.forEach((d) => {
      const p = closing.find((c) => c.id === d.id);
      MemoryEngine.recordTradeMemory({ ...d, symbol: p?.symbol ?? "BTCUSDT", agent: "Max Trader" });
    });
  }, []);

  const runCycle = useCallback(async () => {
    setLoading(true);
    setError("");
    const m = await fetchMarket(settings.symbol, settings.bank);
    if (!m) { setError("Não foi possível ler as velas da Binance agora."); setLoading(false); return; }
    if (stopRef.current) { setLoading(false); return; }
    setMarket(m);
    setLive(m.price);
    setAudit((history) => appendAudit(history, auditDecision(m, autoRef.current === "manual" ? "ANALISE" : "AUTOMATICO")));
    const mine = posRef.current.filter((p) => p.symbol === m.symbol);
    const toClose = !m.riskApproved || m.signal === "AGUARDAR" ? [] : mine.filter((p) => p.side !== m.signal).map((p) => p.id);
    closePositions(toClose, m.price, "IA");
    let adjusted = 0;
    const kept = posRef.current.map((p) => {
      if (p.symbol !== m.symbol) return p;
      const gain = p.side === "COMPRA" ? m.price - p.entry : p.entry - m.price;
      const half = Math.abs(p.tp - p.entry) / 2;
      const beyond = p.side === "COMPRA" ? p.sl < p.entry : p.sl > p.entry;
      if (gain >= half && beyond) { adjusted++; return { ...p, sl: p.entry }; }
      return p;
    });
    if (adjusted) { posRef.current = kept; setPositions(kept); }
    const parts: string[] = [];
    if (toClose.length) parts.push(`${toClose.length} encerrada(s) pela IA (sinal virou ${m.signal})`);
    if (adjusted) parts.push(`${adjusted} stop(s) movido(s) para o ponto de entrada`);
    if (m.signal === "AGUARDAR") parts.push(`AGUARDAR — ${m.riskNote}`);
    else if (kept.some((p) => p.symbol === m.symbol && p.side === m.signal)) parts.push(`mantendo ${m.signal} já aberta, sem ordem repetida`);
    else if (demoOrderRejection(m, m.signal, m.symbol)) parts.push("ordem bloqueada pela validação de risco");
    else if (autoRef.current !== "manual") {
      const side: Side = m.signal;
      const np: Position = { id: String(Date.now()), symbol: m.symbol, side, entry: m.price, sl: m.sl, tp: m.tp, qty: m.qty, provenance: { openedBy: "Max Trader", openedVia: "AUTOMATICO", openedAt: Date.now(), approvedBy: "Rita Risk", plannedRisk: m.risk, riskPercent: 1, decision: side } };
      posRef.current = [...posRef.current, np].slice(-20);
      setPositions(posRef.current);
      parts.push(`nova ${m.signal} aberta pelo Max Trader`);
    }
    setLog(`Revisão da IA: ${parts.length ? parts.join("; ") : "nenhuma posição para revisar"}.`);
    setLoading(false);
  }, [settings.symbol, settings.bank, closePositions]);

  const refreshMarket = useCallback(async () => {
    const m = await fetchMarket(settings.symbol, settings.bank);
    if (m) { setMarket(m); setLive(m.price); }
    return m;
  }, [settings.symbol, settings.bank]);
  const autoRef = useRef(auto);
  useEffect(() => { autoRef.current = auto; }, [auto]);

  const runRef = useRef(runCycle);
  useEffect(() => { runRef.current = runCycle; }, [runCycle]);

  // Piloto automático
  useEffect(() => {
    if (!ready) return;
    const total = AUTO[auto] || 0;
    if (!total) { setCount(0); return; }
    let next = load<number>("td_next_run", 0);
    if (!next || next - Date.now() > total * 1000) { next = Date.now() + total * 1000; setNextRunAt(next); }
    const step = () => {
      const left = Math.ceil((next - Date.now()) / 1000);
      if (left <= 0) {
        next = Date.now() + total * 1000;
        setNextRunAt(next);
        setCount(total);
        stopRef.current = false;
        void runRef.current();
      } else setCount(left);
    };
    step();
    const id = setInterval(step, 1000);
    return () => clearInterval(id);
  }, [auto, ready]);

  // Cotação demo independente do ciclo de análise. Não confundir com proteção no servidor.
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    let pending = false;
    setLive(0);
    setQuoteAt(0);
    const tick = async () => {
      if (pending || !alive) return;
      pending = true;
      try {
        const price = await fetchDemoQuote(settings.symbol);
        if (alive && price !== null) {
          setLive(price);
          setQuoteAt(Date.now());
        }
      } finally { pending = false; }
    };
    void tick();
    const id = setInterval(() => void tick(), 5000);
    return () => { alive = false; clearInterval(id); };
  }, [settings.symbol, ready]);

  // Verifica limites demo independentemente do botão de análise.
  // A cotação precisa ser recente; esta lógica funciona apenas com a página ativa.
  useEffect(() => {
    if (!ready) return;
    const exits = evaluateDemoExits(positions, settings.symbol, live, quoteAt, Date.now());
    const sl = exits.filter((x) => x.result === "SL").map((x) => x.id);
    const tp = exits.filter((x) => x.result === "TP").map((x) => x.id);
    closePositions(sl, live, "SL");
    closePositions(tp, live, "TP");
  }, [live, quoteAt, ready, positions, settings.symbol, closePositions]);

  const running = loading || auto !== "manual";
  const stopAll = () => { stopRef.current = true; setAuto("manual"); setNextRunAt(0); setLoading(false); };
  const closeOne = (id: string) => closePositions([id], liveRef.current, "MANUAL");
  const closeAll = () => closePositions(posRef.current.filter((p) => p.symbol === settings.symbol).map((p) => p.id), liveRef.current, "MANUAL");

  const [notice, setNotice] = useState("");
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 4000); return () => clearTimeout(t); }, [notice]);

  // Ordem disparada pelo chat de qualquer agente (retorna o fato executado; a IA comenta depois)
  const handleCommand = (q: string, agent: Agent, m: Market | null): string | null => {
    const intent = parseIntent(q);
    if (!intent) return null;
    const sym = settings.symbol;
    const price = m?.price || liveRef.current || 0;
    if (intent === "STATUS") {
      const mine = posRef.current.filter((p) => p.symbol === sym);
      if (!mine.length) return `Nenhuma posição aberta em ${sym}. Saldo realizado ${fmt(balance)} USDT.`;
      return `${mine.length} posição(ões) em ${sym}: ` + mine.map((p) => `${p.side} @ ${fmt(p.entry)} P&L ${fmt(pnlOf(p.side, p.entry, price, p.qty))} USDT SL ${fmt(p.sl)} TP ${fmt(p.tp)}`).join("; ") + `. Saldo realizado ${fmt(balance)} USDT.`;
    }
    if (intent === "CLOSE") {
      const ids = posRef.current.filter((p) => p.symbol === sym).map((p) => p.id);
      if (!ids.length) return "Não havia posições abertas para encerrar.";
      closePositions(ids, price, "MANUAL");
      setNotice(`✓ ${agent.name} encerrou ${ids.length} posição(ões) em ${sym}`);
      return `Encerradas ${ids.length} posição(ões) em ${sym} a ${fmt(price)}.`;
    }
    if (intent === "AUTO_OFF") { stopAll(); setNotice(`✓ ${agent.name} colocou o piloto em Manual`); return "Piloto colocado em modo Manual."; }
    if (intent === "AUTO_ON") { stopRef.current = false; setAuto("15m"); setNotice(`✓ ${agent.name} ligou o piloto automático (15m)`); return "Piloto automático ligado a cada 15 minutos."; }
    if (price <= 0 || !m) return "Sem preço de mercado; ordem não executada.";
    const side: Side = intent === "BUY" ? "COMPRA" : "VENDA";
    const rejection = demoOrderRejection(m, side, sym);
    if (rejection) return `Ordem demo bloqueada: ${rejection}`;
    if (posRef.current.some((p) => p.symbol === sym && p.side === side)) return `Já existe ${side} aberta em ${sym}; ordem repetida bloqueada.`;
    const { sl, tp } = levels(side, price, m.slDist);
    if (!Number.isFinite(sl) || !Number.isFinite(tp) || (side === "COMPRA" ? !(sl < price && tp > price) : !(sl > price && tp < price))) return "Ordem demo bloqueada: stop ou alvo inválido.";
    const qty = m.qty;
    const np: Position = { id: String(Date.now()), symbol: sym, side, entry: price, sl, tp, qty, provenance: { openedBy: agent.name, openedVia: "CHAT", openedAt: Date.now(), approvedBy: "Rita Risk", plannedRisk: m.risk, riskPercent: 1, decision: side } };
    posRef.current = [...posRef.current, np].slice(-20);
    setPositions(posRef.current);
    setLog(`${agent.name} executou ${side} em ${sym} a ${fmt(price)} pelo chat.`);
    setNotice(`✓ ${side} executada por ${agent.name}: ${sym} @ ${fmt(price)}`);
    return `${side} de ${fmt(qty, 6)} ${sym} a ${fmt(price)}, SL ${fmt(sl)}, TP ${fmt(tp)} (conta demo).`;
  };

  const execute = () => {
    if (!market || market.signal === "AGUARDAR") { setLog("Ordem demo bloqueada: sem sinal aprovado."); return; }
    const rejection = demoOrderRejection(market, market.signal, settings.symbol);
    setAudit((history) => appendAudit(history, auditDecision(market, "MANUAL")));
    if (rejection) { setLog(`Ordem demo bloqueada: ${rejection}`); return; }
    const side: Side = market.signal;
    if (positions.some((p) => p.symbol === market.symbol && p.side === side)) { setLog(`Já existe ${side} aberta em ${market.symbol}; ordem repetida bloqueada.`); return; }
    setPositions((ps) => [...ps, { id: String(Date.now()), symbol: market.symbol, side, entry: market.price, sl: market.sl, tp: market.tp, qty: market.qty, provenance: { openedBy: "Operador humano", openedVia: "MANUAL", openedAt: Date.now(), approvedBy: "Rita Risk", plannedRisk: market.risk, riskPercent: 1, decision: side } }].slice(-20));
    setNotice(`✓ ${side} executada: ${market.symbol} @ ${fmt(market.price)}`);
  };

  const floating = positions.filter((p) => p.symbol === settings.symbol).reduce((s, p) => s + (p.side === "COMPRA" ? live - p.entry : p.entry - live) * p.qty, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;
  const performance = demoPerformance(trades);

  return (
    <div className="w-full max-w-md mx-auto px-3 pt-4 pb-24 overflow-x-hidden bg-[#0b0e14] text-slate-100 min-h-screen">
      <header className="text-center">
        <h1 className="text-3xl font-black tracking-widest text-[#d4af37]">TRADING DESK</h1>
        <p className="text-lg font-semibold">Escritório de Agentes</p>
        <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900 py-2 text-sm text-slate-300">18º Andar • Mesa de Operações</div>
      </header>

      <nav className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
        <button onClick={() => setTab("desk")} className={`rounded-lg py-2 ${tab === "desk" ? "bg-[#d4af37] text-slate-900" : "bg-slate-800 text-slate-300"}`}>Mesa de Operações</button>
        <button onClick={() => setTab("brain")} className={`rounded-lg py-2 ${tab === "brain" ? "bg-[#d4af37] text-slate-900" : "bg-slate-800 text-slate-300"}`}>Segundo Cérebro (Grafo)</button>
      </nav>

      {tab === "brain" ? <SecondBrainGraph /> : (<>
      <section className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs" aria-label="Auditoria de decisões demo">
        <h2 className="text-sm font-bold text-[#d4af37]">Auditoria de Decisões (Demo)</h2>
        <p className="mt-1 text-slate-400">Últimas 100 decisões salvas neste navegador; nenhum registro envia ordens.</p>
        {audit.length === 0 ? <p className="mt-2">Nenhuma análise registrada neste navegador.</p> : <div className="mt-2 max-h-44 space-y-2 overflow-y-auto">{audit.slice(0, 10).map((entry) => <div key={entry.id} className="rounded border border-slate-700 p-2"><div className="font-bold">{new Date(entry.at).toLocaleTimeString("pt-BR")} • {entry.symbol} • {entry.decision}</div><div>Ana: {entry.research} | Sofia: {entry.chart} | Sinal: {entry.signal}</div><div className="text-slate-300">{entry.reason}</div></div>)}</div>}
      </section>
      <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-1">
        <OfficeMap agents={agents} market={market} onSelect={setSelected} />
      </section>

      <section className="mt-4 space-y-2">
        {running ? (
          <button onClick={stopAll} className="w-full rounded-lg bg-red-500 py-3 font-bold text-slate-100">
            ■ Parar Operação{loading ? " (buscando dados...)" : ""}
          </button>
        ) : (
          <button onClick={() => { stopRef.current = false; void runCycle(); }} className="w-full rounded-lg bg-green-500 py-3 font-bold text-slate-900">
            ▶ Rodar Ciclo de Operação
          </button>
        )}
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)} className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2 text-sm">⚙ Configurações Globais</button>
          <select value={auto} onChange={(e) => { setNextRunAt(0); save("td_next_run", 0); setAuto(e.target.value); }} className="rounded-lg border border-slate-700 bg-slate-800 px-2 text-sm">
            <option value="manual">Piloto: Manual</option><option value="1m">Piloto: 1m</option><option value="5m">Piloto: 5m</option><option value="15m">Piloto: 15m</option>
          </select>
        </div>
        {auto !== "manual" && <p className="text-center text-xs text-slate-400">Próximo ciclo em {Math.floor(count / 60)}:{String(count % 60).padStart(2, "0")}</p>}
        {log && <p className="text-center text-xs text-[#d4af37]">{log}</p>}
        {error && <p className="text-center text-xs text-red-400">{error}</p>}
      </section>

      {market && (
        <section className={`mt-4 rounded-xl border-2 p-3 ${market.signal === "COMPRA" ? "border-green-500 bg-green-950/40" : market.signal === "VENDA" ? "border-red-500 bg-red-950/40" : "border-slate-500 bg-slate-900"}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#d4af37]">{!market.riskApproved || market.signal === "AGUARDAR" ? "SEM APROVAÇÃO DE RISCO" : "SINAL APROVADO"} • {market.symbol}</span>
            <span className={`rounded px-2 py-0.5 text-sm font-black ${market.signal === "COMPRA" ? "bg-green-500 text-slate-900" : market.signal === "VENDA" ? "bg-red-500" : "bg-slate-600"}`}>{market.signal === "VENDA" ? "VENDA (SHORT)" : market.signal === "COMPRA" ? "COMPRA (LONG)" : "AGUARDAR"}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Preço {fmt(market.price)} • 30min {fmt(market.change5m)}% • Volume comprador {market.volumeVerified ? `${fmt(market.buyRatio * 100, 0)}%` : "indisponível (sem dado verificado)"} • Fonte: {market.source ?? "não identificada"} • Último candle: {market.lastCandleAt ? new Date(market.lastCandleAt).toLocaleTimeString("pt-BR") : "indisponível"} • Consulta: {market.fetchedAt ? new Date(market.fetchedAt).toLocaleTimeString("pt-BR") : "indisponível"}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>RSI14: <b>{fmt(market.rsi, 1)}</b></div><div>MACD hist: <b>{fmt(market.macdHist)}</b></div>
            <div>EMA9: <b>{fmt(market.ema9)}</b></div><div>EMA21: <b>{fmt(market.ema21)}</b></div>
            {market.signal !== "AGUARDAR" && <><div className="text-red-400">Stop: <b>{fmt(market.sl)}</b></div><div className="text-green-400">Take: <b>{fmt(market.tp)}</b></div>
            <div className="col-span-2">Lote: <b>{fmt(market.qty, 6)}</b> • Risco <b>{fmt(market.risk)} USDT</b> (1%)</div></>}
          </div>
          <ul className="mt-2 space-y-0.5 text-xs text-slate-300">
            <li>🔎 Pesquisa: <b>{market.research.trend}</b> — {market.research.note}</li>
            <li>📈 Gráfico: <b>{market.chart.trend}</b> — {market.chart.note}</li>
            <li>🛡 Risco: {market.riskNote}</li>
            <li>⚡ Execução: {market.signal === "AGUARDAR" ? "aguardando consenso, nenhuma ordem" : `${market.signal} liberada`}</li>
          </ul>
          {market.signal !== "AGUARDAR" && market.riskApproved && <button onClick={execute} className="mt-3 w-full rounded-lg bg-[#d4af37] py-2 font-bold text-slate-900">Executar {market.signal} na Conta Demo ✓</button>}
        </section>
      )}

      <section className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-3" aria-label="Desempenho da conta demo">
        <h2 className="font-bold text-[#d4af37]">Painel de Desempenho (Demo)</h2>
        <p className="mt-1 text-xs text-slate-400">Calculado apenas sobre operações encerradas salvas neste navegador. Não representa resultados de uma conta real.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded bg-slate-800 p-2">P&L realizado<br /><b className={performance.netPnl >= 0 ? "text-green-400" : "text-red-400"}>{fmt(performance.netPnl)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">Drawdown realizado máximo<br /><b>{fmt(performance.maxDrawdown)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">Ganho médio<br /><b>{fmt(performance.averageWin)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">Perda média (valor absoluto)<br /><b>{fmt(performance.averageLoss)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">Taxa de acerto<br /><b>{fmt(performance.winRate, 1)}% ({performance.count})</b></div>
          <div className="rounded bg-slate-800 p-2">Fator de lucro<br /><b>{performance.profitFactor === null ? "N/D" : fmt(performance.profitFactor, 2)}</b></div>
          <div className="rounded bg-slate-800 p-2">Saídas manuais<br /><b>{performance.manualClosures}</b></div>
          <div className="rounded bg-slate-800 p-2">Saídas por TP / SL / IA<br /><b>{performance.automatedClosures}</b></div>
        </div>
        <p className="mt-2 text-xs text-slate-400">Drawdown: queda máxima do P&L realizado acumulado; não inclui perdas flutuantes. Tipo de saída não identifica quem abriu a operação. Operações anteriores à atualização podem não ter autoria e risco planejado registrados.</p>
      </section>

      <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <h2 className="font-bold text-[#d4af37]">Posições Abertas & Histórico de Trades</h2>
        <p className="text-xs text-slate-400">{settings.symbol} cotação demo: {quoteAt ? fmt(live) : "indisponível"} • {quoteAt ? `Atualizada às ${new Date(quoteAt).toLocaleTimeString("pt-BR")}` : "Aguardando cotação"}</p>
        <p className="text-xs text-amber-300">Stop/Take demo monitorados somente enquanto esta página estiver ativa. Não há proteção garantida com o app fechado ou sem conexão.</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded bg-slate-800 p-2">Saldo Realizado<br /><b>{fmt(balance)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">Patrimônio<br /><b>{fmt(balance + floating)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">P&L Flutuante<br /><b className={floating >= 0 ? "text-green-400" : "text-red-400"}>{fmt(floating)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">Win Rate<br /><b>{fmt(winRate, 1)}%</b> ({trades.length})</div>
        </div>
        <div className="mt-3 space-y-1">
          {positions.length === 0 && <p className="text-xs text-slate-500">Nenhuma posição aberta.</p>}
          {positions.length > 1 && <button onClick={closeAll} className="w-full rounded bg-red-600 py-1.5 text-xs font-bold">Encerrar Todas</button>}
          {positions.map((p) => {
            const pnl = p.symbol === settings.symbol ? (p.side === "COMPRA" ? live - p.entry : p.entry - live) * p.qty : 0;
            return (
              <div key={p.id} className="rounded border border-slate-700 p-2 text-xs">
                <div className="flex justify-between"><b className={p.side === "COMPRA" ? "text-green-400" : "text-red-400"}>{p.side} {p.symbol}</b><b className={pnl >= 0 ? "text-green-400" : "text-red-400"}>{fmt(pnl)} USDT</b></div>
                <div className="text-slate-400">Entrada {fmt(p.entry)} • SL {fmt(p.sl)} • TP {fmt(p.tp)} • Qtd {fmt(p.qty, 5)}</div>
                <div className="text-slate-400">Origem: {p.provenance ? `${p.provenance.openedBy} (${p.provenance.openedVia}) • Aprovado: ${p.provenance.approvedBy} • Risco planejado: ${fmt(p.provenance.plannedRisk)} USDT` : "não registrada (posição antiga)"}</div>
                <button onClick={() => closeOne(p.id)} disabled={p.symbol !== settings.symbol || !live} className="mt-1 w-full rounded bg-red-500/80 py-1 font-bold disabled:opacity-40">Encerrar</button>
              </div>
            );
          })}
        </div>
        {trades.length > 0 && (
          <div className="mt-3 space-y-1">
            {trades.slice().reverse().map((t) => (
              <div key={t.id} className="text-xs text-slate-300"><div className="flex justify-between gap-2">
                <span>{t.side} {fmt(t.entry)} → {fmt(t.exit)} ({{ TP: "Take Profit", SL: "Stop Loss", IA: "Encerrada pela IA", MANUAL: "Manual" }[t.result] ?? t.result})</span>
                <b className={t.pnl >= 0 ? "text-green-400" : "text-red-400"}>{fmt(t.pnl)}</b></div>
                <div className="text-[10px] text-slate-500">Origem: {t.provenance ? `${t.provenance.openedBy} (${t.provenance.openedVia}) • Rita Risk • Risco planejado ${fmt(t.provenance.plannedRisk)} USDT` : "não registrada (operação antiga)"}</div>
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
      </>)}


      {showSettings && (
        <SettingsModal settings={settings} onClose={() => setShowSettings(false)} onSave={(s) => {
          setSettings(s); save("td_settings", s);
          if (s.bank !== settings.bank) setBalance(s.bank);
          setShowSettings(false);
        }} />
      )}

      {notice && (
        <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-lg border border-green-400 bg-slate-900 px-4 py-2 text-sm font-semibold text-green-300 shadow-lg">{notice}</div>
      )}

      {selected && (
        <ChatModal
          agent={agents.find((a) => a.id === selected.id) || selected}
          market={market}
          messages={chats[selected.id] || []}
          setMessages={(fn) => setChats((c) => ({ ...c, [selected.id]: fn(c[selected.id] || []).slice(-20) }))}
          onCommand={(q, m) => handleCommand(q, agents.find((a) => a.id === selected.id) || selected, m)}
          onRefresh={refreshMarket}
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

function ChatModal({ agent, market, messages, setMessages, onPrompt, onCommand, onRefresh, onClose }: {
  agent: Agent; market: Market | null; messages: Msg[];
  setMessages: (fn: (m: Msg[]) => Msg[]) => void; onPrompt: (p: string) => void;
  onCommand: (q: string, m: Market | null) => string | null; onRefresh: () => Promise<Market | null>; onClose: () => void;
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
    const fresh = await onRefresh(); // velas reais no segundo da pergunta
    const action = onCommand(q, fresh) || "";
    const context = fresh ? marketContext(fresh) : "Não foi possível ler a Binance agora; não invente números.";
    let answer = "";
    try {
      const r = await agentChat({ data: { system: agent.prompt, role: agent.role, question: q, context, action } });
      answer = r.text;
    } catch {
      answer = `⚠ IA indisponível no momento.${action ? ` Ação executada: ${action}` : ""}`;
    }
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
          {messages.length === 0 && <p className="text-xs text-slate-500">Ordens: "Compre agora", "Abra uma venda", "Qual é a nossa posição?", "Encerre tudo"</p>}
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
