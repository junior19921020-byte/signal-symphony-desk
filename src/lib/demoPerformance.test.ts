import { describe, expect, it } from "vitest";
import { demoPerformance } from "./demoPerformance";
describe("demo performance", () => {
  it("handles empty history", () => {
    const p = demoPerformance([]);
    expect(p.count).toBe(0);
    expect(p.profitFactor).toBeNull();
    expect(p.maxDrawdown).toBe(0);
  });
  it("calculates P&L, win rate and realized drawdown in chronological order", () => {
    const p = demoPerformance([
      { pnl: 50, result: "MANUAL" },
      { pnl: -80, result: "SL" },
      { pnl: 20, result: "TP" },
    ]);
    expect(p.netPnl).toBe(-10);
    expect(p.winRate).toBeCloseTo(200 / 3);
    expect(p.maxDrawdown).toBe(80);
    expect(p.averageWin).toBe(35);
    expect(p.averageLoss).toBe(80);
    expect(p.profitFactor).toBeCloseTo(0.875);
    expect(p.manualClosures).toBe(1);
    expect(p.automatedClosures).toBe(2);
  });
  it("ignores invalid P&L values", () => {
    expect(demoPerformance([{ pnl: Number.NaN, result: "MANUAL" }]).count).toBe(0);
  });
});
