import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, ArrowUpRight, ArrowDownRight, Repeat, CalendarIcon, CreditCard, Clock, List, TrendingUp } from 'lucide-react';
import { Transaction, Category } from '@/types/budget';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useCreditCards } from '@/hooks/useCreditCards';

import { CardIdentifier } from '@/components/CardIdentifier';

interface AddTransactionModalProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  categories: Category[];
  transactions?: Transaction[];
  trigger?: React.ReactNode;
}

const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Other Income'];
const assetTypeOptions = [
  { value: 'brokerage', label: 'Brokerage' },
  { value: 'retirement', label: 'Retirement (401k, IRA, Roth)' },
  { value: 'high_yield_savings', label: 'High-yield Savings' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
];

export function AddTransactionModal({ onAddTransaction, categories, transactions = [], trigger }: AddTransactionModalProps) {
  const { creditCards, addCreditCard, updateCreditCard, lookupCardBenefits } = useCreditCards();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
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
  
  // Transfer-specific fields
  const [assetType, setAssetType] = useState<string>('');
  const [assetName, setAssetName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields based on type
    if (type === 'transfer') {
      if (!amount || !date) {
        setValidationError('Please complete all required fields.');
        return;
      }
    } else {
      if (!amount || !category || !description.trim()) {
        setValidationError('Please complete all required fields.');
        return;
      }
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
      asset_type?: string | null;
      asset_name?: string | null;
    } = {
      amount: parseFloat(amount),
      type,
      category: type === 'transfer' ? 'Transfer' : category,
      description: type === 'transfer' ? (assetName || 'Transfer/Investment') : description,
      date,
    };

    if (isRecurring && recurringStartDate) {
      transactionData.is_recurring = true;
      transactionData.recurring_frequency = recurringFrequency;
      transactionData.recurring_start_date = format(recurringStartDate, 'yyyy-MM-dd');
      transactionData.recurring_end_date = recurringEndDate ? format(recurringEndDate, 'yyyy-MM-dd') : null;
    }

    if (type !== 'transfer' && showPaymentType && paymentType) {
      transactionData.payment_type = paymentType;
      transactionData.payment_description = paymentDescription || null;
      transactionData.credit_card_id = creditCardId;
    }

    // Add transfer-specific fields
    if (type === 'transfer') {
      transactionData.asset_type = assetType || null;
      transactionData.asset_name = assetName || null;
    }

    onAddTransaction(transactionData as Omit<Transaction, 'id'>);

    // Reset form
    setAmount('');
    setCategory('');
    setDescription('');
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setDate(`${year}-${month}-${day}`);
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
    setAssetType('');
    setAssetName('');
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
    } else if (type === 'expense') {
      const predefinedExpense = categories.map((c) => c.name);
      const customExpenseCategories = transactions
        .filter(t => t.type === 'expense')
        .map(t => t.category)
        .filter(cat => !predefinedExpense.includes(cat));
      return [...new Set([...predefinedExpense, ...customExpenseCategories])].sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
      );
    }
    return [];
  }, [type, categories, transactions]);

  // Get recent categories (last 5 used, most recent first)
  const recentCategories = useMemo(() => {
    if (type === 'transfer') return [];
    
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

  // Get recent payment types (last 5 unique combinations)
  const recentPaymentTypes = useMemo(() => {
    const paymentTypeLabels: Record<string, string> = {
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      venmo: 'Venmo',
      paypal: 'PayPal',
      zelle: 'Zelle',
      crypto: 'Crypto',
      check: 'Check',
      other: 'Other',
    };

    const transactionsWithPayment = transactions
      .filter(t => t.payment_type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const seen = new Set<string>();
    const recent: Array<{
      paymentType: string;
      creditCardId: string | null;
      paymentDescription: string | null;
      label: string;
    }> = [];
    
    for (const t of transactionsWithPayment) {
      // Create a unique key for this payment combination
      const key = t.payment_type === 'credit_card' 
        ? `credit_card:${t.credit_card_id || 'none'}`
        : `${t.payment_type}`;
      
      if (!seen.has(key) && recent.length < 5) {
        seen.add(key);
        
        // Build label
        let label = paymentTypeLabels[t.payment_type || ''] || t.payment_type || '';
        if (t.payment_type === 'credit_card' && t.credit_card_id) {
          const card = creditCards.find(c => c.id === t.credit_card_id);
          if (card) {
            label = card.card_name;
          }
        }
        
        recent.push({
          paymentType: t.payment_type || '',
          creditCardId: t.credit_card_id || null,
          paymentDescription: t.payment_description || null,
          label,
        });
      }
      if (recent.length >= 5) break;
    }
    
    return recent;
  }, [transactions, creditCards]);

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
          {/* Transaction Type Toggle - 3 options */}
          <div className="flex gap-2 p-1 bg-secondary rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-lg font-medium transition-all duration-200 text-sm ${
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
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                type === 'expense'
                  ? 'bg-expense text-destructive-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setType('transfer');
                setCategory('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                type === 'transfer'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Transfer
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

          {/* Transfer-specific fields */}
          {type === 'transfer' && (
            <>
              {/* Date Input for Transfer */}
              <div className="space-y-2">
                <Label htmlFor="transfer-date" className="text-foreground">Date <span className="text-destructive">*</span></Label>
                <Input
                  id="transfer-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>

              {/* Asset Type (Optional) */}
              <div className="space-y-2">
                <Label className="text-foreground">Asset Type</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select asset type (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {assetTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Asset Name (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="asset-name" className="text-foreground">Asset Name</Label>
                <Input
                  id="asset-name"
                  placeholder="e.g., Vanguard, Robinhood, Ally Savings"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
            </>
          )}

          {/* Non-transfer fields */}
          {type !== 'transfer' && (
            <>
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
                        className="w-56 p-0 bg-card border-border" 
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="h-[200px] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y" style={{ WebkitOverflowScrolling: 'touch', transform: 'translateZ(0)' }} onTouchStart={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
                          <div className="p-2 space-y-1">
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
                        className="w-56 p-0 bg-card border-border" 
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <div className="h-[200px] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y" style={{ WebkitOverflowScrolling: 'touch', transform: 'translateZ(0)' }} onTouchStart={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
                          <div className="p-2 space-y-1">
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
                      placeholder="Enter new category"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewCategory();
                        }
                      }}
                      className="bg-secondary border-border"
                      autoFocus
                    />
                    <Button
                      type="button"
                      onClick={handleAddNewCategory}
                      disabled={!newCategoryInput.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
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

                {/* Recurring Options */}
                {isRecurring && (
                  <div className="space-y-4 p-4 bg-secondary/50 rounded-lg border border-border animate-in fade-in slide-in-from-top-2 duration-200">
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
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Type Toggle */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="payment-type" className="text-foreground cursor-pointer">Add payment type?</Label>
                  </div>
                  <Switch
                    id="payment-type"
                    checked={showPaymentType}
                    onCheckedChange={setShowPaymentType}
                  />
                </div>

                {showPaymentType && (
                  <div className="space-y-4 p-4 bg-secondary/50 rounded-lg border border-border animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Recent Payment Types */}
                    {recentPaymentTypes.length > 0 && !paymentType && (
                      <div className="space-y-2">
                        <Label className="text-foreground text-xs uppercase tracking-wide">Recent</Label>
                        <div className="flex flex-wrap gap-2">
                          {recentPaymentTypes.map((recent, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="bg-secondary border-border"
                              onClick={() => {
                                setPaymentType(recent.paymentType);
                                if (recent.creditCardId) {
                                  setSelectedCreditCardId(recent.creditCardId);
                                }
                                if (recent.paymentDescription) {
                                  setPaymentDescription(recent.paymentDescription);
                                }
                              }}
                            >
                              {recent.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-foreground">Payment Method</Label>
                      <Select value={paymentType} onValueChange={(value) => {
                        setPaymentType(value);
                        if (value !== 'credit_card') {
                          setSelectedCreditCardId('');
                          setIsAddingNewCard(false);
                          setNewCardName('');
                        }
                      }}>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue placeholder="Select payment method" />
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

                    {paymentType === 'credit_card' && (
                      <div className="space-y-3">
                        {/* Existing Cards */}
                        {creditCards.length > 0 && !isAddingNewCard && (
                          <div className="space-y-2">
                            <Label className="text-foreground">Select Card</Label>
                            <Select value={selectedCreditCardId} onValueChange={setSelectedCreditCardId}>
                              <SelectTrigger className="bg-secondary border-border">
                                <SelectValue placeholder="Select a card" />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                {creditCards.map((card) => (
                                  <SelectItem key={card.id} value={card.id}>
                                    {card.card_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Toggle to add new card */}
                        {!isAddingNewCard ? (
                          <button
                            type="button"
                            onClick={() => setIsAddingNewCard(true)}
                            className="text-sm text-primary hover:text-primary/80 transition-colors"
                          >
                            + Add new card
                          </button>
                        ) : (
                          <CardIdentifier
                            cardName={newCardName}
                            onCardNameChange={setNewCardName}
                            onCardIdentified={(cardId) => {
                              setSelectedCreditCardId(cardId);
                              setIsAddingNewCard(false);
                            }}
                            addCreditCard={addCreditCard}
                            updateCreditCard={updateCreditCard}
                            lookupCardBenefits={lookupCardBenefits}
                          />
                        )}

                        {isAddingNewCard && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewCard(false);
                              setNewCardName('');
                            }}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-foreground">Payment Note (Optional)</Label>
                      <Input
                        placeholder="e.g., Split with roommate"
                        value={paymentDescription}
                        onChange={(e) => setPaymentDescription(e.target.value)}
                        className="bg-secondary border-border"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Validation Error */}
          {validationError && (
            <p className="text-sm text-destructive">{validationError}</p>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" size="lg">
            Add {type === 'transfer' ? 'Transfer' : 'Transaction'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}