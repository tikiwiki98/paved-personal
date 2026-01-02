import { useMemo } from 'react';
import { Transaction, CreditCard } from '@/types/budget';
import { InsightCard } from '@/components/InsightCard';
import { Link } from 'react-router-dom';

interface CardOptimizationInsightProps {
  transactions: Transaction[];
  creditCards: CreditCard[];
}

// Strict category mapping - only exact matches or very specific keywords
// Categories that DON'T earn bonus rewards should not be matched
const CATEGORY_MAPPINGS: Record<string, { keywords: string[]; excludeKeywords: string[] }> = {
  'Groceries': {
    keywords: ['groceries', 'grocery', 'supermarket', 'whole foods', 'trader joe', 'safeway', 'kroger', 'publix', 'aldi', 'wegmans', 'sprouts'],
    excludeKeywords: ['restaurant', 'dining', 'rent', 'utility', 'bill'],
  },
  'Dining': {
    keywords: ['dining', 'restaurant', 'restaurants', 'eating out', 'doordash', 'ubereats', 'grubhub', 'takeout', 'cafe', 'coffee shop', 'bar', 'pub'],
    excludeKeywords: ['groceries', 'supermarket', 'rent'],
  },
  'Travel': {
    keywords: ['travel', 'flight', 'flights', 'airline', 'hotel', 'hotels', 'airbnb', 'vacation', 'airfare', 'lodging', 'car rental', 'booking.com', 'expedia'],
    excludeKeywords: ['groceries', 'rent', 'utility', 'insurance', 'subscription'],
  },
  'Gas': {
    keywords: ['gas', 'fuel', 'gas station', 'shell', 'chevron', 'exxon', 'bp', 'ev charging', 'petrol'],
    excludeKeywords: ['groceries', 'restaurant'],
  },
  'Streaming': {
    keywords: ['streaming', 'netflix', 'spotify', 'hulu', 'disney+', 'hbo', 'youtube premium', 'apple tv', 'amazon prime video'],
    excludeKeywords: [],
  },
  'Transit': {
    keywords: ['transit', 'uber', 'lyft', 'subway', 'metro', 'bus fare', 'train ticket', 'rideshare'],
    excludeKeywords: ['rent', 'utility'],
  },
};

// Categories that typically don't earn bonus rewards
const NON_BONUS_CATEGORIES = ['rent', 'mortgage', 'utility', 'utilities', 'insurance', 'bills', 'tax', 'taxes', 'tuition', 'loan', 'payment'];

/**
 * Normalize a transaction category to a standard reward category
 * Returns null if the category doesn't match any bonus category
 */
function normalizeTransactionCategory(category: string): string | null {
  const lower = category.toLowerCase().trim();
  
  // Check if this is a non-bonus category first
  if (NON_BONUS_CATEGORIES.some((nonBonus) => lower.includes(nonBonus))) {
    return null; // Don't try to optimize non-bonus categories
  }
  
  for (const [normalized, { keywords, excludeKeywords }] of Object.entries(CATEGORY_MAPPINGS)) {
    // Check if any exclude keywords match first
    if (excludeKeywords.some((exclude) => lower.includes(exclude))) {
      continue;
    }
    
    // Check for keyword match
    if (keywords.some((keyword) => lower.includes(keyword) || keyword.includes(lower))) {
      return normalized;
    }
  }
  
  return null; // No matching bonus category
}

/**
 * Normalize a card's reward category to match our standard categories
 */
function normalizeRewardCategory(category: string): string {
  const lower = category.toLowerCase().trim();
  
  // Direct mapping for common variations
  const directMappings: Record<string, string> = {
    'us supermarkets': 'Groceries',
    'supermarkets': 'Groceries',
    'grocery': 'Groceries',
    'groceries': 'Groceries',
    'us restaurants': 'Dining',
    'restaurants': 'Dining',
    'dining': 'Dining',
    'travel': 'Travel',
    'flights': 'Travel',
    'hotels': 'Travel',
    'gas': 'Gas',
    'gas stations': 'Gas',
    'streaming': 'Streaming',
    'streaming services': 'Streaming',
    'transit': 'Transit',
    'rideshare': 'Transit',
  };
  
  if (directMappings[lower]) {
    return directMappings[lower];
  }
  
  // Check keyword mappings
  for (const [normalized, { keywords }] of Object.entries(CATEGORY_MAPPINGS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return normalized;
    }
  }
  
  return category; // Return original if no match
}

/**
 * Get the best reward rate for a card in a specific normalized category
 */
function getCardRateForCategory(card: CreditCard, normalizedCategory: string): number {
  if (!card.reward_categories?.length) return 1;

  for (const reward of card.reward_categories) {
    const normalizedRewardCategory = normalizeRewardCategory(reward.category);
    if (normalizedRewardCategory === normalizedCategory) {
      return reward.rate;
    }
  }

  // Check for base rate
  const baseReward = card.reward_categories.find(
    (r) => r.category.toLowerCase() === 'other' || r.category.toLowerCase() === 'everything else'
  );
  
  return baseReward?.rate || 1;
}

/**
 * Get the reward unit for a card in a specific normalized category
 */
