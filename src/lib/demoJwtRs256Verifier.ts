/**
 * Stage 63: Node.js-only RS256 JWT signature verifier.
 * Server-side adapter only: never import this module into a browser bundle.
 * Uses a pinned public key; no remote JWKS or untrusted algorithm selection.
 */
import { createPublicKey, verify as verifySignature } from "node:crypto";
import type {
  CryptoVerifiedTokenClaims,
  TrustedCryptoTokenVerifier,
} from "./demoCredentialVerifier";

export type PinnedJwtKey = {
  readonly keyId: string;
  readonly publicKeyPem: string;
};

export function createPinnedRs256TokenVerifier(
  key: PinnedJwtKey
): TrustedCryptoTokenVerifier {
  if (!key.keyId || !key.publicKeyPem) throw new Error("Missing pinned verification key");
  const publicKey = createPublicKey(key.publicKeyPem);
  if (publicKey.asymmetricKeyType !== "rsa" ||
      (publicKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048)
    throw new Error("RSA public key must be at least 2048 bits");

  return async (credential: string): Promise<CryptoVerifiedTokenClaims | null> => {
    try {
      if (credential.length > 8192) return null;
      const parts = credential.split(".");
      if (parts.length !== 3 || parts.some(p => !p || !/^[A-Za-z0-9_-]+$/.test(p))) return null;
      // Reject non-canonical Base64URL (including ignored trailing bits) in every JWT segment.
      // Otherwise distinct token strings can decode to the same signed bytes.
      for (const part of parts) {
        if (Buffer.from(part, "base64url").toString("base64url") !== part) return null;
      }
      const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];
      const decode = (part: string): unknown => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
      const header = decode(headerPart);
      if (!header || typeof header !== "object") return null;
      const h = header as Record<string, unknown>;
      if (h["alg"] !== "RS256" || h["kid"] !== key.keyId ||
          h["typ"] !== "JWT" || h["crit"] !== undefined ||
          h["jku"] !== undefined || h["jwk"] !== undefined || h["x5u"] !== undefined)
        return null;
      const payload = decode(payloadPart);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
      const p = payload as Record<string, unknown>;
      const signature = Buffer.from(signaturePart, "base64url");
      if (signature.length !== (publicKey.asymmetricKeyDetails?.modulusLength ?? 0) / 8) return null;
      if (!verifySignature("RSA-SHA256", Buffer.from(headerPart + "." + payloadPart), publicKey, signature))
        return null;
      if (typeof p["iss"] !== "string" || typeof p["sub"] !== "string" ||
          typeof p["exp"] !== "number" || typeof p["iat"] !== "number" ||
          (p["nbf"] !== undefined && typeof p["nbf"] !== "number") ||
          !(typeof p["aud"] === "string" ||
            (Array.isArray(p["aud"]) && p["aud"].length > 0 && p["aud"].every(a => typeof a === "string"))))
        return null;
      const aud = p["aud"];
      const nbf = p["nbf"];
      const jti = p["jti"];
      return {
        issuer: p["iss"],
        subject: p["sub"],
        audience: typeof aud === "string" ? [aud] : aud as string[],
        expiresAtSeconds: p["exp"],
        issuedAtSeconds: p["iat"],
        notBeforeSeconds: typeof nbf === "number" ? nbf : undefined,
        tokenId: typeof jti === "string" ? jti : undefined,
      } as unknown as CryptoVerifiedTokenClaims;
    } catch {
      return null;
    }
  };
}
