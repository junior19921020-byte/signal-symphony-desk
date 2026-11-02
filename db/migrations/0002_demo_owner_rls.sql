-- Stage 59: RLS tenant identity contract for a future authenticated API.
-- NEVER trust client-supplied owner_id or session settings.
-- API must authenticate the caller, set desk.owner_id via SET LOCAL within
-- each transaction, and use a role without BYPASSRLS or table ownership.
BEGIN;
CREATE OR REPLACE FUNCTION desk.current_owner_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
 SELECT NULLIF(current_setting('desk.owner_id', true), '')::uuid
$$;
REVOKE ALL ON FUNCTION desk.current_owner_id() FROM PUBLIC;

-- Policy applies only to roles explicitly granted table access by a future API.
-- Absent owner context => NULL => deny; WITH CHECK blocks cross-owner writes.
CREATE POLICY accounts_owner ON desk.accounts
 FOR ALL USING (id = desk.current_owner_id())
 WITH CHECK (id = desk.current_owner_id());
CREATE POLICY broker_accounts_owner ON desk.demo_broker_accounts
 FOR ALL USING (owner_id = desk.current_owner_id())
 WITH CHECK (owner_id = desk.current_owner_id());
CREATE POLICY positions_owner ON desk.demo_positions
 FOR ALL USING (owner_id = desk.current_owner_id())
 WITH CHECK (owner_id = desk.current_owner_id());
CREATE POLICY orders_owner ON desk.demo_orders
 FOR ALL USING (owner_id = desk.current_owner_id())
 WITH CHECK (owner_id = desk.current_owner_id());
CREATE POLICY risk_owner ON desk.risk_decisions
 FOR ALL USING (owner_id = desk.current_owner_id())
 WITH CHECK (owner_id = desk.current_owner_id());
CREATE POLICY agent_owner ON desk.agent_events
 FOR ALL USING (owner_id = desk.current_owner_id())
 WITH CHECK (owner_id = desk.current_owner_id());
CREATE POLICY quotes_owner ON desk.market_observations
 FOR ALL USING (owner_id = desk.current_owner_id())
 WITH CHECK (owner_id = desk.current_owner_id());
CREATE POLICY audit_owner ON desk.audit_events
 FOR ALL USING (owner_id = desk.current_owner_id())
 WITH CHECK (owner_id = desk.current_owner_id());
COMMIT;
