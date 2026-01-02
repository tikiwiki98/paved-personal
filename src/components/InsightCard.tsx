import { Lightbulb, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface InsightCardProps {
  message: string;
  className?: string;
  action?: ReactNode;
  variant?: 'default' | 'success';
}

export function InsightCard({ message, className, action, variant = 'default' }: InsightCardProps) {
  const isSuccess = variant === 'success';
  
  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg animate-fade-in",
        isSuccess 
          ? "bg-income/5 border border-income/10" 
          : "bg-primary/5 border border-primary/10",
        className
      )}
    >
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isSuccess ? "bg-income/10" : "bg-primary/10"
      )}>
        {isSuccess ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-income" />
        ) : (
          <Lightbulb className="w-3.5 h-3.5 text-primary" />
        )}
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