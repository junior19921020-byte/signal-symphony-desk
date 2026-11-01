import { describe, expect, it } from "vitest";
import { demoProfitTarget } from "./demoProfitTarget";

describe("demo profit target", () => {
  it("calculates short profit target and risk", () => {
    const x = demoProfitTarget("VENDA", 77954, 78109.91, 77642.18, 0.64140, 77954);
    expect(x?.targetProfit).toBeCloseTo(200.000548);
    expect(x?.plannedLoss).toBeCloseTo(100.000674);
    expect(x?.riskReward).toBeCloseTo(2, 3);
    expect(x?.progress).toBe(0);
  });
  it("calculates long target and progress", () => {
    const x = demoProfitTarget("COMPRA", 100, 90, 120, 2, 110);
    expect(x?.targetProfit).toBe(40);
    expect(x?.plannedLoss).toBe(20);
    expect(x?.progress).toBe(50);
  });
  it("clamps progress and keeps losses visible", () => {
    expect(demoProfitTarget("COMPRA", 100, 90, 120, 1, 80)?.progress).toBe(0);
    expect(demoProfitTarget("COMPRA", 100, 90, 120, 1, 125)?.progress).toBe(100);
    expect(demoProfitTarget("COMPRA", 100, 90, 120, 1, 80)?.currentPnl).toBe(-20);
  });
  it("does not fabricate live P&L without a quote", () => {
    const x = demoProfitTarget("VENDA", 100, 110, 80, 1, null);
    expect(x?.currentPnl).toBeNull();
    expect(x?.progress).toBeNull();
  });
  it("rejects malformed risk levels and quantities", () => {
    expect(demoProfitTarget("COMPRA", 100, 110, 120, 1, 100)).toBeNull();
    expect(demoProfitTarget("VENDA", 100, 90, 80, 1, 100)).toBeNull();
    expect(demoProfitTarget("VENDA", 100, 110, 80, 0, 100)).toBeNull();
  });
});
