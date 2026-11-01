import { describe, expect, it } from "vitest";
import { observeDemoExcursion } from "./demoExcursion";
describe("observed demo excursions", () => {
  it("tracks favorable and adverse excursions without resetting extrema", () => {
    const p = {side: "COMPRA" as const, entry: 100, qty: 2};
    const a = observeDemoExcursion(p, 110, 1000, 1000)!;
    const b = observeDemoExcursion({...p, excursion: a}, 95, 2000, 2000)!;
    expect(b.maxFavorablePnl).toBe(20);
    expect(b.maxAdversePnl).toBe(-10);
    expect(b.firstObservedAt).toBe(1000);
  });
  it("handles short positions", () => {
    expect(observeDemoExcursion({side:"VENDA",entry:100,qty:2},90,1000,1000)?.maxFavorablePnl).toBe(20);
  });
  it("rejects stale, future and invalid quotes", () => {
    const p = {side:"COMPRA" as const,entry:100,qty:1};
    expect(observeDemoExcursion(p,110,1000,17001)).toBeNull();
    expect(observeDemoExcursion(p,110,2000,1000)).toBeNull();
    expect(observeDemoExcursion(p,NaN,1000,1000)).toBeNull();
  });
});