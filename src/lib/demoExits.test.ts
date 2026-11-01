import { describe, expect, it } from "vitest";
import { evaluateDemoExits, type DemoPositionLevels } from "./demoExits";

const now = 100000;
const buy: DemoPositionLevels = { id: "buy", symbol: "BTCUSDT", side: "COMPRA", entry: 100, sl: 90, tp: 120, qty: 1 };
const sell: DemoPositionLevels = { id: "sell", symbol: "BTCUSDT", side: "VENDA", entry: 100, sl: 110, tp: 80, qty: 1 };
const run = (positions: DemoPositionLevels[], price: number, quotedAt = now) =>
  evaluateDemoExits(positions, "BTCUSDT", price, quotedAt, now);

describe("demo stop/take exits", () => {
  it("closes long at or beyond SL", () => {
    expect(run([buy], 90)).toEqual([{ id: "buy", result: "SL" }]);
    expect(run([buy], 89)).toEqual([{ id: "buy", result: "SL" }]);
  });
  it("closes long at or beyond TP", () => {
    expect(run([buy], 120)).toEqual([{ id: "buy", result: "TP" }]);
    expect(run([buy], 121)).toEqual([{ id: "buy", result: "TP" }]);
  });
  it("closes short at or beyond SL/TP", () => {
    expect(run([sell], 110)).toEqual([{ id: "sell", result: "SL" }]);
    expect(run([sell], 80)).toEqual([{ id: "sell", result: "TP" }]);
  });
  it("does not close within bounds", () => {
    expect(run([buy, sell], 100)).toEqual([]);
  });
  it("ignores other symbols", () => {
    expect(run([{ ...buy, symbol: "ETHUSDT" }], 80)).toEqual([]);
  });
  it("rejects stale, future, invalid or missing quotes", () => {
    expect(run([buy], 80, now - 15001)).toEqual([]);
    expect(run([buy], 80, now + 1)).toEqual([]);
    expect(run([buy], 0)).toEqual([]);
    expect(run([buy], NaN)).toEqual([]);
  });
  it("rejects malformed position risk levels", () => {
    expect(run([{ ...buy, sl: 105 }], 80)).toEqual([]);
    expect(run([{ ...sell, tp: 105 }], 80)).toEqual([]);
    expect(run([{ ...buy, qty: 0 }], 80)).toEqual([]);
  });
  it("does not issue duplicate exits for the same position", () => {
    expect(run([buy], 80)).toEqual([{ id: "buy", result: "SL" }]);
  });
});
