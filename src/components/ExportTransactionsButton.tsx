import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { buildTransactionsCsv, downloadCsv } from '@/lib/exportTransactions';
import { useToast } from '@/hooks/use-toast';

export const ExportTransactionsButton = () => {
  const { transactions } = useTransactions();
  const { creditCards } = useCreditCards();
  const { toast } = useToast();

  const handleExport = () => {
    if (transactions.length === 0) {
      toast({ title: 'No transactions to export' });
      return;
    }
    const csv = buildTransactionsCsv(transactions, creditCards);
    const filename = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    downloadCsv(filename, csv);
    toast({ title: 'Export ready', description: `Downloaded ${filename}` });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
  );
};
