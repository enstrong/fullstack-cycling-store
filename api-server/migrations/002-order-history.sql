ALTER TABLE order_items ADD COLUMN product_name TEXT;
UPDATE order_items oi SET product_name=p.name FROM products p WHERE p.product_id=oi.product_id;
CREATE INDEX orders_user_created_idx ON orders(user_id, time_of_creation DESC, order_id DESC);
