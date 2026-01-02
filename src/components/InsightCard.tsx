import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface InsightCardProps {
  message: string;
  className?: string;
  action?: ReactNode;
}

export function InsightCard({ message, className, action }: InsightCardProps) {
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
      <div className="flex-1">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}
