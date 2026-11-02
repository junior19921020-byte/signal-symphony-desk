import { describe, expect, it } from "vitest";
import { assessDemoServerMonitoring } from "./demoServerMonitoring";
const sample = { mode: "DEMO" as const, generatedAt: 10000, quoteAt: 10000, price: 80000, positionSnapshotAt: 10000, riskApproved: true };
describe("assessDemoServerMonitoring", () => {
  it("defaults to fail-closed without a running server", () => {
    expect(assessDemoServerMonitoring(null, 11000)).toMatchObject({status:"UNCONFIGURED",mayEvaluateDemoExit:false});
  });
  it("permits only DEMO evaluation when all inputs are fresh and approved", () => {
    expect(assessDemoServerMonitoring(sample, 11000)).toMatchObject({status:"HEALTHY",mayEvaluateDemoExit:true});
  });
  it("blocks stale heartbeat, quote and position snapshots", () => {
    for (const key of ["generatedAt","quoteAt","positionSnapshotAt"] as const) {
      expect(assessDemoServerMonitoring({...sample,[key]:1000}, 20000)).toMatchObject({status:"STALE",mayEvaluateDemoExit:false});
    }
  });
  it("blocks invalid price, future timestamps and missing risk approval", () => {
    expect(assessDemoServerMonitoring({...sample,price:0},11000).mayEvaluateDemoExit).toBe(false);
    expect(assessDemoServerMonitoring({...sample,quoteAt:12000},11000).mayEvaluateDemoExit).toBe(false);
    expect(assessDemoServerMonitoring({...sample,riskApproved:false},11000).mayEvaluateDemoExit).toBe(false);
    expect(assessDemoServerMonitoring(sample,11000,0).mayEvaluateDemoExit).toBe(false);
  });
});
