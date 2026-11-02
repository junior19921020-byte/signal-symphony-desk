-- Stage 59: temporary CI only. RLS must isolate owners with non-bypass role.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE demo_ci_tenant NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA desk TO demo_ci_tenant;
GRANT EXECUTE ON FUNCTION desk.current_owner_id() TO demo_ci_tenant;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA desk TO demo_ci_tenant;
INSERT INTO desk.accounts(id) VALUES
 ('00000000-0000-0000-0000-000000000011'),
 ('00000000-0000-0000-0000-000000000022');
INSERT INTO desk.demo_broker_accounts(id,owner_id,broker) VALUES
 ('10000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000011','BINANCE'),
 ('10000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000022','BYBIT');
SET LOCAL ROLE demo_ci_tenant;
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM desk.accounts;
 IF n <> 0 THEN RAISE EXCEPTION 'Missing owner context should deny all'; END IF;
END $$;
SELECT set_config('desk.owner_id','00000000-0000-0000-0000-000000000011',true);
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM desk.accounts;
 IF n <> 1 THEN RAISE EXCEPTION 'Owner A account isolation failed: %',n; END IF;
 SELECT count(*) INTO n FROM desk.demo_broker_accounts;
 IF n <> 1 THEN RAISE EXCEPTION 'Owner A broker isolation failed: %',n; END IF;
 IF EXISTS (SELECT 1 FROM desk.demo_broker_accounts WHERE broker='BYBIT') THEN
  RAISE EXCEPTION 'Owner B broker visible'; END IF;
END $$;
DO $$
BEGIN
 BEGIN
  INSERT INTO desk.demo_broker_accounts(id,owner_id,broker)
  VALUES ('10000000-0000-0000-0000-000000000033','00000000-0000-0000-0000-000000000022','OKX');
  RAISE EXCEPTION 'Cross-owner write accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
SELECT set_config('desk.owner_id','00000000-0000-0000-0000-000000000022',true);
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM desk.demo_broker_accounts WHERE broker='BYBIT';
 IF n <> 1 THEN RAISE EXCEPTION 'Owner B isolation failed'; END IF;
 SELECT count(*) INTO n FROM desk.demo_broker_accounts WHERE broker='BINANCE';
 IF n <> 0 THEN RAISE EXCEPTION 'Owner A data visible to B'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
