import { describe, expect, it, vi } from 'vitest';
import { approveVerifiedDemoOrder } from './demoRitaVerifiedGateway';
import { canonicalRitaPayload, type RitaEnvelope } from './demoRitaOrigin';
const ownerId = '00000000-0000-0000-0000-000000000068';
const orderId = '10000000-0000-0000-0000-000000000068';
const decisionId = '20000000-0000-0000-0000-000000000068';
const consumptionId = '30000000-0000-0000-0000-000000000068';
const now = 1_800_000_000_000;
const envelope: RitaEnvelope = {
 version: 1, decisionId, ownerId, orderId, approved: true,
 issuedAt: now - 1000, expiresAt: now + 30000,
 issuer: 'signal-symphony-rita', audience: 'signal-symphony-demo-risk',
};
describe('DEMO Rita verified gateway', () => {
 it('fails closed on veto, forged signature, wrong order, expiry, DB failure and replay', async () => {
  const keys = await crypto.subtle.generateKey(
   { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
     publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
  const sign = async (e: RitaEnvelope) => new Uint8Array(await crypto.subtle.sign(
   'RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(canonicalRitaPayload(e))));
  const signature = await sign(envelope);
  const db = { insertAndConsumeAtomically: vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false) };
  const input = { envelope, signature, expected: { ownerId, orderId, decisionId }, consumptionId };
  expect(await approveVerifiedDemoOrder(input, keys.publicKey, db, now)).toBe(true);
  expect(await approveVerifiedDemoOrder(input, keys.publicKey, db, now)).toBe(false);
  expect(db.insertAndConsumeAtomically).toHaveBeenCalledTimes(2);
  const veto = { ...envelope, approved: false } as RitaEnvelope;
  expect(await approveVerifiedDemoOrder({ ...input, envelope:veto, signature:await sign(veto) }, keys.publicKey, db, now)).toBe(false);
  expect(await approveVerifiedDemoOrder({ ...input, signature:new Uint8Array(256) }, keys.publicKey, db, now)).toBe(false);
  expect(await approveVerifiedDemoOrder({ ...input, expected:{ownerId,orderId:ownerId,decisionId} }, keys.publicKey, db, now)).toBe(false);
  expect(await approveVerifiedDemoOrder(input, keys.publicKey, db, now+31000)).toBe(false);
  expect(db.insertAndConsumeAtomically).toHaveBeenCalledTimes(2);
  const brokenDb = { insertAndConsumeAtomically: vi.fn().mockRejectedValue(new Error('db down')) };
  expect(await approveVerifiedDemoOrder(input, keys.publicKey, brokenDb, now)).toBe(false);
 });
});
