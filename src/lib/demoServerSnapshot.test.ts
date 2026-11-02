import { describe, expect, it } from "vitest";
import { validateDemoServerSnapshot, type DemoServerSnapshot } from "./demoServerSnapshot";
const sample: DemoServerSnapshot = {
  schemaVersion:1,mode:"DEMO",ownerId:"test-owner",revision:1,capturedAt:1000,
  positions:[{id:"p1",symbol:"BTCUSDT",side:"COMPRA",quantity:0.01,entry:80000,stopLoss:79000,takeProfit:82000}]
};
describe("validateDemoServerSnapshot", () => {
  it("accepts a structurally valid DEMO snapshot", () => {
    expect(validateDemoServerSnapshot(sample,"test-owner",2000).valid).toBe(true);
  });
  it("rejects wrong owner, future timestamp, duplicate IDs and invalid protections", () => {
    expect(validateDemoServerSnapshot(sample,"other",2000).valid).toBe(false);
    expect(validateDemoServerSnapshot({...sample,capturedAt:3000},"test-owner",2000).valid).toBe(false);
    expect(validateDemoServerSnapshot({...sample,positions:[...sample.positions,...sample.positions]},"test-owner",2000).valid).toBe(false);
    expect(validateDemoServerSnapshot({...sample,positions:[{...sample.positions[0],stopLoss:81000}]},"test-owner",2000).valid).toBe(false);
  });
  it("rejects nonpositive prices and wrong stop direction for sells", () => {
    expect(validateDemoServerSnapshot({...sample,positions:[{...sample.positions[0],quantity:0}]},"test-owner",2000).valid).toBe(false);
    expect(validateDemoServerSnapshot({...sample,positions:[{...sample.positions[0],side:"VENDA"}]},"test-owner",2000).valid).toBe(false);
  });
});
