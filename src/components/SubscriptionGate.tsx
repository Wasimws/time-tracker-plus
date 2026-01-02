import { ReactNode, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, Building2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionGateProps {
  children: ReactNode;
  /** If true, shows content but with edit restrictions */
  allowViewOnly?: boolean;
}

export function SubscriptionGate({ children, allowViewOnly = false }: SubscriptionGateProps) {
  const { hasActiveSubscription, subscription, organization, role, session } = useAuth();
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

  // If organization subscription is active, allow full access
  if (hasActiveSubscription) {
    return <>{children}</>;
  }

  // No organization assigned - show different message
  if (!organization) {
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

  // Subscription inactive - show paywall
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle>Brak aktywnej subskrypcji</CardTitle>
          <CardDescription>
            {organization.trialEndAt && new Date(organization.trialEndAt) < new Date() ? (
              <>
                Okres próbny firmy <strong>{organization.name}</strong> wygasł{' '}
                {format(organization.trialEndAt, 'd MMMM yyyy', { locale: pl })}.
              </>
            ) : (
              <>
                Subskrypcja firmy <strong>{organization.name}</strong> jest nieaktywna.
              </>
            )}
            {' '}Odnów subskrypcję, aby kontynuować korzystanie z aplikacji.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline">{organization.name}</Badge>
            <Badge variant="destructive">
              {organization.trialEndAt && new Date(organization.trialEndAt) < new Date() ? 'Trial wygasł' : 'Nieaktywna'}
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
                {isLoading ? 'Przekierowanie...' : 'Odnów subskrypcję'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Cena: 29,99 PLN / miesiąc za firmę
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Skontaktuj się z zarządem firmy w celu odnowienia subskrypcji.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
