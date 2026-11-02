-- Stage 66: preserve the integrity of recorded Rita decisions (DEMO only).
-- Source authentication requires a future trusted server; this migration cannot prove Rita identity.
BEGIN;
CREATE FUNCTION desk.reject_risk_decision_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, desk AS $fn$
BEGIN
 RAISE EXCEPTION 'DEMO risk decisions are immutable'
 USING ERRCODE = '42501';
END;
$fn$;
REVOKE ALL ON FUNCTION desk.reject_risk_decision_mutation() FROM PUBLIC;
CREATE TRIGGER risk_decisions_immutable
BEFORE UPDATE OR DELETE ON desk.risk_decisions
FOR EACH ROW EXECUTE FUNCTION desk.reject_risk_decision_mutation();
-- The database must not treat an arbitrary user/agent supplied actor string as proof of Rita.
-- Ordinary roles have no INSERT grant; future trusted API must authenticate Rita
-- and issue tightly-scoped INSERT privileges under reviewed server credentials.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON desk.risk_decisions FROM PUBLIC;
COMMIT;
