import { describe, expect, it } from "vitest";
import { parseAuditHistory } from "./decisionAudit";

const valid = {
  id: "123-BTCUSDT-ANALISE", at: 123, symbol: "BTCUSDT",
  research: "BAIXA", chart: "ALTA", signal: "AGUARDAR",
  approved: false, decision: "BLOQUEADA", reason: "Sem consenso", source: "ANALISE",
};

describe("persistent decision audit", () => {
  it("restores a valid saved decision", () => {
    expect(parseAuditHistory(JSON.stringify([valid]))).toEqual([valid]);
  });
  it("fails closed for malformed storage", () => {
    expect(parseAuditHistory("{bad")).toEqual([]);
    expect(parseAuditHistory(JSON.stringify({ entries: [valid] }))).toEqual([]);
    expect(parseAuditHistory(null)).toEqual([]);
  });
  it("discards invalid records", () => {
    expect(parseAuditHistory(JSON.stringify([{ ...valid, approved: true }, { ...valid, reason: 4 }, valid]))).toEqual([valid]);
  });
  it("caps restored entries to 100", () => {
    expect(parseAuditHistory(JSON.stringify(Array.from({ length: 130 }, (_, i) => ({ ...valid, id: String(i) }))))).toHaveLength(100);
  });
});
