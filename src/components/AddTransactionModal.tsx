import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, ArrowUpRight, ArrowDownRight, Repeat, CalendarIcon, CreditCard, Clock, List } from 'lucide-react';
import { Transaction, Category } from '@/types/budget';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useCreditCards } from '@/hooks/useCreditCards';

interface AddTransactionModalProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  categories: Category[];
  transactions?: Transaction[];
  trigger?: React.ReactNode;
}

const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Other Income'];

export function AddTransactionModal({ onAddTransaction, categories, transactions = [], trigger }: AddTransactionModalProps) {
  const { creditCards, addCreditCard } = useCreditCards();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<string>('monthly');
  const [recurringStartDate, setRecurringStartDate] = useState<Date | undefined>(undefined);
  const [recurringEndDate, setRecurringEndDate] = useState<Date | undefined>(undefined);
  const [showPaymentType, setShowPaymentType] = useState(false);
  const [paymentType, setPaymentType] = useState<string>('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string>('');
  const [newCardName, setNewCardName] = useState('');
  const [isAddingNewCard, setIsAddingNewCard] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!amount || !category || !description.trim()) {
      setValidationError('Please complete all required fields.');
      return;
    }
    
    setValidationError('');

    // If adding a new credit card, create it first
    let creditCardId: string | null = null;
    if (showPaymentType && paymentType === 'credit_card') {
      if (isAddingNewCard && newCardName.trim()) {
        const newCard = await addCreditCard(newCardName.trim());
        if (newCard) {
          creditCardId = newCard.id;
        }
      } else if (selectedCreditCardId) {
        creditCardId = selectedCreditCardId;
      }
    }

    const transactionData: Omit<Transaction, 'id'> & {
      is_recurring?: boolean;
      recurring_frequency?: string;
      recurring_start_date?: string;
      recurring_end_date?: string | null;
      payment_type?: string | null;
      payment_description?: string | null;
      credit_card_id?: string | null;
    } = {
      amount: parseFloat(amount),
      type,
      category,
      description,
      date,
    };

    if (isRecurring && recurringStartDate) {
      transactionData.is_recurring = true;
      transactionData.recurring_frequency = recurringFrequency;
      transactionData.recurring_start_date = format(recurringStartDate, 'yyyy-MM-dd');
      transactionData.recurring_end_date = recurringEndDate ? format(recurringEndDate, 'yyyy-MM-dd') : null;
    }

    if (showPaymentType && paymentType) {
      transactionData.payment_type = paymentType;
      transactionData.payment_description = paymentDescription || null;
      transactionData.credit_card_id = creditCardId;
    }

    onAddTransaction(transactionData as Omit<Transaction, 'id'>);

    setAmount('');
    setCategory('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsRecurring(false);
    setRecurringFrequency('monthly');
    setRecurringStartDate(undefined);
    setRecurringEndDate(undefined);
    setShowPaymentType(false);
    setPaymentType('');
    setPaymentDescription('');
    setSelectedCreditCardId('');
    setNewCardName('');
    setIsAddingNewCard(false);
    setValidationError('');
    setOpen(false);
  };

  // State for category selection UI
  const [categoryDropdownType, setCategoryDropdownType] = useState<'recent' | 'all' | 'new' | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Get all category options (alphabetically sorted)
  const allCategoryOptions = useMemo(() => {
    if (type === 'income') {
      const customIncomeCategories = transactions
        .filter(t => t.type === 'income')
        .map(t => t.category)
        .filter(cat => !incomeCategories.includes(cat));
      return [...new Set([...incomeCategories, ...customIncomeCategories])].sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
      );
    } else {
      const predefinedExpense = categories.map((c) => c.name);
      const customExpenseCategories = transactions
        .filter(t => t.type === 'expense')
        .map(t => t.category)
        .filter(cat => !predefinedExpense.includes(cat));
      return [...new Set([...predefinedExpense, ...customExpenseCategories])].sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
      );
    }
  }, [type, categories, transactions]);

  // Get recent categories (last 5 used, most recent first)
  const recentCategories = useMemo(() => {
    const relevantTransactions = transactions
      .filter(t => t.type === type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const seen = new Set<string>();
    const recent: string[] = [];
    
    for (const t of relevantTransactions) {
      if (!seen.has(t.category) && recent.length < 5) {
        seen.add(t.category);
        recent.push(t.category);
      }
      if (recent.length >= 5) break;
    }
    
    return recent;
  }, [transactions, type]);

  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
    setCategoryDropdownType(null);
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (trimmed) {
      // Case-insensitive check for existing category
      const existingCategory = allCategoryOptions.find(
        cat => cat.toLowerCase() === trimmed.toLowerCase()
      );
      // Use existing category if found (preserves original casing), otherwise use new input
      setCategory(existingCategory || trimmed);
      setNewCategoryInput('');
      setCategoryDropdownType(null);
    }
  };

  const defaultTrigger = (
    <Button size="lg" className="gap-2 shadow-glow">
      <Plus className="w-5 h-5" />
      Add Transaction
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Transaction Type Toggle */}
          <div className="flex gap-2 p-1 bg-secondary rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                type === 'income'
                  ? 'bg-income text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Income
            </button>
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                type === 'expense'
                  ? 'bg-expense text-destructive-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              Expense
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground">Amount <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-lg bg-secondary border-border"
              />
            </div>
          </div>

          {/* Category Selection - Two Buttons */}
          <div className="space-y-2">
            <Label className="text-foreground">Category <span className="text-destructive">*</span></Label>
            
            {/* Selected Category Display */}
            {category && (
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span className="font-medium">{category}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCategory('')}
                  className="text-muted-foreground hover:text-foreground h-auto py-1 px-2"
                >
                  Change
                </Button>
              </div>
            )}

            {/* Category Selection Buttons */}
            {!category && (
              <div className="flex gap-2">
                <Popover open={categoryDropdownType === 'recent'} onOpenChange={(open) => {
                  if (!open && categoryDropdownType === 'recent') {
                    setCategoryDropdownType(null);
                  } else if (open) {
                    setCategoryDropdownType('recent');
                  }
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2 bg-secondary border-border"
                    >
                      <Clock className="w-4 h-4" />
                      Recent
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-56 p-0 bg-card border-border flex flex-col max-h-64" 
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <div 
                      className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1"
                      style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                      {recentCategories.length > 0 ? (
                        recentCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleSelectCategory(cat)}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary text-sm transition-colors"
                          >
                            {cat}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No recent categories</p>
                      )}
                    </div>
                    <div className="border-t border-border sticky bottom-0 bg-card p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryDropdownType('new');
                        }}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary text-sm text-primary font-medium transition-colors"
                      >
                        + Add new
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover open={categoryDropdownType === 'all'} onOpenChange={(open) => {
                  if (!open && categoryDropdownType === 'all') {
                    setCategoryDropdownType(null);
                  } else if (open) {
                    setCategoryDropdownType('all');
                  }
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2 bg-secondary border-border"
                    >
                      <List className="w-4 h-4" />
                      All
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-56 p-0 bg-card border-border flex flex-col max-h-64" 
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <div 
                      className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1"
                      style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                      {allCategoryOptions.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleSelectCategory(cat)}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary text-sm transition-colors"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-border sticky bottom-0 bg-card p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryDropdownType('new');
                        }}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary text-sm text-primary font-medium transition-colors"
                      >
                        + Add new
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Add New Category Input */}
            {categoryDropdownType === 'new' && !category && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Input
                  placeholder="Enter new category name"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewCategory();
                    }
                  }}
                  className="flex-1 bg-secondary border-border"
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={handleAddNewCategory}
                  disabled={!newCategoryInput.trim()}
                  size="sm"
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCategoryDropdownType(null);
                    setNewCategoryInput('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Date Input */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-foreground">Date <span className="text-destructive">*</span></Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Description <span className="text-destructive">*</span></Label>
            <Input
              id="description"
              placeholder="Enter a description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          {/* Recurring Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="recurring" className="text-foreground cursor-pointer">Recurring?</Label>
              </div>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>

            {/* Recurring Options - Only show when toggle is enabled */}
            {isRecurring && (
              <div className="space-y-4 p-4 bg-secondary/50 rounded-lg border border-border animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Frequency */}
                <div className="space-y-2">
                  <Label className="text-foreground">Frequency</Label>
                  <Select value={recurringFrequency} onValueChange={setRecurringFrequency}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label className="text-foreground">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-secondary border-border",
                          !recurringStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {recurringStartDate ? format(recurringStartDate, "PPP") : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                      <Calendar
                        mode="single"
                        selected={recurringStartDate}
                        onSelect={setRecurringStartDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date (Optional) */}
                <div className="space-y-2">
                  <Label className="text-foreground">End Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-secondary border-border",
                          !recurringEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {recurringEndDate ? format(recurringEndDate, "PPP") : "No end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                      <Calendar
                        mode="single"
                        selected={recurringEndDate}
                        onSelect={setRecurringEndDate}
                        disabled={(date) => recurringStartDate ? date < recurringStartDate : false}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {recurringEndDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setRecurringEndDate(undefined)}
                    >
                      Clear end date
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment Type Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="payment-type-toggle" className="text-foreground cursor-pointer">Add Payment Type?</Label>
              </div>
              <Switch
                id="payment-type-toggle"
                checked={showPaymentType}
                onCheckedChange={setShowPaymentType}
              />
            </div>

            {/* Payment Type Options - Only show when toggle is enabled */}
            {showPaymentType && (
              <div className="space-y-4 p-4 bg-secondary/50 rounded-lg border border-border animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Payment Type Select */}
                <div className="space-y-2">
                  <Label className="text-foreground">Payment Type</Label>
                  <Select value={paymentType} onValueChange={(value) => {
                    setPaymentType(value);
                    if (value !== 'credit_card') {
                      setSelectedCreditCardId('');
                      setIsAddingNewCard(false);
                      setNewCardName('');
                    }
                  }}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="zelle">Zelle</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Credit Card Selection - Only show when credit_card is selected */}
                {paymentType === 'credit_card' && (
                  <div className="space-y-2">
                    <Label className="text-foreground">Select Card</Label>
                    <Select 
                      value={isAddingNewCard ? 'add_new' : selectedCreditCardId} 
                      onValueChange={(value) => {
                        if (value === 'add_new') {
                          setIsAddingNewCard(true);
                          setSelectedCreditCardId('');
                        } else {
                          setIsAddingNewCard(false);
                          setSelectedCreditCardId(value);
                          setNewCardName('');
                        }
                      }}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Select a credit card" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {creditCards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.card_name}{card.card_type ? ` (${card.card_type})` : ''}
                          </SelectItem>
                        ))}
                        <SelectItem value="add_new" className="text-primary font-medium">
                          + Add New Credit Card
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* New Card Input - Only show when adding new card */}
                {paymentType === 'credit_card' && isAddingNewCard && (
                  <div className="space-y-2">
                    <Label htmlFor="new-card-name" className="text-foreground">New Card Name</Label>
                    <Input
                      id="new-card-name"
                      placeholder="e.g., Chase Sapphire Preferred"
                      value={newCardName}
                      onChange={(e) => setNewCardName(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                )}

                {/* Payment Description - Only show for non-credit card types */}
                {paymentType !== 'credit_card' && (
                  <div className="space-y-2">
                    <Label htmlFor="payment-description" className="text-foreground">Payment Note (Optional)</Label>
                    <Input
                      id="payment-description"
                      placeholder="e.g., ending in 4242"
                      value={paymentDescription}
                      onChange={(e) => setPaymentDescription(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{validationError}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            variant={type === 'income' ? 'income' : 'expense'}
            size="lg"
          >
            Add {type === 'income' ? 'Income' : 'Expense'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
