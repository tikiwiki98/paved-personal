-- Add credit_card_id column to link transactions to specific credit cards
ALTER TABLE public.transactions 
ADD COLUMN credit_card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL;