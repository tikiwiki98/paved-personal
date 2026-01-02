import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, ArrowUpRight, ArrowDownRight, Repeat, CalendarIcon, CreditCard } from 'lucide-react';
import { Transaction, Category } from '@/types/budget';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface AddTransactionModalProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  categories: Category[];
  transactions?: Transaction[];
  trigger?: React.ReactNode;
}

const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Other Income'];

export function AddTransactionModal({ onAddTransaction, categories, transactions = [], trigger }: AddTransactionModalProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<string>('monthly');
  const [recurringStartDate, setRecurringStartDate] = useState<Date | undefined>(undefined);
  const [recurringEndDate, setRecurringEndDate] = useState<Date | undefined>(undefined);
  const [showPaymentType, setShowPaymentType] = useState(false);
  const [paymentType, setPaymentType] = useState<string>('');
  const [paymentDescription, setPaymentDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !description) return;

    const transactionData: Omit<Transaction, 'id'> & {
      is_recurring?: boolean;
      recurring_frequency?: string;
      recurring_start_date?: string;
      recurring_end_date?: string | null;
      payment_type?: string | null;
      payment_description?: string | null;
    } = {
      amount: parseFloat(amount),
      type,
      category,
      description,
      date: new Date().toISOString().split('T')[0],
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
    }

    onAddTransaction(transactionData as Omit<Transaction, 'id'>);

    setAmount('');
    setCategory('');
    setDescription('');
    setIsRecurring(false);
    setRecurringFrequency('monthly');
    setRecurringStartDate(undefined);
    setRecurringEndDate(undefined);
    setShowPaymentType(false);
    setPaymentType('');
    setPaymentDescription('');
    setOpen(false);
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
            <Label htmlFor="amount" className="text-foreground">Amount</Label>
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
                className="pl-8 text-lg font-mono bg-secondary border-border"
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
            <Label htmlFor="description" className="text-foreground">Description</Label>
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
                  <Select value={paymentType} onValueChange={setPaymentType}>
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

                {/* Payment Description */}
                <div className="space-y-2">
                  <Label htmlFor="payment-description" className="text-foreground">Payment Note (Optional)</Label>
                  <Input
                    id="payment-description"
                    placeholder="e.g., Chase Sapphire, ending in 4242"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
            )}
          </div>

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
