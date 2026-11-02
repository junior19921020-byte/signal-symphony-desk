// Stage 69: server-only PostgreSQL adapter; caller must verify Rita signature first.
// This interface does not create a database connection or deploy an API.
import type { RitaEnvelope } from './demoRitaOrigin';
import type { RitaDbAdapter } from './demoRitaVerifiedGateway';

export interface SqlTransaction {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string, values?: readonly unknown[]
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}
export interface TransactionProvider {
  // MUST begin a real DB transaction, commit only on successful return,
  // rollback on any thrown error, and release connection in finally.
  transaction<T>(work: (tx: SqlTransaction) => Promise<T>): Promise<T>;
}

export function createDemoRitaPostgresAdapter(provider: TransactionProvider): RitaDbAdapter {
  return {
    async insertAndConsumeAtomically(decision: RitaEnvelope, consumptionId: string): Promise<boolean> {
      if (decision.approved !== true) return false;
      try {
        return await provider.transaction(async (tx) => {
          // Server-authenticated owner and signed decision are preconditions.
          // Never interpolate identifiers or untrusted data into SQL.
          await tx.query(
            `INSERT INTO desk.risk_decisions
              (id, owner_id, order_id, approved, reason, decided_at)
             VALUES ($1::uuid, $2::uuid, $3::uuid, TRUE, $4, to_timestamp($5::double precision / 1000))`,
            [decision.decisionId, decision.ownerId, decision.orderId,
              'Verified signed Rita DEMO decision', decision.issuedAt],
          );
          const result = await tx.query<{ accepted: boolean }>(
            `SELECT desk.consume_demo_risk_approval(
              $1::uuid, $2::uuid, $3::uuid, $4::uuid
             ) AS accepted`,
            [decision.ownerId, decision.orderId, decision.decisionId, consumptionId],
          );
          if (result.rows.length !== 1 || result.rows[0].accepted !== true) {
            // Throw to force rollback of INSERT; never commit an unconsumed approval.
            throw new Error('DEMO risk approval was not consumed');
          }
          return true;
        });
      } catch {
        return false;
      }
    },
  };
}
