export type MonitoringState = "SEM_COTACAO" | "DESATUALIZADA" | "FALHA_ATUALIZACAO" | "PAUSADA" | "ATIVA";
export function demoMonitoringHealth(input: { price: number; quotedAt: number; now: number; visible: boolean; online: boolean; lastAttemptFailed?: boolean }) {
  const { price, quotedAt, now, visible, online, lastAttemptFailed = false } = input;
  if (!visible || !online) return { state: "PAUSADA" as MonitoringState, reliable: false };
  if (!Number.isFinite(now) || now <= 0 || !Number.isFinite(price) || price <= 0 ||
    !Number.isFinite(quotedAt) || quotedAt <= 0 || quotedAt > now)
    return { state: lastAttemptFailed ? "FALHA_ATUALIZACAO" as MonitoringState : "SEM_COTACAO" as MonitoringState, reliable: false };
  if (now - quotedAt > 15000) return { state: "DESATUALIZADA" as MonitoringState, reliable: false };
  if (lastAttemptFailed) return { state: "FALHA_ATUALIZACAO" as MonitoringState, reliable: false };
  return { state: "ATIVA" as MonitoringState, reliable: true };
}
