import type { Market } from "./trading";
import { demoOrderRejection } from "./demoRisk";

export interface DecisionAudit {
  id: string;
  at: number;
  symbol: string;
  research: string;
  chart: string;
  signal: string;
  approved: boolean;
  decision: "BLOQUEADA" | "APROVADA";
  reason: string;
  source: "ANALISE" | "MANUAL" | "AUTOMATICO";
  quote?: AuditQuote | null;
}

/** Records a snapshot of the risk decision, never an exchange order. */
export function auditDecision(m: Market, source: DecisionAudit["source"], at = Date.now()): DecisionAudit {
  const reason = m.signal === "AGUARDAR"
    ? (m.riskNote || "Sem consenso entre Pesquisa e Gráfico.")
    : demoOrderRejection(m, m.signal, m.symbol);
  return {
    id: `${at}-${m.symbol}-${source}`,
    at, symbol: m.symbol,
    research: m.research.trend,
    chart: m.chart.trend,
    signal: m.signal,
    approved: reason === null || reason === "",
    decision: reason ? "BLOQUEADA" : "APROVADA",
    reason: reason || "Consenso direcional e validação de risco aprovados.",
    source,
    quote: captureQuote(m),
  };
}

export function appendAudit(history: DecisionAudit[], item: DecisionAudit): DecisionAudit[] {
  return [item, ...history].slice(0, 100);
}

/** Treat browser storage as untrusted; discard invalid or oversized entries. */
export function parseAuditHistory(raw: string | null): DecisionAudit[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is DecisionAudit => {
      if (!item || typeof item !== "object") return false;
      const x = item as Partial<DecisionAudit>;
      return typeof x.id === "string" && x.id.length <= 120 &&
        typeof x.at === "number" && Number.isFinite(x.at) && x.at > 0 &&
        typeof x.symbol === "string" && x.symbol.length <= 30 &&
        ["ALTA", "BAIXA", "LATERAL"].includes(x.research ?? "") &&
        ["ALTA", "BAIXA", "LATERAL"].includes(x.chart ?? "") &&
        ["COMPRA", "VENDA", "AGUARDAR"].includes(x.signal ?? "") &&
        typeof x.approved === "boolean" &&
        (x.decision === "APROVADA" || x.decision === "BLOQUEADA") &&
        x.approved === (x.decision === "APROVADA") &&
        typeof x.reason === "string" && x.reason.length <= 1000 &&
        ["ANALISE", "MANUAL", "AUTOMATICO"].includes(x.source ?? "");
    }).slice(0, 100).map((x) => ({ ...x, quote: parseQuote((x as { quote?: unknown }).quote) }));
  } catch {
    return [];
  }
}

/** Quote metadata captured at decision time; absent on legacy entries. */
export interface AuditQuote {
  provider: "Binance" | "Bybit" | "Mista" | null;
  symbol: string;
  price: number;
  fetchedAt: number | null;
  lastCandleAt: number | null;
}

export function captureQuote(m: Market): AuditQuote {
  return {
    provider: m.source ?? null,
    symbol: m.symbol,
    price: m.price,
    fetchedAt: typeof m.fetchedAt === "number" && Number.isFinite(m.fetchedAt) ? m.fetchedAt : null,
    lastCandleAt: typeof m.lastCandleAt === "number" && Number.isFinite(m.lastCandleAt) ? m.lastCandleAt : null,
  };
}

export function parseQuote(raw: unknown): AuditQuote | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  const provider = q["provider"];
  if (typeof q["symbol"] !== "string" || num(q["price"]) === null) return null;
  return {
    provider: provider === "Binance" || provider === "Bybit" || provider === "Mista" ? provider : null,
    symbol: String(q["symbol"]).slice(0, 30),
    price: Number(q["price"]),
    fetchedAt: num(q["fetchedAt"]),
    lastCandleAt: num(q["lastCandleAt"]),
  };
}

const NR = "não registrado / não verificável";

export interface AuditEvidence {
  quoteOrigin: "EXTERNO" | "DESCONHECIDO";
  quoteLines: { label: string; value: string }[];
  agents: { name: string; value: string }[];
  execution: "DEMO_LOCAL" | "NAO_VERIFICAVEL";
  executionText: string;
  warnings: string[];
}

/** Read-only evidence view. Never infers real execution; never calls a quote real without provider metadata. */
export function auditEvidence(entry: DecisionAudit & { quote?: AuditQuote | null }): AuditEvidence {
  const q = entry.quote ?? null;
  const verified = !!q && q.provider !== null && q.fetchedAt !== null;
  const ts = (v: number | null | undefined) => (v ? new Date(v).toLocaleString("pt-BR") : NR);
  const age = q && q.fetchedAt !== null ? Math.round((entry.at - q.fetchedAt) / 1000) : null;
  const quoteLines = [
    { label: "Provedor", value: q?.provider ?? NR },
    { label: "Símbolo", value: q?.symbol ?? NR },
    { label: "Valor", value: q ? q.price.toFixed(2) : NR },
    { label: "Amostra coletada", value: ts(q?.fetchedAt) },
    { label: "Última vela", value: ts(q?.lastCandleAt) },
    { label: "Idade na decisão", value: age !== null && age >= 0 ? `${age}s` : NR },
    { label: "Natureza do dado", value: verified ? "Externo (API pública, sem assinatura)" : "Desconhecido" },
  ];
  const agents = [
    { name: "Ana (Pesquisa)", value: `${entry.research} • ${ts(entry.at)}` },
    { name: "Sofia (Gráfico)", value: `${entry.chart} • ${ts(entry.at)}` },
    { name: "Rita (Risco)", value: `${entry.decision} — ${entry.reason}` },
    { name: "Max (Execução)", value: NR },
  ];
  const warnings = ["Aprovação não é execução: nenhuma ordem real é inferida deste registro."];
  if (!verified) warnings.push("Cotação sem origem verificável registrada; não deve ser tratada como real.");
  return {
    quoteOrigin: verified ? "EXTERNO" : "DESCONHECIDO",
    quoteLines, agents,
    execution: entry.approved ? "DEMO_LOCAL" : "NAO_VERIFICAVEL",
    executionText: entry.approved
      ? "DEMO / simulação local — sem identificador nem confirmação de corretora."
      : "Sem execução registrada (decisão bloqueada ou em espera).",
    warnings,
  };
}
