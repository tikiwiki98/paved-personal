import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import { RewardCategory } from '@/types/budget';

interface CardCandidate {
  cardType: string;
  issuer: string;
  rewardCategories: RewardCategory[];
  confidence: 'high' | 'medium' | 'low';
}

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
  lookupCardBenefits: (cardName: string) => Promise<CardCandidate[] | null>;
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
  const [candidates, setCandidates] = useState<CardCandidate[] | null>(null);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CardCandidate | null>(null);

  const handleIdentifyCard = async () => {
    if (!cardName.trim()) return;
    
    setIsIdentifying(true);
    setCandidates(null);
    setSelectedCandidate(null);
    
    const newCard = await addCreditCard(cardName.trim());
    
    if (newCard) {
      setPendingCardId(newCard.id);
      const results = await lookupCardBenefits(cardName.trim());
      
      if (results && results.length > 0) {
        if (results.length === 1) {
          // Single match — go straight to confirm
          setSelectedCandidate(results[0]);
        } else {
          // Multiple matches — show selection list
          setCandidates(results);
        }
      } else {
        // No results — use card as-is
        onCardIdentified(newCard.id);
        onCardNameChange('');
        setPendingCardId(null);
      }
    }
    
    setIsIdentifying(false);
  };

  const handleSelectCandidate = (candidate: CardCandidate) => {
    setSelectedCandidate(candidate);
    setCandidates(null);
  };

  const handleConfirmCard = async () => {
    if (!selectedCandidate || !pendingCardId) return;
    
    await updateCreditCard(pendingCardId, {
      card_type: selectedCandidate.cardType,
      issuer: selectedCandidate.issuer,
      reward_categories: selectedCandidate.rewardCategories,
    });
    
    onCardIdentified(pendingCardId);
    onCardNameChange('');
    setSelectedCandidate(null);
    setPendingCardId(null);
  };

  const handleSkip = () => {
    if (pendingCardId) {
      onCardIdentified(pendingCardId);
      onCardNameChange('');
    }
    setCandidates(null);
    setSelectedCandidate(null);
    setPendingCardId(null);
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

  // Show candidate selection list
  if (candidates && candidates.length > 1) {
    return (
      <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">We found several matches</span>
        </div>
        
        <div className="space-y-2">
          {candidates.map((candidate, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectCandidate(candidate)}
              className="w-full text-left p-2.5 rounded-md bg-muted/50 hover:bg-muted border border-transparent hover:border-border transition-colors"
            >
              <p className="font-medium text-sm text-foreground">{candidate.cardType}</p>
              {candidate.issuer && (
                <p className="text-xs text-muted-foreground">{candidate.issuer}</p>
              )}
              {candidate.rewardCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {candidate.rewardCategories.slice(0, 3).map((r, i) => (
                    <Badge key={i} variant="outline" className="text-xs py-0">
                      {r.category}: {r.rate}{r.unit === 'percent' ? '%' : 'x'}
                    </Badge>
                  ))}
                  {candidate.rewardCategories.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{candidate.rewardCategories.length - 3} more</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        <Button size="sm" variant="ghost" onClick={handleSkip} className="w-full text-muted-foreground">
          <X className="w-3 h-3 mr-1" />
          None of these
        </Button>
      </div>
    );
  }

  // Show single-candidate confirmation
  if (selectedCandidate) {
    return (
      <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Confirm Card Type</span>
          <Badge
            variant={selectedCandidate.confidence === 'high' ? 'default' : 'secondary'}
            className="ml-auto text-xs"
          >
            {selectedCandidate.confidence} confidence
          </Badge>
        </div>
        
        <div className="p-2 rounded bg-muted/50">
          <p className="font-medium text-sm">{selectedCandidate.cardType}</p>
          {selectedCandidate.issuer && (
            <p className="text-xs text-muted-foreground">{selectedCandidate.issuer}</p>
          )}
          {selectedCandidate.rewardCategories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {selectedCandidate.rewardCategories.slice(0, 3).map((reward, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {reward.category}: {reward.rate}
                  {reward.unit === 'percent' ? '%' : 'x'}
                </Badge>
              ))}
              {selectedCandidate.rewardCategories.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedCandidate.rewardCategories.length - 3} more
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
          <Button size="sm" variant="outline" onClick={handleSkip}>
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
