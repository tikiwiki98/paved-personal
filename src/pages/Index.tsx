import { useState, useMemo } from 'react';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { BudgetCategories } from '@/components/BudgetCategories';
import { SpendingChart } from '@/components/SpendingChart';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { mockTransactions, mockCategories } from '@/data/mockData';
import { Transaction } from '@/types/budget';
import { Wallet } from 'lucide-react';

const Index = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [categories, setCategories] = useState(mockCategories);

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

  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = {
      ...newTransaction,
      id: Date.now().toString(),
    };
    setTransactions((prev) => [transaction, ...prev]);

    // Update category spending if expense
    if (transaction.type === 'expense') {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.name === transaction.category
            ? { ...cat, spent: cat.spent + transaction.amount }
            : cat
        )
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Wallet className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">BudgetFlow</h1>
                <p className="text-xs text-muted-foreground">Personal Finance Tracker</p>
              </div>
            </div>
            <AddTransactionModal onAddTransaction={handleAddTransaction} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Balance & Chart */}
          <div className="lg:col-span-2 space-y-6">
            <BalanceCard
              totalBalance={summary.totalBalance}
              totalIncome={summary.totalIncome}
              totalExpenses={summary.totalExpenses}
            />
            <SpendingChart />
            <TransactionList transactions={transactions} />
          </div>

          {/* Right Column - Categories */}
          <div className="space-y-6">
            <BudgetCategories categories={categories} />
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
    </div>
  );
};

export default Index;
