import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Transaction {
  amount: number;
  category: string;
  date: string;
  description: string;
  type: string;
}

interface RequestBody {
  transactions: Transaction[];
}

function buildPrompt(transactions: Transaction[]): string {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Filter to expenses only
  const expenses = transactions.filter(t => t.type === "expense");
  
  // Current month transactions
  const currentMonthTxns = expenses.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  
  // Previous months for comparison (last 3 months)
  const recentTxns = expenses.filter(t => {
    const d = new Date(t.date);
    const monthsAgo = (currentYear - d.getFullYear()) * 12 + (currentMonth - d.getMonth());
    return monthsAgo > 0 && monthsAgo <= 3;
  });

  // Calculate category totals for current month
  const currentByCategory: Record<string, number> = {};
  const currentCountByCategory: Record<string, number> = {};
  currentMonthTxns.forEach(t => {
    currentByCategory[t.category] = (currentByCategory[t.category] || 0) + t.amount;
    currentCountByCategory[t.category] = (currentCountByCategory[t.category] || 0) + 1;
  });

  // Calculate monthly averages by category for recent months
  const recentMonthlyByCategory: Record<string, number[]> = {};
  const recentCountByCategory: Record<string, number[]> = {};
  
  recentTxns.forEach(t => {
    const d = new Date(t.date);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    if (!recentMonthlyByCategory[t.category]) {
      recentMonthlyByCategory[t.category] = [];
      recentCountByCategory[t.category] = [];
    }
  });

  // Group recent transactions by month and category
  const recentByMonthCategory: Record<string, Record<string, { total: number; count: number }>> = {};
  recentTxns.forEach(t => {
    const d = new Date(t.date);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    if (!recentByMonthCategory[monthKey]) recentByMonthCategory[monthKey] = {};
    if (!recentByMonthCategory[monthKey][t.category]) {
      recentByMonthCategory[monthKey][t.category] = { total: 0, count: 0 };
    }
    recentByMonthCategory[monthKey][t.category].total += t.amount;
    recentByMonthCategory[monthKey][t.category].count += 1;
  });

  // Calculate averages
  const categoryAvgSpend: Record<string, number> = {};
  const categoryAvgCount: Record<string, number> = {};
  const monthCount = Object.keys(recentByMonthCategory).length || 1;
  
  for (const monthData of Object.values(recentByMonthCategory)) {
    for (const [cat, data] of Object.entries(monthData)) {
      categoryAvgSpend[cat] = (categoryAvgSpend[cat] || 0) + data.total / monthCount;
      categoryAvgCount[cat] = (categoryAvgCount[cat] || 0) + data.count / monthCount;
    }
  }

  // Calculate variance/volatility
  const categoryVariance: Record<string, number> = {};
  for (const [cat, avg] of Object.entries(categoryAvgSpend)) {
    const monthlyTotals = Object.values(recentByMonthCategory).map(m => m[cat]?.total || 0);
    if (monthlyTotals.length > 1) {
      const variance = monthlyTotals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / monthlyTotals.length;
      categoryVariance[cat] = Math.sqrt(variance);
    }
  }

  const totalCurrentMonth = Object.values(currentByCategory).reduce((a, b) => a + b, 0);
  const totalRecentAvg = recentTxns.length > 0 ? recentTxns.reduce((a, t) => a + t.amount, 0) / monthCount : 0;
  
  const sortedCategories = Object.entries(currentByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Find largest transactions
  const largestTxns = [...currentMonthTxns].sort((a, b) => b.amount - a.amount).slice(0, 3);
  
  // Calculate percentage changes by category
  const categoryChanges: { category: string; current: number; avg: number; pctChange: number }[] = [];
  for (const [cat, current] of Object.entries(currentByCategory)) {
    const avg = categoryAvgSpend[cat] || 0;
    if (avg > 0) {
      const pctChange = ((current - avg) / avg) * 100;
      categoryChanges.push({ category: cat, current, avg, pctChange });
    }
  }
  categoryChanges.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));

  // Frequency changes
  const frequencyChanges: { category: string; current: number; avg: number; diff: number }[] = [];
  for (const [cat, count] of Object.entries(currentCountByCategory)) {
    const avg = categoryAvgCount[cat] || 0;
    if (avg > 0) {
      frequencyChanges.push({ category: cat, current: count, avg, diff: count - avg });
    }
  }
  frequencyChanges.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  // Most volatile categories
  const volatileCategories = Object.entries(categoryVariance)
    .filter(([_, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return `You are a financial data analyst generating a single, digestible insight.

STRICT RULES:
- Output EXACTLY 1-2 sentences, no more
- Be neutral, observational, calm
- Do NOT give advice or use "you should"
- Do NOT infer intent, goals, or emotions
- Do NOT mention financial health or success/failure
- Use actual numbers when possible
- No emojis
- If data is insufficient for a meaningful insight, state spending appears typical

DATA CONTEXT:
- Current month total: $${totalCurrentMonth.toFixed(0)}
- Recent monthly average: $${totalRecentAvg.toFixed(0)}
- Current month transactions: ${currentMonthTxns.length}
- Top categories: ${sortedCategories.map(([cat, amt]) => `${cat} ($${amt.toFixed(0)})`).join(", ")}
- Category changes vs avg: ${categoryChanges.slice(0, 3).map(c => `${c.category}: ${c.pctChange > 0 ? '+' : ''}${c.pctChange.toFixed(0)}%`).join(", ") || "N/A"}
- Frequency patterns: ${frequencyChanges.slice(0, 2).map(f => `${f.category}: ${f.current} txns vs ${f.avg.toFixed(1)} avg`).join(", ") || "N/A"}
- Volatile categories: ${volatileCategories.map(([cat]) => cat).join(", ") || "N/A"}
- Largest transactions: ${largestTxns.map(t => `${t.description}: $${t.amount.toFixed(0)} (${t.category})`).join("; ") || "N/A"}

INSIGHT TYPES (choose the most impactful one):
1. Spending Trend Change - if a category is notably higher/lower than average
2. Spending Frequency - if transaction count in a category differs from usual
3. Category Volatility - if a category fluctuates more than others
4. Top Categories - share breakdown of largest spending areas
5. Unusual Transaction - if a transaction is notably large for its category

Generate ONE insight that provides the most interesting or notable observation from this data. If nothing stands out, focus on top spending categories.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions }: RequestBody = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = buildPrompt(transactions);

    console.log("Generating insight for", transactions.length, "transactions");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a neutral financial data observer. Output only 1-2 sentences. No advice, no judgment, just facts.",
          },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate insight" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Unable to generate insight.";

    console.log("Generated insight:", content);

    return new Response(
      JSON.stringify({ insight: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("spend-insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
