CREATE TABLE IF NOT EXISTS pending_signups (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT        NOT NULL,
    username    TEXT        NOT NULL,
    display_name TEXT       NOT NULL,
    password_hash TEXT      NOT NULL,
    otp_hash    TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS pending_signups_email_idx ON pending_signups (email);
