-- Add new columns for transfer/investment transactions
ALTER TABLE public.transactions 
ADD COLUMN asset_type text,
ADD COLUMN asset_name text;

-- Add a comment to document the valid transaction types
COMMENT ON COLUMN public.transactions.type IS 'Transaction type: income, expense, or transfer';