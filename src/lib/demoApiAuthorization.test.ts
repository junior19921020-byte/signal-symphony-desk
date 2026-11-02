import { describe, expect, it, vi } from "vitest";
import {
  authorizeDemoApiRequest,
  type DemoApiRequest,
  type TrustedPrincipalVerifier,
  type TrustedRiskApprovalLookup,
  type VerifiedDemoPrincipal,
} from "./demoApiAuthorization";

const request: DemoApiRequest = {
  mode: "DEMO", credential: "opaque-token", claimedOwnerId: "owner-b",
  resourceOwnerId: "owner-a", director: "ANA", capability: "market:record",
};
// Test double only: production code must never cast or forge principals.
const verify: TrustedPrincipalVerifier = async token =>
  token === "opaque-token" ? ({ ownerId: "owner-a" } as VerifiedDemoPrincipal) : null;
const risk: TrustedRiskApprovalLookup = async (ownerId, orderId) => ({
  approvalId: "approval-1", ownerId, orderId, valid: true,
});
const authorize = (changes: Partial<DemoApiRequest> = {},
  verifier = verify, lookup = risk) =>
  authorizeDemoApiRequest({ ...request, ...changes }, verifier, lookup);

describe("DEMO API authorization boundary (no deployed API)", () => {
  it("uses verified identity rather than claimed owner", async () => {
    expect((await authorize()).allowed).toBe(true);
    expect((await authorize({ resourceOwnerId: "owner-b", claimedOwnerId: "owner-b" })).status).toBe(403);
  });
  it("rejects missing, invalid and failed authentication", async () => {
    expect((await authorize({ credential: null })).status).toBe(401);
    expect((await authorize({ credential: "invalid" })).status).toBe(401);
    expect((await authorize({}, async () => { throw Error("down"); })).status).toBe(401);
  });
  it("does not query approval for ordinary market reads", async () => {
    const lookup = vi.fn(risk);
    expect((await authorize({}, verify, lookup)).allowed).toBe(true);
    expect(lookup).not.toHaveBeenCalled();
  });
  it("blocks Max without valid Rita approval for matching order", async () => {
    const max: Partial<DemoApiRequest> = {
      director: "MAX", capability: "demo_order:simulate", targetOrderId: "order-1",
    };
    expect((await authorize(max)).allowed).toBe(true);
    expect((await authorize(max, verify, async () => null)).status).toBe(403);
    expect((await authorize(max, verify, async () => ({
      approvalId: "approval-1", ownerId: "owner-b", orderId: "order-1", valid: true,
    }))).status).toBe(403);
    expect((await authorize(max, verify, async () => ({
      approvalId: "approval-1", ownerId: "owner-a", orderId: "order-2", valid: true,
    }))).status).toBe(403);
    expect((await authorize(max, verify, async () => { throw Error("down"); })).status).toBe(403);
    expect((await authorize({ ...max, targetOrderId: undefined })).status).toBe(403);
  });
  it("does not let Ana approve risk or allow REAL mode", async () => {
    expect((await authorize({ capability: "risk:decide" })).status).toBe(403);
    expect((await authorize({ mode: "REAL" as DemoApiRequest["mode"] })).status).toBe(403);
  });
});
