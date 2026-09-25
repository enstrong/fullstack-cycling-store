CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT,
  google_sub TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS oauth_states (
  state_hash TEXT PRIMARY KEY,
  verifier TEXT NOT NULL,
  return_to TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE cart ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE cart ADD COLUMN IF NOT EXISTS guest_token_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS cart_user_unique ON cart(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cart_guest_unique ON cart(guest_token_hash) WHERE guest_token_hash IS NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(user_id);
-- Consolidate old duplicate lines before enforcing one line per product.
WITH totals AS (
 SELECT MIN(cart_item_id) AS id, SUM(quantity) AS quantity FROM cart_items GROUP BY cart_id, product_id
) UPDATE cart_items ci SET quantity = t.quantity FROM totals t WHERE ci.cart_item_id = t.id;
DELETE FROM cart_items a USING cart_items b
 WHERE a.cart_id = b.cart_id AND a.product_id = b.product_id AND a.cart_item_id > b.cart_item_id;
CREATE UNIQUE INDEX IF NOT EXISTS cart_item_product_unique ON cart_items(cart_id, product_id);
