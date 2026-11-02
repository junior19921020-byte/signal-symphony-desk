// Stage 67: server-only DEMO Rita decision envelope verification.
// Never bundle this module into client code or accept a public key from the request.
export type RitaEnvelope = Readonly<{
  version: 1;
  decisionId: string;
  ownerId: string;
  orderId: string;
  approved: boolean;
  issuedAt: number;
  expiresAt: number;
  issuer: 'signal-symphony-rita';
  audience: 'signal-symphony-demo-risk';
}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();
const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export function canonicalRitaPayload(v: RitaEnvelope): string {
  // Fixed order, no untrusted extra fields. JSON serialization is unambiguous.
  return JSON.stringify({
    version: v.version, decisionId: v.decisionId, ownerId: v.ownerId,
    orderId: v.orderId, approved: v.approved, issuedAt: v.issuedAt,
    expiresAt: v.expiresAt, issuer: v.issuer, audience: v.audience,
  });
}

export async function verifyRitaDecision(
  input: unknown,
  signature: Uint8Array,
  pinnedPublicKey: CryptoKey,
  expected: { ownerId: string; orderId: string; decisionId: string },
  nowMs: number,
): Promise<boolean> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const v = input as Record<string, unknown>;
  const keys = ['version','decisionId','ownerId','orderId','approved','issuedAt','expiresAt','issuer','audience'];
  if (Object.keys(v).length !== keys.length || keys.some((k) => !Object.hasOwn(v,k))) return false;
  if (v.version !== 1 || v.issuer !== 'signal-symphony-rita' || v.audience !== 'signal-symphony-demo-risk') return false;
  if (![v.ownerId,v.orderId,v.decisionId].every((id) => typeof id === 'string' && UUID.test(id))) return false;
  if (v.ownerId !== expected.ownerId || v.orderId !== expected.orderId || v.decisionId !== expected.decisionId) return false;
  if (typeof v.approved !== 'boolean' || !Number.isSafeInteger(v.issuedAt) || !Number.isSafeInteger(v.expiresAt)) return false;
  if (!Number.isFinite(nowMs) || v.issuedAt > nowMs || v.expiresAt <= nowMs ||
      v.expiresAt <= v.issuedAt || v.expiresAt - v.issuedAt > 300_000 ||
      nowMs - v.issuedAt > 300_000) return false;
  if (!(signature instanceof Uint8Array) || signature.length !== 256 ||
      pinnedPublicKey.algorithm.name !== 'RSASSA-PKCS1-v1_5' ||
      pinnedPublicKey.type !== 'public' || pinnedPublicKey.usages.includes('sign')) return false;
  try {
    return await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' }, pinnedPublicKey, signature,
      encoder.encode(canonicalRitaPayload(v as unknown as RitaEnvelope)),
    );
  } catch { return false; }
}
