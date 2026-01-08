import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import { RewardCategory } from '@/types/budget';

interface CardIdentifierProps {
  cardName: string;
  onCardNameChange: (name: string) => void;
  onCardIdentified: (cardId: string) => void;
  addCreditCard: (name: string) => Promise<{ id: string } | null>;
  updateCreditCard: (id: string, updates: {
    card_type?: string | null;
    issuer?: string | null;
    reward_categories?: RewardCategory[];
  }) => Promise<boolean>;
  lookupCardBenefits: (cardName: string) => Promise<{
    cardType: string;
    issuer: string;
    rewardCategories: RewardCategory[];
    confidence: 'high' | 'medium' | 'low';
  } | null>;
  inputId?: string;
}

export function CardIdentifier({
  cardName,
  onCardNameChange,
  onCardIdentified,
  addCreditCard,
  updateCreditCard,
  lookupCardBenefits,
  inputId = 'new-card-name',
}: CardIdentifierProps) {
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    cardId: string;
    suggestedType: string;
    suggestedIssuer: string;
    suggestedRewards: RewardCategory[];
    confidence: 'high' | 'medium' | 'low';
  } | null>(null);

  const handleIdentifyCard = async () => {
    if (!cardName.trim()) return;
    
    setIsIdentifying(true);
    
    // First, add the card
    const newCard = await addCreditCard(cardName.trim());
    
    if (newCard) {
      // Look up benefits
      const benefits = await lookupCardBenefits(cardName.trim());
      
      if (benefits) {
        setPendingConfirmation({
          cardId: newCard.id,
          suggestedType: benefits.cardType,
          suggestedIssuer: benefits.issuer,
          suggestedRewards: benefits.rewardCategories,
          confidence: benefits.confidence,
        });
      } else {
        // Card added but no benefits found - still use the card
        onCardIdentified(newCard.id);
        onCardNameChange('');
      }
    }
    
    setIsIdentifying(false);
  };

  const handleConfirmCard = async () => {
    if (!pendingConfirmation) return;
    
    await updateCreditCard(pendingConfirmation.cardId, {
      card_type: pendingConfirmation.suggestedType,
      issuer: pendingConfirmation.suggestedIssuer,
      reward_categories: pendingConfirmation.suggestedRewards,
    });
    
    onCardIdentified(pendingConfirmation.cardId);
    onCardNameChange('');
    setPendingConfirmation(null);
  };

  const handleSkipConfirmation = () => {
    if (pendingConfirmation) {
      onCardIdentified(pendingConfirmation.cardId);
      onCardNameChange('');
    }
    setPendingConfirmation(null);
  };

  const handleAddWithoutIdentifying = async () => {
    if (!cardName.trim()) return;
    
    setIsIdentifying(true);
    const newCard = await addCreditCard(cardName.trim());
    if (newCard) {
      onCardIdentified(newCard.id);
      onCardNameChange('');
    }
    setIsIdentifying(false);
  };

  // Show confirmation UI when we have pending benefits
  if (pendingConfirmation) {
    return (
      <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Confirm Card Type</span>
          <Badge
            variant={pendingConfirmation.confidence === 'high' ? 'default' : 'secondary'}
            className="ml-auto text-xs"
          >
            {pendingConfirmation.confidence} confidence
          </Badge>
        </div>
        
        <div className="p-2 rounded bg-muted/50">
          <p className="font-medium text-sm">{pendingConfirmation.suggestedType}</p>
          {pendingConfirmation.suggestedIssuer && (
            <p className="text-xs text-muted-foreground">{pendingConfirmation.suggestedIssuer}</p>
          )}
          {pendingConfirmation.suggestedRewards.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {pendingConfirmation.suggestedRewards.slice(0, 3).map((reward, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {reward.category}: {reward.rate}
                  {reward.unit === 'percent' ? '%' : 'x'}
                </Badge>
              ))}
              {pendingConfirmation.suggestedRewards.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{pendingConfirmation.suggestedRewards.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button size="sm" onClick={handleConfirmCard} className="flex-1">
            <Check className="w-3 h-3 mr-1" />
            Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={handleSkipConfirmation}>
            <X className="w-3 h-3 mr-1" />
            Skip
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className="text-foreground">New Card Name</Label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          placeholder="e.g., Chase Sapphire Preferred"
          value={cardName}
          onChange={(e) => onCardNameChange(e.target.value)}
          className="flex-1 bg-secondary border-border"
          disabled={isIdentifying}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleIdentifyCard}
          disabled={!cardName.trim() || isIdentifying}
          className="shrink-0"
        >
          {isIdentifying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              Identify
            </>
          )}
        </Button>
      </div>
      <button
        type="button"
        onClick={handleAddWithoutIdentifying}
        disabled={!cardName.trim() || isIdentifying}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        or add without identifying
      </button>
    </div>
  );
}
