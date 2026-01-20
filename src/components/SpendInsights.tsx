import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, TrendingUp, Clock, BarChart3, List, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type InsightType = 'summary' | 'trend' | 'frequency' | 'volatility' | 'top' | 'unusual';

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

const insightButtons = [
  { type: 'trend' as InsightType, label: 'Spending Trend Changes', icon: TrendingUp },
  { type: 'frequency' as InsightType, label: 'Spending Frequency', icon: Clock },
  { type: 'volatility' as InsightType, label: 'Category Volatility', icon: BarChart3 },
  { type: 'top' as InsightType, label: 'Top Spending Categories', icon: List },
  { type: 'unusual' as InsightType, label: 'Unusual Transactions', icon: AlertCircle },
];

export function SpendInsights({ transactions }: SpendInsightsProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [activeInsight, setActiveInsight] = useState<InsightType | null>(null);
  const [insightContent, setInsightContent] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
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

  const fetchInsight = useCallback(async (type: InsightType) => {
    if (type === 'summary') {
      setSummaryLoading(true);
      setSummaryFailed(false);
    } else {
      setInsightLoading(true);
      setActiveInsight(type);
    }

    try {
      const { data, error } = await supabase.functions.invoke('spend-insights', {
        body: { transactions: transactionData, insightType: type },
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
        if (type === 'summary') {
          setSummaryFailed(true);
        }
        return;
      }

      if (type === 'summary') {
        setSummary(data?.insight || null);
        setHasFetched(true);
      } else {
        setInsightContent(data?.insight || null);
      }
    } catch (err) {
      console.error('Failed to fetch insight:', err);
      if (type === 'summary') {
        setSummaryFailed(true);
      }
      toast({
        title: 'Error',
        description: 'Failed to generate insight. Please try again.',
        variant: 'destructive',
      });
    } finally {
      if (type === 'summary') {
        setSummaryLoading(false);
      } else {
        setInsightLoading(false);
      }
    }
  }, [transactionData, toast]);

  // Fetch summary on mount if we have transactions
  useEffect(() => {
    if (transactions.length > 0 && !summary && !summaryLoading && !hasFetched) {
      fetchInsight('summary');
    }
  }, [transactions.length, summary, summaryLoading, hasFetched, fetchInsight]);

  const handleInsightClick = (type: InsightType) => {
    if (activeInsight === type) {
      // Toggle off
      setActiveInsight(null);
      setInsightContent(null);
    } else {
      // Fetch new insight
      setInsightContent(null);
      fetchInsight(type);
    }
  };

  const handleRetry = () => {
    setSummaryFailed(false);
    setHasFetched(false);
    fetchInsight('summary');
  };

  // Don't show if no transactions
  if (transactions.length === 0) {
    return null;
  }

  return (
    <Card className="gradient-card border-border/50 p-5 shadow-card animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Monthly Summary</h3>
        </div>
        <div className="flex items-center gap-1">
          {summary && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 w-8 p-0"
              onClick={handleRetry}
              disabled={summaryLoading}
            >
              <RefreshCw className={`w-4 h-4 ${summaryLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4">
        {summaryLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Analyzing your spending...</span>
          </div>
        ) : summary ? (
          <p className="text-sm text-foreground leading-relaxed">{summary}</p>
        ) : summaryFailed ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Failed to load summary.</span>
            <Button variant="link" size="sm" className="text-primary p-0 h-auto" onClick={handleRetry}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </div>

      {/* Expandable Insights Section */}
      {expanded && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Insight Buttons */}
          <div className="flex flex-wrap gap-2">
            {insightButtons.map(({ type, label, icon: Icon }) => (
              <Button
                key={type}
                variant={activeInsight === type ? 'default' : 'outline'}
                size="sm"
                className={`text-xs gap-1.5 ${
                  activeInsight === type 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary/50 border-border hover:bg-secondary'
                }`}
                onClick={() => handleInsightClick(type)}
                disabled={insightLoading && activeInsight !== type}
              >
                <Icon className="w-3 h-3" />
                {label}
              </Button>
            ))}
          </div>

          {/* Active Insight Content */}
          {(insightLoading || insightContent) && (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              {insightLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating insight...</span>
                </div>
              ) : insightContent ? (
                <p className="text-sm text-foreground leading-relaxed">{insightContent}</p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Expand hint when collapsed */}
      {!expanded && summary && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Tap for more insights →
        </button>
      )}
    </Card>
  );
}
