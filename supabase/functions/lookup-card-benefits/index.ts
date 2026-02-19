import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  console.log('lookup-card-benefits invoked with method:', req.method);
  
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
            content: `You are a credit card rewards expert with precise knowledge of all major US credit card reward structures.

When a user's query could match MULTIPLE distinct cards (e.g. "chase freedom" could be Chase Freedom Flex or Chase Freedom Unlimited), return ALL matching candidates (up to 5), ranked by relevance.

When the query clearly identifies ONE specific card, return just that one candidate.

IMPORTANT: Use NORMALIZED category names for consistency. Map card-specific terminology to these standard categories:
- "Groceries" for supermarkets, US Supermarkets, grocery stores
- "Dining" for restaurants, US Restaurants, eating out
- "Travel" for flights, hotels, travel purchases
- "Gas" for gas stations, fuel
- "Streaming" for streaming services like Netflix, Spotify
- "Transit" for public transportation, rideshare
- "Flights" for airlines specifically
- "Hotels" for hotels specifically
- "Shopping" for general retail purchases
- "Other" for everything else (base earn rate)

Be PRECISE about rates. Common cards:
- Amex Gold: 4x Groceries (up to $25k/yr), 4x Dining, 3x Flights, 1x Other
- Chase Sapphire Preferred: 3x Dining, 3x Streaming, 2x Travel, 5x Travel via Chase, 1x Other
- Chase Freedom Flex: 5% rotating quarterly categories, 3% Dining, 3% Drugstores, 1% Other
- Chase Freedom Unlimited: 1.5% everything, 3% Dining, 3% Drugstores, 5% Travel via Chase
- Citi Double Cash: 2% on everything
- Discover it: 5% rotating categories, 1% other

Return accurate, current reward structures. If you're unsure about a card, set its confidence to "low".
Only return the JSON via the function call, no other text.`
          },
          {
            role: 'user',
            content: `Identify credit card(s) matching "${cardName}" and return their reward structures. If the query is ambiguous and could match multiple distinct cards, return all matches (up to 5). If it clearly identifies one card, return just that one.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "get_card_candidates",
              description: "Return one or more credit card candidates with their benefits",
              parameters: {
                type: "object",
                properties: {
                  candidates: {
                    type: "array",
                    description: "Array of matching credit card candidates, ranked by relevance. 1 for unambiguous, up to 5 for ambiguous queries.",
                    items: {
                      type: "object",
                      properties: {
                        cardType: { type: "string", description: "The exact official card name" },
                        issuer: { type: "string", description: "The card issuer (Chase, American Express, Citi, etc.)" },
                        rewardCategories: {
                          type: "array",
                          description: "Array of reward categories using normalized names",
                          items: {
                            type: "object",
                            properties: {
                              category: { 
                                type: "string",
                                description: "Normalized category: Groceries, Dining, Travel, Gas, Streaming, Transit, Flights, Hotels, Shopping, or Other"
                              },
                              rate: { type: "number", description: "The multiplier or percentage" },
                              unit: { type: "string", enum: ["points", "percent", "miles"] }
                            },
                            required: ["category", "rate", "unit"]
                          }
                        },
                        confidence: { 
                          type: "string", 
                          enum: ["high", "medium", "low"],
                          description: "high if certain about the card and rates, medium if mostly sure, low if uncertain"
                        }
                      },
                      required: ["cardType", "issuer", "rewardCategories", "confidence"]
                    }
                  }
                },
                required: ["candidates"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "get_card_candidates" } }
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
      const result = JSON.parse(toolCall.function.arguments);
      console.log('Parsed candidates:', JSON.stringify(result));
      
      // Ensure we always return { candidates: [...] }
      if (result.candidates && Array.isArray(result.candidates)) {
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Fallback: if old-format single object, wrap it
      if (result.cardType) {
        return new Response(
          JSON.stringify({ candidates: [result] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: try to parse content directly
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.candidates) {
          return new Response(
            JSON.stringify(parsed),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (parsed.cardType) {
          return new Response(
            JSON.stringify({ candidates: [parsed] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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
