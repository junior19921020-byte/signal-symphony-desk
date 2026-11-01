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
    }).slice(0, 100);
  } catch {
    return [];
  }
}
