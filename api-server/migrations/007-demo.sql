ALTER TABLE users ADD COLUMN demo_expires_at TIMESTAMPTZ;
CREATE INDEX users_demo_expiry_idx ON users(demo_expires_at) WHERE demo_expires_at IS NOT NULL;
ALTER TABLE products ADD COLUMN demo_user_id INTEGER REFERENCES users(user_id);
CREATE INDEX products_demo_user_idx ON products(demo_user_id);
CREATE TABLE demo_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
);
