import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, PieChart, Target } from 'lucide-react';

export default function Landing() {
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem('paved_visited');
    if (visited) {
      setIsReturning(true);
    }
    localStorage.setItem('paved_visited', '1');
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Paved</span>
        </div>
        <Link to="/auth?mode=login">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-2xl mx-auto gap-8 py-16">
        <div className="space-y-4 animate-fade-in">
          {isReturning && (
            <p className="text-sm text-accent font-medium">Welcome back 👋</p>
          )}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Your finances,<br />
            <span className="text-primary">clearly paved.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            A simple, focused spending tracker that helps you understand where your money goes.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid gap-4 sm:grid-cols-3 w-full max-w-lg animate-slide-up">
          <BenefitItem icon={TrendingUp} text="Track every dollar in and out" />
          <BenefitItem icon={Target} text="Set budgets and stay on track" />
          <BenefitItem icon={PieChart} text="See trends at a glance" />
        </div>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3 animate-slide-up">
          <Link to="/auth?mode=signup">
            <Button size="lg" className="shadow-glow text-base px-8">
              Get started — it's free
            </Button>
          </Link>
          {isReturning ? (
            <Link to="/auth?mode=login">
              <Button variant="outline" size="lg" className="text-base px-8">
                Sign in to your account
              </Button>
            </Link>
          ) : (
            <Link to="/auth?mode=login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Already have an account? Sign in
            </Link>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Paved
      </footer>
    </div>
  );
}

function BenefitItem({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50">
      <Icon className="w-5 h-5 text-primary" />
      <span className="text-sm text-foreground">{text}</span>
    </div>
  );
}
