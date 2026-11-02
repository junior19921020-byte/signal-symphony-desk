import { describe, expect, it, vi } from 'vitest';
import { createDemoRitaPostgresAdapter, type TransactionProvider } from './demoRitaPostgresAdapter';
import type { RitaEnvelope } from './demoRitaOrigin';
const decision: RitaEnvelope = {
 version: 1, ownerId:'00000000-0000-0000-0000-000000000069',
 orderId:'10000000-0000-0000-0000-000000000069',
 decisionId:'20000000-0000-0000-0000-000000000069',
 approved:true, issuedAt:1800000000000, expiresAt:1800000030000,
 issuer:'signal-symphony-rita', audience:'signal-symphony-demo-risk',
};
const id='30000000-0000-0000-0000-000000000069';
describe('Rita PostgreSQL transactional adapter contract', () => {
 it('inserts then consumes with parameterized SQL', async () => {
  const query = vi.fn().mockResolvedValueOnce({rows:[],rowCount:1})
    .mockResolvedValueOnce({rows:[{accepted:true}],rowCount:1});
  const transaction = vi.fn(async (fn) => fn({query})) as TransactionProvider['transaction'];
  const adapter=createDemoRitaPostgresAdapter({transaction});
  expect(await adapter.insertAndConsumeAtomically(decision,id)).toBe(true);
  expect(query).toHaveBeenCalledTimes(2);
  expect(query.mock.calls[0][1][0]).toBe(decision.decisionId);
  expect(query.mock.calls[1][1]).toEqual([decision.ownerId,decision.orderId,decision.decisionId,id]);
  expect(query.mock.calls[0][0]).toContain('$1::uuid');
 });
 it('throws inside transaction on rejected consumption so provider can rollback', async () => {
  const query=vi.fn().mockResolvedValueOnce({rows:[],rowCount:1})
   .mockResolvedValueOnce({rows:[{accepted:false}],rowCount:1});
  let rollbackRequired=false;
  const transaction: TransactionProvider['transaction']=async (fn) => {
   try {return await fn({query});} catch {rollbackRequired=true; throw new Error('rolled back');}
  };
  expect(await createDemoRitaPostgresAdapter({transaction}).insertAndConsumeAtomically(decision,id)).toBe(false);
  expect(rollbackRequired).toBe(true);
 });
 it('does not write a veto', async () => {
  const transaction=vi.fn();
  expect(await createDemoRitaPostgresAdapter({transaction}).insertAndConsumeAtomically({...decision,approved:false},id)).toBe(false);
  expect(transaction).not.toHaveBeenCalled();
 });
});
