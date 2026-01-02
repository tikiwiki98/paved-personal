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
            content: `You are a credit card rewards expert with precise knowledge of all major US credit card reward structures.

IMPORTANT: Use NORMALIZED category names for consistency. Map card-specific terminology to these standard categories:
- "Groceries" for supermarkets, US Supermarkets, grocery stores (e.g., Amex Gold's 4x on US Supermarkets = "Groceries" at 4x)
- "Dining" for restaurants, US Restaurants, eating out
- "Travel" for flights, hotels, travel purchases, travel booked through portals
- "Gas" for gas stations, fuel
- "Streaming" for streaming services like Netflix, Spotify
- "Transit" for public transportation, rideshare
- "Flights" for airlines specifically (if different from general travel)
- "Hotels" for hotels specifically (if different from general travel)
- "Shopping" for general retail purchases
- "Other" for everything else (base earn rate)

For example:
- Amex Gold's "4x at US Supermarkets" should be: { "category": "Groceries", "rate": 4, "unit": "points" }
- Amex Gold's "4x at US Restaurants" should be: { "category": "Dining", "rate": 4, "unit": "points" }
- Chase Sapphire Preferred's "3x on dining" should be: { "category": "Dining", "rate": 3, "unit": "points" }

Be PRECISE about rates. Common cards:
- Amex Gold: 4x Groceries (up to $25k/yr), 4x Dining, 3x Flights, 1x Other
- Chase Sapphire Preferred: 3x Dining, 3x Streaming, 2x Travel, 5x Travel via Chase, 1x Other
- Citi Double Cash: 2% on everything (1% when you buy + 1% when you pay)
- Discover it: 5% rotating categories, 1% other

Return accurate, current reward structures. If you're unsure, set confidence to "low".
Only return the JSON object via the function call, no other text.`
          },
          {
            role: 'user',
            content: `Identify this credit card and return its EXACT reward structure using normalized category names: "${cardName}"`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "get_card_benefits",
              description: "Return the credit card benefits and reward categories with normalized category names",
              parameters: {
                type: "object",
                properties: {
                  cardType: { type: "string", description: "The exact official card name" },
                  issuer: { type: "string", description: "The card issuer (Chase, American Express, Citi, etc.)" },
                  rewardCategories: {
                    type: "array",
                    description: "Array of reward categories using normalized names (Groceries, Dining, Travel, Gas, etc.)",
                    items: {
                      type: "object",
                      properties: {
                        category: { 
                          type: "string",
                          description: "Normalized category: Groceries, Dining, Travel, Gas, Streaming, Transit, Flights, Hotels, Shopping, or Other"
                        },
                        rate: { type: "number", description: "The multiplier or percentage (e.g., 4 for 4x or 4%)" },
                        unit: { type: "string", enum: ["points", "percent", "miles"] }
                      },
                      required: ["category", "rate", "unit"]
                    }
                  },
                  confidence: { 
                    type: "string", 
                    enum: ["high", "medium", "low"],
                    description: "high if you're certain about the card and rates, medium if mostly sure, low if uncertain"
                  }
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