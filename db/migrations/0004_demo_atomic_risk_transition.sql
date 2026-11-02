-- Stage 65: atomic DEMO order approval consumption; privileged DB adapter only.
BEGIN;
CREATE FUNCTION desk.consume_demo_risk_approval(
 p_owner_id uuid, p_order_id uuid, p_decision_id uuid, p_consumption_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, desk AS $fn$
DECLARE v_order desk.demo_orders%ROWTYPE;
DECLARE v_decision desk.risk_decisions%ROWTYPE;
BEGIN
 -- Row lock serializes attempts for the same order; transaction rolls back on error.
 SELECT * INTO v_order FROM desk.demo_orders
 WHERE id = p_order_id AND owner_id = p_owner_id AND mode = 'DEMO'
 FOR UPDATE;
 IF NOT FOUND OR v_order.status <> 'PENDING' THEN RETURN false; END IF;
 SELECT * INTO v_decision FROM desk.risk_decisions
 WHERE id = p_decision_id AND owner_id = p_owner_id AND order_id = p_order_id
 FOR UPDATE;
 IF NOT FOUND OR v_decision.approved IS DISTINCT FROM true
    OR v_decision.decided_at > now()
    OR v_decision.decided_at < now() - interval '5 minutes'
 THEN RETURN false; END IF;
 -- Unique constraints reject replay, including consumption of decision by another order.
 INSERT INTO desk.demo_risk_approval_consumptions(id,owner_id,order_id,risk_decision_id)
 VALUES (p_consumption_id,p_owner_id,p_order_id,p_decision_id);
 UPDATE desk.demo_orders SET status = 'APPROVED'
 WHERE id = p_order_id AND owner_id = p_owner_id AND status = 'PENDING';
 IF NOT FOUND THEN RAISE EXCEPTION 'Order state changed'; END IF;
 RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION desk.consume_demo_risk_approval(uuid,uuid,uuid,uuid) FROM PUBLIC;
-- Intentionally no GRANT: future audited server role only, never browser or agent.
COMMIT;
