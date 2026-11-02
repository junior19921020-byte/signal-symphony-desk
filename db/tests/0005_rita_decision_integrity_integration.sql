\set ON_ERROR_STOP on
BEGIN;
INSERT INTO desk.accounts(id) VALUES ('00000000-0000-0000-0000-000000000061');
INSERT INTO desk.demo_broker_accounts(id,owner_id,broker) VALUES
 ('10000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000061','BINANCE');
INSERT INTO desk.demo_orders(id,owner_id,broker_account_id,idempotency_key,status) VALUES
 ('30000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000061','10000000-0000-0000-0000-000000000061','stage66-immutable','PENDING');
INSERT INTO desk.risk_decisions(id,owner_id,order_id,approved,reason) VALUES
 ('40000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000061','30000000-0000-0000-0000-000000000061',false,'Rita veto DEMO');
DO $test$
DECLARE n integer;
BEGIN
 BEGIN
  UPDATE desk.risk_decisions SET approved=true WHERE id='40000000-0000-0000-0000-000000000061';
  RAISE EXCEPTION 'Veto could be changed to approval';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  DELETE FROM desk.risk_decisions WHERE id='40000000-0000-0000-0000-000000000061';
  RAISE EXCEPTION 'Decision could be deleted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 SELECT count(*) INTO n FROM desk.risk_decisions
 WHERE id='40000000-0000-0000-0000-000000000061' AND approved=false;
 IF n <> 1 THEN RAISE EXCEPTION 'Veto was not preserved'; END IF;
END $test$;
CREATE ROLE demo_ci_max_agent NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA desk TO demo_ci_max_agent;
GRANT SELECT, INSERT, UPDATE, DELETE ON desk.risk_decisions TO demo_ci_max_agent;
SET LOCAL ROLE demo_ci_max_agent;
DO $test$
BEGIN
 BEGIN
  INSERT INTO desk.risk_decisions(id,owner_id,order_id,approved,reason)
  VALUES ('40000000-0000-0000-0000-000000000062',
   '00000000-0000-0000-0000-000000000061',
   '30000000-0000-0000-0000-000000000061',true,'Max forged Rita');
  RAISE EXCEPTION 'Agent forged decision';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $test$;
RESET ROLE;
ROLLBACK;
