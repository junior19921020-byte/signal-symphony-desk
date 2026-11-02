import { describe, expect, it } from 'vitest';
import { canonicalRitaPayload, verifyRitaDecision, type RitaEnvelope } from './demoRitaOrigin';
const a = '00000000-0000-0000-0000-000000000067';
const b = '10000000-0000-0000-0000-000000000067';
const c = '20000000-0000-0000-0000-000000000067';
const now = 1_800_000_000_000;
const envelope: RitaEnvelope = {
  version: 1, decisionId: c, ownerId: a, orderId: b, approved: true,
  issuedAt: now - 1000, expiresAt: now + 60000,
  issuer: 'signal-symphony-rita', audience: 'signal-symphony-demo-risk',
};
const expected = { ownerId: a, orderId: b, decisionId: c };
describe('Rita DEMO signed decision', () => {
  it('accepts only a matching valid RSA signature and exact context', async () => {
    const keys = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
        publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
    const sign = async (v: RitaEnvelope) => new Uint8Array(await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(canonicalRitaPayload(v))));
    const signature = await sign(envelope);
    expect(await verifyRitaDecision(envelope, signature, keys.publicKey, expected, now)).toBe(true);
    expect(await verifyRitaDecision({...envelope, approved:false}, signature, keys.publicKey, expected, now)).toBe(false);
    expect(await verifyRitaDecision(envelope, signature, keys.publicKey, {...expected, orderId:a}, now)).toBe(false);
    expect(await verifyRitaDecision({...envelope, expiresAt:now-1}, signature, keys.publicKey, expected, now)).toBe(false);
    expect(await verifyRitaDecision({...envelope, issuer:'max-trader'}, signature, keys.publicKey, expected, now)).toBe(false);
    expect(await verifyRitaDecision({...envelope, extra:true}, signature, keys.publicKey, expected, now)).toBe(false);
    const other = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
        publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
    expect(await verifyRitaDecision(envelope, signature, other.publicKey, expected, now)).toBe(false);
    const bad = signature.slice(); bad[0] ^= 1;
    expect(await verifyRitaDecision(envelope, bad, keys.publicKey, expected, now)).toBe(false);
  });
});
