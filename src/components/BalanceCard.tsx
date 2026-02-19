import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Transaction } from '@/types/budget';
import { SummaryRangeSelector } from '@/components/SummaryRangeSelector';
import { filterTransactionsByRange } from '@/lib/dateRangeUtils';
import { useTimeFrame } from '@/contexts/TimeFrameContext';

interface BalanceCardProps {
  transactions: Transaction[];
}

export function BalanceCard({ transactions }: BalanceCardProps) {
  const { range, setRange, filterRent, customStartDate, customEndDate } = useTimeFrame();

  const filteredTransactions = useMemo(() => {
    const rangeFiltered = filterTransactionsByRange(transactions, range, customStartDate, customEndDate);
    return filterRent(rangeFiltered);
  }, [transactions, range, filterRent, customStartDate, customEndDate]);

  const { totalBalance, totalIncome, totalExpenses, totalTransfers, savingsRate } = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expenses = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const transfers = filteredTransactions
      .filter((t) => t.type === 'transfer')
      .reduce((acc, t) => acc + t.amount, 0);
    // Balance = income - expenses - transfers (transfers reduce available cash)
    const balance = income - expenses - transfers;
    const rate = income > 0 ? ((income - expenses - transfers) / income * 100).toFixed(1) : '0';

    return {
      totalBalance: balance,
      totalIncome: income,
      totalExpenses: expenses,
      totalTransfers: transfers,
      savingsRate: rate,
    };
  }, [filteredTransactions]);

  return (
    <Card className="gradient-card border-border/50 p-6 shadow-card animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <h2 className="text-3xl font-bold text-foreground">
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Savings Rate</p>
          <p className="text-2xl font-bold text-primary">{savingsRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-income/10 rounded-xl p-4 border border-income/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-income/20 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-income" />
            </div>
            <span className="text-sm text-muted-foreground">Income</span>
          </div>
          <p className="text-xl font-bold text-income">
            +${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-expense/10 rounded-xl p-4 border border-expense/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-expense/20 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-expense" />
            </div>
            <span className="text-sm text-muted-foreground">Expenses</span>
          </div>
          <p className="text-xl font-bold text-expense">
            -${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <SummaryRangeSelector value={range} onChange={setRange} transactions={transactions} />
    </Card>
  );
}