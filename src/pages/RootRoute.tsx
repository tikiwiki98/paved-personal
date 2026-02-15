import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import Index from './Index';
import Landing from './Landing';

export default function RootRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return user ? <Index /> : <Landing />;
}
