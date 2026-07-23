CREATE TABLE IF NOT EXISTS sagas (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    type       VARCHAR(50) NOT NULL,
    status     VARCHAR(50) NOT NULL,
    payload    JSONB       NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sagas_status
    ON sagas (status);