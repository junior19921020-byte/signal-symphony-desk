import { verifyRestoredDemoBackup } from "@/lib/demoBackupIntegrity";
import { parseRestorableDemoBackup, restoreDemoBackupToStorage } from "@/lib/restoreDemoBackup";
import { previewDemoBackup, type DemoBackupPreview } from "@/lib/demoBackupPreview";
import { createDemoBackup } from "@/lib/demoBackup";
import { preventiveRiskGate } from "@/lib/preventiveRisk";
import { dailyLossStatus } from "@/lib/dailyLoss";
import { evaluateExitVariance, type ExitVariance } from "@/lib/exitVariance";
import { editDemoTargets } from "@/lib/editDemoTargets";
import { demoProfitTarget } from "@/lib/demoProfitTarget";
import { observeDemoExcursion, type ObservedExcursion } from "@/lib/demoExcursion";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { OfficeMap, statusFor, type Agent } from "@/components/OfficeMap";
import { fetchMarket, fmt, levels, marketContext, parseIntent, pnlOf, type Market, type Side } from "@/lib/trading";
import { agentChat } from "@/lib/agent.functions";
import { demoOrderRejection } from "@/lib/demoRisk";
import { fetchDemoQuote } from "@/lib/demoQuote";
import { evaluateDemoExits } from "@/lib/demoExits";
import { demoPerformance } from "@/lib/demoPerformance";
import { demoStrategyDiagnostics } from "@/lib/demoStrategyDiagnostics";
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
interface Position { id: string; symbol: string; side: Side; entry: number; sl: number; tp: number; qty: number; provenance?: TradeProvenance; excursion?: ObservedExcursion }
interface TradeProvenance { openedBy: string; openedVia: "MANUAL" | "CHAT" | "AUTOMATICO"; openedAt: number; approvedBy: "Rita Risk"; plannedRisk: number; riskPercent: number; decision: Side }

