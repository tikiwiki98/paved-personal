import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  message: string;
  className?: string;
}

export function InsightCard({ message, className }: InsightCardProps) {
  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 animate-fade-in",
        className
      )}
    >
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Lightbulb className="w-3.5 h-3.5 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {message}
      </p>
    </div>
  );
}
