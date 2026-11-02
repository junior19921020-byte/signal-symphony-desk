// Stage 71: server-only composition of signed Rita verification and atomic DEMO persistence.
// Dependencies MUST be supplied by a trusted backend, never by browser/user input.
import { approveVerifiedDemoOrder, type VerifiedDecisionInput } from './demoRitaVerifiedGateway';
import { createDemoRitaPostgresAdapter } from './demoRitaPostgresAdapter';
import { createDemoTransactionProvider, type PgPoolLike } from './demoTransactionProvider';

export type DemoRitaServerDependencies = Readonly<{
  pool: PgPoolLike;
  pinnedRitaPublicKey: CryptoKey;
  authenticatedOwnerId: string;
  clock: () => number;
}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** No network listener, connection pool, or credentials are created by this function. */
export function createDemoRitaServerApproval(deps: DemoRitaServerDependencies) {
  const database = createDemoRitaPostgresAdapter(createDemoTransactionProvider(deps.pool));
  return async (input: VerifiedDecisionInput): Promise<boolean> => {
    // Bind the request to the server-authenticated owner, not the caller's claim.
    if (!UUID.test(deps.authenticatedOwnerId) ||
        input.expected.ownerId !== deps.authenticatedOwnerId) return false;
    try {
      return await approveVerifiedDemoOrder(
        input, deps.pinnedRitaPublicKey, database, deps.clock(),
      );
    } catch {
      return false;
    }
  };
}
