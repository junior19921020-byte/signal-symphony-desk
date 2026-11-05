import { describe, expect, it } from "vitest";
import { appendAudit, auditDecision, type DecisionAudit } from "./decisionAudit";
import type { Market } from "./trading";

const market = (overrides: Record<string, unknown> = {}): Market => ({
  symbol: "BTCUSDT", signal: "AGUARDAR", riskApproved: false,
  riskNote: "Sem consenso", research: { trend: "BAIXA" },
  chart: { trend: "ALTA" }, ...overrides,
} as unknown as Market);

describe("decision audit", () => {
  it("records disagreement as blocked with agent votes", () => {
    const entry = auditDecision(market(), "ANALISE", 123);
    expect(entry.decision).toBe("BLOQUEADA");
    expect(entry.research).toBe("BAIXA");
    expect(entry.chart).toBe("ALTA");
    expect(entry.reason).toBe("Sem consenso");
    expect(entry.at).toBe(123);
  });
  it("does not approve a veto even with a directional signal", () => {
    const entry = auditDecision(market({ signal: "COMPRA", riskApproved: false }), "MANUAL");
    expect(entry.approved).toBe(false);
  });
  it("keeps only the latest 100 entries", () => {
    const entry = auditDecision(market(), "AUTOMATICO");
    const result = Array.from({ length: 105 }).reduce<DecisionAudit[]>(
      (items, _, i) => appendAudit(items, { ...entry, id: String(i) }), [],
    );
    expect(result).toHaveLength(100);
    expect(result[0]?.id).toBe("104");
    expect(result[99]?.id).toBe("5");
  });
});

import { auditEvidence as evidenceOf, parseAuditHistory as parseHist } from "./decisionAudit";
describe("audit evidence", () => {
  const legacy = { id: "1", at: 1000, symbol: "BTCUSDT", research: "ALTA", chart: "ALTA", signal: "COMPRA", approved: true, decision: "APROVADA", reason: "ok", source: "MANUAL" };
  it("legacy entries without metadata are unverifiable, not invented", () => {
    const [e] = parseHist(JSON.stringify([legacy]));
    const ev = evidenceOf(e!);
    expect(ev.quoteOrigin).toBe("DESCONHECIDO");
    expect(ev.quoteLines.find((l) => l.label === "Valor")?.value).toBe("não registrado / não verificável");
  });
  it("approval never implies a real order", () => {
    const [e] = parseHist(JSON.stringify([{ ...legacy, quote: { provider: "Binance", symbol: "BTCUSDT", price: 100, fetchedAt: 900, lastCandleAt: 800 } }]));
    const ev = evidenceOf(e!);
    expect(ev.quoteOrigin).toBe("EXTERNO");
    expect(ev.execution).toBe("DEMO_LOCAL");
    expect(ev.executionText).toMatch(/sem identificador/);
  });
  it("quote without provider is not called real", () => {
    const [e] = parseHist(JSON.stringify([{ ...legacy, quote: { provider: "X", symbol: "BTCUSDT", price: 100, fetchedAt: 900 } }]));
    expect(evidenceOf(e!).quoteOrigin).toBe("DESCONHECIDO");
  });
});
