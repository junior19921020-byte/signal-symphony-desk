-- PostgreSQL integration tests; run only on disposable local CI database.
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY[
  'accounts','demo_broker_accounts','demo_positions','demo_orders',
  'risk_decisions','agent_events','market_observations','audit_events'
 ] LOOP
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='desk' AND c.relname=t AND c.relrowsecurity AND c.relforcerowsecurity
  ) THEN RAISE EXCEPTION 'RLS not enabled and forced for %',t; END IF;
 END LOOP;
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='desk') THEN
  RAISE EXCEPTION 'Unexpected RLS policy'; END IF;
END $$;

CREATE ROLE demo_ci_reader NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA desk TO demo_ci_reader;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA desk TO demo_ci_reader;

INSERT INTO desk.accounts(id) VALUES
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002');
INSERT INTO desk.demo_broker_accounts(id,owner_id,broker)
VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','BINANCE');

SET LOCAL ROLE demo_ci_reader;
DO $$
DECLARE n bigint;
BEGIN
 SELECT count(*) INTO n FROM desk.accounts;
 IF n <> 0 THEN RAISE EXCEPTION 'RLS default deny failed'; END IF;
END $$;
RESET ROLE;

-- Invalid DEMO mode must fail.
DO $$
BEGIN
 BEGIN
  INSERT INTO desk.demo_broker_accounts(id,owner_id,broker,mode)
  VALUES ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','BYBIT','REAL');
  RAISE EXCEPTION 'REAL accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;

-- Cross-owner FK must fail.
DO $$
BEGIN
 BEGIN
  INSERT INTO desk.demo_positions(id,owner_id,broker_account_id,symbol,side,quantity,entry_price,stop_loss,take_profit,status)
  VALUES ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','BTCUSDT','COMPRA',1,100,90,110,'OPEN');
  RAISE EXCEPTION 'Cross-owner reference accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;
END $$;

-- Inverted SL/TP must fail.
DO $$
BEGIN
 BEGIN
  INSERT INTO desk.demo_positions(id,owner_id,broker_account_id,symbol,side,quantity,entry_price,stop_loss,take_profit,status)
  VALUES ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','BTCUSDT','COMPRA',1,100,110,90,'OPEN');
  RAISE EXCEPTION 'Inverted SL/TP accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;

INSERT INTO desk.demo_orders(id,owner_id,broker_account_id,idempotency_key,status)
VALUES ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','same-request-key','PENDING');
DO $$
BEGIN
 BEGIN
  INSERT INTO desk.demo_orders(id,owner_id,broker_account_id,idempotency_key,status)
  VALUES ('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','same-request-key','PENDING');
  RAISE EXCEPTION 'Duplicate accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
END $$;
ROLLBACK;
