import { describe, expect, it } from "vitest";
import { assessDemoAgentAuthorization, type DemoAgentAuthorization } from "./demoAgentCapabilities";

const base: DemoAgentAuthorization = {
  mode: "DEMO", authenticatedOwnerId: "owner-a", resourceOwnerId: "owner-a",
  director: "ANA", capability: "market:record", serverVerifiedIdentity: true,
};
const assess = (overrides: Partial<DemoAgentAuthorization> = {}) =>
  assessDemoAgentAuthorization({ ...base, ...overrides });

describe("DEMO agent capability policy (pure contract only)", () => {
  it("permits Ana to record market data but not decide risk", () => {
    expect(assess().allowed).toBe(true);
    expect(assess({ capability: "risk:decide" }).allowed).toBe(false);
  });
  it("permits Sofia analysis but not order simulation", () => {
    expect(assess({ director: "SOFIA", capability: "analysis:write" }).allowed).toBe(true);
    expect(assess({ director: "SOFIA", capability: "demo_order:simulate" }).allowed).toBe(false);
  });
  it("only Rita can decide risk", () => {
    expect(assess({ director: "RITA", capability: "risk:decide" }).allowed).toBe(true);
    expect(assess({ director: "MAX", capability: "risk:decide" }).allowed).toBe(false);
  });
  it("Max requires matching risk approval to simulate", () => {
    const approval: Partial<DemoAgentAuthorization> = {
      director: "MAX", capability: "demo_order:simulate",
      riskApprovalId: "approval-1", targetOrderId: "order-1",
      riskApprovalOrderId: "order-1", riskApprovalOwnerId: "owner-a", riskApprovalValid: true,
    };
    expect(assess(approval).allowed).toBe(true);
    expect(assess({ ...approval, riskApprovalOrderId: "order-2" }).allowed).toBe(false);
    expect(assess({ ...approval, riskApprovalOwnerId: "owner-b" }).allowed).toBe(false);
    expect(assess({ ...approval, riskApprovalValid: false }).allowed).toBe(false);
    expect(assess({ director: "MAX", capability: "demo_order:simulate" }).allowed).toBe(false);
  });
  it("denies unverified identity and cross-owner access", () => {
    expect(assess({ serverVerifiedIdentity: false }).allowed).toBe(false);
    expect(assess({ resourceOwnerId: "owner-b" }).allowed).toBe(false);
  });
  it("fails closed for unknown director or capability", () => {
    expect(assess({ director: "UNKNOWN" as DemoAgentAuthorization["director"] }).allowed).toBe(false);
    expect(assess({ capability: "live_order:send" as DemoAgentAuthorization["capability"] }).allowed).toBe(false);
    expect(assessDemoAgentAuthorization(null).allowed).toBe(false);
    expect(assess({ mode: "REAL" as DemoAgentAuthorization["mode"] }).allowed).toBe(false);
  });
});
