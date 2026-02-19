import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Transaction } from '@/types/budget';
import { getSmartDefaultRange, getEarliestTransactionDate, getRangeMeaningfulness } from '@/lib/dateRangeUtils';

export type TimeFrameRange = '1m' | '3m' | '6m' | '1y' | 'mtd' | 'ytd' | 'custom';

interface TimeFrameContextType {
  range: TimeFrameRange;
  setRange: (range: TimeFrameRange) => void;
  includeRent: boolean;
  setIncludeRent: (include: boolean) => void;
  filterRent: (transactions: Transaction[]) => Transaction[];
  initializeWithTransactions: (transactions: Transaction[]) => void;
  customStartDate: string | null;
  customEndDate: string | null;
  setCustomRange: (start: string, end: string) => void;
  clearCustomRange: () => void;
}

const TimeFrameContext = createContext<TimeFrameContextType | undefined>(undefined);

const INCLUDE_RENT_KEY = 'budget-app-include-rent';

export function TimeFrameProvider({ children }: { children: ReactNode }) {
  const [range, setRangeState] = useState<TimeFrameRange>('mtd');
  const [initialized, setInitialized] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string | null>(null);
  const [customEndDate, setCustomEndDate] = useState<string | null>(null);
  const [includeRent, setIncludeRentState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(INCLUDE_RENT_KEY);
      return stored === null ? true : stored === 'true';
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem(INCLUDE_RENT_KEY, String(includeRent));
  }, [includeRent]);

  const setIncludeRent = (include: boolean) => {
    setIncludeRentState(include);
  };

  const setRange = useCallback((newRange: TimeFrameRange) => {
    if (newRange !== 'custom') {
      // Clear custom dates when switching to a preset
      setCustomStartDate(null);
      setCustomEndDate(null);
    }
    setRangeState(newRange);
  }, []);

  const setCustomRange = useCallback((start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setRangeState('custom');
  }, []);

  const clearCustomRange = useCallback(() => {
    setCustomStartDate(null);
    setCustomEndDate(null);
    setRangeState('mtd');
  }, []);

  const initializeWithTransactions = useCallback((transactions: Transaction[]) => {
    if (initialized) return;
    
    const earliestDate = getEarliestTransactionDate(transactions);
    const smartDefault = getSmartDefaultRange(earliestDate);
    const meaningfulness = getRangeMeaningfulness(earliestDate);
    
    if (meaningfulness[smartDefault].enabled) {
      setRangeState(smartDefault);
    } else if (meaningfulness['mtd'].enabled) {
      setRangeState('mtd');
    } else if (meaningfulness['1m'].enabled) {
      setRangeState('1m');
    }
    
    setInitialized(true);
  }, [initialized]);

  const filterRent = useMemo(() => {
    return (transactions: Transaction[]) => {
      if (includeRent) {
        return transactions;
      }
      return transactions.filter(
        (t) => t.category.toLowerCase() !== 'rent'
      );
    };
  }, [includeRent]);

  return (
    <TimeFrameContext.Provider value={{ 
      range, 
      setRange, 
      includeRent, 
      setIncludeRent, 
      filterRent,
      initializeWithTransactions,
      customStartDate,
      customEndDate,
      setCustomRange,
      clearCustomRange,
    }}>
      {children}
    </TimeFrameContext.Provider>
  );
}

export function useTimeFrame() {
  const context = useContext(TimeFrameContext);
  if (context === undefined) {
    throw new Error('useTimeFrame must be used within a TimeFrameProvider');
  }
  return context;
}
