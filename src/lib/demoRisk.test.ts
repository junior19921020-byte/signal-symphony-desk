import { describe, expect, it } from "vitest";
import { demoOrderRejection } from "./demoRisk";
import type { Market } from "./trading";

const approved = {
  symbol: "BTCUSDT", signal: "COMPRA", riskApproved: true,
  price: 100, qty: 1, sl: 98, tp: 104, slDist: 2,
} as Market;

describe("demo order risk gate", () => {
  it("permits an approved buy", () => expect(demoOrderRejection(approved, "COMPRA", "BTCUSDT")).toBeNull());
  it("rejects missing analysis", () => expect(demoOrderRejection(null, "COMPRA", "BTCUSDT")).not.toBeNull());
  it("rejects Rita Risk veto", () => expect(demoOrderRejection({ ...approved, riskApproved: false }, "COMPRA", "BTCUSDT")).not.toBeNull());
  it("rejects opposite side", () => expect(demoOrderRejection(approved, "VENDA", "BTCUSDT")).not.toBeNull());
  it("rejects different symbol", () => expect(demoOrderRejection(approved, "COMPRA", "ETHUSDT")).not.toBeNull());
  it("rejects invalid quantity", () => expect(demoOrderRejection({ ...approved, qty: 0 }, "COMPRA", "BTCUSDT")).not.toBeNull());
  it("rejects inverted stop", () => expect(demoOrderRejection({ ...approved, sl: 102 }, "COMPRA", "BTCUSDT")).not.toBeNull());
  it("permits an approved sell", () => expect(demoOrderRejection({ ...approved, signal: "VENDA", sl: 102, tp: 96 }, "VENDA", "BTCUSDT")).toBeNull());
});
