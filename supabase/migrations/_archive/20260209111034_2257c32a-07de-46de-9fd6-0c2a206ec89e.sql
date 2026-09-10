
-- Drop the unique constraint on user_id to allow multiple customer profiles (e.g. for demo data)
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_user_id_key;
