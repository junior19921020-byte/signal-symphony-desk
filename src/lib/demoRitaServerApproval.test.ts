import { describe, expect, it, vi } from 'vitest';
import { createDemoRitaServerApproval } from './demoRitaServerApproval';

const owner = '11111111-1111-4111-8111-111111111111';
const order = '22222222-2222-4222-8222-222222222222';
const decision = '33333333-3333-4333-8333-333333333333';
const consumption = '44444444-4444-4444-8444-444444444444';
const now = 1762000000000;
const envelope = {
  version: 1 as const, ownerId: owner, orderId: order, decisionId: decision,
  approved: true, issuedAt: now - 1000, expiresAt: now + 1000,
  issuer: 'signal-symphony-rita' as const,
  audience: 'signal-symphony-demo-risk' as const,
};
const input = {
  envelope, signature: new Uint8Array(256),
  expected: { ownerId: owner, orderId: order, decisionId: decision },
  consumptionId: consumption,
};
async function fixture() {
  const keys = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify'],
  );
  const { canonicalRitaPayload } = await import('./demoRitaOrigin');
  const signature = new Uint8Array(await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(canonicalRitaPayload(envelope)),
  ));
  const query = vi.fn().mockImplementation(async (sql: string) =>
    sql.includes('consume_demo_risk_approval')
      ? { rows: [{ accepted: true }], rowCount: 1 }
      : { rows: [], rowCount: 1 },
  );
  const release = vi.fn();
  const connect = vi.fn().mockResolvedValue({ query, release });
  const approve = createDemoRitaServerApproval({
    pool: { connect }, pinnedRitaPublicKey: keys.publicKey,
    authenticatedOwnerId: owner, clock: () => now,
  });
  return { approve, query, release, connect, signature };
}
describe('server-only DEMO Rita wiring', () => {
  it('commits only after a signed approval is atomically consumed', async () => {
    const f = await fixture();
    expect(await f.approve({ ...input, signature: f.signature })).toBe(true);
    expect(f.query.mock.calls.map(([sql]) => sql)).toEqual([
      'BEGIN', expect.stringContaining('INSERT INTO desk.risk_decisions'),
      expect.stringContaining('consume_demo_risk_approval'), 'COMMIT',
    ]);
    expect(f.release).toHaveBeenCalledOnce();
  });
  it('rejects unsigned or altered approval before any DB access', async () => {
    const f = await fixture();
    expect(await f.approve(input)).toBe(false);
    expect(await f.approve({ ...input, signature: f.signature, envelope: { ...envelope, approved: false } })).toBe(false);
    expect(f.connect).not.toHaveBeenCalled();
  });
  it('rejects cross-owner request before DB access', async () => {
    const f = await fixture();
    expect(await f.approve({ ...input, signature: f.signature,
      expected: { ...input.expected, ownerId: order } })).toBe(false);
    expect(f.connect).not.toHaveBeenCalled();
  });
  it('rolls back when consumption is rejected', async () => {
    const f = await fixture();
    f.query.mockImplementation(async (sql: string) =>
      sql.includes('consume_demo_risk_approval')
        ? { rows: [{ accepted: false }], rowCount: 1 }
        : { rows: [], rowCount: 1 },
    );
    expect(await f.approve({ ...input, signature: f.signature })).toBe(false);
    expect(f.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
    expect(f.release).toHaveBeenCalledOnce();
  });
  it('rejects DB failure without granting approval', async () => {
    const f = await fixture();
    f.connect.mockRejectedValue(new Error('offline'));
    expect(await f.approve({ ...input, signature: f.signature })).toBe(false);
  });
});
