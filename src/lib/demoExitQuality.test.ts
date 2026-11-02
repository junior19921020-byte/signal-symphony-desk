import { describe, expect, it } from "vitest";
import { demoExitQuality } from "./demoExitQuality";
const record = (difference: number, result = "SL") => ({ result, exitVariance: { plannedPrice: 100, actualPrice: 101, plannedPnl: -10, actualPnl: -10 + difference, difference } });
describe("demoExitQuality", () => {
  it("classifies differences and computes impacts without counting manual exits", () => {
    const data = [record(-3.38), record(2, "TP"), record(0), record(-100, "MANUAL"), {result:"SL"}, {result:"IA"}];
    expect(demoExitQuality(data)).toEqual({total:6,eligible:3,missing:3,atTarget:1,favorable:1,unfavorable:1,favorableImpact:2,unfavorableImpact:-3.38,netImpact:-1.38});
  });
  it("rejects incomplete and inconsistent historical records", () => {
    expect(demoExitQuality([{result:"TP",exitVariance:{plannedPrice:100,actualPrice:101,plannedPnl:1,actualPnl:2,difference:99}}, {result:"SL",exitVariance:null}])).toMatchObject({eligible:0,missing:2});
  });
  it("does not mutate trades", () => {
    const data = Object.freeze([Object.freeze(record(-1))]);
    expect(demoExitQuality(data).unfavorable).toBe(1);
  });
});
