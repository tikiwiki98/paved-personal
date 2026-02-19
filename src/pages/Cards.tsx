import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditCards } from '@/hooks/useCreditCards';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard as CreditCardIcon, Plus, Trash2, Sparkles, Check, X } from 'lucide-react';
import { CreditCard, RewardCategory } from '@/types/budget';
import { toast } from 'sonner';

interface CardCandidate {
  cardType: string;
  issuer: string;
  rewardCategories: RewardCategory[];
  confidence: 'high' | 'medium' | 'low';
}

function CardItem({
  card,
  onLookup,
  onDelete,
  isLookingUp,
}: {
  card: CreditCard;
  onLookup: (card: CreditCard) => void;
  onDelete: (id: string) => void;
  isLookingUp: boolean;
}) {
  const needsConfirmation = !card.card_type;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CreditCardIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate">
                  {card.card_type || card.card_name}
                </h3>
                {needsConfirmation && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => onLookup(card)}
                    disabled={isLookingUp}
                    className="text-xs h-6"
                  >
                    {isLookingUp ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Looking up...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Identify Card
                      </>
                    )}
                  </Button>
                )}
              </div>
              {card.issuer && (
                <p className="text-sm text-muted-foreground">{card.issuer}</p>
              )}
              {card.reward_categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {card.reward_categories.slice(0, 4).map((reward, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {reward.category}: {reward.rate}
                      {reward.unit === 'percent' ? '%' : 'x'}
                    </Badge>
                  ))}
                  {card.reward_categories.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{card.reward_categories.length - 4} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(card.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddCardForm({
  onAdd,
  isAdding,
}: {
  onAdd: (name: string) => void;
  isAdding: boolean;
}) {
  const [cardName, setCardName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardName.trim()) {
      onAdd(cardName.trim());
      setCardName('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Enter card name (e.g., Chase Sapphire Preferred)"
        value={cardName}
        onChange={(e) => setCardName(e.target.value)}
        className="flex-1"
        disabled={isAdding}
      />
      <Button type="submit" disabled={!cardName.trim() || isAdding}>
        {isAdding ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        <span className="ml-2 hidden sm:inline">Add Card</span>
      </Button>
    </form>
  );
}

function CandidateSelectionPanel({
  candidates,
  onSelect,
  onSkip,
  isLoading,
  cardName,
}: {
  candidates: CardCandidate[];
  onSelect: (candidate: CardCandidate) => void;
  onSkip: () => void;
  isLoading: boolean;
  cardName: string;
}) {
  if (isLoading) {
    return (
      <Card className="bg-card border-primary/30 border-2">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <div>
              <p className="font-medium text-foreground">Looking up card benefits...</p>
              <p className="text-sm text-muted-foreground">
                We're identifying "{cardName}" and its rewards
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (candidates.length === 0) return null;

  return (
    <Card className="bg-card border-primary/30 border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">
            {candidates.length === 1 ? 'Confirm Card Type' : 'We found several matches'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {candidates.length > 1 && (
          <p className="text-sm text-muted-foreground">Which card is this?</p>
        )}
        
        {candidates.map((candidate, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(candidate)}
            className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted border border-transparent hover:border-border transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-foreground">{candidate.cardType}</p>
                {candidate.issuer && (
                  <p className="text-xs text-muted-foreground">{candidate.issuer}</p>
                )}
              </div>
              {candidate.confidence && (
                <Badge
                  variant={candidate.confidence === 'high' ? 'default' : 'secondary'}
                  className="text-xs shrink-0"
                >
                  {candidate.confidence}
                </Badge>
              )}
            </div>
            {candidate.rewardCategories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {candidate.rewardCategories.slice(0, 4).map((reward, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {reward.category}: {reward.rate}
                    {reward.unit === 'percent' ? '%' : 'x'}
                  </Badge>
                ))}
                {candidate.rewardCategories.length > 4 && (
                  <span className="text-xs text-muted-foreground">+{candidate.rewardCategories.length - 4} more</span>
                )}
              </div>
            )}
          </button>
        ))}

        <Button variant="ghost" size="sm" onClick={onSkip} className="w-full text-muted-foreground mt-1">
          <X className="w-4 h-4 mr-2" />
          {candidates.length === 1 ? 'Skip' : 'None of these'}
        </Button>
      </CardContent>
    </Card>
  );
}

function ConfirmSelectedCard({
  candidate,
  onConfirm,
  onBack,
}: {
  candidate: CardCandidate;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <Card className="bg-card border-primary/30 border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Confirm Card Type</CardTitle>
          <Badge
            variant={candidate.confidence === 'high' ? 'default' : 'secondary'}
            className="ml-auto text-xs"
          >
            {candidate.confidence} confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Is this the correct card?</p>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="font-semibold text-foreground">{candidate.cardType}</p>
          {candidate.issuer && (
            <p className="text-sm text-muted-foreground">{candidate.issuer}</p>
          )}
          {candidate.rewardCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {candidate.rewardCategories.map((reward, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {reward.category}: {reward.rate}
                  {reward.unit === 'percent' ? '%' : 'x'}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={onConfirm} className="flex-1">
            <Check className="w-4 h-4 mr-2" />
            Yes, that's correct
          </Button>
          <Button variant="outline" onClick={onBack}>
            <X className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const Cards = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    creditCards,
    isLoading,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    lookupCardBenefits,
  } = useCreditCards();

  const [isAdding, setIsAdding] = useState(false);
  const [lookingUpCardId, setLookingUpCardId] = useState<string | null>(null);

  // Multi-candidate state
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [pendingCardName, setPendingCardName] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [candidates, setCandidates] = useState<CardCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CardCandidate | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const startLookup = async (cardId: string, cardName: string) => {
    setPendingCardId(cardId);
    setPendingCardName(cardName);
    setIsLookingUp(true);
    setCandidates([]);
    setSelectedCandidate(null);

    const results = await lookupCardBenefits(cardName);

    if (results && results.length > 0) {
      setCandidates(results);
    } else {
      clearPending();
      toast.info('Could not look up card benefits. You can add them manually later.');
    }
    setIsLookingUp(false);
  };

  const clearPending = () => {
    setPendingCardId(null);
    setPendingCardName('');
    setCandidates([]);
    setSelectedCandidate(null);
    setIsLookingUp(false);
  };

  const handleAddCard = async (cardName: string) => {
    setIsAdding(true);
    const newCard = await addCreditCard(cardName);
    setIsAdding(false);

    if (newCard) {
      await startLookup(newCard.id, cardName);
    }
  };

  const handleSelectCandidate = (candidate: CardCandidate) => {
    if (candidates.length === 1) {
      // Single candidate — selecting it means confirm
      handleConfirmCandidate(candidate);
    } else {
      // Multi — go to confirm step
      setSelectedCandidate(candidate);
      setCandidates([]);
    }
  };

  const handleConfirmCandidate = async (candidate?: CardCandidate) => {
    const toConfirm = candidate || selectedCandidate;
    if (!toConfirm || !pendingCardId) return;

    const success = await updateCreditCard(pendingCardId, {
      card_type: toConfirm.cardType,
      issuer: toConfirm.issuer,
      reward_categories: toConfirm.rewardCategories,
    });

    if (success) {
      toast.success('Card confirmed with rewards!');
    }
    clearPending();
  };

  const handleSkip = () => {
    clearPending();
  };

  const handleBackFromConfirm = () => {
    // Go back to candidate list — re-trigger lookup
    setSelectedCandidate(null);
    if (pendingCardId && pendingCardName) {
      startLookup(pendingCardId, pendingCardName);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (pendingCardId === id) {
      clearPending();
    }
    await deleteCreditCard(id);
  };

  const handleLookupExistingCard = async (card: CreditCard) => {
    setLookingUpCardId(card.id);
    await startLookup(card.id, card.card_name);
    setLookingUpCardId(null);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 md:py-10 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCardIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">My Cards</h1>
            <p className="text-sm text-muted-foreground">
              Manage your credit cards and track rewards
            </p>
          </div>
        </div>

        {/* Add Card Form */}
        <div className="mb-6">
          <AddCardForm onAdd={handleAddCard} isAdding={isAdding} />
        </div>

        {/* Candidate Selection / Confirmation */}
        {pendingCardId && (
          <div className="mb-6">
            {selectedCandidate ? (
              <ConfirmSelectedCard
                candidate={selectedCandidate}
                onConfirm={() => handleConfirmCandidate()}
                onBack={handleBackFromConfirm}
              />
            ) : (
              <CandidateSelectionPanel
                candidates={candidates}
                onSelect={handleSelectCandidate}
                onSkip={handleSkip}
                isLoading={isLookingUp}
                cardName={pendingCardName}
              />
            )}
          </div>
        )}

        {/* Card List */}
        <div className="space-y-3">
          {creditCards.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <CreditCardIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No cards added yet. Add your first card above.
                </p>
              </CardContent>
            </Card>
          ) : (
            creditCards
              .filter((card) => card.id !== pendingCardId)
              .map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  onLookup={handleLookupExistingCard}
                  onDelete={handleDeleteCard}
                  isLookingUp={lookingUpCardId === card.id}
                />
              ))
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Cards;
