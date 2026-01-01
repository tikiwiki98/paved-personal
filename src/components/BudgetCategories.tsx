import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Category } from '@/types/budget';
import { ManageCategoriesModal } from './ManageCategoriesModal';

interface BudgetCategoriesProps {
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id' | 'spent'>) => void;
  onUpdateCategory: (category: Partial<Category> & { id: string }) => void;
  onDeleteCategory: (id: string) => void;
}

export function BudgetCategories({ 
  categories, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory 
}: BudgetCategoriesProps) {
  return (
    <Card className="gradient-card border-border/50 p-6 shadow-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Budget Categories</h3>
        <ManageCategoriesModal
          categories={categories}
          onAddCategory={onAddCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
        />
      </div>

      <div className="space-y-4">
        {categories.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No categories yet. Add one to start budgeting!</p>
        ) : (
          categories.map((category, index) => {
            const percentage = (category.spent / category.budget) * 100;
            const isOverBudget = percentage > 100;
            const remaining = category.budget - category.spent;

            return (
              <div
                key={category.id}
                className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-all duration-200"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <p className="font-medium text-foreground">{category.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${category.spent.toFixed(0)} of ${category.budget}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        isOverBudget ? 'text-expense' : 'text-income'
                      }`}
                    >
                      {isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isOverBudget ? 'over budget' : 'remaining'}
                    </p>
                  </div>
                </div>
                <Progress
                  value={Math.min(percentage, 100)}
                  className="h-2"
                  style={{
                    '--progress-color': isOverBudget ? 'hsl(var(--expense))' : 'hsl(var(--income))',
                  } as React.CSSProperties}
                />
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
