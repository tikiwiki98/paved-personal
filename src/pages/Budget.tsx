import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { IncludeRentToggle } from '@/components/IncludeRentToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { Loader2 } from 'lucide-react';
import { BudgetOverview } from '@/components/budget/BudgetOverview';
import { BudgetByCategory } from '@/components/budget/BudgetByCategory';

const Budget = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { transactions, isLoading: transactionsLoading } = useTransactions();
  const { categories, isLoading: categoriesLoading, upsertBudget } = useCategories(transactions, 'monthly');
  const { initializeWithTransactions } = useTimeFrame();

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
          <h2 className="text-2xl font-bold text-foreground">Monthly Budget</h2>
          <IncludeRentToggle />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Budget Overview - Analytics */}
          <BudgetOverview 
            categories={categories} 
            transactions={transactions}
          />

          {/* Budget by Category - Entry & Progress */}
          <BudgetByCategory 
            categories={categories} 
            onUpdateBudget={upsertBudget}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Budget;
