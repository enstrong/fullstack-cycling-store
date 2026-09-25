ALTER TABLE order_items ADD COLUMN product_icon TEXT;
UPDATE order_items oi SET product_icon=p.icon FROM products p WHERE p.product_id=oi.product_id;
