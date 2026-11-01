import { describe, expect, it } from "vitest";
import { marketCandlesFresh, type Candle } from "./trading";

const now = 1_800_000_000_000;
const candles = (interval: number, count: number, lastAge: number, price = 100): Candle[] =>
  Array.from({ length: count }, (_, i) => ({
    t: now - lastAge - (count - 1 - i) * interval,
    o: price, h: price + 1, l: price - 1, c: price, v: 10, buyV: 5,
  }));

describe("market data freshness gate", () => {
  it("accepts fresh consistent candles", () => {
    expect(marketCandlesFresh(candles(900000, 60, 300000), candles(300000, 12, 120000), now)).toBe(true);
  });
  it("rejects stale five-minute candles", () => {
    expect(marketCandlesFresh(candles(900000, 60, 300000), candles(300000, 12, 660000), now)).toBe(false);
  });
  it("rejects stale fifteen-minute candles", () => {
    expect(marketCandlesFresh(candles(900000, 60, 1260000), candles(300000, 12, 120000), now)).toBe(false);
  });
  it("rejects conflicting prices across intervals", () => {
    expect(marketCandlesFresh(candles(900000, 60, 300000, 100), candles(300000, 12, 120000, 104), now)).toBe(false);
  });
  it("rejects missing or malformed candles", () => {
    expect(marketCandlesFresh([], candles(300000, 12, 120000), now)).toBe(false);
    const bad = candles(900000, 60, 300000);
    bad[5]!.c = NaN;
    expect(marketCandlesFresh(bad, candles(300000, 12, 120000), now)).toBe(false);
  });
  it("rejects future candles and nonmonotonic timestamps", () => {
    const future = candles(300000, 12, -120000);
    expect(marketCandlesFresh(candles(900000, 60, 300000), future, now)).toBe(false);
    const bad = candles(300000, 12, 120000);
    bad[3]!.t = bad[2]!.t;
    expect(marketCandlesFresh(candles(900000, 60, 300000), bad, now)).toBe(false);
  });
});
