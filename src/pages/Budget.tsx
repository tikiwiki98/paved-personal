import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { IncludeRentToggle } from '@/components/IncludeRentToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { Loader2 } from 'lucide-react';
import { SpendVsBudgetChart } from '@/components/budget/SpendVsBudgetChart';
import { CategorySpendList } from '@/components/budget/CategorySpendList';

const Budget = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { transactions, isLoading: transactionsLoading } = useTransactions();
  const { categories, isLoading: categoriesLoading, upsertBudget } = useCategories(transactions, 'monthly');
  const { initializeWithTransactions } = useTimeFrame();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!transactionsLoading && transactions.length > 0) {
      initializeWithTransactions(transactions);
    }
  }, [transactions, transactionsLoading, initializeWithTransactions]);

  // Create budgets lookup from categories
  const budgets = useMemo(() => {
    const lookup: Record<string, number> = {};
    categories.forEach(c => {
      if (c.budget > 0) {
        lookup[c.name] = c.budget;
      }
    });
    return lookup;
  }, [categories]);

  const handleCategoryClick = (categoryName: string) => {
    setEditingCategory(categoryName);
  };

  if (authLoading || transactionsLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-foreground">Monthly Spending</h2>
          <IncludeRentToggle />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Spend vs Budget Chart */}
          <SpendVsBudgetChart 
            transactions={transactions}
            budgets={budgets}
            onCategoryClick={handleCategoryClick}
          />

          {/* Category Spend List with inline budget editing */}
          <CategorySpendList 
            categories={categories}
            transactions={transactions}
            budgets={budgets}
            onUpdateBudget={upsertBudget}
            editingCategory={editingCategory}
            setEditingCategory={setEditingCategory}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Budget;
