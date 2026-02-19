import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, RewardCategory } from '@/types/budget';
import { toast } from 'sonner';

export function useCreditCards() {
  const { user } = useAuth();
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCreditCards = useCallback(async () => {
    if (!user) {
      setCreditCards([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const cards: CreditCard[] = (data || []).map((card) => ({
        ...card,
        reward_categories: (card.reward_categories as unknown as RewardCategory[]) || [],
      }));

      setCreditCards(cards);
    } catch (error) {
      console.error('Error fetching credit cards:', error);
      toast.error('Failed to load credit cards');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCreditCards();
  }, [fetchCreditCards]);

  const addCreditCard = async (cardName: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({
          user_id: user.id,
          card_name: cardName,
        })
        .select()
        .single();

      if (error) throw error;

      const newCard: CreditCard = {
        ...data,
        reward_categories: [],
      };

      setCreditCards((prev) => [newCard, ...prev]);
      return newCard;
    } catch (error) {
      console.error('Error adding credit card:', error);
      toast.error('Failed to add credit card');
      return null;
    }
  };

  const updateCreditCard = async (
    id: string,
    updates: Partial<Pick<CreditCard, 'card_type' | 'issuer' | 'reward_categories'>>
  ) => {
    if (!user) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbUpdates: any = {
        card_type: updates.card_type,
        issuer: updates.issuer,
      };
      
      if (updates.reward_categories) {
        dbUpdates.reward_categories = JSON.parse(JSON.stringify(updates.reward_categories));
      }

      const { error } = await supabase
        .from('credit_cards')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setCreditCards((prev) =>
        prev.map((card) => (card.id === id ? { ...card, ...updates } : card))
      );
      return true;
    } catch (error) {
      console.error('Error updating credit card:', error);
      toast.error('Failed to update credit card');
      return false;
    }
  };

  const deleteCreditCard = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setCreditCards((prev) => prev.filter((card) => card.id !== id));
      toast.success('Card removed');
      return true;
    } catch (error) {
      console.error('Error deleting credit card:', error);
      toast.error('Failed to delete credit card');
      return false;
    }
  };

  const lookupCardBenefits = async (cardName: string) => {
    try {
      console.log('Looking up card benefits for:', cardName);
      
      const { data, error } = await supabase.functions.invoke('lookup-card-benefits', {
        body: { cardName },
      });

      console.log('Card lookup response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('AI lookup error:', data.error);
        toast.error(data.error);
        return null;
      }

      // Handle new multi-candidate format
      if (data?.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
        return data.candidates as {
          cardType: string;
          issuer: string;
          rewardCategories: RewardCategory[];
          confidence: 'high' | 'medium' | 'low';
        }[];
      }

      // Fallback: old single-object format
      if (data?.cardType) {
        return [data as {
          cardType: string;
          issuer: string;
          rewardCategories: RewardCategory[];
          confidence: 'high' | 'medium' | 'low';
        }];
      }

      return null;
    } catch (error) {
      console.error('Error looking up card benefits:', error);
      toast.error('Failed to look up card benefits. Please try again.');
      return null;
    }
  };

  return {
    creditCards,
    isLoading,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    lookupCardBenefits,
    refetch: fetchCreditCards,
  };
}
