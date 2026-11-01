import { describe,it,expect } from "vitest";
import { evaluateExitVariance } from "./exitVariance";
describe("Rita Risk exit variance",()=>{
 const p={side:"VENDA" as const,entry:77762.01,sl:77793.11,tp:77699.8,qty:0.64299};
 it("detects stop loss overrun",()=>{const x=evaluateExitVariance(p,77796.01,"SL");expect(x?.difference).toBeCloseTo(-2.9*0.64299);expect(x?.plannedPrice).toBe(77793.11);});
 it("detects take profit improvement",()=>{const x=evaluateExitVariance(p,77695,"TP");expect(x?.difference).toBeGreaterThan(0);});
 it("does not mislabel manual exit",()=>{expect(evaluateExitVariance(p,77750,"MANUAL")).toBeNull();});
 it("supports long",()=>{expect(evaluateExitVariance({side:"COMPRA",entry:100,sl:90,tp:120,qty:2},88,"SL")?.difference).toBe(-4);});
 it("rejects invalid data",()=>{expect(evaluateExitVariance({...p,qty:0},100,"SL")).toBeNull();});
});
