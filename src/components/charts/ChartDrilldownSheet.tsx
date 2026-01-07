import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Transaction } from '@/types/budget';

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            <span>{title}</span>
            <span className="text-sm font-normal text-muted-foreground">
              ${total.toLocaleString()} total
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="relative mb-4">
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
        <p className="text-xs text-muted-foreground mb-3">
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
        </p>

        {/* Transaction List */}
        <ScrollArea className="h-[calc(85vh-180px)]">
          <div className="space-y-2 pr-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No transactions found
              </div>
            ) : (
              filteredTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {t.description}
                    </p>
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
                  <div className="text-right ml-3">
                    <span className="font-semibold text-expense">
                      -${t.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
