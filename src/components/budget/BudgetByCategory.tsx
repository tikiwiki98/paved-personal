import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Category } from '@/types/budget';
import { Pencil, Check, X } from 'lucide-react';
import { useTimeFrame } from '@/contexts/TimeFrameContext';

interface BudgetByCategoryProps {
  categories: Category[];
  onUpdateBudget: (params: { category: string; amount: number }) => void;
}

export function BudgetByCategory({ categories, onUpdateBudget }: BudgetByCategoryProps) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const { includeRent } = useTimeFrame();

  const handleStartEdit = (category: Category) => {
    setEditingCategory(category.name);
    setEditValue(category.budget.toString());
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

  // Filter categories based on rent toggle
  const filteredCategories = categories.filter(c => includeRent || c.name !== 'Rent');

  // Sort: categories with budgets first, then alphabetically
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (a.budget > 0 && b.budget === 0) return -1;
    if (a.budget === 0 && b.budget > 0) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Card className="gradient-card border-border/50 p-6 shadow-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Budget by Category</h3>
        <p className="text-sm text-muted-foreground">Set your monthly spending limits</p>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {sortedCategories.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No categories yet.</p>
        ) : (
          sortedCategories.map((category) => {
            const percentage = category.budget > 0 ? (category.spent / category.budget) * 100 : 0;
            const isOverBudget = percentage > 100;
            const isEditing = editingCategory === category.name;

            return (
              <div
                key={category.id}
                className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{category.icon}</span>
                    <span className="font-medium text-foreground">{category.name}</span>
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
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        ${category.budget.toLocaleString()}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => handleStartEdit(category)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {category.budget > 0 && (
                  <>
                    <Progress
                      value={Math.min(percentage, 100)}
                      className="h-2 mb-2"
                      style={{
                        '--progress-color': isOverBudget ? 'hsl(var(--expense))' : 'hsl(var(--income))',
                      } as React.CSSProperties}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>${category.spent.toLocaleString()} spent</span>
                      <span className={isOverBudget ? 'text-expense' : ''}>
                        {isOverBudget
                          ? `$${(category.spent - category.budget).toLocaleString()} over`
                          : `$${(category.budget - category.spent).toLocaleString()} left`}
                      </span>
                    </div>
                  </>
                )}

                {category.budget === 0 && (
                  <p className="text-xs text-muted-foreground">No budget set</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
