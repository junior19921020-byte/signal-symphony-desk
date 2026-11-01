import { describe, expect, it } from "vitest";
import { hasDirectionalConsensus, type Trend } from "./trading";

describe("Rita Risk consensus", () => {
  const trends: Trend[] = ["ALTA", "BAIXA", "LATERAL"];
  for (const a of trends) {
    for (const b of trends) {
      it(`${a} and ${b}`, () => {
        expect(hasDirectionalConsensus(a, b)).toBe(a === b && a !== "LATERAL");
      });
    }
  }
});
