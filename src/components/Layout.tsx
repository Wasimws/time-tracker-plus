import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Clock, LogOut, User, Shield, Building2, Settings, Users, ArrowLeftRight } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useViewModeSafe } from '@/hooks/useViewMode';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

function ViewModeToggleButton() {
  const viewMode = useViewModeSafe();
  
  // ViewModeProvider not available (employee user or outside provider)
  if (!viewMode) {
    return null;
  }

  const { isEmployeeViewMode, toggleViewMode } = viewMode;
  
  return (
    <Button
      onClick={toggleViewMode}
      variant={isEmployeeViewMode ? "default" : "outline"}
      size="sm"
      className={cn(
        "gap-2 transition-all duration-300",
        isEmployeeViewMode && "bg-primary text-primary-foreground shadow-lg"
      )}
    >
      <ArrowLeftRight className="w-4 h-4" />
      {isEmployeeViewMode ? (
        <>
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Tryb Zarządu</span>
        </>
      ) : (
        <>
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Tryb Użytkownika</span>
        </>
      )}
    </Button>
  );
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
              <span className="text-xl font-bold text-primary">{APP_NAME}</span>
            </div>
            {organization && (
              <Badge variant="outline" className="hidden sm:flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {organization.name}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {role === 'management' && <ViewModeToggleButton />}
            
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
            
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline truncate max-w-[120px]">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/account')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Zarządzanie kontem
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Wyloguj
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
