import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type BudgetTimeframe = 'monthly' | 'quarterly' | 'yearly';

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  timeframe: BudgetTimeframe;
  created_at: string;
  updated_at: string;
}

export function useBudgets(timeframe: BudgetTimeframe = 'monthly') {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', user?.id, timeframe],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('timeframe', timeframe);
      
      if (error) throw error;
      
      return data as Budget[];
    },
    enabled: !!user,
  });

  const upsertBudget = useMutation({
    mutationFn: async ({ category, amount }: { category: string; amount: number }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Check if budget exists for this category and timeframe
      const existing = budgets.find(b => b.category === category);
      
      if (existing) {
        const { error } = await supabase
          .from('budgets')
          .update({ amount })
          .eq('id', existing.id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('budgets')
          .insert({
            user_id: user.id,
            category,
            amount,
            timeframe,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', user?.id] });
      toast({
        title: 'Budget updated',
        description: 'Your budget has been saved.',
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

  const deleteBudget = useMutation({
    mutationFn: async (category: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', user.id)
        .eq('category', category)
        .eq('timeframe', timeframe);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', user?.id] });
      toast({
        title: 'Budget removed',
        description: 'Your budget has been removed.',
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

  // Helper to get budget amount for a specific category
  const getBudgetForCategory = (category: string): number | null => {
    const budget = budgets.find(b => b.category === category);
    return budget ? budget.amount : null;
  };

  return {
    budgets,
    isLoading,
    upsertBudget: upsertBudget.mutate,
    deleteBudget: deleteBudget.mutate,
    getBudgetForCategory,
  };
}
