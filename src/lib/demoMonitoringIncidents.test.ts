import { describe, expect, it } from "vitest";
import { summarizeMonitoringIncidents } from "./demoMonitoringIncidents";
describe("summarizeMonitoringIncidents", () => {
  it("measures completed and ongoing interruptions", () => {
    const events=[{at:1000,state:"ATIVA"},{at:2000,state:"DESATUALIZADA"},{at:19000,state:"ATIVA"},{at:21000,state:"PAUSADA"}];
    const result=summarizeMonitoringIncidents(events,23000);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({state:"PAUSADA",durationMs:2000,ongoing:true,severity:"ATENCAO"});
    expect(result[1]).toMatchObject({state:"DESATUALIZADA",durationMs:17000,ongoing:false,severity:"CRITICO"});
  });
  it("ignores future timestamps and never mutates input", () => {
    const events=Object.freeze([{at:20000,state:"ATIVA"},{at:1000,state:"SEM_COTACAO"}]);
    expect(summarizeMonitoringIncidents(events,15000)).toMatchObject([{durationMs:14000,ongoing:true}]);
  });
});
