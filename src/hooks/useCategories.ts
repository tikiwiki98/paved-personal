import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Category } from '@/types/budget';
import { useToast } from '@/hooks/use-toast';
import { useBudgets, BudgetTimeframe } from './useBudgets';

const defaultCategories = [
  { name: 'Rent', icon: '🏠', color: '#ef4444' },
  { name: 'Groceries', icon: '🛒', color: '#22c55e' },
  { name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
  { name: 'Utilities', icon: '💡', color: '#f59e0b' },
  { name: 'Dining', icon: '🍽️', color: '#ec4899' },
  { name: 'Transport', icon: '🚗', color: '#3b82f6' },
];

export function useCategories(
  transactions: { type: string; category: string; amount: number }[] = [],
  budgetTimeframe: BudgetTimeframe = 'monthly'
) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { budgets, getBudgetForCategory, upsertBudget, isLoading: budgetsLoading } = useBudgets(budgetTimeframe);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // If no categories exist, create default ones
      if (data.length === 0) {
        const { data: newCategories, error: insertError } = await supabase
          .from('categories')
          .insert(
            defaultCategories.map((cat) => ({
              user_id: user.id,
              name: cat.name,
              icon: cat.icon,
              budget: 0, // Default budget in categories table (legacy)
              color: cat.color,
            }))
          )
          .select();
        
        if (insertError) throw insertError;
        data.push(...(newCategories || []));
      }
      
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        budget: 0, // Will be overridden by budgets table
        color: c.color,
        spent: 0, // Will be calculated from transactions
      })) as Category[];
    },
    enabled: !!user,
  });

  const isLoading = categoriesLoading || budgetsLoading;

  // Calculate spent amounts from transactions and get budgets from budgets table
  const categoriesWithSpendingAndBudgets = categories.map((cat) => {
    const spent = transactions
      .filter((t) => t.type === 'expense' && t.category === cat.name)
      .reduce((sum, t) => sum + t.amount, 0);
    const budget = getBudgetForCategory(cat.name) ?? 0;
    return { ...cat, spent, budget };
  });

  const addCategory = useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'spent'>) => {
      if (!user) throw new Error('User not authenticated');
      
      // Add category without budget (budget goes to budgets table)
      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: category.name,
          icon: category.icon,
          budget: 0, // Legacy field
          color: category.color,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // If a budget was provided, save it to the budgets table
      if (category.budget > 0) {
        upsertBudget({ category: category.name, amount: category.budget });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] });
      toast({
        title: 'Category added',
        description: 'Your new category has been created.',
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

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] });
      toast({
        title: 'Category updated',
        description: 'Your category has been updated.',
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

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] });
      toast({
        title: 'Category deleted',
        description: 'Your category has been removed.',
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
    categories: categoriesWithSpendingAndBudgets,
    isLoading,
    addCategory: addCategory.mutate,
    updateCategory: updateCategory.mutate,
    deleteCategory: deleteCategory.mutate,
    upsertBudget,
  };
}
