import { describe, expect, it } from "vitest";
import { editDemoTargets } from "./editDemoTargets";
const short = { side: "VENDA" as const, entry: 77954, sl: 78109.91, tp: 77642.18, qty: 0.6414, provenance: { plannedRisk: 100 } };
describe("edit demo targets", () => {
 it("edits short TP and reduces risk", () => {
   const x = editDemoTargets(short, 250, 50);
   expect("error" in x).toBe(false);
   if ("tp" in x) { expect(x.tp).toBeCloseTo(77954 - 250 / 0.6414); expect(x.sl).toBeCloseTo(77954 + 50 / 0.6414); }
 });
 it("blocks risk increases", () => { expect(editDemoTargets(short, 250, 101)).toHaveProperty("error"); });
 it("blocks risk increase even within original budget after stop tightening", () => {
   expect(editDemoTargets({ ...short, sl: 78000 }, 200, 50)).toHaveProperty("error");
 });
 it("edits long", () => {
   const x = editDemoTargets({side:"COMPRA",entry:100,sl:90,tp:120,qty:2,provenance:{plannedRisk:20}},40,10);
   expect(x).toEqual({tp:120,sl:95});
 });
 it("rejects impossible prices and invalid input", () => {
   expect(editDemoTargets(short, 1000000, 50)).toHaveProperty("error");
   expect(editDemoTargets(short, NaN, 50)).toHaveProperty("error");
   expect(editDemoTargets(short, 100, -1)).toHaveProperty("error");
 });
});
