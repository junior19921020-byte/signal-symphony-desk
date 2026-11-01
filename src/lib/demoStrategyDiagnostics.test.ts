import { describe, expect, it } from "vitest";
import { demoStrategyDiagnostics } from "./demoStrategyDiagnostics";

describe("demoStrategyDiagnostics", () => {
  it("groups by side and exit without double-counting", () => {
    const data = [
      { side: "COMPRA" as const, result: "TP" as const, pnl: 30 },
      { side: "COMPRA" as const, result: "SL" as const, pnl: -50 },
      { side: "VENDA" as const, result: "MANUAL" as const, pnl: 10 },
      { side: "VENDA" as const, result: "IA" as const, pnl: -5 },
    ];
    const result = demoStrategyDiagnostics(data);
    expect(result.total).toBe(4);
    expect(result.bySide.map(x => x.netPnl)).toEqual([-20, 5]);
    expect(result.byExit.map(x => x.netPnl)).toEqual([30, -50, -5, 10]);
    expect(result.bySide[0].winRate).toBe(50);
    expect(result.bySide.reduce((s,x)=>s+x.netPnl,0)).toBe(-15);
  });
  it("handles empty and invalid data safely", () => {
    const result = demoStrategyDiagnostics([{ side: "COMPRA", result: "TP", pnl: NaN }]);
    expect(result.total).toBe(0);
    expect(result.excluded).toBe(1);
    expect(result.bySide[0].averagePnl).toBe(0);
  });
});
