import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUpRight, ArrowDownRight, Trash2, Check, ChevronsUpDown, Repeat, CalendarIcon, CreditCard } from 'lucide-react';
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

export function EditTransactionModal({
  transaction,
  open,
  onOpenChange,
  onUpdateTransaction,
  onDeleteTransaction,
  categories,
  transactions = [],
}: EditTransactionModalProps) {
  const { creditCards, addCreditCard } = useCreditCards();
  const [type, setType] = useState<'income' | 'expense'>('expense');
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
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !amount || !category || !description) return;

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
      category,
      description,
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

    if (showPaymentType && paymentType) {
      updateData.payment_type = paymentType;
      updateData.payment_description = paymentDescription || null;
      updateData.credit_card_id = creditCardId;
    } else {
      updateData.payment_type = null;
      updateData.payment_description = null;
      updateData.credit_card_id = null;
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
    } else {
      const predefinedExpense = categories.map((c) => c.name);
      const customExpenseCategories = transactions
        .filter(t => t.type === 'expense')
        .map(t => t.category)
        .filter(cat => !predefinedExpense.includes(cat));
      return [...new Set([...predefinedExpense, ...customExpenseCategories])];
    }
  })();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Transaction</DialogTitle>
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
              <Label htmlFor="edit-amount" className="text-foreground">Amount</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                <Input
                  id="edit-amount"
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

            {/* Recurring Toggle */}
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
                  <Label htmlFor="edit-payment-type-toggle" className="text-foreground cursor-pointer">Add Payment Type?</Label>
                </div>
                <Switch
                  id="edit-payment-type-toggle"
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
                      <Label htmlFor="edit-new-card-name" className="text-foreground">New Card Name</Label>
                      <Input
                        id="edit-new-card-name"
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
                      <Label htmlFor="edit-payment-description" className="text-foreground">Payment Note (Optional)</Label>
                      <Input
                        id="edit-payment-description"
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

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                type="submit"
                className="flex-1"
                variant={type === 'income' ? 'income' : 'expense'}
                size="lg"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
