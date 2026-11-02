// Stage 70: server-only transaction provider for a PostgreSQL-compatible pool.
// A real pool must be injected by the server; no network connection is created here.
import type { SqlTransaction, TransactionProvider } from './demoRitaPostgresAdapter';

export interface PgClientLike extends SqlTransaction {
  release(): void;
}
export interface PgPoolLike {
  connect(): Promise<PgClientLike>;
}

export function createDemoTransactionProvider(pool: PgPoolLike): TransactionProvider {
  return {
    async transaction<T>(work: (tx: SqlTransaction) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      let began = false;
      try {
        await client.query('BEGIN');
        began = true;
        // One connection, one transaction. Any work error triggers rollback.
        const result = await work(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        if (began) {
          try {
            await client.query('ROLLBACK');
          } catch {
            // Rollback failure must never turn an error into approval.
          }
        }
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
