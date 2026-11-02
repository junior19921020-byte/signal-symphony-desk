-- Stage 64: DEMO-only, one-time reservation of Rita risk approvals.
-- This is a DB contract, NOT order execution or a deployed API.
BEGIN;
ALTER TABLE desk.risk_decisions
 ADD CONSTRAINT risk_decisions_id_owner_order_unique UNIQUE (id, owner_id, order_id);
CREATE TABLE desk.demo_risk_approval_consumptions (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES desk.accounts(id),
 order_id uuid NOT NULL,
 risk_decision_id uuid NOT NULL,
 consumed_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (order_id, owner_id) REFERENCES desk.demo_orders(id, owner_id),
 FOREIGN KEY (risk_decision_id, owner_id, order_id)
  REFERENCES desk.risk_decisions(id, owner_id, order_id),
 UNIQUE (owner_id, order_id),
 UNIQUE (risk_decision_id)
);
ALTER TABLE desk.demo_risk_approval_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE desk.demo_risk_approval_consumptions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON desk.demo_risk_approval_consumptions FROM PUBLIC;
CREATE POLICY consumption_owner_read ON desk.demo_risk_approval_consumptions
 FOR SELECT USING (owner_id = desk.current_owner_id());
-- No INSERT/UPDATE/DELETE policy: ordinary tenant roles cannot reserve or modify.
-- Trusted service must use a separately reviewed, tightly scoped DB role/function.
COMMIT;
