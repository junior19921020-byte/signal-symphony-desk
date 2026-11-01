import { describe, expect, it } from "vitest";
import { evaluateDemoTrailing } from "./demoTrailingRisk";
const base = { side: "COMPRA" as const, entry: 100, qty: 1, price: 100, quotedAt: 100000, now: 100000, activateAtUsdt: 5, trailDistanceUsdt: 3 };
describe("demo trailing risk (pure; no order execution)", () => {
  it("waits, arms, then exits after a 3 USDT drawdown from the peak", () => {
    let previous;
    for (const price of [100, 102, 104, 106, 108, 110]) {
      const result = evaluateDemoTrailing({ ...base, price, previous });
      expect(result.shouldClose).toBe(false);
      if (result.next) previous = result.next;
    }
    const result = evaluateDemoTrailing({ ...base, price: 107, previous });
    expect(result).toMatchObject({ status: "EXIT", shouldClose: true, pnl: 7, floor: 7, breached: false });
  });
  it("supports short positions", () => {
    const armed = evaluateDemoTrailing({ ...base, side: "VENDA", price: 94 });
    const result = evaluateDemoTrailing({ ...base, side: "VENDA", price: 97, previous: armed.next ?? undefined });
    expect(result).toMatchObject({ status: "EXIT", pnl: 3, floor: 3 });
  });
  it("rejects stale and future quotes without changing state", () => {
    expect(evaluateDemoTrailing({ ...base, now: 116000 }).status).toBe("STALE");
    expect(evaluateDemoTrailing({ ...base, quotedAt: 100001 }).status).toBe("STALE");
  });
  it("rejects invalid prices and trailing configuration", () => {
    expect(evaluateDemoTrailing({ ...base, price: 0 }).status).toBe("INVALID");
    expect(evaluateDemoTrailing({ ...base, trailDistanceUsdt: 5 }).status).toBe("INVALID");
  });
  it("does not close on the first activation observation", () => {
    expect(evaluateDemoTrailing({ ...base, price: 106 })).toMatchObject({ status: "ARMED", shouldClose: false });
  });
  it("flags sampled price gaps beyond the floor", () => {
    const previous = { peakPnl: 10, activated: true };
    expect(evaluateDemoTrailing({ ...base, price: 4 + 100, previous })).toMatchObject({ status: "EXIT", breached: true, pnl: 4, floor: 7 });
  });
});
