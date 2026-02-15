import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Category } from '@/types/budget';
import { Pencil, Check, X, Plus, Lightbulb } from 'lucide-react';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { getDateRangeStart } from '@/lib/dateRangeUtils';
import { startOfDay, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface CategorySpendListProps {
  categories: Category[];
  transactions: { type: string; category: string; amount: number; date: string }[];
  budgets: Record<string, number>;
  onUpdateBudget: (params: { category: string; amount: number }) => void;
}

export function CategorySpendList({ 
  categories, 
  transactions, 
  budgets, 
  onUpdateBudget,
}: CategorySpendListProps) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const { includeRent, range } = useTimeFrame();

  // Calculate actual spend by category from transactions
  const spendByCategory = useMemo(() => {
    const startDate = getDateRangeStart(range);
    const endDate = startOfDay(new Date());
    
    const filteredTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      const withinRange = txDate >= startDate && txDate <= endDate;
      const rentFilter = includeRent || t.category !== 'Rent';
      return t.type === 'expense' && withinRange && rentFilter;
    });

    const spend: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      spend[t.category] = (spend[t.category] || 0) + t.amount;
    });
    return spend;
  }, [transactions, range, includeRent]);

  // Compute suggested monthly budget per category (avg over past 3-6 months)
  const suggestedBudgets = useMemo(() => {
    const now = new Date();
    const suggestions: Record<string, number | null> = {};

    // Look back up to 6 months, require at least 1 full prior month
    const lookbackMonths = 6;
    const monthlySpend: Record<string, number[]> = {};

    for (let i = 1; i <= lookbackMonths; i++) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));

      const monthTxns = transactions.filter(t => {
        const txDate = new Date(t.date);
        return t.type === 'expense' && isWithinInterval(txDate, { start: monthStart, end: monthEnd });
      });

      monthTxns.forEach(t => {
        if (!monthlySpend[t.category]) monthlySpend[t.category] = [];
        // We need to track by month index
      });
    }

    // Better approach: compute total per category per month, then average
    const catMonths: Record<string, Record<number, number>> = {};

    for (let i = 1; i <= lookbackMonths; i++) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));

      const monthTxns = transactions.filter(t => {
        const txDate = new Date(t.date);
        const rentFilter = includeRent || t.category !== 'Rent';
        return t.type === 'expense' && rentFilter && isWithinInterval(txDate, { start: monthStart, end: monthEnd });
      });

      monthTxns.forEach(t => {
        if (!catMonths[t.category]) catMonths[t.category] = {};
        catMonths[t.category][i] = (catMonths[t.category][i] || 0) + t.amount;
      });
    }

    Object.entries(catMonths).forEach(([cat, months]) => {
      const monthValues = Object.values(months);
      if (monthValues.length >= 1) {
        const avg = monthValues.reduce((a, b) => a + b, 0) / monthValues.length;
        suggestions[cat] = Math.round(avg);
      }
    });

    return suggestions;
  }, [transactions, includeRent]);

  // Get all categories with spend (even if no budget)
  const categoriesWithSpend = useMemo(() => {
    const allCategoryNames = new Set<string>();
    Object.keys(spendByCategory).forEach(name => allCategoryNames.add(name));
    
    const merged = Array.from(allCategoryNames).map(name => {
      const existing = categories.find(c => c.name === name);
      const spent = spendByCategory[name] || 0;
      const budget = budgets[name] || 0;
      
      return {
        id: existing?.id || name,
        name,
        icon: existing?.icon || '📦',
        color: existing?.color || '#6366f1',
        spent,
        budget,
        hasBudget: budget > 0,
      };
    });

    return merged.sort((a, b) => b.spent - a.spent);
  }, [categories, spendByCategory, budgets]);

  const handleStartEdit = (categoryName: string, currentBudget: number) => {
    setEditingCategory(categoryName);
    setEditValue(currentBudget > 0 ? currentBudget.toString() : '');
  };

  const handleSave = (categoryName: string) => {
    const amount = parseFloat(editValue) || 0;
    onUpdateBudget({ category: categoryName, amount });
    setEditingCategory(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingCategory(null);
    setEditValue('');
  };

  const handleUseSuggestion = (amount: number) => {
    setEditValue(amount.toString());
  };

  return (
    <Card className="bg-card border-border p-6 animate-fade-in">
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {categoriesWithSpend.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No spending data for this period.</p>
        ) : (
          categoriesWithSpend.map((category) => {
            const percentage = category.budget > 0 ? (category.spent / category.budget) * 100 : 0;
            const isOverBudget = category.budget > 0 && category.spent > category.budget;
            const isEditing = editingCategory === category.name;
            const suggestion = suggestedBudgets[category.name];

            return (
              <div
                key={category.id}
                className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{category.icon}</span>
                    <div>
                      <span className="font-medium text-foreground">{category.name}</span>
                      <p className="text-sm text-foreground">
                        ${category.spent.toLocaleString()} spent
                      </p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 h-8 text-right"
                        placeholder="0"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(category.name);
                          if (e.key === 'Escape') handleCancel();
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-income hover:text-income"
                        onClick={() => handleSave(category.name)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-expense"
                        onClick={handleCancel}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : category.hasBudget ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        ${category.budget.toLocaleString()} budget
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleStartEdit(category.name, category.budget)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-primary gap-1"
                      onClick={() => handleStartEdit(category.name, 0)}
                    >
                      <Plus className="w-3 h-3" />
                      Set target
                    </Button>
                  )}
                </div>

                {/* Suggestion when editing */}
                {isEditing && suggestion && suggestion > 0 && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                    <Lightbulb className="w-3 h-3 shrink-0" />
                    <span>Suggested: ${suggestion.toLocaleString()}/mo (avg spending)</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-5 text-[10px] px-2 py-0"
                      onClick={() => handleUseSuggestion(suggestion)}
                    >
                      Use
                    </Button>
                  </div>
                )}

                {category.hasBudget && !isEditing && (
                  <>
                    <Progress
                      value={Math.min(percentage, 100)}
                      className="h-2 mb-2"
                      style={{
                        '--progress-color': isOverBudget ? 'hsl(32, 95%, 55%)' : 'hsl(220, 60%, 45%)',
                      } as React.CSSProperties}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{percentage.toFixed(0)}% of budget</span>
                      <span className={isOverBudget ? 'text-accent' : ''}>
                        {isOverBudget
                          ? `$${(category.spent - category.budget).toLocaleString()} over`
                          : `$${(category.budget - category.spent).toLocaleString()} left`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
