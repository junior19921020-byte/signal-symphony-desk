import { describe, expect, it } from "vitest";
import { marketSourcesAgree } from "./trading";

describe("market exchange provenance", () => {
  it("accepts two Binance intervals", () => expect(marketSourcesAgree("Binance", "Binance")).toBe(true));
  it("accepts two Bybit intervals", () => expect(marketSourcesAgree("Bybit", "Bybit")).toBe(true));
  it("rejects mixed exchanges", () => {
    expect(marketSourcesAgree("Binance", "Bybit")).toBe(false);
    expect(marketSourcesAgree("Bybit", "Binance")).toBe(false);
  });
  it("rejects missing or unsupported source", () => {
    expect(marketSourcesAgree("Indisponível", "Binance")).toBe(false);
    expect(marketSourcesAgree("", "Bybit")).toBe(false);
  });
});
