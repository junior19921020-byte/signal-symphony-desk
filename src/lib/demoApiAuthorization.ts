/**
 * Stage 61: transport-independent API authorization boundary.
 * This is NOT a deployed endpoint, token verifier or database connection.
 * Only a trusted server adapter may construct VerifiedDemoPrincipal.
 */
import {
  assessDemoAgentAuthorization,
  type DemoCapability,
  type DemoDirector,
} from "./demoAgentCapabilities";

declare const verifiedPrincipalBrand: unique symbol;
export type VerifiedDemoPrincipal = {
  readonly ownerId: string;
  readonly [verifiedPrincipalBrand]: true;
};

export type TrustedPrincipalVerifier = (
  credential: string
) => Promise<VerifiedDemoPrincipal | null>;

export type DemoApiRequest = {
  credential: string | null;
  claimedOwnerId?: string;
  resourceOwnerId: string;
  director: DemoDirector;
  capability: DemoCapability;
  mode: "DEMO";
  targetOrderId?: string;
};

export type TrustedRiskApproval = {
  approvalId: string;
  orderId: string;
  ownerId: string;
  valid: boolean;
};

export type TrustedRiskApprovalLookup = (
  ownerId: string,
  orderId: string
) => Promise<TrustedRiskApproval | null>;

export type DemoApiDecision = {
  allowed: boolean;
  status: 200 | 401 | 403;
  reason: string;
  ownerId?: string;
};

export async function authorizeDemoApiRequest(
  request: DemoApiRequest,
  verifyPrincipal: TrustedPrincipalVerifier,
  findRiskApproval: TrustedRiskApprovalLookup
): Promise<DemoApiDecision> {
  const deny = (status: 401 | 403, reason: string): DemoApiDecision =>
    ({ allowed: false, status, reason });
  if (request.mode !== "DEMO") return deny(403, "Modo não permitido");
  if (!request.credential) return deny(401, "Credencial ausente");
  let principal: VerifiedDemoPrincipal | null;
  try {
    principal = await verifyPrincipal(request.credential);
  } catch {
    return deny(401, "Falha na verificação da identidade");
  }
  if (!principal?.ownerId) return deny(401, "Identidade não verificada");
  // Ignore claimedOwnerId: browser claims never establish identity.
  if (principal.ownerId !== request.resourceOwnerId)
    return deny(403, "Recurso pertence a outro usuário");

  let approval: TrustedRiskApproval | null = null;
  if (request.capability === "demo_order:simulate") {
    if (!request.targetOrderId) return deny(403, "Ordem ausente");
    try {
      approval = await findRiskApproval(principal.ownerId, request.targetOrderId);
    } catch {
      return deny(403, "Falha ao consultar aprovação de risco");
    }
  }
  const result = assessDemoAgentAuthorization({
    mode: "DEMO",
    authenticatedOwnerId: principal.ownerId,
    resourceOwnerId: request.resourceOwnerId,
    serverVerifiedIdentity: true,
    director: request.director,
    capability: request.capability,
    targetOrderId: request.targetOrderId,
    riskApprovalId: approval?.approvalId,
    riskApprovalOwnerId: approval?.ownerId,
    riskApprovalOrderId: approval?.orderId,
    riskApprovalValid: approval?.valid === true,
  });
  if (!result.allowed) return deny(403, result.reason);
  return { allowed: true, status: 200, reason: result.reason, ownerId: principal.ownerId };
}
