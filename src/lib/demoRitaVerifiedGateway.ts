// Stage 68: fail-closed server orchestration contract, not a deployed endpoint.
// The database adapter must use a trusted server credential and an atomic transaction.
import { verifyRitaDecision, type RitaEnvelope } from './demoRitaOrigin';

export type VerifiedDecisionInput = Readonly<{
  envelope: unknown;
  signature: Uint8Array;
  expected: { ownerId: string; orderId: string; decisionId: string };
  consumptionId: string;
}>;

export type RitaDbAdapter = Readonly<{
  // This must be a single transaction: insert immutable decision, then consume
  // using desk.consume_demo_risk_approval; rollback on false/error.
  insertAndConsumeAtomically: (
    decision: RitaEnvelope, consumptionId: string,
  ) => Promise<boolean>;
}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function approveVerifiedDemoOrder(
  input: VerifiedDecisionInput,
  trustedPublicKey: CryptoKey,
  database: RitaDbAdapter,
  nowMs: number,
): Promise<boolean> {
  if (!UUID.test(input.consumptionId) || !input.envelope ||
      typeof input.envelope !== 'object' || Array.isArray(input.envelope)) return false;
  const envelope = input.envelope as RitaEnvelope;
  if (envelope.approved !== true) return false; // Rita veto always wins
  const valid = await verifyRitaDecision(
    input.envelope, input.signature, trustedPublicKey, input.expected, nowMs,
  );
  if (!valid) return false;
  try {
    return (await database.insertAndConsumeAtomically(envelope, input.consumptionId)) === true;
  } catch {
    // Never approve if persistence, risk checks, or transaction fails.
    return false;
  }
}
