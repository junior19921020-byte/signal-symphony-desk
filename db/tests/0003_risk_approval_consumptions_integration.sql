-- Stage 64 disposable CI test: owner-bound FK, uniqueness, and RLS default deny.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO desk.accounts(id) VALUES
 ('00000000-0000-0000-0000-000000000041'),
 ('00000000-0000-0000-0000-000000000042');
INSERT INTO desk.demo_broker_accounts(id,owner_id,broker) VALUES
 ('10000000-0000-0000-0000-000000000041','00000000-0000-0000-0000-000000000041','BINANCE'),
 ('10000000-0000-0000-0000-000000000042','00000000-0000-0000-0000-000000000042','BYBIT');
INSERT INTO desk.demo_orders(id,owner_id,broker_account_id,idempotency_key,status) VALUES
 ('30000000-0000-0000-0000-000000000041','00000000-0000-0000-0000-000000000041','10000000-0000-0000-0000-000000000041','stage64-owner-a','PENDING'),
 ('30000000-0000-0000-0000-000000000042','00000000-0000-0000-0000-000000000042','10000000-0000-0000-0000-000000000042','stage64-owner-b','PENDING');
INSERT INTO desk.risk_decisions(id,owner_id,order_id,approved,reason) VALUES
 ('40000000-0000-0000-0000-000000000041','00000000-0000-0000-0000-000000000041','30000000-0000-0000-0000-000000000041',true,'DEMO approved'),
 ('40000000-0000-0000-0000-000000000042','00000000-0000-0000-0000-000000000042','30000000-0000-0000-0000-000000000042',true,'DEMO approved');
INSERT INTO desk.demo_risk_approval_consumptions(id,owner_id,order_id,risk_decision_id) VALUES
 ('50000000-0000-0000-0000-000000000041','00000000-0000-0000-0000-000000000041','30000000-0000-0000-0000-000000000041','40000000-0000-0000-0000-000000000041');
DO $$
BEGIN
 BEGIN
  INSERT INTO desk.demo_risk_approval_consumptions(id,owner_id,order_id,risk_decision_id) VALUES
   ('50000000-0000-0000-0000-000000000043','00000000-0000-0000-0000-000000000041','30000000-0000-0000-0000-000000000041','40000000-0000-0000-0000-000000000041');
  RAISE EXCEPTION 'Duplicate approval consumption accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO desk.demo_risk_approval_consumptions(id,owner_id,order_id,risk_decision_id) VALUES
   ('50000000-0000-0000-0000-000000000044','00000000-0000-0000-0000-000000000042','30000000-0000-0000-0000-000000000042','40000000-0000-0000-0000-000000000041');
  RAISE EXCEPTION 'Cross-owner risk decision accepted';
 EXCEPTION WHEN foreign_key_violation OR unique_violation THEN NULL;
 END;
END $$;
CREATE ROLE demo_ci_risk_reader NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA desk TO demo_ci_risk_reader;
GRANT EXECUTE ON FUNCTION desk.current_owner_id() TO demo_ci_risk_reader;
GRANT SELECT, INSERT ON desk.demo_risk_approval_consumptions TO demo_ci_risk_reader;
SET LOCAL ROLE demo_ci_risk_reader;
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM desk.demo_risk_approval_consumptions;
 IF n <> 0 THEN RAISE EXCEPTION 'Missing identity exposed consumption'; END IF;
END $$;
SELECT set_config('desk.owner_id','00000000-0000-0000-0000-000000000041',true);
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM desk.demo_risk_approval_consumptions;
 IF n <> 1 THEN RAISE EXCEPTION 'Owner A cannot see own consumption'; END IF;
 BEGIN
  INSERT INTO desk.demo_risk_approval_consumptions(id,owner_id,order_id,risk_decision_id) VALUES
   ('50000000-0000-0000-0000-000000000045','00000000-0000-0000-0000-000000000042','30000000-0000-0000-0000-000000000042','40000000-0000-0000-0000-000000000042');
  RAISE EXCEPTION 'Tenant insert accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;
ROLLBACK;
