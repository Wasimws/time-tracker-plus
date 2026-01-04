import { ReactNode, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, Building2, Loader2, Clock, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { SUBSCRIPTION_PRICE_MONTHLY, SUBSCRIPTION_CURRENCY } from '@/lib/constants';

interface SubscriptionGateProps {
  children: ReactNode;
  /** If true, shows content with view-only restrictions banner */
  allowViewOnly?: boolean;
}

export function SubscriptionGate({ children, allowViewOnly = false }: SubscriptionGateProps) {
  const { role, session, organization } = useAuth();
  const guard = useSubscriptionGuard();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!session) {
      toast({
        title: 'Błąd',
        description: 'Musisz być zalogowany, aby subskrybować.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('Nie otrzymano URL do płatności');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Błąd płatności',
        description: error instanceof Error ? error.message : 'Nie udało się utworzyć sesji płatności',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state with timeout protection
  if (guard.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Sprawdzanie statusu subskrypcji...</p>
        </div>
      </div>
    );
  }

  // No organization assigned
  if (!guard.hasOrganization) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Building2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>Brak przypisanej firmy</CardTitle>
            <CardDescription>
              Twoje konto nie jest jeszcze przypisane do żadnej firmy.
              Skontaktuj się z administratorem lub wyloguj się i zarejestruj ponownie.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Full access - render children directly
  if (guard.access === 'full') {
    return <>{children}</>;
  }

  // View-only mode with banner (trial expired but allowing view)
  if (guard.access === 'view_only' && allowViewOnly) {
    return (
      <>
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
          <Lock className="h-5 w-5 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              Trial zakończony – aktywuj subskrypcję
            </p>
            <p className="text-xs text-muted-foreground">
              Możesz przeglądać dane, ale dodawanie i edycja są zablokowane
            </p>
          </div>
          {role === 'management' && (
            <Button size="sm" onClick={handleSubscribe} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Subskrybuj'}
            </Button>
          )}
        </div>
        {children}
      </>
    );
  }

  // Blocked - show paywall
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle>
            {guard.isTrialExpired ? 'Trial zakończony' : 'Brak aktywnej subskrypcji'}
          </CardTitle>
          <CardDescription>
            {guard.isTrialExpired && guard.trialEndDate ? (
              <>
                Okres próbny firmy <strong>{organization?.name}</strong> wygasł{' '}
                {format(guard.trialEndDate, 'd MMMM yyyy', { locale: pl })}.
              </>
            ) : (
              <>
                Subskrypcja firmy <strong>{organization?.name}</strong> jest nieaktywna.
              </>
            )}
            {' '}Aktywuj subskrypcję, aby kontynuować korzystanie z aplikacji.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline">{organization?.name}</Badge>
            <Badge variant="destructive">
              {guard.isTrialExpired ? 'Trial wygasł' : 'Nieaktywna'}
            </Badge>
          </div>
          
          {role === 'management' ? (
            <>
              <Button onClick={handleSubscribe} className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Przekierowanie...' : 'Aktywuj subskrypcję'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Cena: {SUBSCRIPTION_PRICE_MONTHLY % 1 === 0 ? SUBSCRIPTION_PRICE_MONTHLY : SUBSCRIPTION_PRICE_MONTHLY.toFixed(2).replace('.', ',')} {SUBSCRIPTION_CURRENCY} / miesiąc za firmę
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Skontaktuj się z zarządem firmy w celu aktywacji subskrypcji.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
