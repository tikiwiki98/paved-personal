import { useMemo } from 'react';
import { Transaction, CreditCard, RewardCategory } from '@/types/budget';
import { InsightCard } from '@/components/InsightCard';
import { Link } from 'react-router-dom';

interface CardOptimizationInsightProps {
  transactions: Transaction[];
  creditCards: CreditCard[];
}

// Map transaction categories to reward categories
const CATEGORY_MAPPING: Record<string, string[]> = {
  'Dining': ['dining', 'restaurants', 'food', 'eating out'],
  'Groceries': ['groceries', 'supermarket', 'food', 'grocery'],
  'Travel': ['travel', 'flights', 'hotels', 'vacation'],
  'Gas': ['gas', 'fuel', 'transportation'],
  'Entertainment': ['entertainment', 'streaming', 'movies', 'games'],
  'Shopping': ['shopping', 'retail', 'clothes', 'amazon'],
};

function normalizeCategory(category: string): string {
  const lower = category.toLowerCase();
  for (const [normalized, keywords] of Object.entries(CATEGORY_MAPPING)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return normalized;
    }
  }
  return category;
}

export function CardOptimizationInsight({
  transactions,
  creditCards,
}: CardOptimizationInsightProps) {
  const insight = useMemo(() => {
    if (creditCards.length < 2) return null;

    // Get credit card transactions grouped by category
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
    for (const [category, spending] of Object.entries(categorySpending)) {
      if (spending.total < 50) continue; // Skip small categories

      // Find the best card for this category
      let bestCard: CreditCard | null = null;
      let bestRate = 0;

      for (const card of creditCards) {
        if (!card.reward_categories?.length) continue;

        const matchingReward = card.reward_categories.find((r) =>
          r.category.toLowerCase().includes(category.toLowerCase()) ||
          category.toLowerCase().includes(r.category.toLowerCase())
        );

        if (matchingReward && matchingReward.rate > bestRate) {
          bestRate = matchingReward.rate;
          bestCard = card;
        }
      }

      if (!bestCard || bestRate <= 1) continue;

      // Check if user is NOT using this best card for this category
      const currentCards = Object.entries(spending.cards);
      const bestCardName = bestCard.card_type || bestCard.card_name;

      for (const [usedCard, amount] of currentCards) {
        const isUsingBestCard =
          usedCard.toLowerCase() === bestCardName.toLowerCase() ||
          usedCard.toLowerCase().includes(bestCardName.toLowerCase()) ||
          bestCardName.toLowerCase().includes(usedCard.toLowerCase());

        if (!isUsingBestCard && amount > 30) {
          // Find what the used card offers
          const usedCardData = creditCards.find(
            (c) =>
              c.card_name.toLowerCase() === usedCard.toLowerCase() ||
              c.card_type?.toLowerCase() === usedCard.toLowerCase()
          );

          const usedCardRate = usedCardData?.reward_categories?.find(
            (r) =>
              r.category.toLowerCase().includes(category.toLowerCase()) ||
              category.toLowerCase().includes(r.category.toLowerCase())
          )?.rate || 1;

          if (bestRate > usedCardRate) {
            const potential = amount * ((bestRate - usedCardRate) / 100);
            const unit = bestCard.reward_categories.find((r) => r.rate === bestRate)?.unit || 'points';

            return {
              message: `Your ${bestCard.card_type || bestCard.card_name} earns ${bestRate}${unit === 'percent' ? '%' : 'x'} on ${category}. Using it instead of ${usedCard} could optimize your $${amount.toFixed(0)} in ${category} spending.`,
              category,
              bestCard: bestCard.card_type || bestCard.card_name,
              currentCard: usedCard,
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
