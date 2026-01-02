export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  is_recurring?: boolean;
  recurring_frequency?: string;
  recurring_start_date?: string;
  recurring_end_date?: string | null;
  payment_type?: string | null;
  payment_description?: string | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  budget: number;
  spent: number;
  color: string;
}

export interface BudgetSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
}
