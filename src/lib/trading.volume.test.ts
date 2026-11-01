import { describe, expect, it } from "vitest";
import { analyze, parseKlines, type Candle } from "./trading";

const now = Date.now();
const candles = (n: number, step: number, verified: boolean): Candle[] =>
  Array.from({ length: n }, (_, i) => ({
    t: now - (n - i) * step,
    o: 100 + i * 0.1, h: 101 + i * 0.1, l: 99 + i * 0.1,
    c: 100.2 + i * 0.1, v: 10, buyV: verified ? 6 : NaN,
  }));

describe("verified buyer volume", () => {
  it("does not fabricate buyer volume from candles without taker data", () => {
    const parsed = parseKlines([[now, "100", "101", "99", "100.5", "10"]]);
    expect(Number.isNaN(parsed[0]!.buyV)).toBe(true);
  });
  it("blocks an otherwise directional trade if buyer volume is unavailable", () => {
    const m = analyze("BTCUSDT", candles(60, 900000, false), candles(12, 300000, false), 10000);
    expect(m.volumeVerified).toBe(false);
    expect(m.riskApproved).toBe(false);
    expect(m.signal).toBe("AGUARDAR");
    expect(m.riskNote).toContain("volume comprador real indisponível");
  });
  it("preserves verified volume from exchange klines", () => {
    const parsed = parseKlines([[now, "100", "101", "99", "100.5", "10", 0, 0, 0, "6"]]);
    expect(parsed[0]!.buyV).toBe(6);
    const m = analyze("BTCUSDT", candles(60, 900000, true), candles(12, 300000, true), 10000);
    expect(m.volumeVerified).toBe(true);
  });
});
