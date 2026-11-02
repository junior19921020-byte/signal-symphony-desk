import { describe, expect, it } from "vitest";
import {
  createDemoCredentialVerifier,
  type CryptoVerifiedTokenClaims,
  type TrustedCryptoTokenVerifier,
} from "./demoCredentialVerifier";

const owner = "123e4567-e89b-42d3-a456-426614174000";
const claims = {
  issuer: "https://identity.example.test",
  audience: ["signal-symphony-demo"],
  subject: owner,
  issuedAtSeconds: 900,
  expiresAtSeconds: 1100,
} as unknown as CryptoVerifiedTokenClaims;
const config = {
  expectedIssuer: "https://identity.example.test",
  expectedAudience: "signal-symphony-demo",
  maxTokenLifetimeSeconds: 300,
  clockSkewSeconds: 0,
};
const check = (changes: Partial<CryptoVerifiedTokenClaims> = {},
  verifier: TrustedCryptoTokenVerifier = async () => ({ ...claims, ...changes })) =>
  createDemoCredentialVerifier(verifier, config, () => 1000)("opaque.token");

describe("DEMO credential verification contract (mock crypto only)", () => {
  it("derives owner identity from trusted claims", async () => {
    expect((await check())?.ownerId).toBe(owner);
  });
  it("rejects issuer, audience, subject and time mismatches", async () => {
    expect(await check({ issuer: "https://other.test" })).toBeNull();
    expect(await check({ audience: ["another-app"] })).toBeNull();
    expect(await check({ subject: "browser-owner" })).toBeNull();
    expect(await check({ expiresAtSeconds: 1000 })).toBeNull();
    expect(await check({ issuedAtSeconds: 1001 })).toBeNull();
    expect(await check({ expiresAtSeconds: 1300 })).toBeNull();
    expect(await check({ notBeforeSeconds: 1001 })).toBeNull();
    expect(await check({ expiresAtSeconds: Number.NaN })).toBeNull();
  });
  it("fails closed when crypto adapter rejects or throws", async () => {
    expect(await check({}, async () => null)).toBeNull();
    expect(await check({}, async () => { throw Error("bad signature"); })).toBeNull();
  });
  it("rejects malformed and oversized credentials before crypto", async () => {
    const verify = createDemoCredentialVerifier(async () => claims, config, () => 1000);
    expect(await verify("")).toBeNull();
    expect(await verify("Bearer token")).toBeNull();
    expect(await verify("x".repeat(8193))).toBeNull();
  });
});
