CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS subscriptions (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL,
    owner         VARCHAR(255) NOT NULL,
    repo          VARCHAR(255) NOT NULL,
    confirmed     BOOLEAN      NOT NULL DEFAULT FALSE,
    confirm_token VARCHAR(255) UNIQUE NOT NULL,
    unsub_token   VARCHAR(255) UNIQUE NOT NULL,
    last_seen_tag VARCHAR(255) DEFAULT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (email, owner, repo)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_owner_repo
    ON subscriptions (owner, repo);

CREATE INDEX IF NOT EXISTS idx_confirm_token
    ON subscriptions (confirm_token);

CREATE INDEX IF NOT EXISTS idx_unsub_token
    ON subscriptions (unsub_token);
