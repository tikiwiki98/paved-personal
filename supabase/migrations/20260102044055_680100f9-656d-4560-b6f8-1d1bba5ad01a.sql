-- Add payment type and payment description columns to transactions table
ALTER TABLE public.transactions
ADD COLUMN payment_type text,
ADD COLUMN payment_description text;