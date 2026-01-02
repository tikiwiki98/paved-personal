import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUpRight, ArrowDownRight, Trash2, Check, ChevronsUpDown, Repeat, CalendarIcon } from 'lucide-react';
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

interface EditTransactionModalProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTransaction: (transaction: Partial<Transaction> & { id: string }) => void;
  onDeleteTransaction: (id: string) => void;
  categories: Category[];
}

const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Other Income'];

export function EditTransactionModal({
  transaction,
  open,
  onOpenChange,
  onUpdateTransaction,
  onDeleteTransaction,
  categories,
}: EditTransactionModalProps) {
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
    }
  }, [transaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !amount || !category || !description) return;

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

  const categoryOptions = type === 'income' 
    ? incomeCategories 
    : categories.map((c) => c.name);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border sm:max-w-md">
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
