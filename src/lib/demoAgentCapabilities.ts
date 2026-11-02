/**
 * Stage 60: pure authorization policy specification for future server-side use.
 * NOT an authentication system, API middleware, or runtime permission boundary.
 * Never accept role/owner identity asserted by a browser or autonomous agent.
 */
export type DemoDirector = "ANA" | "SOFIA" | "RITA" | "MAX";
export type DemoCapability =
  | "market:read" | "market:record"
  | "analysis:read" | "analysis:write"
  | "risk:read" | "risk:decide"
  | "demo_order:propose" | "demo_order:simulate"
  | "audit:read";

export type DemoAgentAuthorization = {
  mode: "DEMO";
  authenticatedOwnerId: string;
  resourceOwnerId: string;
  director: DemoDirector;
  capability: DemoCapability;
  serverVerifiedIdentity: boolean;
  riskApprovalId?: string;
  riskApprovalOwnerId?: string;
  riskApprovalOrderId?: string;
  targetOrderId?: string;
  riskApprovalValid?: boolean;
};

const capabilities: Readonly<Record<DemoDirector, readonly DemoCapability[]>> = {
  ANA: ["market:read", "market:record"],
  SOFIA: ["market:read", "analysis:read", "analysis:write"],
  RITA: ["market:read", "analysis:read", "risk:read", "risk:decide", "audit:read"],
  MAX: ["market:read", "risk:read", "demo_order:propose", "demo_order:simulate"],
};

export type DemoAuthorizationResult = { allowed: boolean; reason: string };

export function assessDemoAgentAuthorization(
  request: DemoAgentAuthorization | null
): DemoAuthorizationResult {
  const deny = (reason: string): DemoAuthorizationResult => ({ allowed: false, reason });
  if (!request || request.mode !== "DEMO") return deny("Apenas DEMO");
  if (request.serverVerifiedIdentity !== true) return deny("Identidade não verificada pelo servidor");
  if (!request.authenticatedOwnerId || !request.resourceOwnerId ||
      request.authenticatedOwnerId !== request.resourceOwnerId)
    return deny("Proprietário divergente");
  if (!Object.prototype.hasOwnProperty.call(capabilities, request.director))
    return deny("Diretor desconhecido");
  if (!capabilities[request.director].includes(request.capability))
    return deny("Capacidade não concedida ao diretor");
  if (request.capability === "demo_order:simulate") {
    if (!request.riskApprovalId || !request.targetOrderId ||
        request.riskApprovalOrderId !== request.targetOrderId ||
        request.riskApprovalOwnerId !== request.authenticatedOwnerId ||
        request.riskApprovalValid !== true)
      return deny("Simulação exige aprovação válida da Rita para esta ordem e proprietário");
  }
  return { allowed: true, reason: "Contrato DEMO permite a capacidade solicitada" };
}
