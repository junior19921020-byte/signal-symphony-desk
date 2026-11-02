/**
 * Stage 62: server-side credential validation contract only.
 * NOT a JWT decoder, cryptographic verifier, login server or deployed API.
 * The trusted adapter MUST validate the token signature and algorithm against
 * pinned keys before returning VerifiedTokenClaims.
 */
import type { TrustedPrincipalVerifier, VerifiedDemoPrincipal } from "./demoApiAuthorization";

declare const cryptoVerifiedClaimsBrand: unique symbol;
export type CryptoVerifiedTokenClaims = {
  readonly [cryptoVerifiedClaimsBrand]: true;
  readonly issuer: string;
  readonly audience: readonly string[];
  readonly subject: string;
  readonly expiresAtSeconds: number;
  readonly notBeforeSeconds?: number;
  readonly issuedAtSeconds?: number;
  readonly tokenId?: string;
};

export type TrustedCryptoTokenVerifier = (
  credential: string
) => Promise<CryptoVerifiedTokenClaims | null>;

export type DemoIdentityConfig = {
  expectedIssuer: string;
  expectedAudience: string;
  maxTokenLifetimeSeconds: number;
  clockSkewSeconds: number;
};

const credentialPattern = /^[A-Za-z0-9_\-.]+$/;
const subjectPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createDemoCredentialVerifier(
  cryptoVerify: TrustedCryptoTokenVerifier,
  config: DemoIdentityConfig,
  nowSeconds: () => number = () => Date.now() / 1000
): TrustedPrincipalVerifier {
  return async (credential: string): Promise<VerifiedDemoPrincipal | null> => {
    if (!credential || credential.length > 8192 || !credentialPattern.test(credential))
      return null;
    if (!config.expectedIssuer || !config.expectedAudience ||
        !Number.isFinite(config.maxTokenLifetimeSeconds) ||
        config.maxTokenLifetimeSeconds <= 0 ||
        !Number.isFinite(config.clockSkewSeconds) ||
        config.clockSkewSeconds < 0 || config.clockSkewSeconds > 120)
      return null;
    try {
      const claims = await cryptoVerify(credential);
      if (!claims) return null;
      const now = nowSeconds();
      if (!Number.isFinite(now) ||
          claims.issuer !== config.expectedIssuer ||
          !Array.isArray(claims.audience) ||
          !claims.audience.includes(config.expectedAudience) ||
          !subjectPattern.test(claims.subject) ||
          !Number.isFinite(claims.expiresAtSeconds) ||
          !Number.isFinite(claims.issuedAtSeconds) ||
          claims.issuedAtSeconds === undefined ||
          claims.expiresAtSeconds <= now - config.clockSkewSeconds ||
          claims.issuedAtSeconds > now + config.clockSkewSeconds ||
          claims.expiresAtSeconds <= claims.issuedAtSeconds ||
          claims.expiresAtSeconds - claims.issuedAtSeconds > config.maxTokenLifetimeSeconds ||
          (claims.notBeforeSeconds !== undefined &&
           (!Number.isFinite(claims.notBeforeSeconds) ||
            claims.notBeforeSeconds > now + config.clockSkewSeconds)))
        return null;
      // Runtime owner identity is derived from verified subject, never browser owner_id.
      return { ownerId: claims.subject } as VerifiedDemoPrincipal;
    } catch {
      return null;
    }
  };
}
