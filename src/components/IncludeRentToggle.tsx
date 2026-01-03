import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { Home } from 'lucide-react';

export function IncludeRentToggle() {
  const { includeRent, setIncludeRent } = useTimeFrame();

  return (
    <div className="flex items-center gap-2">
      <Home className="w-4 h-4 text-muted-foreground" />
      <Switch
        id="include-rent-toggle"
        checked={includeRent}
        onCheckedChange={setIncludeRent}
      />
      <Label 
        htmlFor="include-rent-toggle" 
        className="text-sm text-muted-foreground cursor-pointer"
      >
        Include Rent
      </Label>
    </div>
  );
}