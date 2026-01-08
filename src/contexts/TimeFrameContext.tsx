import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Transaction } from '@/types/budget';
import { getSmartDefaultRange, getEarliestTransactionDate, getRangeMeaningfulness } from '@/lib/dateRangeUtils';

export type TimeFrameRange = '1m' | '3m' | '6m' | '1y' | 'mtd' | 'ytd';

interface TimeFrameContextType {
  range: TimeFrameRange;
  setRange: (range: TimeFrameRange) => void;
  includeRent: boolean;
  setIncludeRent: (include: boolean) => void;
  filterRent: (transactions: Transaction[]) => Transaction[];
  initializeWithTransactions: (transactions: Transaction[]) => void;
}

const TimeFrameContext = createContext<TimeFrameContextType | undefined>(undefined);

const INCLUDE_RENT_KEY = 'budget-app-include-rent';
const INITIALIZED_KEY = 'budget-app-timeframe-initialized';

export function TimeFrameProvider({ children }: { children: ReactNode }) {
  const [range, setRangeState] = useState<TimeFrameRange>('mtd');
  const [initialized, setInitialized] = useState(false);
  const [includeRent, setIncludeRentState] = useState<boolean>(() => {
    // Initialize from localStorage, default to true (include rent)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(INCLUDE_RENT_KEY);
      return stored === null ? true : stored === 'true';
    }
    return true;
  });

  // Persist to localStorage when changed
  useEffect(() => {
    localStorage.setItem(INCLUDE_RENT_KEY, String(includeRent));
  }, [includeRent]);

  const setIncludeRent = (include: boolean) => {
    setIncludeRentState(include);
  };

  // Smart range setter that validates the range is meaningful
  const setRange = useCallback((newRange: TimeFrameRange) => {
    setRangeState(newRange);
  }, []);

  // Initialize with smart default based on transactions
  const initializeWithTransactions = useCallback((transactions: Transaction[]) => {
    if (initialized) return;
    
    const earliestDate = getEarliestTransactionDate(transactions);
    const smartDefault = getSmartDefaultRange(earliestDate);
    const meaningfulness = getRangeMeaningfulness(earliestDate);
    
    // Only set if the smart default is meaningful, otherwise fall back to mtd
    if (meaningfulness[smartDefault].enabled) {
      setRangeState(smartDefault);
    } else if (meaningfulness['mtd'].enabled) {
      setRangeState('mtd');
    } else if (meaningfulness['1m'].enabled) {
      setRangeState('1m');
    }
    
    setInitialized(true);
  }, [initialized]);

  // Helper function to filter out rent transactions when needed
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
      initializeWithTransactions 
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