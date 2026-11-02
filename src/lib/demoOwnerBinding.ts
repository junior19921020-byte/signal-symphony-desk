/**
 * Stage 73: DEMO-only authorization boundary between authenticated principal,
 * immutable Rita decision, and the proposed position. Pure validation only.
 * This is NOT a database policy, signed-token verifier, or live order endpoint.
 */
export type DemoOwnerPrincipal = {
  ownerId: string;
  authenticated: boolean;
  mode: "DEMO";
};
export type DemoRitaAuthorization = {
  ownerId: string;
  decisionId: string;
  positionId: string;
  approved: boolean;
  mode: "DEMO";
  issuedAt: number;
  expiresAt: number;
};
export type DemoPositionIntent = {
  ownerId: string;
  positionId: string;
  mode: "DEMO";
};
export type DemoOwnerBindingResult = {
  allowed: boolean;
  reason: string;
};
const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export function validateDemoOwnerBinding(
  principal: DemoOwnerPrincipal | null,
  decision: DemoRitaAuthorization | null,
  intent: DemoPositionIntent | null,
  now: number
): DemoOwnerBindingResult {
  const deny = (reason: string): DemoOwnerBindingResult => ({ allowed: false, reason });
  if (!principal || !decision || !intent) return deny("Contexto de autorização ausente");
  if (principal.authenticated !== true || principal.mode !== "DEMO" ||
      decision.mode !== "DEMO" || intent.mode !== "DEMO")
    return deny("Identidade não autenticada ou modo não DEMO");
  if (![principal.ownerId, decision.ownerId, intent.ownerId, decision.decisionId,
        decision.positionId, intent.positionId].every(validId))
    return deny("Identificador inválido");
  if (principal.ownerId !== decision.ownerId || principal.ownerId !== intent.ownerId)
    return deny("Proprietários diferentes");
  if (decision.positionId !== intent.positionId)
    return deny("Decisão não pertence à posição");
  if (decision.approved !== true) return deny("Rita Risk vetou ou não aprovou");
  if (![now, decision.issuedAt, decision.expiresAt].every(Number.isSafeInteger) ||
      now <= 0 || decision.issuedAt <= 0 || decision.issuedAt > now ||
      decision.expiresAt <= decision.issuedAt || now >= decision.expiresAt)
    return deny("Autorização vencida ou relógio inválido");
  return { allowed: true, reason: "Vínculo DEMO consistente; não executa ordem" };
}