function getCardUnitForCategory(card: CreditCard, normalizedCategory: string): string {
  if (!card.reward_categories?.length) return 'points';

  for (const reward of card.reward_categories) {
    const normalizedRewardCategory = normalizeRewardCategory(reward.category);
    if (normalizedRewardCategory === normalizedCategory) {
      return reward.unit || 'points';
    }
  }

  return 'points';
}

interface InsightResult {
  message: string;
  type: 'optimization' | 'positive';
  category: string;
}

export function CardOptimizationInsight({
  transactions,
  creditCards,
}: CardOptimizationInsightProps) {
  const insight = useMemo((): InsightResult | null => {
    // Need at least 1 card with rewards data
    const cardsWithRewards = creditCards.filter((c) => c.reward_categories?.length > 0);
    if (cardsWithRewards.length === 0) return null;

    // Get credit card transactions grouped by normalized category (only bonus categories)
    const categorySpending: Record<string, { total: number; cards: Record<string, number> }> = {};

    transactions
      .filter((t) => t.type === 'expense' && t.payment_type === 'credit_card' && t.payment_description)
      .forEach((t) => {
        const normalizedCategory = normalizeTransactionCategory(t.category);
        
        // Skip transactions that don't map to bonus categories
        if (!normalizedCategory) return;
        
        const cardName = t.payment_description || 'Unknown';

        if (!categorySpending[normalizedCategory]) {
          categorySpending[normalizedCategory] = { total: 0, cards: {} };
        }
        categorySpending[normalizedCategory].total += t.amount;
        categorySpending[normalizedCategory].cards[cardName] =
          (categorySpending[normalizedCategory].cards[cardName] || 0) + t.amount;
      });

    // Track positive usage for potential positive feedback
    let bestPositiveInsight: InsightResult | null = null;
    let highestPositiveAmount = 0;

    // Find optimization opportunities or positive reinforcement
    for (const [normalizedCategory, spending] of Object.entries(categorySpending)) {
      if (spending.total < 50) continue;

      // Find the best card for this normalized category
      let bestCard: CreditCard | null = null;
      let bestRate = 0;

      for (const card of cardsWithRewards) {
        const rate = getCardRateForCategory(card, normalizedCategory);
        if (rate > bestRate) {
          bestRate = rate;
          bestCard = card;
        }
      }

      if (!bestCard || bestRate <= 1) continue;

      const currentCards = Object.entries(spending.cards);
      const bestCardName = bestCard.card_type || bestCard.card_name;

      for (const [usedCardName, amount] of currentCards) {
        if (amount < 30) continue;

        // Check if this IS the best card
        const isUsingBestCard =
          usedCardName.toLowerCase() === bestCardName.toLowerCase() ||
          usedCardName.toLowerCase().includes(bestCardName.toLowerCase()) ||
          bestCardName.toLowerCase().includes(usedCardName.toLowerCase()) ||
          usedCardName.toLowerCase() === bestCard.card_name.toLowerCase();

        if (isUsingBestCard) {
          // Positive reinforcement - user is using the best card!
          if (amount > highestPositiveAmount && cardsWithRewards.length >= 2) {
            const unit = getCardUnitForCategory(bestCard, normalizedCategory);
            const unitDisplay = unit === 'percent' ? '%' : 'x';
            
            bestPositiveInsight = {
              message: `Great choice using ${bestCardName} for ${normalizedCategory}! At ${bestRate}${unitDisplay}, it's your best card for this category.`,
              type: 'positive',
              category: normalizedCategory,
            };
            highestPositiveAmount = amount;
          }
        } else {
          // Find the card being used and its rate
          const usedCard = creditCards.find(
            (c) =>
              c.card_name.toLowerCase() === usedCardName.toLowerCase() ||
              c.card_type?.toLowerCase() === usedCardName.toLowerCase() ||
              usedCardName.toLowerCase().includes(c.card_name.toLowerCase()) ||
              (c.card_type && usedCardName.toLowerCase().includes(c.card_type.toLowerCase()))
          );

          const usedCardRate = usedCard 
            ? getCardRateForCategory(usedCard, normalizedCategory)
            : 1;

          // Only suggest if the best card ACTUALLY offers a better rate
          if (bestRate > usedCardRate) {
            const unit = getCardUnitForCategory(bestCard, normalizedCategory);
            const unitDisplay = unit === 'percent' ? '%' : 'x';

            // Return optimization insight immediately (prioritize over positive)
            return {
              message: `Your ${bestCardName} earns ${bestRate}${unitDisplay} on ${normalizedCategory}. Using it instead of ${usedCardName} could optimize your $${amount.toFixed(0)} in ${normalizedCategory} spending.`,
              type: 'optimization',
              category: normalizedCategory,
            };
          }
        }
      }
    }

    // If no optimization needed, show positive reinforcement
    return bestPositiveInsight;
  }, [transactions, creditCards]);

  if (!insight) return null;

  return (
    <InsightCard
      message={insight.message}
      className="mb-4"
      variant={insight.type === 'positive' ? 'success' : 'default'}
      action={
        <Link to="/cards" className="text-primary text-sm hover:underline">
          View cards →
        </Link>
      }
    />
  );
}