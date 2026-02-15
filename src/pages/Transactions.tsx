import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, ArrowLeft, Search, Repeat, Loader2, ChevronDown, X, CalendarIcon, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Transaction, Category } from '@/types/budget';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useCreditCards } from '@/hooks/useCreditCards';
import { cn } from '@/lib/utils';

const PAYMENT_TYPES = ['Credit Card', 'Cash', 'Venmo', 'Crypto', 'Bank Transfer', 'Other'];

const Transactions = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { transactions, isLoading: transactionsLoading, updateTransaction, deleteTransaction } = useTransactions();
  const { categories, isLoading: categoriesLoading } = useCategories(transactions);
  const { creditCards, isLoading: cardsLoading } = useCreditCards();
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [creditCardFilter, setCreditCardFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Reset credit card filter when payment type changes away from Credit Card
  useEffect(() => {
    if (paymentTypeFilter !== 'Credit Card') {
      setCreditCardFilter('all');
    }
  }, [paymentTypeFilter]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || t.type === typeFilter;
        const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
        const matchesPaymentType = paymentTypeFilter === 'all' || t.payment_type === paymentTypeFilter;
        const matchesCreditCard = creditCardFilter === 'all' || t.credit_card_id === creditCardFilter;
        
        // Date range filtering
        let matchesDateRange = true;
        if (startDate || endDate) {
          const transactionDate = parseISO(t.date);
          if (startDate && endDate) {
            matchesDateRange = isWithinInterval(transactionDate, {
              start: startOfDay(startDate),
              end: endOfDay(endDate),
            });
          } else if (startDate) {
            matchesDateRange = transactionDate >= startOfDay(startDate);
          } else if (endDate) {
            matchesDateRange = transactionDate <= endOfDay(endDate);
          }
        }
        
        return matchesSearch && matchesType && matchesCategory && matchesPaymentType && matchesCreditCard && matchesDateRange;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, typeFilter, categoryFilter, paymentTypeFilter, creditCardFilter, startDate, endDate]);

  const allCategories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category));
    return Array.from(cats);
  }, [transactions]);

  const allPaymentTypes = useMemo(() => {
    const types = new Set(transactions.map((t) => t.payment_type).filter(Boolean));
    // Merge with default payment types
    PAYMENT_TYPES.forEach((type) => types.add(type));
    return Array.from(types) as string[];
  }, [transactions]);

  const hasActiveFilters = paymentTypeFilter !== 'all' || creditCardFilter !== 'all' || startDate || endDate;

  const clearAllFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setPaymentTypeFilter('all');
    setCreditCardFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (authLoading || transactionsLoading || categoriesLoading || cardsLoading) {
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="border-border/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">All Transactions</h1>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="container mx-auto px-4 py-6">
        <Card className="bg-card border-border p-4 mb-6">
          {/* Primary filters - always visible */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-40 bg-secondary border-border">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-secondary border-border">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Collapsible additional filters */}
          <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
            <div className="flex items-center justify-between mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <ChevronDown className={cn("w-4 h-4 mr-2 transition-transform", filtersExpanded && "rotate-180")} />
                  More Filters
                  {hasActiveFilters && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-primary" />
                  )}
                </Button>
              </CollapsibleTrigger>
              {(hasActiveFilters || searchTerm || typeFilter !== 'all' || categoryFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            
            <CollapsibleContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Payment Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Payment Type</label>
                  <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                    <SelectTrigger className="w-full bg-secondary border-border">
                      <SelectValue placeholder="All Payment Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      <SelectItem value="all">All Payment Types</SelectItem>
                      {allPaymentTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Credit Card Filter - only shown when Payment Type is Credit Card */}
                {paymentTypeFilter === 'Credit Card' && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Credit Card</label>
                    <Select value={creditCardFilter} onValueChange={setCreditCardFilter}>
                      <SelectTrigger className="w-full bg-secondary border-border">
                        <SelectValue placeholder="All Cards" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-50">
                        <SelectItem value="all">All Cards</SelectItem>
                        {creditCards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>{card.card_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Start Date Filter */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-secondary border-border",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MMM d, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date Filter */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-secondary border-border",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MMM d, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Transaction List */}
        <Card className="bg-card border-border p-6">
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                {transactions.length === 0 
                  ? "No transactions yet. Add one to get started!" 
                  : "No transactions match your filters."}
              </p>
            ) : (
              filteredTransactions.map((transaction) => {
                const getIcon = () => {
                  switch (transaction.type) {
                    case 'income':
                      return <ArrowUpRight className="w-5 h-5 text-income" />;
                    case 'expense':
                      return <ArrowDownRight className="w-5 h-5 text-expense" />;
                    case 'transfer':
                      return <TrendingUp className="w-5 h-5 text-primary" />;
                  }
                };
                const getBg = () => {
                  switch (transaction.type) {
                    case 'income': return 'bg-income/20';
                    case 'expense': return 'bg-expense/20';
                    case 'transfer': return 'bg-primary/20';
                  }
                };
                const getColor = () => {
                  switch (transaction.type) {
                    case 'income': return 'text-income';
                    case 'expense': return 'text-expense';
                    case 'transfer': return 'text-primary';
                  }
                };
                const getPrefix = () => {
                  switch (transaction.type) {
                    case 'income': return '+';
                    case 'expense': return '-';
                    case 'transfer': return '→';
                  }
                };

                return (
                  <div
                    key={transaction.id}
                    onClick={() => setEditingTransaction(transaction)}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary/80 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${getBg()}`}
                      >
                        {getIcon()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground">{transaction.description}</p>
                          {transaction.is_recurring && (
                            <Repeat className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {transaction.type === 'transfer' && transaction.asset_type 
                            ? `Transfer · ${transaction.asset_type.replace('_', ' ')}`
                            : transaction.category
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${getColor()}`}>
                        {getPrefix()}$
                        {transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(transaction.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <EditTransactionModal
        transaction={editingTransaction}
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        onUpdateTransaction={updateTransaction}
        onDeleteTransaction={deleteTransaction}
        categories={categories}
        transactions={transactions}
      />
    </div>
  );
};

export default Transactions;