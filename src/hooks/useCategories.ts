import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Category } from '@/types/budget';
import { useToast } from '@/hooks/use-toast';

const defaultCategories = [
  { name: 'Rent', icon: '🏠', budget: 1500, color: '#ef4444' },
  { name: 'Groceries', icon: '🛒', budget: 600, color: '#22c55e' },
  { name: 'Entertainment', icon: '🎬', budget: 200, color: '#8b5cf6' },
  { name: 'Utilities', icon: '💡', budget: 150, color: '#f59e0b' },
  { name: 'Dining', icon: '🍽️', budget: 300, color: '#ec4899' },
  { name: 'Transport', icon: '🚗', budget: 250, color: '#3b82f6' },
];

export function useCategories(transactions: { type: string; category: string; amount: number }[] = []) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
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
              budget: cat.budget,
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
        budget: Number(c.budget),
        color: c.color,
        spent: 0, // Will be calculated from transactions
      })) as Category[];
    },
    enabled: !!user,
  });

  // Calculate spent amounts from transactions
  const categoriesWithSpending = categories.map((cat) => {
    const spent = transactions
      .filter((t) => t.type === 'expense' && t.category === cat.name)
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...cat, spent };
  });

  const addCategory = useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'spent'>) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: category.name,
          icon: category.icon,
          budget: category.budget,
          color: category.color,
        })
        .select()
        .single();
      
      if (error) throw error;
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
    categories: categoriesWithSpending,
    isLoading,
    addCategory: addCategory.mutate,
    updateCategory: updateCategory.mutate,
    deleteCategory: deleteCategory.mutate,
  };
}
