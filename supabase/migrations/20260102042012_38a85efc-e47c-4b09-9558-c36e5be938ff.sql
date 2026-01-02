-- Add recurring transaction fields to transactions table
ALTER TABLE public.transactions
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN recurring_frequency TEXT,
ADD COLUMN recurring_start_date DATE,
ADD COLUMN recurring_end_date DATE;