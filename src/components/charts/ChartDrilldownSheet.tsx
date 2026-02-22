import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, X, ChevronRight, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';

import { Transaction, Category } from '@/types/budget';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

interface ChartDrilldownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  transactions: Transaction[];
}

const PAYMENT_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  cash: 'Cash',
  venmo: 'Venmo',
  paypal: 'PayPal',
  crypto: 'Crypto',
  bank_transfer: 'Bank Transfer',
  zelle: 'Zelle',
  check: 'Check',
  other: 'Other',
};

export function ChartDrilldownSheet({
  open,
  onOpenChange,
  title,
  transactions,
}: ChartDrilldownSheetProps) {
  const [search, setSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);
  
  const { updateTransaction, deleteTransaction, transactions: allTransactions } = useTransactions();
  const { categories } = useCategories();

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const query = search.toLowerCase();
    return transactions.filter(
      (t) =>
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.payment_description?.toLowerCase().includes(query)
    );
  }, [transactions, search]);

  const total = useMemo(
    () => transactions.reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditModalOpen(true);
  };

  const handleUpdateTransaction = (updated: Partial<Transaction> & { id: string }) => {
    updateTransaction(updated);
    setRecentlySavedId(updated.id);
    // Clear the saved indicator after animation
    setTimeout(() => setRecentlySavedId(null), 2000);
  };

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction(id);
  };

  const handleEditModalClose = (isOpen: boolean) => {
    setEditModalOpen(isOpen);
    if (!isOpen) {
      setSelectedTransaction(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col">
          <SheetHeader className="pb-4 flex-none">
            <SheetTitle className="flex items-center justify-between">
              <span>{title}</span>
              <span className="text-sm font-normal text-muted-foreground">
                ${total.toLocaleString()} total
              </span>
            </SheetTitle>
          </SheetHeader>

          {/* Search */}
          <div className="relative mb-4 flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-foreground mb-3 flex-none">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </p>

          {/* Inline note about trend updates */}
          <p className="text-xs text-muted-foreground/70 mb-3 italic flex-none">
            Editing a transaction will update your trends.
          </p>

          {/* Transaction List */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-2 pb-[env(safe-area-inset-bottom,24px)]">
              {filteredTransactions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No transactions found
                </div>
              ) : (
                filteredTransactions.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTransactionClick(t)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all text-left group",
                      recentlySavedId === t.id && "ring-2 ring-income/50 bg-income/5"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {t.description}
                        </p>
                        {recentlySavedId === t.id && (
                          <Check className="h-4 w-4 text-income flex-shrink-0 animate-in fade-in zoom-in" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{format(new Date(t.date), 'MMM d, yyyy')}</span>
                        <span>•</span>
                        <span>{t.category}</span>
                        {t.payment_type && (
                          <>
                            <span>•</span>
                            <span>
                              {PAYMENT_LABELS[t.payment_type] || t.payment_type}
                              {t.payment_description && ` (${t.payment_description})`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className={cn(
                        "font-semibold",
                        t.type === 'expense' ? "text-expense" : "text-income"
                      )}>
                        {t.type === 'expense' ? '-' : '+'}${t.amount.toLocaleString()}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        transaction={selectedTransaction}
        open={editModalOpen}
        onOpenChange={handleEditModalClose}
        onUpdateTransaction={handleUpdateTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        categories={categories}
        transactions={allTransactions}
      />
    </>
  );
}
