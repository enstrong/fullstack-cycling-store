-- NOT VALID preserves legacy rows while enforcing checks for every new write.
ALTER TABLE products ADD CONSTRAINT products_valid_price CHECK (price IS NOT NULL AND price >= 0 AND price <= 100000000) NOT VALID;
ALTER TABLE products ADD CONSTRAINT products_valid_stock CHECK (stock_quantity IS NOT NULL AND stock_quantity BETWEEN 0 AND 1000000) NOT VALID;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_valid_quantity CHECK (quantity IS NOT NULL AND quantity BETWEEN 1 AND 1000) NOT VALID;
ALTER TABLE order_items ADD CONSTRAINT order_items_valid_quantity CHECK (quantity IS NOT NULL AND quantity BETWEEN 1 AND 1000) NOT VALID;
ALTER TABLE order_items ADD CONSTRAINT order_items_valid_price CHECK (price IS NOT NULL AND price >= 0 AND price <= 100000000) NOT VALID;
ALTER TABLE orders ADD CONSTRAINT orders_valid_total CHECK (total_price IS NOT NULL AND total_price >= 0 AND total_price::text NOT IN ('NaN', 'Infinity', '-Infinity')) NOT VALID;
CREATE INDEX auth_sessions_expiry_idx ON auth_sessions(expires_at);
CREATE INDEX oauth_states_expiry_idx ON oauth_states(expires_at);
