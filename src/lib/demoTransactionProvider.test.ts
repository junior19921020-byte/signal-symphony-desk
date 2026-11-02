import { describe, expect, it, vi } from 'vitest';
import { createDemoTransactionProvider } from './demoTransactionProvider';

describe('DEMO PostgreSQL transaction provider', () => {
  it('commits after successful work on the same connection', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const release = vi.fn();
    const connect = vi.fn().mockResolvedValue({ query, release });
    const provider = createDemoTransactionProvider({ connect });
    const result = await provider.transaction(async (tx) => {
      await tx.query('SELECT 1');
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'SELECT 1', 'COMMIT']);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });
  it('rolls back and releases on work failure', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const release = vi.fn();
    const provider = createDemoTransactionProvider({
      connect: async () => ({ query, release }),
    });
    await expect(provider.transaction(async () => { throw new Error('risk veto'); }))
      .rejects.toThrow('risk veto');
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'ROLLBACK']);
    expect(release).toHaveBeenCalledTimes(1);
  });
  it('does not commit on COMMIT failure and always releases', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockRejectedValueOnce(new Error('commit failed'))
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const release = vi.fn();
    const provider = createDemoTransactionProvider({
      connect: async () => ({ query, release }),
    });
    await expect(provider.transaction(async () => true)).rejects.toThrow('commit failed');
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'COMMIT', 'ROLLBACK']);
    expect(release).toHaveBeenCalledTimes(1);
  });
  it('releases when BEGIN fails without committing', async () => {
    const query = vi.fn().mockRejectedValueOnce(new Error('begin failed'));
    const release = vi.fn();
    const provider = createDemoTransactionProvider({
      connect: async () => ({ query, release }),
    });
    await expect(provider.transaction(async () => true)).rejects.toThrow('begin failed');
    expect(query).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });
  it('preserves the original error when ROLLBACK also fails', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockRejectedValueOnce(new Error('rollback failed'));
    const release = vi.fn();
    const provider = createDemoTransactionProvider({
      connect: async () => ({ query, release }),
    });
    await expect(provider.transaction(async () => { throw new Error('veto'); }))
      .rejects.toThrow('veto');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
