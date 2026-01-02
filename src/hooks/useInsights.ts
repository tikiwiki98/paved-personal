import { useMemo } from 'react';
import { Transaction } from '@/types/budget';
import { parseISO, getDay, getDate } from 'date-fns';

type InsightType = 'balance' | 'spending' | 'trends';

interface InsightResult {
  message: string | null;
  hasInteracted: boolean;
}

// Narrative phrases tied to "Paved" identity
const narrativePhrases = [
  "You're paving awareness into your spending.",
  "Another part of your financial path is clearer.",
  "Your financial landscape is coming into focus.",
  "The path to understanding your money continues.",
];

function getRandomNarrative(): string {
  return narrativePhrases[Math.floor(Math.random() * narrativePhrases.length)];
}

function getDayName(dayIndex: number): string {
  const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  return days[dayIndex];
}

export function useBalanceInsight(
  transactions: Transaction[],
  hasInteracted: boolean
): InsightResult {
  const insight = useMemo(() => {
    if (!hasInteracted || transactions.length === 0) return null;

    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income');
    
    if (expenses.length === 0 && income.length === 0) return null;

    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    
    if (totalIncome > 0 && totalExpenses > 0) {
      const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
      if (savingsRate > 30) {
        return `${getRandomNarrative()} You're keeping over 30% of your income in this period.`;
      }
    }

    // Day of week spending pattern
    if (expenses.length >= 5) {
      const dayTotals = new Array(7).fill(0);
      expenses.forEach(t => {
        const day = getDay(parseISO(t.date));
        dayTotals[day] += t.amount;
      });
      const maxDay = dayTotals.indexOf(Math.max(...dayTotals));
      if (dayTotals[maxDay] > totalExpenses * 0.25) {
        return `Your spending tends to peak on ${getDayName(maxDay)}.`;
      }
    }

    return getRandomNarrative();
  }, [transactions, hasInteracted]);

  return { message: insight, hasInteracted };
}

export function useSpendingInsight(
  transactions: Transaction[],
  showHistorical: boolean,
  hasInteracted: boolean
): InsightResult {
  const insight = useMemo(() => {
    if (!hasInteracted || transactions.length === 0) return null;

    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length < 3) return null;

    // Category concentration
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    
    if (sortedCategories.length > 0) {
      const [topCategory, topAmount] = sortedCategories[0];
      const percentage = (topAmount / totalExpenses) * 100;
      
      if (percentage > 40) {
        return `${topCategory} accounts for over ${Math.round(percentage)}% of your spending in this range.`;
      }
    }

    // Historical comparison messaging
    if (showHistorical) {
      return "Comparing against your historical average reveals spending patterns over time.";
    }

    // End of month spending pattern
    const lateMonthExpenses = expenses.filter(t => getDate(parseISO(t.date)) > 20);
    if (lateMonthExpenses.length > expenses.length * 0.4) {
      return "Most of your spending occurs in the last 10 days of the month.";
    }

    return null;
  }, [transactions, showHistorical, hasInteracted]);

  return { message: insight, hasInteracted };
}

export function useTrendsInsight(
  transactions: Transaction[],
  hasInteracted: boolean,
  interactionType?: 'range' | 'category' | 'payment'
): InsightResult {
  const insight = useMemo(() => {
    if (!hasInteracted || transactions.length === 0) return null;

    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length < 3) return null;

    // Payment type insight
    if (interactionType === 'payment') {
      const paymentTotals: Record<string, { total: number; count: number }> = {};
      expenses.forEach(t => {
        const type = t.payment_type || 'Unknown';
        if (!paymentTotals[type]) {
          paymentTotals[type] = { total: 0, count: 0 };
        }
        paymentTotals[type].total += t.amount;
        paymentTotals[type].count += 1;
      });

      const types = Object.entries(paymentTotals);
      if (types.length >= 2) {
        const sorted = types.sort((a, b) => 
          (b[1].total / b[1].count) - (a[1].total / a[1].count)
        );
        const [highestType] = sorted[0];
        const [lowestType] = sorted[sorted.length - 1];
        
        if (highestType !== lowestType) {
          return `You tend to spend more per transaction with ${highestType} than ${lowestType}.`;
        }
      }
    }

    // Range change insight
    if (interactionType === 'range') {
      return getRandomNarrative();
    }

    // Category insight
    if (interactionType === 'category') {
      const categoryCount = new Set(expenses.map(t => t.category)).size;
      if (categoryCount >= 5) {
        return `Your spending spans ${categoryCount} categories in this period.`;
      }
    }

    return null;
  }, [transactions, hasInteracted, interactionType]);

  return { message: insight, hasInteracted };
}
