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
