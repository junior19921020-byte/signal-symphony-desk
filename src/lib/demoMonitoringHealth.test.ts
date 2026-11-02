import { describe, expect, it } from "vitest";
import { demoMonitoringHealth } from "./demoMonitoringHealth";
const base = { price: 80000, quotedAt: 1000, now: 2000, visible: true, online: true };
describe("demoMonitoringHealth", () => {
  it("allows fresh quote only when page is visible and online", () => expect(demoMonitoringHealth(base)).toMatchObject({state:"ATIVA",reliable:true}));
  it("fails closed on stale, future and invalid quotes", () => {
    expect(demoMonitoringHealth({...base,now:17001}).reliable).toBe(false);
    expect(demoMonitoringHealth({...base,quotedAt:3000}).reliable).toBe(false);
    expect(demoMonitoringHealth({...base,price:0}).reliable).toBe(false);
  });
  it("distinguishes a failed fetch from a missing or stale quote", () => {
    expect(demoMonitoringHealth({...base,lastAttemptFailed:true}).state).toBe("FALHA_ATUALIZACAO");
    expect(demoMonitoringHealth({...base,lastAttemptFailed:true}).reliable).toBe(false);
    expect(demoMonitoringHealth({...base,price:0,lastAttemptFailed:true}).state).toBe("FALHA_ATUALIZACAO");
    expect(demoMonitoringHealth({...base,now:17001,lastAttemptFailed:true}).state).toBe("DESATUALIZADA");
  });
  it("pauses when hidden or offline", () => {
    expect(demoMonitoringHealth({...base,visible:false}).state).toBe("PAUSADA");
    expect(demoMonitoringHealth({...base,online:false}).state).toBe("PAUSADA");
  });
});
