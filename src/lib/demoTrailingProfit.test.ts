import { describe, expect, it } from "vitest";
import { simulateTrailingProfit } from "./demoTrailingProfit";
const base = { entry: 100, side: "COMPRA" as const, qty: 1, activateAtUsdt: 5, trailDistanceUsdt: 3 };
describe("sampled trailing-profit comparison (read-only)", () => {
  it("arms at target and exits on first sampled pullback, recording floor breach", () => {
    const r = simulateTrailingProfit({ ...base, observedPrices: [100, 102, 106, 110, 108, 105, 103] })!;
    expect(r.activatedAtIndex).toBe(2);
    expect(r.peakPnl).toBe(10);
    expect(r.exitIndex).toBe(5);
    expect(r.floorAtExit).toBe(7);
    expect(r.exitPnl).toBe(5);
    expect(r.floorBreached).toBe(true);
  });
  it("does not exit before activation or without pullback", () => {
    const r = simulateTrailingProfit({ ...base, observedPrices: [100, 102, 106, 108] })!;
    expect(r.exitIndex).toBeNull();
    expect(r.floorBySample.slice(0, 2)).toEqual([null, null]);
  });
  it("supports short positions", () => {
    const r = simulateTrailingProfit({ ...base, side: "VENDA", observedPrices: [100, 94, 90, 96] })!;
    expect(r.exitIndex).toBe(3);
    expect(r.exitPnl).toBe(4);
  });
  it("rejects invalid inputs and does not invent missing samples", () => {
    expect(simulateTrailingProfit({ ...base, trailDistanceUsdt: 6, observedPrices: [100] })).toBeNull();
    expect(simulateTrailingProfit({ ...base, observedPrices: [100, Number.NaN] })).toBeNull();
  });
});
