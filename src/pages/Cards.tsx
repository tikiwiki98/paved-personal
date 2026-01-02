import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditCards } from '@/hooks/useCreditCards';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard as CreditCardIcon, Plus, Trash2, Sparkles, Check, X, RefreshCw } from 'lucide-react';
import { CreditCard, RewardCategory } from '@/types/budget';
import { toast } from 'sonner';

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
    <Card className="gradient-card border-border/50">
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

function ConfirmCardModal({
  card,
  suggestedType,
  suggestedIssuer,
  suggestedRewards,
  confidence,
  onConfirm,
  onSkip,
  isLoading,
}: {
  card: CreditCard;
  suggestedType: string | null;
  suggestedIssuer: string | null;
  suggestedRewards: RewardCategory[];
  confidence: 'high' | 'medium' | 'low' | null;
  onConfirm: () => void;
  onSkip: () => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="gradient-card border-primary/30 border-2">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <div>
              <p className="font-medium text-foreground">Looking up card benefits...</p>
              <p className="text-sm text-muted-foreground">
                We're identifying "{card.card_name}" and its rewards
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestedType) {
    return null;
  }

  return (
    <Card className="gradient-card border-primary/30 border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Confirm Card Type</CardTitle>
          {confidence && (
            <Badge
              variant={confidence === 'high' ? 'default' : 'secondary'}
              className="ml-auto text-xs"
            >
              {confidence} confidence
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Is this the correct card?
        </p>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="font-semibold text-foreground">{suggestedType}</p>
          {suggestedIssuer && (
            <p className="text-sm text-muted-foreground">{suggestedIssuer}</p>
          )}
          {suggestedRewards.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {suggestedRewards.map((reward, idx) => (
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
          <Button variant="outline" onClick={onSkip}>
            <X className="w-4 h-4 mr-2" />
            Skip
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
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    cardId: string;
    isLookingUp: boolean;
    suggestedType: string | null;
    suggestedIssuer: string | null;
    suggestedRewards: RewardCategory[];
    confidence: 'high' | 'medium' | 'low' | null;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleAddCard = async (cardName: string) => {
    setIsAdding(true);
    const newCard = await addCreditCard(cardName);
    setIsAdding(false);

    if (newCard) {
      // Start looking up benefits
      setPendingConfirmation({
        cardId: newCard.id,
        isLookingUp: true,
        suggestedType: null,
        suggestedIssuer: null,
        suggestedRewards: [],
        confidence: null,
      });

      const benefits = await lookupCardBenefits(cardName);

      if (benefits) {
        setPendingConfirmation({
          cardId: newCard.id,
          isLookingUp: false,
          suggestedType: benefits.cardType,
          suggestedIssuer: benefits.issuer,
          suggestedRewards: benefits.rewardCategories,
          confidence: benefits.confidence,
        });
      } else {
        setPendingConfirmation(null);
        toast.info('Could not look up card benefits. You can add them manually later.');
      }
    }
  };

  const handleConfirmCard = async () => {
    if (!pendingConfirmation) return;

    const success = await updateCreditCard(pendingConfirmation.cardId, {
      card_type: pendingConfirmation.suggestedType,
      issuer: pendingConfirmation.suggestedIssuer,
      reward_categories: pendingConfirmation.suggestedRewards,
    });

    if (success) {
      toast.success('Card confirmed with rewards!');
    }
    setPendingConfirmation(null);
  };

  const handleSkipConfirmation = () => {
    setPendingConfirmation(null);
  };

  const handleDeleteCard = async (id: string) => {
    if (pendingConfirmation?.cardId === id) {
      setPendingConfirmation(null);
    }
    await deleteCreditCard(id);
  };

  const [lookingUpCardId, setLookingUpCardId] = useState<string | null>(null);

  const handleLookupExistingCard = async (card: CreditCard) => {
    setLookingUpCardId(card.id);
    
    const benefits = await lookupCardBenefits(card.card_name);
    
    if (benefits) {
      setPendingConfirmation({
        cardId: card.id,
        isLookingUp: false,
        suggestedType: benefits.cardType,
        suggestedIssuer: benefits.issuer,
        suggestedRewards: benefits.rewardCategories,
        confidence: benefits.confidence,
      });
    }
    
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

  const pendingCard = pendingConfirmation
    ? creditCards.find((c) => c.id === pendingConfirmation.cardId)
    : null;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCardIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">My Cards</h1>
            <p className="text-sm text-muted-foreground">
              Manage your credit cards and track rewards
            </p>
          </div>
        </div>

        {/* Add Card Form */}
        <div className="mb-6">
          <AddCardForm onAdd={handleAddCard} isAdding={isAdding} />
        </div>

        {/* Pending Confirmation */}
        {pendingCard && pendingConfirmation && (
          <div className="mb-6">
            <ConfirmCardModal
              card={pendingCard}
              suggestedType={pendingConfirmation.suggestedType}
              suggestedIssuer={pendingConfirmation.suggestedIssuer}
              suggestedRewards={pendingConfirmation.suggestedRewards}
              confidence={pendingConfirmation.confidence}
              onConfirm={handleConfirmCard}
              onSkip={handleSkipConfirmation}
              isLoading={pendingConfirmation.isLookingUp}
            />
          </div>
        )}

        {/* Card List */}
        <div className="space-y-3">
          {creditCards.length === 0 ? (
            <Card className="gradient-card border-border/50">
              <CardContent className="p-8 text-center">
                <CreditCardIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No cards added yet. Add your first card above.
                </p>
              </CardContent>
            </Card>
          ) : (
            creditCards
              .filter((card) => card.id !== pendingConfirmation?.cardId)
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
