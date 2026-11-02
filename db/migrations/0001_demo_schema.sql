-- Stage 56: DESIGN ONLY. Do not run against a database without security review.
-- PostgreSQL portable schema. Access is DENIED to PUBLIC by default.
BEGIN;
CREATE SCHEMA IF NOT EXISTS desk;
REVOKE ALL ON SCHEMA desk FROM PUBLIC;

CREATE TABLE desk.accounts (
 id uuid PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE desk.demo_broker_accounts (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES desk.accounts(id),
 broker text NOT NULL CHECK (broker IN ('BINANCE','BYBIT','OKX')),
 mode text NOT NULL DEFAULT 'DEMO' CHECK (mode = 'DEMO'),
 UNIQUE(id, owner_id)
);
CREATE TABLE desk.demo_positions (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES desk.accounts(id),
 broker_account_id uuid NOT NULL,
 symbol text NOT NULL CHECK (symbol ~ '^[A-Z0-9]{3,20}$'),
 side text NOT NULL CHECK (side IN ('COMPRA','VENDA')),
 quantity numeric(28,12) NOT NULL CHECK (quantity > 0),
 entry_price numeric(28,12) NOT NULL CHECK (entry_price > 0),
 stop_loss numeric(28,12) NOT NULL CHECK (stop_loss > 0),
 take_profit numeric(28,12) NOT NULL CHECK (take_profit > 0),
 status text NOT NULL CHECK (status IN ('OPEN','CLOSED','CANCELLED')),
 mode text NOT NULL DEFAULT 'DEMO' CHECK (mode = 'DEMO'),
 revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (broker_account_id, owner_id) REFERENCES desk.demo_broker_accounts(id, owner_id),
 UNIQUE(id, owner_id),
 CHECK ((side='COMPRA' AND stop_loss < entry_price AND entry_price < take_profit)
     OR (side='VENDA' AND take_profit < entry_price AND entry_price < stop_loss))
);
CREATE TABLE desk.demo_orders (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES desk.accounts(id),
 broker_account_id uuid NOT NULL,
 position_id uuid,
 idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 200),
 status text NOT NULL CHECK (status IN ('PENDING','APPROVED','VETOED','SIMULATED','FAILED')),
 mode text NOT NULL DEFAULT 'DEMO' CHECK (mode = 'DEMO'),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (broker_account_id, owner_id) REFERENCES desk.demo_broker_accounts(id, owner_id),
 FOREIGN KEY (position_id, owner_id) REFERENCES desk.demo_positions(id, owner_id),
 UNIQUE(owner_id, broker_account_id, idempotency_key),
 UNIQUE(id, owner_id)
);
CREATE TABLE desk.risk_decisions (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES desk.accounts(id),
 order_id uuid NOT NULL,
 approved boolean NOT NULL,
 reason text NOT NULL,
 decided_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (order_id, owner_id) REFERENCES desk.demo_orders(id, owner_id)
);
CREATE TABLE desk.agent_events (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES desk.accounts(id),
 agent text NOT NULL CHECK (agent IN ('ANA','SOFIA','RITA','MAX')),
 broker_account_id uuid,
 event_type text NOT NULL,
 correlation_id uuid NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (broker_account_id, owner_id) REFERENCES desk.demo_broker_accounts(id, owner_id)
);
CREATE TABLE desk.market_observations (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES desk.accounts(id),
 broker_account_id uuid NOT NULL,
 symbol text NOT NULL CHECK (symbol ~ '^[A-Z0-9]{3,20}$'),
 price numeric(28,12) NOT NULL CHECK (price > 0),
 observed_at timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 source text NOT NULL,
 FOREIGN KEY (broker_account_id, owner_id) REFERENCES desk.demo_broker_accounts(id, owner_id),
 CHECK (expires_at > observed_at)
);
CREATE TABLE desk.audit_events (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES desk.accounts(id),
 actor text NOT NULL,
 action text NOT NULL,
 correlation_id uuid NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demo_positions_owner_status_idx ON desk.demo_positions(owner_id, status);
CREATE INDEX demo_orders_owner_created_idx ON desk.demo_orders(owner_id, created_at DESC);
CREATE INDEX risk_decisions_owner_decided_idx ON desk.risk_decisions(owner_id, decided_at DESC);
CREATE INDEX agent_events_owner_occurred_idx ON desk.agent_events(owner_id, occurred_at DESC);
CREATE INDEX market_observations_owner_symbol_idx ON desk.market_observations(owner_id, symbol, observed_at DESC);
CREATE INDEX audit_events_owner_occurred_idx ON desk.audit_events(owner_id, occurred_at DESC);

-- RLS enabled and forced, but NO policies intentionally: fail closed until
-- authenticated API identity and roles have been designed and tested.
ALTER TABLE desk.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE desk.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE desk.demo_broker_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE desk.demo_broker_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE desk.demo_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE desk.demo_positions FORCE ROW LEVEL SECURITY;
ALTER TABLE desk.demo_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE desk.demo_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE desk.risk_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE desk.risk_decisions FORCE ROW LEVEL SECURITY;
ALTER TABLE desk.agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE desk.agent_events FORCE ROW LEVEL SECURITY;
ALTER TABLE desk.market_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE desk.market_observations FORCE ROW LEVEL SECURITY;
ALTER TABLE desk.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE desk.audit_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA desk FROM PUBLIC;
COMMIT;
