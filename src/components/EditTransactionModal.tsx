import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUpRight, ArrowDownRight, Trash2, Check, ChevronsUpDown, Repeat, CalendarIcon, CreditCard, TrendingUp } from 'lucide-react';
import { Transaction, Category } from '@/types/budget';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { useCreditCards } from '@/hooks/useCreditCards';
import { CardIdentifier } from '@/components/CardIdentifier';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTransaction: (transaction: Partial<Transaction> & { id: string }) => void;
  onDeleteTransaction: (id: string) => void;
  categories: Category[];
  transactions?: Transaction[];
}

const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Other Income'];
const assetTypeOptions = [
  { value: 'brokerage', label: 'Brokerage' },
  { value: 'retirement', label: 'Retirement (401k, IRA, Roth)' },
  { value: 'high_yield_savings', label: 'High-yield Savings' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
];

export function EditTransactionModal({
  transaction,
  open,
  onOpenChange,
  onUpdateTransaction,
  onDeleteTransaction,
  categories,
  transactions = [],
}: EditTransactionModalProps) {
  const { creditCards, addCreditCard, updateCreditCard: updateCard, lookupCardBenefits } = useCreditCards();
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
  
  // Transfer-specific fields
  const [assetType, setAssetType] = useState<string>('');
  const [assetName, setAssetName] = useState('');

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
      const key = t.payment_type === 'credit_card' 
        ? `credit_card:${t.credit_card_id || 'none'}`
        : `${t.payment_type}`;
      
      if (!seen.has(key) && recent.length < 5) {
        seen.add(key);
        
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

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setCategory(transaction.category);
      setDescription(transaction.description);
      setDate(transaction.date);
      setIsRecurring(transaction.is_recurring || false);
      setRecurringFrequency(transaction.recurring_frequency || 'monthly');
      setRecurringStartDate(transaction.recurring_start_date ? parseISO(transaction.recurring_start_date) : undefined);
      setRecurringEndDate(transaction.recurring_end_date ? parseISO(transaction.recurring_end_date) : undefined);
      setShowPaymentType(!!transaction.payment_type);
      setPaymentType(transaction.payment_type || '');
      setPaymentDescription(transaction.payment_description || '');
      setSelectedCreditCardId(transaction.credit_card_id || '');
      setIsAddingNewCard(false);
      setNewCardName('');
      setAssetType(transaction.asset_type || '');
      setAssetName(transaction.asset_name || '');
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !amount) return;
    
    // Validate based on type
    if (type !== 'transfer' && (!category || !description)) return;

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

    const updateData: Partial<Transaction> & { id: string } = {
      id: transaction.id,
      amount: parseFloat(amount),
      type,
      category: type === 'transfer' ? 'Transfer' : category,
      description: type === 'transfer' ? (description.trim() || assetName || 'Transfer/Investment') : description,
      date,
      is_recurring: isRecurring,
    };

    if (isRecurring && recurringStartDate) {
      updateData.recurring_frequency = recurringFrequency;
      updateData.recurring_start_date = format(recurringStartDate, 'yyyy-MM-dd');
      updateData.recurring_end_date = recurringEndDate ? format(recurringEndDate, 'yyyy-MM-dd') : null;
    } else {
      updateData.recurring_frequency = undefined;
      updateData.recurring_start_date = undefined;
      updateData.recurring_end_date = null;
    }

    if (type !== 'transfer' && showPaymentType && paymentType) {
      updateData.payment_type = paymentType;
      updateData.payment_description = paymentDescription || null;
      updateData.credit_card_id = creditCardId;
    } else {
      updateData.payment_type = null;
      updateData.payment_description = null;
      updateData.credit_card_id = null;
    }

    // Transfer-specific fields
    if (type === 'transfer') {
      updateData.asset_type = assetType || null;
      updateData.asset_name = assetName || null;
    } else {
      updateData.asset_type = null;
      updateData.asset_name = null;
    }

    onUpdateTransaction(updateData);

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (transaction) {
      onDeleteTransaction(transaction.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    }
  };

  // Merge predefined categories with custom categories from past transactions
  const categoryOptions = (() => {
    if (type === 'income') {
      const customIncomeCategories = transactions
        .filter(t => t.type === 'income')
        .map(t => t.category)
        .filter(cat => !incomeCategories.includes(cat));
      return [...new Set([...incomeCategories, ...customIncomeCategories])];
    } else if (type === 'expense') {
      const predefinedExpense = categories.map((c) => c.name);
      const customExpenseCategories = transactions
        .filter(t => t.type === 'expense')
        .map(t => t.category)
        .filter(cat => !predefinedExpense.includes(cat));
      return [...new Set([...predefinedExpense, ...customExpenseCategories])];
    }
    return [];
  })();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Transaction</DialogTitle>
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
              <Label htmlFor="edit-amount" className="text-foreground">Amount</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                <Input
                  id="edit-amount"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    setAmount(sanitized);
                  }}
                  className="pl-8 text-lg bg-secondary border-border"
                />
              </div>
            </div>

            {/* Transfer-specific fields */}
            {type === 'transfer' && (
              <>
                {/* Date Input for Transfer */}
                <div className="space-y-2">
                  <Label htmlFor="edit-transfer-date" className="text-foreground">Date</Label>
                  <Input
                    id="edit-transfer-date"
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
                  <Label htmlFor="edit-asset-name" className="text-foreground">Asset Name</Label>
                  <Input
                    id="edit-asset-name"
                    placeholder="e.g., Vanguard, Robinhood, Ally Savings"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>

                {/* Description Input for Transfers (optional) */}
                <div className="space-y-2">
                  <Label htmlFor="edit-transfer-description" className="text-foreground">Description</Label>
                  <Input
                    id="edit-transfer-description"
                    placeholder="e.g., Monthly contribution, 401k match"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
              </>
            )}

            {/* Non-transfer fields */}
            {type !== 'transfer' && (
              <>
                {/* Category Combobox */}
                <div className="space-y-2">
                  <Label className="text-foreground">Category</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between bg-secondary border-border font-normal"
                      >
                        {category || "Select or type a category"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-card border-border" align="start">
                      <Command className="bg-card">
                        <CommandInput 
                          placeholder="Search or type custom..." 
                          value={category}
                          onValueChange={setCategory}
                          className="bg-card"
                        />
                        <CommandList>
                          <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                            Press enter to use "{category}"
                          </CommandEmpty>
                          <CommandGroup>
                            {categoryOptions.map((cat) => (
                              <CommandItem
                                key={cat}
                                value={cat}
                                onSelect={(value) => setCategory(value)}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    category === cat ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {cat}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Description Input */}
                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-foreground">Description</Label>
                  <Input
                    id="edit-description"
                    placeholder="Enter a description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>

                {/* Date Input */}
                <div className="space-y-2">
                  <Label htmlFor="edit-date" className="text-foreground">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
              </>
            )}

            {/* Recurring Toggle - visible for ALL transaction types */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="edit-recurring" className="text-foreground cursor-pointer">Recurring?</Label>
                </div>
                <Switch
                  id="edit-recurring"
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
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Type Toggle - only for non-transfer */}
            {type !== 'transfer' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <Label htmlFor="edit-payment-type" className="text-foreground cursor-pointer">Add payment type?</Label>
                  </div>
                  <Switch
                    id="edit-payment-type"
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
                            updateCreditCard={updateCard}
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
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button type="submit" className="flex-1">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}