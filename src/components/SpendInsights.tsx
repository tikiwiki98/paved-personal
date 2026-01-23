import { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  amount: number;
  category: string;
  date: string;
  description: string;
  type: string;
}

interface SpendInsightsProps {
  transactions: Transaction[];
}

export function SpendInsights({ transactions }: SpendInsightsProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const { toast } = useToast();

  // Filter to just the serializable data we need
  const transactionData = transactions.map(t => ({
    amount: t.amount,
    category: t.category,
    date: t.date,
    description: t.description,
    type: t.type,
  }));

  const fetchInsight = useCallback(async () => {
    setLoading(true);
    setFailed(false);

    try {
      const { data, error } = await supabase.functions.invoke('spend-insights', {
        body: { transactions: transactionData },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        toast({
          title: 'Insight unavailable',
          description: data.error,
          variant: 'destructive',
        });
        setFailed(true);
        return;
      }

      setInsight(data?.insight || null);
      setHasFetched(true);
    } catch (err) {
      console.error('Failed to fetch insight:', err);
      setFailed(true);
      toast({
        title: 'Error',
        description: 'Failed to generate insight. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [transactionData, toast]);

  // Fetch insight on mount if we have transactions
  useEffect(() => {
    if (transactions.length > 0 && !insight && !loading && !hasFetched) {
      fetchInsight();
    }
  }, [transactions.length, insight, loading, hasFetched, fetchInsight]);

  const handleRefresh = () => {
    setInsight(null);
    setHasFetched(false);
    fetchInsight();
  };

  // Don't show if no transactions
  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Analyzing spending...</span>
          </div>
        ) : insight ? (
          <p className="text-sm text-foreground leading-relaxed">{insight}</p>
        ) : failed ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Unable to load insight.</span>
            <button 
              onClick={handleRefresh}
              className="text-sm text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </div>

      {insight && !loading && (
        <button
          onClick={handleRefresh}
          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Refresh insight"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
