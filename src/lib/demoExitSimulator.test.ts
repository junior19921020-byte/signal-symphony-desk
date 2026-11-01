import { describe, expect, it } from "vitest";
import { simulateDemoExits, diagnoseDemoExits } from "./demoExitSimulator";

const base = {
  entry: 100, side: "COMPRA" as const, qty: 1, stopLoss: 95, takeProfit: 110,
  observedPrices: [100, 106, 103, 111, 94],
  profitTargetUsdt: 5, protectAfterUsdt: 5, protectFloorUsdt: 3,
  agentExitIndex: 2,
};
describe("read-only demo exit simulator", () => {
  it("compares independently observed exit triggers", () => {
    const [tp, sl, target, protect, agent] = simulateDemoExits(base);
    expect(tp.exitIndex).toBe(3);
    expect(sl.exitIndex).toBe(4);
    expect(target.pnl).toBe(6);
    expect(protect.exitIndex).toBe(2);
    expect(protect.pnl).toBe(3);
    expect(agent.pnl).toBe(3);
  });
  it("supports short scenarios", () => {
    const [tp, sl] = simulateDemoExits({ ...base, side: "VENDA", stopLoss: 105, takeProfit: 90, observedPrices: [100, 106, 89] });
    expect(tp.exitIndex).toBe(2);
    expect(sl.exitIndex).toBe(1);
  });
  it("fails closed for missing price samples", () => {
    const results = simulateDemoExits({ ...base, observedPrices: [] });
    expect(results.every(result => result.pnl === null)).toBe(true);
  });
  it("does not fabricate agent decisions", () => {
    const result = simulateDemoExits({ ...base, agentExitIndex: undefined });
    expect(result[4].pnl).toBeNull();
  });
});

describe("demo exit diagnostics", () => {
  it("flags an observed protection floor breach and identifies the earlier target", () => {
    const d = diagnoseDemoExits({ ...base, observedPrices: [100,102,104,106,108,105,103,101], takeProfit: 110, profitTargetUsdt: 5, protectAfterUsdt: 3, protectFloorUsdt: 2, agentExitIndex: 3 })!;
    expect(d.peakObservedPnl).toBe(8);
    expect(d.protectionActualPnl).toBe(1);
    expect(d.protectionDifference).toBe(-1);
    expect(d.protectionBreached).toBe(true);
    expect(d.firstExit?.rule).toBe("PROFIT_TARGET");
    expect(d.firstExit?.exitIndex).toBe(3);
    expect(d.tiedFirstRules).toEqual(["PROFIT_TARGET", "AGENT"]);
  });
  it("handles no observed exits without inventing an execution", () => {
    const d = diagnoseDemoExits({ ...base, observedPrices: [100], agentExitIndex: undefined })!;
    expect(d.firstExit).toBeNull();
    expect(d.protectionBreached).toBe(false);
  });
});
