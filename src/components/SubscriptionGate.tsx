import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionGateProps {
  children: ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { hasActiveSubscription } = useAuth();
  const { toast } = useToast();

  const handleMockPayment = () => {
    toast({
      title: 'Mock płatności',
      description: 'System płatności zostanie zintegrowany w przyszłości. Na razie nowi użytkownicy mają 14 dni okresu próbnego.',
    });
  };

  if (!hasActiveSubscription) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Brak aktywnej subskrypcji</CardTitle>
            <CardDescription>
              Twój okres próbny wygasł lub subskrypcja jest nieaktywna.
              Odnów subskrypcję, aby kontynuować korzystanie z aplikacji.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleMockPayment} className="w-full">
              <CreditCard className="mr-2 h-4 w-4" />
              Odnów subskrypcję
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Cena: 29,99 PLN / miesiąc
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
