-- Execute ONCE against an EXISTING PostgreSQL database BEFORE starting the updated backend.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(32);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);
-- Empty usernames remain NULL. Lowercase enforcement is done by the API.