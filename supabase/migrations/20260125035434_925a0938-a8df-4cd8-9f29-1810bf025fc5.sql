-- Drop the existing check constraint
ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check;

-- Add updated check constraint that includes 'transfer'
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
CHECK (type = ANY (ARRAY['income'::text, 'expense'::text, 'transfer'::text]));