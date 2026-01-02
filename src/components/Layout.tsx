import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Clock, LogOut, User, Shield, Building2 } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, role, organization, hasActiveSubscription, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-primary">WorkTime</span>
            </div>
            {organization && (
              <Badge variant="outline" className="hidden sm:flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {organization.name}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2">
              {role === 'management' ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Zarząd
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Pracownik
                </Badge>
              )}
              
              {hasActiveSubscription ? (
                <Badge className="bg-primary">Aktywna</Badge>
              ) : (
                <Badge variant="destructive">Nieaktywna</Badge>
              )}
            </div>
            
            <span className="text-sm text-muted-foreground hidden md:block">
              {user?.email}
            </span>
            
            <ThemeToggle />
            
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Wyloguj</span>
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
