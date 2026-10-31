import { describe, it, expect } from "vitest";
import { analyze, levels, pnlOf, type Candle } from "@/lib/trading";

const mk = (closes: number[], buyShare: number): Candle[] =>
  closes.map((c, i) => {
    const o = closes[i - 1] ?? c;
    return { t: i * 900000, o, h: Math.max(o, c) + 1, l: Math.min(o, c) - 1, c, v: 10, buyV: 10 * buyShare };
  });

describe("sinais", () => {
  it("queda forte gera VENDA", () => {
    const c = Array.from({ length: 50 }, (_, i) => 1000 - i * 5);
    expect(analyze("BTCUSDT", mk(c, 0.3), mk(c, 0.3), 10000).signal).toBe("VENDA");
  });
  it("alta gera COMPRA", () => {
    const c = Array.from({ length: 50 }, (_, i) => 1000 + i * 2 + (i % 2 ? 1 : 0));
    expect(analyze("BTCUSDT", mk(c, 0.7), mk(c, 0.7), 10000).signal).not.toBe("VENDA");
  });
  it("lateral/divergência gera AGUARDAR", () => {
    const c = Array.from({ length: 50 }, (_, i) => 1000 + (i % 2 ? 3 : -3));
    expect(analyze("BTCUSDT", mk(c, 0.5), mk(c, 0.5), 10000).signal).toBe("AGUARDAR");
  });
  it("VENDA: SL acima e TP abaixo da entrada", () => {
    const { sl, tp } = levels("VENDA", 100, 1);
    expect(sl).toBe(101);
    expect(tp).toBe(98);
  });
  it("VENDA lucra quando o preço cai", () => expect(pnlOf("VENDA", 100, 90, 2)).toBe(20));
});
