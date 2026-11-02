export type MonitoringState = "SEM_COTACAO" | "DESATUALIZADA" | "PAUSADA" | "ATIVA";
export function demoMonitoringHealth(input: { price: number; quotedAt: number; now: number; visible: boolean; online: boolean }) {
  const { price, quotedAt, now, visible, online } = input;
  if (!visible || !online) return { state: "PAUSADA" as MonitoringState, reliable: false };
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quotedAt) || quotedAt <= 0 || quotedAt > now) return { state: "SEM_COTACAO" as MonitoringState, reliable: false };
  if (now - quotedAt > 15000) return { state: "DESATUALIZADA" as MonitoringState, reliable: false };
  return { state: "ATIVA" as MonitoringState, reliable: true };
}
