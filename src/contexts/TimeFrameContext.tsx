import { createContext, useContext, useState, ReactNode } from 'react';

export type TimeFrameRange = '1m' | '3m' | '6m' | '1y' | 'mtd' | 'ytd';

interface TimeFrameContextType {
  range: TimeFrameRange;
  setRange: (range: TimeFrameRange) => void;
}

const TimeFrameContext = createContext<TimeFrameContextType | undefined>(undefined);

export function TimeFrameProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<TimeFrameRange>('mtd');

  return (
    <TimeFrameContext.Provider value={{ range, setRange }}>
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