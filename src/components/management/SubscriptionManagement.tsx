import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Settings, Loader2, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export function SubscriptionManagement() {
  const { organization, subscription, session, hasActiveSubscription, hasStripeSubscription, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSubscribe = async () => {
    if (!session) return;
    
    setIsCheckoutLoading(true);
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
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się utworzyć sesji płatności',
        variant: 'destructive',
      });
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;

    setIsPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('Nie otrzymano URL do portalu');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się otworzyć portalu zarządzania',
        variant: 'destructive',
      });
    } finally {
      setIsPortalLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!session) return;

    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      await refreshUserData();
      
      toast({
        title: 'Status zaktualizowany',
        description: data?.subscribed ? 'Subskrypcja jest aktywna' : 'Brak aktywnej subskrypcji',
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się odświeżyć statusu',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = () => {
    if (hasActiveSubscription) {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Aktywna
        </Badge>
      );
    }
    
    if (subscription?.status === 'trial') {
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Trial wygasł
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Nieaktywna
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Status subskrypcji
              </CardTitle>
              <CardDescription>
                Zarządzaj subskrypcją organizacji {organization?.name}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Organizacja</p>
              <p className="text-lg font-semibold">{organization?.name || 'Brak'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Kod organizacji</p>
              <p className="text-lg font-mono">{organization?.code || '-'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-lg capitalize">
                {subscription?.status === 'active' ? 'Aktywna' : 
                 subscription?.status === 'trial' ? 'Okres próbny' : 'Nieaktywna'}
              </p>
            </div>
            {subscription?.trialEndsAt && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {subscription.status === 'trial' ? 'Trial wygasa' : 'Trial wygasł'}
                </p>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(subscription.trialEndsAt, 'd MMMM yyyy', { locale: pl })}
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <div className="flex flex-wrap gap-3">
              {hasStripeSubscription ? (
                <Button onClick={handleManageSubscription} disabled={isPortalLoading}>
                  {isPortalLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Settings className="mr-2 h-4 w-4" />
                  )}
                  Zarządzaj subskrypcją
                </Button>
              ) : (
                <Button onClick={handleSubscribe} disabled={isCheckoutLoading}>
                  {isCheckoutLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  Wykup subskrypcję
                </Button>
              )}
              
              <Button variant="outline" onClick={handleRefreshStatus} disabled={isRefreshing}>
                {isRefreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Odśwież status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Hourlyx Pro</CardTitle>
          <CardDescription>
            Pełny dostęp do systemu zarządzania czasem pracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-bold">100</span>
            <span className="text-muted-foreground">PLN / miesiąc</span>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Nielimitowana liczba pracowników
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Rejestracja czasu pracy
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Statystyki i raporty
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Eksport do CSV
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Zarządzanie użytkownikami
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Dziennik aktywności
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
