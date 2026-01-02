import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('lookup-card-benefits invoked with method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cardName } = await req.json();
    
    if (!cardName || typeof cardName !== 'string') {
      return new Response(
        JSON.stringify({ error: 'cardName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Looking up benefits for card: ${cardName}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a credit card rewards expert. Given a credit card name, identify the exact card and return its reward categories and rates.
            
Return a JSON object with this exact structure:
{
  "cardType": "exact card name (e.g., Chase Sapphire Preferred)",
  "issuer": "card issuer (e.g., Chase, American Express, Citi)",
  "rewardCategories": [
    { "category": "Dining", "rate": 3, "unit": "points" },
    { "category": "Travel", "rate": 2, "unit": "points" },
    { "category": "Everything else", "rate": 1, "unit": "points" }
  ],
  "confidence": "high" | "medium" | "low"
}

Categories should match common spending categories like: Dining, Groceries, Travel, Gas, Streaming, Entertainment, Shopping, etc.
If you're unsure about the exact card, set confidence to "low" or "medium".
Only return the JSON object, no other text.`
          },
          {
            role: 'user',
            content: `What are the reward categories and rates for this credit card: "${cardName}"?`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "get_card_benefits",
              description: "Return the credit card benefits and reward categories",
              parameters: {
                type: "object",
                properties: {
                  cardType: { type: "string", description: "The exact card name" },
                  issuer: { type: "string", description: "The card issuer" },
                  rewardCategories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        rate: { type: "number" },
                        unit: { type: "string", enum: ["points", "percent", "miles"] }
                      },
                      required: ["category", "rate", "unit"]
                    }
                  },
                  confidence: { type: "string", enum: ["high", "medium", "low"] }
                },
                required: ["cardType", "issuer", "rewardCategories", "confidence"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "get_card_benefits" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to lookup card benefits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    // Extract the tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const cardBenefits = JSON.parse(toolCall.function.arguments);
      console.log('Parsed card benefits:', JSON.stringify(cardBenefits));
      
      return new Response(
        JSON.stringify(cardBenefits),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: try to parse content directly
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return new Response(
          JSON.stringify(parsed),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        console.error('Failed to parse AI response content');
      }
    }

    return new Response(
      JSON.stringify({ error: 'Could not parse card benefits' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in lookup-card-benefits:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
