/**
 * Stage 57: static contract checks only.
 * These tests do NOT execute PostgreSQL or prove runtime tenant isolation.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../../db/migrations/0001_demo_schema.sql", import.meta.url), "utf8");
const tables = [
  "accounts", "demo_broker_accounts", "demo_positions", "demo_orders",
  "risk_decisions", "agent_events", "market_observations", "audit_events",
];

describe("DEMO PostgreSQL schema static security contract", () => {
  it("defines all eight planned tables", () => {
    for (const table of tables) expect(sql).toContain(`CREATE TABLE desk.${table} (`);
  });
  it("forces RLS for every table and defines no permissive policies", () => {
    for (const table of tables) {
      expect(sql).toContain(`ALTER TABLE desk.${table} ENABLE ROW LEVEL SECURITY;`);
      expect(sql).toContain(`ALTER TABLE desk.${table} FORCE ROW LEVEL SECURITY;`);
    }
    expect(sql).not.toMatch(/CREATE\s+POLICY\s/i);
    expect(sql).toContain("REVOKE ALL ON ALL TABLES IN SCHEMA desk FROM PUBLIC;");
    expect(sql).toContain("REVOKE ALL ON SCHEMA desk FROM PUBLIC;");
  });
  it("enforces DEMO-only records on broker accounts, positions and orders", () => {
    const count = sql.match(/mode text NOT NULL DEFAULT 'DEMO' CHECK \(mode = 'DEMO'\)/g) ?? [];
    expect(count).toHaveLength(3);
  });
  it("requires composite owner-scoped references for orders and positions", () => {
    expect(sql).toContain("FOREIGN KEY (broker_account_id, owner_id) REFERENCES desk.demo_broker_accounts(id, owner_id)");
    expect(sql).toContain("FOREIGN KEY (position_id, owner_id) REFERENCES desk.demo_positions(id, owner_id)");
    expect(sql).toContain("FOREIGN KEY (order_id, owner_id) REFERENCES desk.demo_orders(id, owner_id)");
  });
  it("requires owner-scoped idempotency and numeric/SL-TP constraints", () => {
    expect(sql).toContain("UNIQUE(owner_id, broker_account_id, idempotency_key)");
    expect(sql).toContain("CHECK (quantity > 0)");
    expect(sql).toContain("stop_loss < entry_price AND entry_price < take_profit");
    expect(sql).toContain("take_profit < entry_price AND entry_price < stop_loss");
  });
});
