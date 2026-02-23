import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Repeat, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Transaction, Category } from '@/types/budget';
import { format, parseISO } from 'date-fns';
import { EditTransactionModal } from './EditTransactionModal';
import { useNavigate } from 'react-router-dom';

const ASSET_TYPE_LABELS: Record<string, string> = {
  brokerage: 'Brokerage',
  retirement: 'Retirement',
  high_yield_savings: 'High-yield Savings',
  crypto: 'Crypto',
  other: 'Other',
};

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onUpdateTransaction: (transaction: Partial<Transaction> & { id: string }) => void;
  onDeleteTransaction: (id: string) => void;
}

export function TransactionList({ 
  transactions, 
  categories,
  onUpdateTransaction, 
  onDeleteTransaction 
}: TransactionListProps) {
  const navigate = useNavigate();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return <ArrowUpRight className="w-5 h-5 text-income" />;
      case 'expense':
        return <ArrowDownRight className="w-5 h-5 text-expense" />;
      case 'transfer':
        return <TrendingUp className="w-5 h-5 text-primary" />;
    }
  };

  const getTransactionBg = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return 'bg-income/20';
      case 'expense':
        return 'bg-expense/20';
      case 'transfer':
        return 'bg-primary/20';
    }
  };

  const getTransactionColor = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return 'text-income';
      case 'expense':
        return 'text-expense';
      case 'transfer':
        return 'text-primary';
    }
  };

  const getAmountPrefix = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return '+';
      case 'expense':
        return '-';
      case 'transfer':
        return '→';
    }
  };

  return (
    <>
      <Card className="bg-card border-border p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
          <button 
            className="text-sm text-primary hover:text-primary/80 transition-colors"
            onClick={() => navigate('/transactions')}
          >
            View All
          </button>
        </div>

        <div className="space-y-3">
          {sortedTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transactions yet. Add one to get started!</p>
          ) : (
            sortedTransactions.slice(0, 6).map((transaction, index) => (
              <div
                key={transaction.id}
                onClick={() => setEditingTransaction(transaction)}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary/80 transition-all duration-200 cursor-pointer group"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${getTransactionBg(transaction.type)}`}
                  >
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-foreground">{transaction.description}</p>
                      {transaction.is_recurring && (
                        <Repeat className="w-3.5 h-3.5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {transaction.type === 'transfer' && transaction.asset_type 
                        ? `Transfer · ${ASSET_TYPE_LABELS[transaction.asset_type] || transaction.asset_type}`
                        : transaction.category
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${getTransactionColor(transaction.type)}`}>
                    {getAmountPrefix(transaction.type)}$
                    {transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(transaction.date), 'MMM d')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <EditTransactionModal
        transaction={editingTransaction}
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        onUpdateTransaction={onUpdateTransaction}
        onDeleteTransaction={onDeleteTransaction}
        categories={categories}
        transactions={transactions}
      />
    </>
  );
}
