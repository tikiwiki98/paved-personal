import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { BudgetCategories } from '@/components/BudgetCategories';
import { SpendingChart } from '@/components/SpendingChart';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { Wallet, LogOut, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
                <Wallet className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-foreground">BudgetFlow</h1>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              {/* Desktop only: Add Transaction button */}
              <div className="hidden md:block">
                <AddTransactionModal onAddTransaction={handleAddTransaction} categories={categories} />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={signOut}
                className="border-border/50 h-8 w-8 md:h-10 md:w-10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
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
            <BudgetCategories 
              categories={categories} 
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Track your finances with clarity and control
          </p>
        </div>
      </footer>

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <AddTransactionModal 
          onAddTransaction={handleAddTransaction} 
          categories={categories}
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
    </div>
  );
};

export default Index;
