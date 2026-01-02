import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { BudgetCategories } from '@/components/BudgetCategories';
import { SpendingChart } from '@/components/SpendingChart';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { transactions, isLoading: transactionsLoading, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { categories, isLoading: categoriesLoading, addCategory, updateCategory, deleteCategory } = useCategories(transactions);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const summary = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return {
      totalBalance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
    };
  }, [transactions]);

  const handleAddTransaction = (newTransaction: Omit<typeof transactions[0], 'id'>) => {
    addTransaction(newTransaction);
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
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Balance & Chart */}
          <div className="lg:col-span-2 space-y-6">
            <BalanceCard
              totalBalance={summary.totalBalance}
              totalIncome={summary.totalIncome}
              totalExpenses={summary.totalExpenses}
            />
            <SpendingChart transactions={transactions} />
            <TransactionList 
              transactions={transactions} 
              categories={categories}
              onUpdateTransaction={updateTransaction}
              onDeleteTransaction={deleteTransaction}
            />
          </div>

          {/* Right Column - Categories */}
          <div className="space-y-6">
            {/* Desktop only: Add Transaction button */}
            <div className="hidden md:block">
              <AddTransactionModal onAddTransaction={handleAddTransaction} categories={categories} transactions={transactions} />
            </div>
            <BudgetCategories 
              categories={categories} 
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
            />
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-6 z-50 md:hidden">
        <AddTransactionModal 
          onAddTransaction={handleAddTransaction} 
          categories={categories}
          transactions={transactions}
          trigger={
            <Button 
              size="icon" 
              className="h-14 w-14 rounded-full shadow-lg shadow-primary/25"
            >
              <Plus className="w-6 h-6" />
            </Button>
          }
        />
      </div>
    </AppLayout>
  );
};

export default Index;
