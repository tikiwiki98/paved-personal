import { useEffect } from 'react';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { SpendingOverTimeChart } from '@/components/SpendingOverTimeChart';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { AppLayout } from '@/components/AppLayout';
import { IncludeRentToggle } from '@/components/IncludeRentToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { transactions, isLoading: transactionsLoading, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { categories, isLoading: categoriesLoading } = useCategories(transactions);
  const { initializeWithTransactions } = useTimeFrame();

  // Initialize smart default range based on transaction history
  useEffect(() => {
    if (!transactionsLoading && transactions.length > 0) {
      initializeWithTransactions(transactions);
    }
  }, [transactions, transactionsLoading, initializeWithTransactions]);

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
        <div className="flex justify-end mb-4">
          <IncludeRentToggle />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Balance & Chart */}
          <div className="lg:col-span-2 space-y-8">
            <BalanceCard transactions={transactions} />
            <SpendingOverTimeChart transactions={transactions} />
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
