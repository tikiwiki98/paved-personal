import { Transaction, Category } from '@/types/budget';

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    amount: 3500,
    type: 'income',
    category: 'Salary',
    description: 'Monthly salary',
    date: '2026-01-01',
  },
  {
    id: '2',
    amount: 1200,
    type: 'expense',
    category: 'Rent',
    description: 'Monthly rent payment',
    date: '2026-01-01',
  },
  {
    id: '3',
    amount: 85.50,
    type: 'expense',
    category: 'Groceries',
    description: 'Weekly groceries',
    date: '2025-12-30',
  },
  {
    id: '4',
    amount: 45,
    type: 'expense',
    category: 'Entertainment',
    description: 'Netflix & Spotify',
    date: '2025-12-28',
  },
  {
    id: '5',
    amount: 250,
    type: 'income',
    category: 'Freelance',
    description: 'Side project payment',
    date: '2025-12-27',
  },
  {
    id: '6',
    amount: 120,
    type: 'expense',
    category: 'Utilities',
    description: 'Electric bill',
    date: '2025-12-25',
  },
  {
    id: '7',
    amount: 65,
    type: 'expense',
    category: 'Dining',
    description: 'Restaurant dinner',
    date: '2025-12-24',
  },
  {
    id: '8',
    amount: 200,
    type: 'expense',
    category: 'Shopping',
    description: 'New headphones',
    date: '2025-12-22',
  },
];

export const mockCategories: Category[] = [
  { id: '1', name: 'Rent', icon: '🏠', budget: 1200, spent: 1200, color: 'hsl(0, 72%, 51%)' },
  { id: '2', name: 'Groceries', icon: '🛒', budget: 400, spent: 285.50, color: 'hsl(160, 84%, 39%)' },
  { id: '3', name: 'Entertainment', icon: '🎬', budget: 150, spent: 45, color: 'hsl(38, 92%, 50%)' },
  { id: '4', name: 'Utilities', icon: '💡', budget: 200, spent: 120, color: 'hsl(200, 80%, 50%)' },
  { id: '5', name: 'Dining', icon: '🍽️', budget: 250, spent: 65, color: 'hsl(280, 70%, 50%)' },
  { id: '6', name: 'Shopping', icon: '🛍️', budget: 300, spent: 200, color: 'hsl(320, 70%, 50%)' },
];

export const monthlyData = [
  { month: 'Aug', income: 3200, expenses: 2100 },
  { month: 'Sep', income: 3400, expenses: 2300 },
  { month: 'Oct', income: 3100, expenses: 2000 },
  { month: 'Nov', income: 3600, expenses: 2400 },
  { month: 'Dec', income: 3750, expenses: 1915 },
  { month: 'Jan', income: 3750, expenses: 1765.50 },
];
