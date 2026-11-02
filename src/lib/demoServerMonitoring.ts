/**
 * Pure DEMO server-monitoring safety contract. No orders, scheduler, storage,
 * external API or background process is started by this module.
 */
export type DemoMonitorStatus = "UNCONFIGURED" | "HEALTHY" | "STALE" | "INVALID";
export type DemoMonitorHeartbeat = {
  mode: "DEMO";
  generatedAt: number;
  quoteAt: number;
  price: number;
  positionSnapshotAt: number;
  riskApproved: boolean;
};
export type DemoMonitorAssessment = {
  status: DemoMonitorStatus;
  mayEvaluateDemoExit: boolean;
  reason: string;
};
export function assessDemoServerMonitoring(
  heartbeat: DemoMonitorHeartbeat | null,
  now: number,
  maxAgeMs = 15000
): DemoMonitorAssessment {
  const deny = (status: DemoMonitorStatus, reason: string): DemoMonitorAssessment =>
    ({ status, mayEvaluateDemoExit: false, reason });
  if (!heartbeat) return deny("UNCONFIGURED", "Nenhum serviço independente conectado");
  if (!Number.isFinite(now) || now <= 0 || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0)
    return deny("INVALID", "Relógio ou limite inválido");
  const { generatedAt, quoteAt, positionSnapshotAt, price, riskApproved, mode } = heartbeat;
  if (mode !== "DEMO" || !Number.isFinite(price) || price <= 0 || !riskApproved ||
    ![generatedAt, quoteAt, positionSnapshotAt].every(t => Number.isFinite(t) && t > 0 && t <= now))
    return deny("INVALID", "Dados ou autorização de risco inválidos");
  if ([generatedAt, quoteAt, positionSnapshotAt].some(t => now - t > maxAgeMs))
    return deny("STALE", "Heartbeat, cotação ou posições desatualizados");
  return { status: "HEALTHY", mayEvaluateDemoExit: true, reason: "Dados DEMO recentes; apenas avaliação, sem execução" };
}
