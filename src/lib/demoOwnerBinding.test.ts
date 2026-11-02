import { describe, expect, it } from "vitest";
import { validateDemoOwnerBinding } from "./demoOwnerBinding";

const now = 1_800_000_000_000;
const principal = { ownerId: "owner_A", authenticated: true, mode: "DEMO" as const };
const decision = {
  ownerId: "owner_A", decisionId: "rita_1", positionId: "pos_1",
  approved: true, mode: "DEMO" as const, issuedAt: now - 1000, expiresAt: now + 1000,
};
const intent = { ownerId: "owner_A", positionId: "pos_1", mode: "DEMO" as const };
const check = (
  p: Parameters<typeof validateDemoOwnerBinding>[0] = principal,
  d: Parameters<typeof validateDemoOwnerBinding>[1] = decision,
  i: Parameters<typeof validateDemoOwnerBinding>[2] = intent,
  t = now
) => validateDemoOwnerBinding(p, d, i, t).allowed;

describe("DEMO owner binding — fail closed", () => {
  it("accepts only matching authenticated DEMO context", () => expect(check()).toBe(true));
  it("rejects missing context", () => {
    expect(check(null)).toBe(false);
    expect(check(principal, null)).toBe(false);
    expect(check(principal, decision, null)).toBe(false);
  });
  it("rejects cross-owner decision and position", () => {
    expect(check(principal, { ...decision, ownerId: "owner_B" })).toBe(false);
    expect(check(principal, decision, { ...intent, ownerId: "owner_B" })).toBe(false);
  });
  it("rejects decision replay for a different position", () =>
    expect(check(principal, decision, { ...intent, positionId: "pos_2" })).toBe(false));
  it("rejects veto, unauthenticated principal and non-DEMO mode", () => {
    expect(check(principal, { ...decision, approved: false })).toBe(false);
    expect(check({ ...principal, authenticated: false })).toBe(false);
    expect(check({ ...principal, mode: "LIVE" as "DEMO" })).toBe(false);
    expect(check(principal, { ...decision, mode: "LIVE" as "DEMO" })).toBe(false);
  });
  it("rejects expiry, future issue and malformed timestamps", () => {
    expect(check(principal, decision, intent, decision.expiresAt)).toBe(false);
    expect(check(principal, { ...decision, issuedAt: now + 1 })).toBe(false);
    expect(check(principal, { ...decision, expiresAt: Number.NaN })).toBe(false);
  });
  it("rejects invalid identifiers", () => {
    expect(check({ ...principal, ownerId: "" })).toBe(false);
    expect(check(principal, { ...decision, decisionId: "bad id" })).toBe(false);
  });
});
