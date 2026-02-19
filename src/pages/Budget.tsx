import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { IncludeRentToggle } from '@/components/IncludeRentToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets } from '@/hooks/useBudgets';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { CategorySpendList } from '@/components/budget/CategorySpendList';
import { startOfMonth, endOfMonth, format, subMonths, addMonths, isSameMonth, isAfter, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

const Budget = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { transactions, isLoading: transactionsLoading } = useTransactions();
  const { categories, isLoading: categoriesLoading, upsertBudget } = useCategories(transactions, 'monthly');
  const { budgets: budgetsArray, isLoading: budgetsLoading } = useBudgets('monthly');
  const { initializeWithTransactions, includeRent } = useTimeFrame();

  // Month navigation state — defaults to current month
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);

  const now = new Date();
  const isCurrentMonth = isSameMonth(selectedMonth, now);
  const canGoNext = !isCurrentMonth; // Can't go past current month

  const handlePrevMonth = () => setSelectedMonth(prev => startOfMonth(subMonths(prev, 1)));
  const handleNextMonth = () => {
    if (canGoNext) setSelectedMonth(prev => startOfMonth(addMonths(prev, 1)));
  };

  const handlePickMonth = (date: Date | undefined) => {
    if (date) {
      setSelectedMonth(startOfMonth(date));
      setPickerOpen(false);
    }
  };

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

  const budgets = useMemo(() => {
    const lookup: Record<string, number> = {};
    budgetsArray.forEach(b => {
      if (b.amount > 0) {
        lookup[b.category] = b.amount;
      }
    });
    return lookup;
  }, [budgetsArray]);

  // Compute date range for selected month
  const { monthStart, monthEnd } = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    // For current month, cap at today. For past months, use end of month.
    const end = isCurrentMonth ? startOfDay(now) : endOfMonth(selectedMonth);
    return { monthStart: start, monthEnd: end };
  }, [selectedMonth, isCurrentMonth]);

  const monthLabel = format(selectedMonth, 'MMMM yyyy');

  const { totalSpent, totalBudgeted, overCount } = useMemo(() => {
    const filtered = transactions.filter(t => {
      const txDate = new Date(t.date + 'T00:00:00');
      const withinRange = txDate >= monthStart && txDate <= monthEnd;
      const rentFilter = includeRent || t.category !== 'Rent';
      return t.type === 'expense' && withinRange && rentFilter;
    });

    const spendByCat: Record<string, number> = {};
    filtered.forEach(t => {
      spendByCat[t.category] = (spendByCat[t.category] || 0) + t.amount;
    });

    let spent = 0;
    let budgeted = 0;
    let over = 0;

    Object.keys(spendByCat).forEach(cat => {
      spent += spendByCat[cat];
      if (budgets[cat]) {
        budgeted += budgets[cat];
        if (spendByCat[cat] > budgets[cat]) over++;
      }
    });

    Object.keys(budgets).forEach(cat => {
      if (!spendByCat[cat]) {
        budgeted += budgets[cat];
      }
    });

    return { totalSpent: spent, totalBudgeted: budgeted, overCount: over };
  }, [transactions, budgets, includeRent, monthStart, monthEnd]);

  if (authLoading || transactionsLoading || categoriesLoading || budgetsLoading) {
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
      <div className="container mx-auto px-4 py-8 md:py-10 max-w-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h2 className="text-xl font-bold text-foreground">Spending & Budgets</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set targets by category. We'll show how you're doing vs your plan.
            </p>
          </div>
          <IncludeRentToggle />
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-center gap-2 my-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[180px] justify-center gap-2 font-semibold"
              >
                <CalendarIcon className="w-4 h-4" />
                {monthLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedMonth}
                onSelect={handlePickMonth}
                disabled={(date) => isAfter(startOfMonth(date), startOfMonth(now))}
                defaultMonth={selectedMonth}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Summary strip */}
        {totalBudgeted > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-6">
            <span>
              <span className="font-semibold text-foreground">${totalSpent.toLocaleString()}</span> spent of{' '}
              <span className="font-semibold text-foreground">${totalBudgeted.toLocaleString()}</span> budgeted
            </span>
            {overCount > 0 && (
              <span className="text-accent font-medium">
                Over in {overCount} {overCount === 1 ? 'category' : 'categories'}
              </span>
            )}
          </div>
        )}

        {/* Category List */}
        <div className={totalBudgeted === 0 ? 'mt-6' : ''}>
          <CategorySpendList
            categories={categories}
            transactions={transactions}
            budgets={budgets}
            onUpdateBudget={upsertBudget}
            monthStart={monthStart}
            monthEnd={monthEnd}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Budget;
