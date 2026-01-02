import { useMemo } from 'react';
import { Transaction, CreditCard, RewardCategory } from '@/types/budget';
import { InsightCard } from '@/components/InsightCard';
import { Link } from 'react-router-dom';

interface CardOptimizationInsightProps {
  transactions: Transaction[];
  creditCards: CreditCard[];
}

// Normalized categories with their aliases/synonyms
// This maps transaction categories AND card reward categories to a standard set
const CATEGORY_ALIASES: Record<string, string[]> = {
  'Groceries': ['groceries', 'grocery', 'supermarket', 'supermarkets', 'us supermarkets', 'food', 'whole foods', 'trader joe', 'safeway', 'kroger', 'publix', 'aldi', 'costco', 'walmart grocery'],
  'Dining': ['dining', 'restaurants', 'restaurant', 'us restaurants', 'eating out', 'food delivery', 'doordash', 'ubereats', 'grubhub', 'takeout'],
  'Travel': ['travel', 'flights', 'hotels', 'vacation', 'airfare', 'lodging', 'car rental', 'travel purchases'],
  'Gas': ['gas', 'fuel', 'gas station', 'gas stations', 'ev charging', 'petrol'],
  'Streaming': ['streaming', 'streaming services', 'netflix', 'spotify', 'hulu', 'disney+', 'hbo', 'youtube premium'],
  'Transit': ['transit', 'public transportation', 'rideshare', 'uber', 'lyft', 'subway', 'bus', 'train'],
  'Entertainment': ['entertainment', 'movies', 'concerts', 'games', 'gaming', 'recreation'],
  'Shopping': ['shopping', 'retail', 'amazon', 'online shopping', 'merchandise', 'clothes', 'clothing'],
  'Flights': ['flights', 'airlines', 'airfare', 'air travel'],
  'Hotels': ['hotels', 'lodging', 'hotel', 'accommodation', 'airbnb'],
};

/**
 * Normalize any category string to a standard category name
 */
function normalizeCategory(category: string): string {
  const lower = category.toLowerCase().trim();
  
  for (const [normalized, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((alias) => lower === alias || lower.includes(alias) || alias.includes(lower))) {
      return normalized;
    }
  }
  
  return category; // Return original if no match
}

/**
 * Get the reward rate for a card in a specific normalized category
 */
function getCardRateForCategory(card: CreditCard, normalizedCategory: string): number {
  if (!card.reward_categories?.length) return 1;

  // Find matching reward category
  for (const reward of card.reward_categories) {
    const normalizedRewardCategory = normalizeCategory(reward.category);
    if (normalizedRewardCategory === normalizedCategory) {
      return reward.rate;
    }
  }

  // Check for "Other" or base rate
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
    const normalizedRewardCategory = normalizeCategory(reward.category);
    if (normalizedRewardCategory === normalizedCategory) {
      return reward.unit || 'points';
    }
  }

  return 'points';
}

export function CardOptimizationInsight({
  transactions,
  creditCards,
}: CardOptimizationInsightProps) {
  const insight = useMemo(() => {
    // Need at least 2 cards with rewards data to compare
    const cardsWithRewards = creditCards.filter((c) => c.reward_categories?.length > 0);
    if (cardsWithRewards.length < 2) return null;

    // Get credit card transactions grouped by normalized category
    const categorySpending: Record<string, { total: number; cards: Record<string, number> }> = {};

    transactions
      .filter((t) => t.type === 'expense' && t.payment_type === 'credit_card' && t.payment_description)
      .forEach((t) => {
        const normalizedCategory = normalizeCategory(t.category);
        const cardName = t.payment_description || 'Unknown';

        if (!categorySpending[normalizedCategory]) {
          categorySpending[normalizedCategory] = { total: 0, cards: {} };
        }
        categorySpending[normalizedCategory].total += t.amount;
        categorySpending[normalizedCategory].cards[cardName] =
          (categorySpending[normalizedCategory].cards[cardName] || 0) + t.amount;
      });

    // Find optimization opportunities
    for (const [normalizedCategory, spending] of Object.entries(categorySpending)) {
      if (spending.total < 50) continue; // Skip small categories

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

      // Check if user is NOT using this best card for this category
      const currentCards = Object.entries(spending.cards);
      const bestCardName = bestCard.card_type || bestCard.card_name;

      for (const [usedCardName, amount] of currentCards) {
        // Check if this is the best card
        const isUsingBestCard =
          usedCardName.toLowerCase() === bestCardName.toLowerCase() ||
          usedCardName.toLowerCase().includes(bestCardName.toLowerCase()) ||
          bestCardName.toLowerCase().includes(usedCardName.toLowerCase()) ||
          usedCardName.toLowerCase() === bestCard.card_name.toLowerCase();

        if (!isUsingBestCard && amount > 30) {
          // Find the card being used and its rate
          const usedCard = creditCards.find(
            (c) =>
              c.card_name.toLowerCase() === usedCardName.toLowerCase() ||
              c.card_type?.toLowerCase() === usedCardName.toLowerCase() ||
              usedCardName.toLowerCase().includes(c.card_name.toLowerCase()) ||
              usedCardName.toLowerCase().includes(c.card_type?.toLowerCase() || '')
          );

          const usedCardRate = usedCard 
            ? getCardRateForCategory(usedCard, normalizedCategory)
            : 1;

          // Only suggest if the best card ACTUALLY offers a better rate
          if (bestRate > usedCardRate) {
            const unit = getCardUnitForCategory(bestCard, normalizedCategory);
            const unitDisplay = unit === 'percent' ? '%' : 'x';

            return {
              message: `Your ${bestCardName} earns ${bestRate}${unitDisplay} on ${normalizedCategory}. Using it instead of ${usedCardName} could optimize your $${amount.toFixed(0)} in ${normalizedCategory} spending.`,
              category: normalizedCategory,
              bestCard: bestCardName,
              currentCard: usedCardName,
              bestRate,
              currentRate: usedCardRate,
            };
          }
        }
      }
    }

    return null;
  }, [transactions, creditCards]);

  if (!insight) return null;

  return (
    <InsightCard
      message={insight.message}
      className="mb-4"
      action={
        <Link to="/cards" className="text-primary text-sm hover:underline">
          View cards →
        </Link>
      }
    />
  );
}