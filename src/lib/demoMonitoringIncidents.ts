export type MonitoringEvent = { at: number; state: string; reason?: "ABA_OCULTA" | "SEM_REDE" };
export type MonitoringIncident = { start: number; end: number | null; durationMs: number; state: string; reason?: MonitoringEvent["reason"]; severity: "PAUSA" | "ATENCAO" | "CRITICO"; ongoing: boolean };
export function summarizeMonitoringIncidents(events: readonly MonitoringEvent[], now: number): MonitoringIncident[] {
  if (!Number.isFinite(now) || now <= 0) return [];
  const sorted = [...events].filter(e => Number.isFinite(e.at) && e.at > 0 && e.at <= now)
    .sort((a,b) => a.at - b.at);
  const incidents: MonitoringIncident[] = [];
  for (let i=0;i<sorted.length;i++) {
    const current = sorted[i];
    if (current.state === "ATIVA") continue;
    const next = sorted[i+1];
    const end = next ? next.at : null;
    const durationMs = Math.max(0,(end ?? now)-current.at);
    const userPaused = current.state === "PAUSADA" && current.reason === "ABA_OCULTA";
    incidents.push({start:current.at,end,durationMs,state:current.state,reason:current.reason,
      severity:userPaused ? "PAUSA" : durationMs >= 15000 ? "CRITICO" : "ATENCAO",ongoing:end === null});
  }
  return incidents.reverse();
}
