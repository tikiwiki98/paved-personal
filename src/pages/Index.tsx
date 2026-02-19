import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { AppLayout } from '@/components/AppLayout';
import { IncludeRentToggle } from '@/components/IncludeRentToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { Loader2, Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { transactions, isLoading: transactionsLoading, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { categories, isLoading: categoriesLoading } = useCategories(transactions);
  const { initializeWithTransactions } = useTimeFrame();

  // Initialize smart default range based on transaction history
  useEffect(() => {
    if (!transactionsLoading && transactions.length > 0) {
      initializeWithTransactions(transactions);
    }
  }, [transactions, transactionsLoading, initializeWithTransactions]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

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
      <div className="container mx-auto px-4 py-8 md:py-10">
        {/* Top Controls */}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary gap-2"
            onClick={() => navigate('/trends')}
          >
            <TrendingUp className="w-4 h-4" />
            View spending trends
          </Button>
          <IncludeRentToggle />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Balance & Transactions */}
          <div className="lg:col-span-2 space-y-8">
            <BalanceCard transactions={transactions} />
            <TransactionList 
              transactions={transactions} 
              categories={categories}
              onUpdateTransaction={updateTransaction}
              onDeleteTransaction={deleteTransaction}
            />
          </div>

          {/* Right Column - Add Transaction */}
          <div className="hidden md:block">
            <AddTransactionModal onAddTransaction={handleAddTransaction} categories={categories} transactions={transactions} />
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
