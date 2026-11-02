import { describe, expect, it } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { createPinnedRs256TokenVerifier } from "./demoJwtRs256Verifier";
import { createDemoCredentialVerifier } from "./demoCredentialVerifier";

const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
const owner = "123e4567-e89b-42d3-a456-426614174000";
const payload = { iss: "https://issuer.example.test", aud: "desk-demo",
  sub: owner, iat: 900, exp: 1100 };
const encode = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const jwt = (claims: unknown = payload, header: unknown = { alg: "RS256", typ: "JWT", kid: "test-key" }) => {
  const message = encode(header) + "." + encode(claims);
  return message + "." + sign("RSA-SHA256", Buffer.from(message), pair.privateKey).toString("base64url");
};
const verify = createPinnedRs256TokenVerifier({ keyId: "test-key", publicKeyPem });
const credential = createDemoCredentialVerifier(verify, {
  expectedIssuer: "https://issuer.example.test", expectedAudience: "desk-demo",
  maxTokenLifetimeSeconds: 300, clockSkewSeconds: 0,
}, () => 1000);

describe("Node RS256 pinned JWT cryptographic verification", () => {
  it("accepts a valid signed token and derives the owner", async () => {
    expect((await credential(jwt()))?.ownerId).toBe(owner);
  });
  it("rejects modified payload and invalid signatures", async () => {
    const original = jwt();
    const parts = original.split(".");
    parts[1] = encode({ ...payload, sub: "223e4567-e89b-42d3-a456-426614174000" });
    expect(await credential(parts.join("."))).toBeNull();
    expect(await credential(original.slice(0, -2) + "ab")).toBeNull();
  });
  it("rejects alg none, HS256, unknown key and unsafe header fields", async () => {
    for (const header of [
      { alg: "none", typ: "JWT", kid: "test-key" },
      { alg: "HS256", typ: "JWT", kid: "test-key" },
      { alg: "RS256", typ: "JWT", kid: "other" },
      { alg: "RS256", typ: "JWT", kid: "test-key", jku: "https://attacker.test" },
    ]) expect(await credential(jwt(payload, header))).toBeNull();
  });
  it("rejects expired, wrong issuer, wrong audience and future-issued tokens", async () => {
    for (const claims of [
      { ...payload, exp: 999 },
      { ...payload, iss: "https://other.test" },
      { ...payload, aud: "another-app" },
      { ...payload, iat: 1001 },
    ]) expect(await credential(jwt(claims))).toBeNull();
  });
  it("rejects malformed tokens", async () => {
    expect(await verify("not-a-jwt")).toBeNull();
    expect(await verify("a.b.c.d")).toBeNull();
  });
});
