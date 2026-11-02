import { describe, expect, it, vi } from 'vitest';
import { parseDemoPostgresConfig, checkDemoDatabaseAvailability } from './demoPostgresConfig';

const valid = 'postgresql://desk_app:placeholder@db.example.com:5432/desk_demo?sslmode=verify-full';

describe('DEMO database configuration', () => {
  it('requires a TLS-verified URL and constrained pool', () => {
    expect(parseDemoPostgresConfig({ DEMO_DATABASE_URL: valid })?.maxConnections).toBe(3);
    expect(parseDemoPostgresConfig({ DEMO_DATABASE_URL: valid })?.sslMode).toBe('verify-full');
    expect(parseDemoPostgresConfig({ DEMO_DATABASE_URL: valid, DEMO_DB_POOL_MAX: '100' })).toBeNull();
    expect(parseDemoPostgresConfig({ DEMO_DATABASE_URL: undefined })).toBeNull();
  });
  it('rejects missing certificate verification and local endpoints', () => {
    expect(parseDemoPostgresConfig({ DEMO_DATABASE_URL: valid.replace('verify-full', 'disable') })).toBeNull();
    expect(parseDemoPostgresConfig({ DEMO_DATABASE_URL: valid.replace('db.example.com', 'localhost') })).toBeNull();
  });
  it('checks availability read-only and rejects failures', async () => {
    const query = vi.fn().mockResolvedValue({});
    expect(await checkDemoDatabaseAvailability(query)).toBe(true);
    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(await checkDemoDatabaseAvailability(async () => { throw Error('offline'); })).toBe(false);
    expect(await checkDemoDatabaseAvailability(() => new Promise(() => {}), 100)).toBe(false);
  });
});
