import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface SubscriptionGateProps {
  children: ReactNode;
  /** If true, shows content but with edit restrictions */
  allowViewOnly?: boolean;
}

export function SubscriptionGate({ children, allowViewOnly = false }: SubscriptionGateProps) {
  const { hasActiveSubscription, subscription, organization, role } = useAuth();
  const { toast } = useToast();

  const handleMockPayment = () => {
    toast({
      title: 'Mock płatności',
      description: 'System płatności zostanie zintegrowany w przyszłości. Na razie nowe firmy mają 14 dni okresu próbnego.',
    });
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
            {subscription?.status === 'trial' && subscription.trialEndsAt ? (
              <>
                Okres próbny firmy <strong>{organization.name}</strong> wygasł{' '}
                {format(subscription.trialEndsAt, 'd MMMM yyyy', { locale: pl })}.
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
              {subscription?.status === 'trial' ? 'Trial wygasł' : 'Nieaktywna'}
            </Badge>
          </div>
          
          {role === 'management' ? (
            <>
              <Button onClick={handleMockPayment} className="w-full">
                <CreditCard className="mr-2 h-4 w-4" />
                Odnów subskrypcję
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
