import { describe, expect, it } from "vitest";
import { preventiveRiskGate } from "./preventiveRisk";
const now = new Date(2026,10,1,12).getTime();
const p = (risk:number)=>({entry:100,sl:100+risk,qty:1});
describe("preventive Rita Risk gate",()=>{
 it("rejects proposed order above remaining daily budget",()=>expect(preventiveRiskGate([{pnl:-70,closedAt:now}],[],p(40),now,10000)).toMatch(/supera/));
 it("includes open positions risk",()=>expect(preventiveRiskGate([], [p(70)],p(40),now,10000)).toMatch(/supera/));
 it("accepts when all exposure fits",()=>expect(preventiveRiskGate([{pnl:-20,closedAt:now}],[p(30)],p(40),now,10000)).toBeNull());
 it("rejects exhausted daily limit",()=>expect(preventiveRiskGate([{pnl:-101,closedAt:now}],[],p(1),now,10000)).toMatch(/atingido/));
 it("rejects invalid parameters",()=>expect(preventiveRiskGate([],[],p(NaN),now,10000)).toMatch(/inválidos/));
});
