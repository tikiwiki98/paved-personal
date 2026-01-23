import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InsightType = "summary" | "trend" | "frequency" | "volatility" | "top" | "unusual";

interface Transaction {
  amount: number;
  category: string;
  date: string;
  description: string;
  type: string;
}

interface RequestBody {
  transactions: Transaction[];
  insightType: InsightType;
}

function buildPrompt(transactions: Transaction[], insightType: InsightType): string {
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
  currentMonthTxns.forEach(t => {
    currentByCategory[t.category] = (currentByCategory[t.category] || 0) + t.amount;
  });

  // Calculate average by category for recent months
  const recentByCategory: Record<string, number[]> = {};
  recentTxns.forEach(t => {
    const d = new Date(t.date);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    if (!recentByCategory[t.category]) recentByCategory[t.category] = [];
    // We'll aggregate per month later
  });

  const totalCurrentMonth = Object.values(currentByCategory).reduce((a, b) => a + b, 0);
  const sortedCategories = Object.entries(currentByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const dataContext = `
Current month spending data:
- Total spent this month: $${totalCurrentMonth.toFixed(2)}
- Number of transactions: ${currentMonthTxns.length}
- Top categories: ${sortedCategories.map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`).join(", ")}
- Recent transactions sample: ${currentMonthTxns.slice(0, 10).map(t => `${t.description}: $${t.amount} (${t.category})`).join("; ")}
- Previous 3 months average total: $${recentTxns.length > 0 ? (recentTxns.reduce((a, t) => a + t.amount, 0) / 3).toFixed(2) : "N/A"}
`;

  const baseRules = `
CRITICAL RULES:
- Be neutral, observational, non-judgmental
- Do NOT give advice or recommendations
- Do NOT mention budgets unless data includes them
- Do NOT mention credit card rewards
- Do NOT infer emotions, goals, or financial health
- If data is insufficient, say so briefly
- No emojis in your response
`;

  if (insightType === "summary") {
    return `${baseRules}

${dataContext}

Generate a 1-2 sentence summary of the user's current month spending. Be concise and easy to read at a glance. Focus only on overall spending level and top 1-2 categories.`;
  }

  if (insightType === "trend") {
    return `${baseRules}

${dataContext}

In 1-2 sentences, describe any notable spending trend changes by comparing current month to recent average. If no notable changes, say spending is consistent.`;
  }

  if (insightType === "frequency") {
    return `${baseRules}

${dataContext}

In 1-2 sentences, describe the spending frequency pattern - how often transactions occur and if any category has notably more frequent spending than usual.`;
  }

  if (insightType === "volatility") {
    return `${baseRules}

${dataContext}

In 1-2 sentences, identify which spending categories fluctuate the most month-to-month based on the data.`;
  }

  if (insightType === "top") {
    return `${baseRules}

${dataContext}

In 1-2 sentences, rank and describe the top spending categories for the current month by their share of total spending.`;
  }

  if (insightType === "unusual") {
    return `${baseRules}

${dataContext}

In 1-2 sentences, highlight any transactions that appear unusually large or rare compared to typical spending patterns. If none, state that spending appears typical.`;
  }

  return `${baseRules}\n${dataContext}\nProvide a brief neutral observation about spending.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, insightType }: RequestBody = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = buildPrompt(transactions, insightType);

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
            content: "You are a neutral financial data summarizer. You provide brief, factual observations about spending data without advice or judgment.",
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