interface Trade { id: string; side: Side; entry: number; exit: number; pnl: number; result: "TP" | "SL" | "IA" | "MANUAL"; closedAt?: number; provenance?: TradeProvenance; exitVariance?: ExitVariance; excursion?: ObservedExcursion }
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
  const [showSignalCard, setShowSignalCard] = useState(true);
  const [backupError, setBackupError] = useState("");
  const [integrityResult, setIntegrityResult] = useState<{ ok: boolean; differences: string[] } | null>(null);
  const [backupPreview, setBackupPreview] = useState<DemoBackupPreview | null>(null);
  const [backupRaw, setBackupRaw] = useState<string | null>(null);
  const [restoreAcknowledged, setRestoreAcknowledged] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
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
  const [auditFilter, setAuditFilter] = useState<"TODAS" | "BLOQUEADA" | "APROVADA">("TODAS");
  const [tab, setTab] = useState<"desk" | "brain">("desk");
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editProfit, setEditProfit] = useState("");
  const [editRisk, setEditRisk] = useState("");
  const [editTargetError, setEditTargetError] = useState("");
  const [targetEdits, setTargetEdits] = useState<{ at: number; id: string; oldTp: number; newTp: number; oldSl: number; newSl: number }[]>([]);
  const [signalUsed, setSignalUsed] = useState(false);
  const signalUsedRef = useRef(false);
  const consumeSignal = () => { signalUsedRef.current = true; setSignalUsed(true); };
  const tradesRef = useRef<Trade[]>([]);
  const posRef = useRef<Position[]>([]);
  const liveRef = useRef<number>(0);
  const stopRef = useRef(false);

  useEffect(() => {
    setAgents(load("td_agents", DEFAULT_AGENTS));
    const s = load<Settings>("td_settings", { apiKey: "", symbol: "BTCUSDT", bank: 10000 });
    setSettings(s);
    setBalance(load("td_balance", s.bank));
    setPositions(load("td_positions", []));
    setTargetEdits(load("td_target_edits", []));
    const loadedTrades = load<Trade[]>("td_trades", []);
    tradesRef.current = loadedTrades;
    setTrades(loadedTrades);
    setAuto(load("td_auto", "manual"));
    setNextRunAt(load("td_next_run", 0));
    try { setAudit(parseAuditHistory(localStorage.getItem("td_decision_audit_v1"))); } catch { setAudit([]); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) save("td_agents", agents); }, [agents, ready]);
  useEffect(() => { if (ready) save("td_balance", balance); }, [balance, ready]);
  useEffect(() => { if (ready) save("td_positions", positions); }, [positions, ready]);
  useEffect(() => { if (ready) save("td_target_edits", targetEdits); }, [targetEdits, ready]);
  useEffect(() => { if (ready) save("td_trades", trades); }, [trades, ready]);
  useEffect(() => { if (ready) save("td_auto", auto); }, [auto, ready]);
  useEffect(() => { if (ready) save("td_next_run", nextRunAt); }, [nextRunAt, ready]);
  useEffect(() => { if (ready) save("td_decision_audit_v1", audit); }, [audit, ready]);
  useEffect(() => { posRef.current = positions; }, [positions]);
  useEffect(() => { tradesRef.current = trades; }, [trades]);
  useEffect(() => { liveRef.current = live; }, [live]);

  const closePositions = useCallback((ids: string[], price: number, result: Trade["result"]) => {
    if (!ids.length || price <= 0) return;
    const cur = posRef.current;
    const closing = cur.filter((p) => ids.includes(p.id));
    if (!closing.length) return;
    const done: Trade[] = closing.map((p) => ({
      id: p.id, side: p.side, entry: p.entry, exit: price, result, closedAt: Date.now(), provenance: p.provenance, exitVariance: evaluateExitVariance(p, price, result), excursion: p.excursion,
      pnl: (p.side === "COMPRA" ? price - p.entry : p.entry - price) * p.qty,
    }));
    signalUsedRef.current = true;
    setSignalUsed(true);
    const keep = cur.filter((p) => !ids.includes(p.id));
    posRef.current = keep;
    setPositions(keep);
    const nextTrades = [...tradesRef.current, ...done].slice(-50);
    tradesRef.current = nextTrades;
    setTrades(nextTrades);
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
    setShowSignalCard(true);
    signalUsedRef.current = false;
    setSignalUsed(false);
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
    else if (signalUsedRef.current) parts.push("sinal já utilizado ou encerrado; nova análise necessária");
    else if (dailyLossStatus(tradesRef.current, Date.now(), settings.bank).blocked) parts.push("Rita Risk bloqueou nova ordem: limite diário de perdas atingido");
    else if (demoOrderRejection(m, m.signal, m.symbol)) parts.push("ordem bloqueada pela validação de risco");
    else if (preventiveRiskGate(tradesRef.current, posRef.current, { entry: m.price, sl: m.sl, qty: m.qty }, Date.now(), settings.bank)) parts.push(preventiveRiskGate(tradesRef.current, posRef.current, { entry: m.price, sl: m.sl, qty: m.qty }, Date.now(), settings.bank)!);
    else if (autoRef.current !== "manual") {
      const side: Side = m.signal;
      const np: Position = { id: String(Date.now()), symbol: m.symbol, side, entry: m.price, sl: m.sl, tp: m.tp, qty: m.qty, provenance: { openedBy: "Max Trader", openedVia: "AUTOMATICO", openedAt: Date.now(), approvedBy: "Rita Risk", plannedRisk: m.risk, riskPercent: 1, decision: side } };
      posRef.current = [...posRef.current, np].slice(-20);
      setPositions(posRef.current);
      consumeSignal();
      parts.push(`nova ${m.signal} aberta pelo Max Trader`);
    }
    setLog(`Revisão da IA: ${parts.length ? parts.join("; ") : "nenhuma posição para revisar"}.`);
    setLoading(false);
  }, [settings.symbol, settings.bank, closePositions]);

  const refreshMarket = useCallback(async () => {
    const m = await fetchMarket(settings.symbol, settings.bank);
    if (m) { setMarket(m); setShowSignalCard(true); setLive(m.price); }
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

  // Observa apenas cotações recentes; não reconstrói máximas históricas nem executa ordens.
  useEffect(() => {
    if (!ready || quoteAt <= 0) return;
    const cur = posRef.current;
    let changed = false;
    const next = cur.map((p) => {
      if (p.symbol !== settings.symbol) return p;
      const excursion = observeDemoExcursion(p, live, quoteAt, Date.now());
      if (!excursion || (p.excursion && p.excursion.lastObservedAt >= quoteAt)) return p;
      changed = true;
      return { ...p, excursion };
    });
    if (changed) { posRef.current = next; setPositions(next); }
  }, [ready, quoteAt, live, settings.symbol]);

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
  const saveTargetEdit = (id: string) => {
    const p = posRef.current.find((item) => item.id === id);
    if (!p) { setEditTargetError("Posição não encontrada ou já encerrada."); return; }
    const change = editDemoTargets(p, Number(editProfit), Number(editRisk));
    if ("error" in change) { setEditTargetError(change.error); return; }
    const updated = posRef.current.map((item) => item.id === id ? { ...item, tp: change.tp, sl: change.sl } : item);
    posRef.current = updated;
    setPositions(updated);
    setTargetEdits((edits) => [...edits, { at: Date.now(), id, oldTp: p.tp, newTp: change.tp, oldSl: p.sl, newSl: change.sl }].slice(-100));
    setEditingTargetId(null);
    setEditTargetError("");
  };

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
    if (signalUsedRef.current) return "Sinal anterior já utilizado ou encerrado. Rode um novo ciclo de análise antes de abrir outra operação demo.";
    const side: Side = intent === "BUY" ? "COMPRA" : "VENDA";
    if (dailyLossStatus(tradesRef.current, Date.now(), settings.bank).blocked) return "Rita Risk bloqueou nova ordem demo: limite diário de perdas atingido.";
    const rejection = demoOrderRejection(m, side, sym);
    if (rejection) return `Ordem demo bloqueada: ${rejection}`;
    if (posRef.current.some((p) => p.symbol === sym && p.side === side)) return `Já existe ${side} aberta em ${sym}; ordem repetida bloqueada.`;
    const { sl, tp } = levels(side, price, m.slDist);
    if (!Number.isFinite(sl) || !Number.isFinite(tp) || (side === "COMPRA" ? !(sl < price && tp > price) : !(sl > price && tp < price))) return "Ordem demo bloqueada: stop ou alvo inválido.";
    const qty = m.qty;
    const preventiveRejection = preventiveRiskGate(tradesRef.current, posRef.current, { entry: price, sl, qty }, Date.now(), settings.bank);
    if (preventiveRejection) return preventiveRejection;
    const np: Position = { id: String(Date.now()), symbol: sym, side, entry: price, sl, tp, qty, provenance: { openedBy: agent.name, openedVia: "CHAT", openedAt: Date.now(), approvedBy: "Rita Risk", plannedRisk: m.risk, riskPercent: 1, decision: side } };
    posRef.current = [...posRef.current, np].slice(-20);
    setPositions(posRef.current);
    consumeSignal();
    setLog(`${agent.name} executou ${side} em ${sym} a ${fmt(price)} pelo chat.`);
    setNotice(`✓ ${side} executada por ${agent.name}: ${sym} @ ${fmt(price)}`);
    return `${side} de ${fmt(qty, 6)} ${sym} a ${fmt(price)}, SL ${fmt(sl)}, TP ${fmt(tp)} (conta demo).`;
  };

  const execute = () => {
    if (signalUsedRef.current) { setLog("Sinal anterior já utilizado ou encerrado. Rode novo ciclo de análise."); return; }
    if (!market || market.signal === "AGUARDAR") { setLog("Ordem demo bloqueada: sem sinal aprovado."); return; }
    if (dailyLossStatus(tradesRef.current, Date.now(), settings.bank).blocked) { setLog("Rita Risk bloqueou nova ordem demo: limite diário de perdas atingido."); return; }
    const rejection = demoOrderRejection(market, market.signal, settings.symbol);
    setAudit((history) => appendAudit(history, auditDecision(market, "MANUAL")));
    if (rejection) { setLog(`Ordem demo bloqueada: ${rejection}`); return; }
    const side: Side = market.signal;
    const preventiveRejection = preventiveRiskGate(tradesRef.current, posRef.current, { entry: market.price, sl: market.sl, qty: market.qty }, Date.now(), settings.bank);
    if (preventiveRejection) { setLog(preventiveRejection); return; }
    if (positions.some((p) => p.symbol === market.symbol && p.side === side)) { setLog(`Já existe ${side} aberta em ${market.symbol}; ordem repetida bloqueada.`); return; }
    setPositions((ps) => [...ps, { id: String(Date.now()), symbol: market.symbol, side, entry: market.price, sl: market.sl, tp: market.tp, qty: market.qty, provenance: { openedBy: "Operador humano", openedVia: "MANUAL", openedAt: Date.now(), approvedBy: "Rita Risk", plannedRisk: market.risk, riskPercent: 1, decision: side } }].slice(-20));
    consumeSignal();
    setNotice(`✓ ${side} executada: ${market.symbol} @ ${fmt(market.price)}`);
  };

  const floating = positions.filter((p) => p.symbol === settings.symbol).reduce((s, p) => s + (p.side === "COMPRA" ? live - p.entry : p.entry - live) * p.qty, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;
  const performance = demoPerformance(trades);
  const diagnostics = demoStrategyDiagnostics(trades);
  const exportDemoBackup = () => {
    try {
      const payload = createDemoBackup({ balance, bank: settings.bank, symbol: settings.symbol, positions, trades, audit, targetEdits });
      const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `signal-symphony-demo-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupError("");
    } catch {
      setBackupError("Não foi possível gerar o backup. Confira os dados da conta demo.");
    }
  };
  const checkBackupIntegrity = () => {
    if (!backupRaw) return;
    try {
      setIntegrityResult(verifyRestoredDemoBackup(backupRaw, localStorage));
      setBackupError("");
    } catch (err) {
      setIntegrityResult(null);
      setBackupError(err instanceof Error ? err.message : "Não foi possível verificar a integridade.");
    }
  };
  const restoreDemoBackup = () => {
    if (!backupRaw || !backupPreview || !restoreAcknowledged || !ready) return;
    if (positions.length) { setBackupError("Encerre as posições demo abertas antes de restaurar."); return; }
    try {
      const parsed = parseRestorableDemoBackup(backupRaw);
      setShowRestoreConfirm(false);
      restoreDemoBackupToStorage(localStorage, parsed);
      window.location.reload();
    } catch (err) { setBackupError(err instanceof Error ? err.message : "Não foi possível restaurar o backup."); }
  };
  const auditVisible = audit.filter((entry) => auditFilter === "TODAS" || entry.decision === auditFilter);
  const auditBlockedCount = audit.filter((entry) => entry.decision === "BLOQUEADA").length;
  const auditApprovedCount = audit.filter((entry) => entry.decision === "APROVADA").length;
  const todayKey = new Date().toLocaleDateString("en-CA");
  const isToday = (at: number) => Number.isFinite(at) && new Date(at).toLocaleDateString("en-CA") === todayKey;
  const dailyAudits = audit.filter((entry) => isToday(entry.at));
  const dailyApproved = dailyAudits.filter((entry) => entry.decision === "APROVADA").length;
  const dailyBlocked = dailyAudits.filter((entry) => entry.decision === "BLOQUEADA").length;
  const dailyOpened = [...positions.map((p) => p.provenance?.openedAt), ...trades.map((t) => t.provenance?.openedAt)].filter((at): at is number => typeof at === "number" && isToday(at)).length;
  const dailyClosed = trades.filter((t) => typeof t.closedAt === "number" && isToday(t.closedAt)).length;
  const dailyRealizedPnl = trades.filter((t) => typeof t.closedAt === "number" && isToday(t.closedAt)).reduce((sum, t) => sum + t.pnl, 0);
  const dailyRisk = dailyLossStatus(trades, Date.now(), settings.bank);
  const preventiveWarning = market && market.signal !== "AGUARDAR" ? preventiveRiskGate(trades, positions, { entry: market.price, sl: market.sl, qty: market.qty }, Date.now(), settings.bank) : null;
  const riskBlocked = dailyRisk.blocked || !!preventiveWarning;

  return (
    <div className="w-full max-w-md mx-auto px-3 pt-4 pb-24 overflow-x-hidden bg-[#0b0e14] text-slate-100 min-h-screen">
      {showRestoreConfirm && backupPreview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="presentation">
        <div role="dialog" aria-modal="true" aria-labelledby="restore-confirm-title" aria-describedby="restore-confirm-description" className="w-full max-w-sm rounded-xl border border-amber-500 bg-slate-900 p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3"><h2 id="restore-confirm-title" className="text-lg font-bold text-amber-300">Confirmar restauração demo</h2><button type="button" aria-label="Fechar confirmação" onClick={() => setShowRestoreConfirm(false)} className="rounded p-2 text-xl text-white">×</button></div>
          <div id="restore-confirm-description" className="mt-3 space-y-3 text-sm text-slate-200">
            <p>Backup de <strong>{new Date(backupPreview.exportedAt).toLocaleString("pt-BR")}</strong>.</p>
            <p className="font-semibold text-amber-200">Esta ação SUBSTITUI os dados locais deste navegador:</p>
            <ul className="list-disc space-y-1 pl-5"><li>Saldo e configurações da banca demo</li><li>Histórico de trades e auditoria</li><li>Metas e edições registradas</li></ul>
            <p>O piloto ficará MANUAL. Nenhuma ordem real será enviada.</p>
            <p className="text-amber-200">Confirme somente se já exportou e guardou o backup atual.</p>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setShowRestoreConfirm(false)} className="min-h-11 rounded-lg border border-slate-500 px-4 py-2 font-semibold text-white">Cancelar</button><button type="button" onClick={restoreDemoBackup} disabled={!restoreAcknowledged || !backupRaw || positions.length > 0} className="min-h-11 rounded-lg bg-amber-400 px-4 py-2 font-bold text-slate-950 disabled:opacity-40">Confirmar restauração</button></div>
        </div>
      </div>}
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
      <section className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs" aria-label="Relatório diário Rita Risk demo">
        <h2 className="text-sm font-bold text-[#d4af37]">Relatório Diário • Rita Risk (Demo)</h2>
        <p className="mt-1 text-slate-300">Hoje, {new Date().toLocaleDateString("pt-BR")} • horário local do dispositivo</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded bg-slate-800 p-3"><div className="text-xl font-bold">{dailyAudits.length}</div>Análises registradas</div>
          <div className="rounded bg-slate-800 p-3"><div className="text-xl font-bold text-emerald-300">{dailyApproved}</div>Aprovações técnicas</div>
          <div className="rounded bg-slate-800 p-3"><div className="text-xl font-bold text-amber-300">{dailyBlocked}</div>Vetos na análise</div>
          <div className="rounded bg-slate-800 p-3"><div className="text-xl font-bold">{dailyOpened}</div>Aberturas registradas</div>
          <div className="rounded bg-slate-800 p-3"><div className="text-xl font-bold">{dailyClosed}</div>Fechamentos</div>
          <div className="rounded bg-slate-800 p-3"><div className={`text-xl font-bold ${dailyRealizedPnl < 0 ? "text-red-300" : "text-emerald-300"}`}>{fmt(dailyRealizedPnl)} USDT</div>P&amp;L de hoje (operações encerradas)</div>
        </div>
        <div className={`mt-3 rounded border p-3 ${dailyRisk.blocked ? "border-red-500 bg-red-950/40" : "border-slate-600 bg-slate-800"}`}>
          <b>Limite diário: {dailyRisk.blocked ? "NOVAS ORDENS BLOQUEADAS" : "Dentro do limite"}</b>
          <p className="mt-1">Perdas brutas de hoje: {fmt(dailyRisk.loss)} / {fmt(dailyRisk.limit)} USDT • Restante: {fmt(dailyRisk.remaining)} USDT</p>
        </div>
        <p className="mt-2 text-slate-400">Aprovações técnicas não são execuções. Vetos na análise não incluem todos os bloqueios preventivos de abertura. Aberturas dependem de registros de origem; operações antigas podem não ter esse dado. Somente dados deste navegador, sem ordens reais.</p>
      </section>
      <section className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs" aria-label="Auditoria de decisões demo">
        <h2 className="text-sm font-bold text-[#d4af37]">Auditoria de Decisões (Demo)</h2>
        <p className="mt-1 text-slate-400">Últimas 100 decisões salvas neste navegador; nenhum registro envia ordens.</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center" aria-label="Resumo das decisões registradas">
          <div className="rounded bg-slate-800 p-2"><div className="font-bold">{audit.length}</div><div className="text-slate-300">Análises</div></div>
          <div className="rounded bg-slate-800 p-2"><div className="font-bold text-emerald-300">{auditApprovedCount}</div><div className="text-slate-300">Aprovadas</div></div>
          <div className="rounded bg-slate-800 p-2"><div className="font-bold text-amber-300">{auditBlockedCount}</div><div className="text-slate-300">Bloqueadas</div></div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2" aria-label="Filtrar auditoria">
          {(["TODAS", "BLOQUEADA", "APROVADA"] as const).map((filter) => <button key={filter} type="button" aria-pressed={auditFilter === filter} onClick={() => setAuditFilter(filter)} className={`min-h-10 rounded-lg border px-3 py-2 font-semibold ${auditFilter === filter ? "border-amber-300 bg-amber-400 text-slate-950" : "border-slate-600 bg-slate-800 text-white"}`}>{filter === "TODAS" ? "Todas" : filter === "BLOQUEADA" ? "Bloqueadas" : "Aprovadas"}</button>)}
        </div>
        <p className="mt-2 text-slate-400">Esta auditoria registra o consenso técnico e a validação inicial. A aprovação não garante execução: a Rita Risk ainda pode bloquear por limite diário ou risco preventivo. Os registros ficam somente neste navegador.</p>
        {auditVisible.length === 0 ? <p className="mt-2 text-slate-300">Nenhuma decisão encontrada neste filtro.</p> : <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">{auditVisible.slice(0, 20).map((entry) => <div key={entry.id} className="rounded border border-slate-700 p-2"><div className="flex flex-wrap items-center gap-2"><span className="font-bold">{new Date(entry.at).toLocaleString("pt-BR")} • {entry.symbol}</span><span className={`rounded px-2 py-1 font-bold ${entry.decision === "BLOQUEADA" ? "bg-amber-950 text-amber-200" : "bg-emerald-950 text-emerald-200"}`}>{entry.decision}</span></div><div className="mt-1">Ana: {entry.research} | Sofia: {entry.chart} | Sinal: {entry.signal}</div><div className="text-slate-300">Origem: {entry.source === "AUTOMATICO" ? "Ciclo automático" : entry.source === "MANUAL" ? "Operador" : "Análise"}</div><div className="mt-1 text-slate-300">Motivo: {entry.reason}</div></div>)}</div>}
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

      {market && showSignalCard && (
        <section className={`mt-4 rounded-xl border-2 p-3 ${market.signal === "COMPRA" ? "border-green-500 bg-green-950/40" : market.signal === "VENDA" ? "border-red-500 bg-red-950/40" : "border-slate-500 bg-slate-900"}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#d4af37]">{signalUsed ? "SINAL ENCERRADO • NOVA ANÁLISE NECESSÁRIA" : riskBlocked ? "SINAL BLOQUEADO PELA RITA RISK" : !market.riskApproved || market.signal === "AGUARDAR" ? "SEM APROVAÇÃO DE RISCO" : "SINAL APROVADO"} • {market.symbol}</span>
            <div className="flex shrink-0 items-center gap-2"><span className={`rounded px-2 py-0.5 text-sm font-black ${market.signal === "COMPRA" ? "bg-green-500 text-slate-900" : market.signal === "VENDA" ? "bg-red-500" : "bg-slate-600"}`}>{market.signal === "VENDA" ? "VENDA (SHORT)" : market.signal === "COMPRA" ? "COMPRA (LONG)" : "AGUARDAR"}</span><button type="button" aria-label="Fechar painel do sinal" title="Fechar painel do sinal" onClick={() => setShowSignalCard(false)} className="rounded px-2 py-1 text-lg font-bold text-slate-300 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">×</button></div>
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
            <li>🛡 {riskBlocked ? <>Análise técnica: {market.research.trend === market.chart.trend && market.signal !== "AGUARDAR" ? `consenso para ${market.signal}` : "sem consenso operacional"}; autorização final: <strong className="text-red-400">BLOQUEADA pela Rita Risk</strong>.</> : <>Rita Risk: {market.riskNote}</>}</li>
            <li>⚡ Execução: {signalUsed ? "sinal utilizado/encerrado; rode novo ciclo" : riskBlocked ? "BLOQUEADA pela Rita Risk; nenhuma ordem autorizada" : market.signal === "AGUARDAR" ? "aguardando consenso, nenhuma ordem" : !market.riskApproved ? "não autorizada pela Rita Risk" : `${market.signal} liberada`}</li>
          </ul>
          {preventiveWarning && <p role="alert" className="mt-2 text-xs text-red-400">{preventiveWarning}</p>}
          {market.signal !== "AGUARDAR" && market.riskApproved && <button disabled={riskBlocked || signalUsed} onClick={execute} className="mt-3 w-full rounded-lg bg-[#d4af37] py-2 font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-40">{signalUsed ? "Sinal encerrado — rode novo ciclo" : riskBlocked ? "Bloqueado pela Rita Risk" : `Executar ${market.signal} na Conta Demo ✓`}</button>}
        </section>
      )}

      <section className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-3" aria-label="Desempenho da conta demo">
        <h2 className="font-bold text-[#d4af37]">Painel de Desempenho (Demo)</h2>
        <p className="mt-1 text-xs text-slate-400">Calculado apenas sobre operações encerradas salvas neste navegador. Não representa resultados de uma conta real.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded bg-slate-800 p-2">P&L acumulado<br /><b className={performance.netPnl >= 0 ? "text-green-400" : "text-red-400"}>{fmt(performance.netPnl)} USDT</b></div>
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

      <section className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-3" aria-label="Diagnóstico da estratégia demo">
        <h2 className="font-bold text-[#d4af37]">Diagnóstico da Estratégia (Demo)</h2>
        <p className="mt-1 text-xs text-slate-400">Análise somente de leitura de {diagnostics.total} operações encerradas neste navegador. Não recomenda nem executa ordens.</p>
        {diagnostics.excluded > 0 && <p className="mt-2 text-xs text-amber-300">{diagnostics.excluded} operação(ões) ignorada(s) por dados inválidos ou incompletos.</p>}
        {diagnostics.total === 0 ? <p className="mt-3 text-sm text-slate-300">Ainda não há operações válidas para diagnosticar.</p> : (
          <div className="mt-3 space-y-4 text-xs">
            {([{ title: "Por direção", groups: diagnostics.bySide }, { title: "Por tipo de saída", groups: diagnostics.byExit }]).map(section => (
              <div key={section.title}>
                <h3 className="mb-2 font-semibold text-white">{section.title}</h3>
                <div className="space-y-2">
                  {section.groups.map(group => (
                    <div key={group.label} className="rounded bg-slate-800 p-2">
                      <div className="flex items-center justify-between gap-2"><b>{group.label}</b><b className={group.netPnl >= 0 ? "text-green-400" : "text-red-400"}>{fmt(group.netPnl)} USDT</b></div>
                      <p className="mt-1 text-slate-300">{group.count} operações • {group.wins} ganhos • {group.losses} perdas • Acerto {fmt(group.winRate, 1)}% • Média {fmt(group.averagePnl)} USDT</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-400">Os mesmos trades aparecem nos dois agrupamentos; não some os resultados das duas seções. Resultados históricos não garantem desempenho futuro.</p>
      </section>

      <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <h2 className="font-bold text-[#d4af37]">Posições Abertas & Histórico de Trades</h2>
        <div className="mt-2 rounded border border-slate-700 p-2 text-xs"><button type="button" onClick={exportDemoBackup} className="rounded bg-slate-700 px-3 py-2 font-semibold text-white">Exportar backup demo (.json)</button><div className="mt-3"><label htmlFor="demo-backup-preview" className="mb-2 block font-semibold text-white">Conferir arquivo de backup demo</label><label htmlFor="demo-backup-preview" className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-amber-300 bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-sm focus-within:ring-2 focus-within:ring-amber-200">📂 Selecionar backup (.json)</label><input id="demo-backup-preview" aria-label="Selecionar arquivo de backup demo JSON" type="file" accept=".json,application/json" className="sr-only" onChange={async (event) => { setBackupPreview(null); setBackupRaw(null); setIntegrityResult(null); setRestoreAcknowledged(false); setBackupError(""); const file = event.currentTarget.files?.[0]; if (!file) return; try { if (file.size > 2_000_000) throw new Error("Arquivo muito grande (máximo 2 MB)."); const raw = await file.text(); setBackupPreview(previewDemoBackup(raw)); setBackupRaw(raw); } catch (err) { setBackupError(err instanceof Error ? err.message : "Backup inválido."); } event.currentTarget.value = ""; }} /><p className="mt-1 text-amber-300">Somente conferência: não importa, não substitui e não executa operações.</p>{backupPreview && <div className="mt-2 rounded bg-slate-800 p-2" role="status"><b>Backup válido para prévia (versão 1)</b><div>Exportado em: {new Date(backupPreview.exportedAt).toLocaleString("pt-BR")}</div><div>Saldo: {fmt(backupPreview.balance)} USDT • Banca: {fmt(backupPreview.bank)} USDT</div><div>Ativo: {backupPreview.symbol} • Posições: {backupPreview.positions} • Trades: {backupPreview.trades}</div><div>Auditorias: {backupPreview.audit} • Edições de metas: {backupPreview.targetEdits}</div></div>}{backupPreview && backupRaw && <div className="mt-3 rounded border border-slate-600 bg-slate-800 p-3"><button type="button" onClick={checkBackupIntegrity} className="min-h-11 w-full rounded-lg bg-emerald-600 px-3 py-3 text-sm font-bold text-white">Verificar integridade dos dados atuais</button><p className="mt-2 text-slate-300">Compara este arquivo com os dados salvos neste navegador. Somente leitura: não restaura nem modifica operações.</p>{integrityResult && <div role="status" className={`mt-2 rounded p-2 ${integrityResult.ok ? "bg-emerald-950 text-emerald-200" : "bg-amber-950 text-amber-200"}`}>{integrityResult.ok ? <b>✓ Backup íntegro: os dados atuais conferem com o arquivo selecionado.</b> : <><b>Diferenças encontradas entre o arquivo e os dados atuais:</b><ul className="mt-1 list-disc pl-5">{integrityResult.differences.map((difference, index) => <li key={index}>{difference}</li>)}</ul><p className="mt-2">Diferenças são esperadas se a conta mudou após a exportação. Nenhum dado foi alterado.</p></>}</div>}</div>}{backupPreview && <div className="mt-3 rounded border border-amber-500/60 bg-slate-900 p-3"><b className="text-amber-300">Restaurar dados demo deste backup</b><p className="mt-1 text-slate-300">Substitui saldo, histórico, auditoria e metas deste navegador. Não sincroniza aparelhos. O piloto ficará manual. Backups com posições abertas não são aceitos.</p><p className="mt-2 text-amber-200">Antes de continuar, use “Exportar backup demo (.json)” acima e guarde a cópia atual.</p><label className="mt-3 flex items-start gap-2 text-slate-200"><input type="checkbox" className="mt-1" checked={restoreAcknowledged} onChange={(event) => setRestoreAcknowledged(event.target.checked)} /><span>Já salvei o backup atual e entendo que os dados locais serão substituídos.</span></label><button type="button" disabled={!restoreAcknowledged || !backupRaw || positions.length > 0} onClick={() => setShowRestoreConfirm(true)} className="mt-3 rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Restaurar backup demo</button>{positions.length > 0 && <p className="mt-2 text-red-300">Restauração bloqueada enquanto houver posições abertas.</p>}</div>}</div><p className="mt-1 text-slate-400">Salva uma cópia local de posições, histórico, auditoria e saldo demo, sem chave de API. Não sincroniza entre aparelhos. A restauração exige arquivo válido, confirmação explícita e ausência de posições abertas.</p>{backupError && <p role="alert" className="mt-1 text-red-400">{backupError}</p>}</div>
        <p className="text-xs text-slate-400">{settings.symbol} cotação demo: {quoteAt ? fmt(live) : "indisponível"} • {quoteAt ? `Atualizada às ${new Date(quoteAt).toLocaleTimeString("pt-BR")}` : "Aguardando cotação"}</p>
        <p className="text-xs text-amber-300">Stop/Take demo monitorados somente enquanto esta página estiver ativa. Não há proteção garantida com o app fechado ou sem conexão.</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded bg-slate-800 p-2">Saldo Realizado<br /><b>{fmt(balance)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">Patrimônio<br /><b>{fmt(balance + floating)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">P&L Flutuante<br /><b className={floating >= 0 ? "text-green-400" : "text-red-400"}>{fmt(floating)} USDT</b></div>
          <div className="rounded bg-slate-800 p-2">Win Rate<br /><b>{fmt(winRate, 1)}%</b> ({trades.length})</div>
        </div>
        <div className="mt-3 rounded border border-amber-600/40 bg-slate-800 p-3 text-xs">
          <div className="flex justify-between gap-2"><b>Rita Risk • Limite diário demo</b><b className={dailyRisk.blocked ? "text-red-400" : "text-green-400"}>{dailyRisk.blocked ? "NOVAS ORDENS BLOQUEADAS" : "Dentro do limite"}</b></div>
          <div className="mt-1">Perdas realizadas hoje: {fmt(dailyRisk.loss)} / {fmt(dailyRisk.limit)} USDT (1% da banca configurada)</div>
          <div>Limite restante: {fmt(dailyRisk.remaining)} USDT • {dailyRisk.count} fechamento(s) hoje</div>
          <p className="mt-1 text-slate-400">Somamos perdas brutas, sem compensar lucros. A data segue o horário local do dispositivo. Trades antigos sem data não entram no cálculo. O bloqueio impede novas ordens demo, mas permite encerrar posições existentes.</p>
        </div>
        <div className="mt-3 space-y-1">
          {positions.length === 0 && <p className="text-xs text-slate-500">Nenhuma posição aberta.</p>}
          {positions.length > 1 && <button onClick={closeAll} className="w-full rounded bg-red-600 py-1.5 text-xs font-bold">Encerrar Todas</button>}
          {positions.map((p) => {
            const quoteAvailable = p.symbol === settings.symbol && quoteAt > 0 && Date.now() - quoteAt <= 15000;
            const target = demoProfitTarget(p.side, p.entry, p.sl, p.tp, p.qty, quoteAvailable ? live : null);
            const pnl = target?.currentPnl ?? 0;
            return (
              <div key={p.id} className="rounded border border-slate-700 p-2 text-xs">
                <div className="flex justify-between"><b className={p.side === "COMPRA" ? "text-green-400" : "text-red-400"}>{p.side} {p.symbol}</b><b className={pnl >= 0 ? "text-green-400" : "text-red-400"}>{target?.currentPnl === null || !target ? "Cotação indisponível" : `${fmt(pnl)} USDT`}</b></div>
                <div className="text-slate-400">Entrada {fmt(p.entry)} • SL {fmt(p.sl)} • TP {fmt(p.tp)} • Qtd {fmt(p.qty, 5)}</div>
                {p.excursion && <div className="mt-1 text-slate-300">Desde o início do monitoramento: maior lucro observado <span className="text-green-400">+{fmt(p.excursion.maxFavorablePnl)} USDT</span> • maior perda observada <span className="text-red-400">{fmt(p.excursion.maxAdversePnl)} USDT</span>. Não inclui períodos sem cotação.</div>}
                {target && (
                  <div className="my-2 rounded bg-slate-800 p-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="text-green-400">Alvo de lucro: +{fmt(target.targetProfit)} USDT</span>
                      <span className="text-red-400">Risco: -{fmt(target.plannedLoss)} USDT</span>
                    </div>
                    <div className="mt-1 text-slate-300">Risco/retorno: 1:{fmt(target.riskReward, 2)} • TP: {fmt(p.tp)}</div>
                    <div className="mt-2 h-2 overflow-hidden rounded bg-slate-700" role="progressbar" aria-label="Progresso até o alvo de lucro" aria-valuenow={target.progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded bg-green-500" style={{ width: `${target.progress ?? 0}%` }} />
                    </div>
                    <div className="mt-1 text-slate-400">{target.progress === null ? "Progresso indisponível sem cotação recente" : `${fmt(target.progress, 1)}% do lucro-alvo atingido`}</div>
                    <div className="mt-1 text-slate-500">Estimativas demo antes de taxas e slippage; a barra não prevê o preço futuro.</div>
                  </div>
                )}
                <div className="text-slate-400">Origem: {p.provenance ? `${p.provenance.openedBy} (${p.provenance.openedVia}) • Aprovado: ${p.provenance.approvedBy} • Risco planejado: ${fmt(p.provenance.plannedRisk)} USDT` : "não registrada (posição antiga)"}</div>
                {target && (
                  <div className="mt-2">
                    {editingTargetId === p.id ? (
                      <div className="space-y-2 rounded border border-amber-600/50 p-2">
                        <label className="block">Novo lucro-alvo (USDT)
                          <input aria-label="Novo lucro-alvo em USDT" type="number" min="0.01" step="0.01" value={editProfit} onChange={(e) => setEditProfit(e.target.value)} className="mt-1 w-full rounded bg-slate-700 p-2 text-white" />
                        </label>
                        <label className="block">Novo risco máximo (USDT, só pode diminuir)
                          <input aria-label="Novo risco máximo em USDT" type="number" min="0.01" step="0.01" value={editRisk} onChange={(e) => setEditRisk(e.target.value)} className="mt-1 w-full rounded bg-slate-700 p-2 text-white" />
                        </label>
                        <p className="text-slate-400">A alteração atualiza o TP e SL da posição demo. Rita Risk bloqueia aumento do risco. O monitoramento exige a página ativa.</p>
                        {editTargetError && <p role="alert" className="text-red-400">{editTargetError}</p>}
                        <div className="flex gap-2">
                          <button onClick={() => saveTargetEdit(p.id)} className="rounded bg-green-700 px-3 py-2 font-bold">Salvar metas</button>
                          <button onClick={() => { setEditingTargetId(null); setEditTargetError(""); }} className="rounded bg-slate-600 px-3 py-2">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingTargetId(p.id); setEditProfit(target.targetProfit.toFixed(2)); setEditRisk(Math.min(target.plannedLoss, p.provenance?.plannedRisk ?? target.plannedLoss).toFixed(2)); setEditTargetError(""); }} className="rounded border border-amber-500 px-3 py-2 text-amber-300">Editar metas demo</button>
                    )}
                  </div>
                )}
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
                {t.excursion && <div className="mt-1 text-[11px] text-slate-300">Máximo lucro observado: +{fmt(t.excursion.maxFavorablePnl)} USDT • Máxima perda observada: {fmt(t.excursion.maxAdversePnl)} USDT • Realizado: {fmt(t.pnl)} USDT. Apenas durante monitoramento ativo.</div>}
                {t.exitVariance && (
                  <div className="mt-1 rounded bg-slate-800 p-2 text-[11px]">
                    <div>Rita Risk • {t.result === "SL" ? "Stop Loss" : "Take Profit"} configurado: {fmt(t.exitVariance.plannedPrice)} • Saída efetiva: {fmt(t.exitVariance.actualPrice)}</div>
                    <div>Resultado previsto: {fmt(t.exitVariance.plannedPnl)} USDT • Realizado: {fmt(t.exitVariance.actualPnl)} USDT</div>
                    <div className={t.exitVariance.difference < -0.005 ? "text-red-400" : "text-green-400"}>
                      Diferença de execução: {t.exitVariance.difference >= 0 ? "+" : ""}{fmt(t.exitVariance.difference)} USDT
                      {t.result === "SL" && t.exitVariance.difference < -0.005 ? " • Risco excedido" : ""}
                    </div>
                  </div>
                )}
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
