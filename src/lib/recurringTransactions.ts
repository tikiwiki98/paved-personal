import { addDays, addWeeks, addMonths, addYears, format, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';
import { Transaction } from '@/types/budget';

/**
 * Generates all recurring transaction instances from a base recurring transaction
 * up to today's date (or the recurring end date if specified).
 */
export function expandRecurringTransaction(
  baseTransaction: Transaction,
  upToDate: Date = new Date()
): Transaction[] {
  // If not recurring or missing required fields, return just the original
  if (!baseTransaction.is_recurring || !baseTransaction.recurring_frequency || !baseTransaction.recurring_start_date) {
    return [baseTransaction];
  }

  const instances: Transaction[] = [];
  const startDate = parseISO(baseTransaction.recurring_start_date);
  const endDate = baseTransaction.recurring_end_date 
    ? parseISO(baseTransaction.recurring_end_date) 
    : upToDate;
  
  // Cap to today's date - don't generate future recurring transactions
  const effectiveEndDate = isBefore(endDate, startOfDay(upToDate)) 
    ? endDate 
    : startOfDay(upToDate);

  let currentDate = startDate;
  let instanceIndex = 0;

  while (!isAfter(currentDate, effectiveEndDate)) {
    const instanceId = `${baseTransaction.id}_recurring_${instanceIndex}`;
    
    instances.push({
      ...baseTransaction,
      id: instanceId,
      date: format(currentDate, 'yyyy-MM-dd'),
      // Keep the is_recurring flag to show the repeat icon
      is_recurring: true,
    });

    // Advance to next occurrence based on frequency
    switch (baseTransaction.recurring_frequency) {
      case 'daily':
        currentDate = addDays(currentDate, 1);
        break;
      case 'weekly':
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'biweekly':
        currentDate = addWeeks(currentDate, 2);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
      case 'quarterly':
        currentDate = addMonths(currentDate, 3);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, 1);
        break;
      default:
        // Unknown frequency, just use monthly as fallback
        currentDate = addMonths(currentDate, 1);
    }

    instanceIndex++;

    // Safety limit to prevent infinite loops
    if (instanceIndex > 1000) {
      console.warn('Recurring transaction expansion hit safety limit:', baseTransaction.id);
      break;
    }
  }

  return instances;
}

/**
 * Takes an array of transactions and expands any recurring ones into their instances.
 * Non-recurring transactions are passed through as-is.
 * 
 * @param transactions - Array of transactions (some may be recurring templates)
 * @param upToDate - Date up to which to generate recurring instances (defaults to today)
 * @returns Array with recurring transactions expanded into individual instances
 */
export function expandAllRecurringTransactions(
  transactions: Transaction[],
  upToDate: Date = new Date()
): Transaction[] {
  const expandedTransactions: Transaction[] = [];

  for (const transaction of transactions) {
    if (transaction.is_recurring && transaction.recurring_start_date) {
      // This is a recurring template - expand it
      const instances = expandRecurringTransaction(transaction, upToDate);
      expandedTransactions.push(...instances);
    } else {
      // Regular transaction - pass through as-is
      expandedTransactions.push(transaction);
    }
  }

  // Sort by date (descending) then by created_at equivalent (using id for stable sort)
  return expandedTransactions.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    // For same date, keep original order (recurring instances after real ones)
    return a.id.localeCompare(b.id);
  });
}
