import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction } from '@/types/budget';
import { useToast } from '@/hooks/use-toast';

export function useTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type as 'income' | 'expense',
        category: t.category,
        description: t.description,
        date: t.date,
        is_recurring: t.is_recurring ?? false,
        recurring_frequency: t.recurring_frequency ?? undefined,
        recurring_start_date: t.recurring_start_date ?? undefined,
        recurring_end_date: t.recurring_end_date ?? undefined,
        payment_type: t.payment_type ?? undefined,
        payment_description: t.payment_description ?? undefined,
        credit_card_id: t.credit_card_id ?? undefined,
      })) as Transaction[];
    },
    enabled: !!user,
  });

  const addTransaction = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id'>) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: transaction.amount,
          type: transaction.type,
          category: transaction.category,
          description: transaction.description,
          date: transaction.date,
          is_recurring: transaction.is_recurring ?? false,
          recurring_frequency: transaction.recurring_frequency ?? null,
          recurring_start_date: transaction.recurring_start_date ?? null,
          recurring_end_date: transaction.recurring_end_date ?? null,
          payment_type: transaction.payment_type ?? null,
          payment_description: transaction.payment_description ?? null,
          credit_card_id: transaction.credit_card_id ?? null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
      toast({
        title: 'Transaction added',
        description: 'Your transaction has been recorded.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
      toast({
        title: 'Transaction updated',
        description: 'Your transaction has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
      toast({
        title: 'Transaction deleted',
        description: 'Your transaction has been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    transactions,
    isLoading,
    addTransaction: addTransaction.mutate,
    updateTransaction: updateTransaction.mutate,
    deleteTransaction: deleteTransaction.mutate,
    isAdding: addTransaction.isPending,
  };
}
