import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Transaction } from '@/types/budget';

export type TimeFrameRange = '1m' | '3m' | '6m' | '1y' | 'mtd' | 'ytd';

interface TimeFrameContextType {
  range: TimeFrameRange;
  setRange: (range: TimeFrameRange) => void;
  includeRent: boolean;
  setIncludeRent: (include: boolean) => void;
  filterRent: (transactions: Transaction[]) => Transaction[];
}

const TimeFrameContext = createContext<TimeFrameContextType | undefined>(undefined);

const INCLUDE_RENT_KEY = 'budget-app-include-rent';

export function TimeFrameProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<TimeFrameRange>('mtd');
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
    <TimeFrameContext.Provider value={{ range, setRange, includeRent, setIncludeRent, filterRent }}>
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