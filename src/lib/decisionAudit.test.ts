import { describe, expect, it } from "vitest";
import { appendAudit, auditDecision } from "./decisionAudit";
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
    const result = Array.from({ length: 105 }).reduce(
      (items, _, i) => appendAudit(items, { ...entry, id: String(i) }), [] as typeof entry[],
    );
    expect(result).toHaveLength(100);
    expect(result[0].id).toBe("104");
    expect(result[99].id).toBe("5");
  });
});
