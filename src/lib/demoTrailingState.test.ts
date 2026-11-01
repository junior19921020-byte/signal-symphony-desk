import { describe, expect, it } from "vitest";
import { observeDemoTrailing } from "./demoTrailingState";

const base = { side: "COMPRA" as const, entry: 100, qty: 1 };
const now = 100_000;

describe("observeDemoTrailing (read-only)", () => {
  it("arms after profit threshold and persists its peak", () => {
    const first = observeDemoTrailing(base, 105, now - 1000, now, 5, 3);
    expect(first?.state).toEqual({ activated: true, peakPnl: 5, lastQuotedAt: now - 1000 });
    const second = observeDemoTrailing({ ...base, trailing: first!.state }, 103, now, now, 5, 3);
    expect(second?.state.peakPnl).toBe(5);
    expect(second?.floor).toBe(2);
    expect(second?.breached).toBe(false);
  });

  it("rejects repeated and older quotes to avoid rewinding saved state", () => {
    const trailing = { activated: true, peakPnl: 10, lastQuotedAt: now };
    expect(observeDemoTrailing({ ...base, trailing }, 110, now, now, 5, 3)).toBeNull();
    expect(observeDemoTrailing({ ...base, trailing }, 110, now - 1, now, 5, 3)).toBeNull();
  });

  it("rejects stale, future, and invalid quotes", () => {
    expect(observeDemoTrailing(base, 106, now - 16000, now, 5, 3)).toBeNull();
    expect(observeDemoTrailing(base, 106, now + 1, now, 5, 3)).toBeNull();
    expect(observeDemoTrailing(base, NaN, now, now, 5, 3)).toBeNull();
  });

  it("does not erase state on invalid configuration", () => {
    const trailing = { activated: true, peakPnl: 10, lastQuotedAt: now - 1000 };
    expect(observeDemoTrailing({ ...base, trailing }, 106, now, now, 5, 5)).toBeNull();
    expect(trailing.peakPnl).toBe(10);
  });

  it("handles short positions without executing orders", () => {
    const observed = observeDemoTrailing({ side: "VENDA", entry: 100, qty: 1 }, 92, now, now, 5, 3);
    expect(observed?.state.peakPnl).toBe(8);
    expect(observed?.state.activated).toBe(true);
  });
});
