import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { EmployeeDashboard } from '@/components/employee/EmployeeDashboard';
import { ManagementDashboard } from '@/components/management/ManagementDashboard';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Index() {
  const { user, loading, role, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Handle payment callback
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast({
        title: 'Płatność zakończona',
        description: 'Dziękujemy za zakup subskrypcji! Status zostanie zaktualizowany w ciągu kilku sekund.',
      });
      // Refresh user data to get updated subscription status
      setTimeout(() => {
        refreshUserData();
      }, 2000);
      // Clear the URL params
      setSearchParams({});
    } else if (payment === 'canceled') {
      toast({
        title: 'Płatność anulowana',
        description: 'Płatność została anulowana. Możesz spróbować ponownie.',
        variant: 'destructive',
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, refreshUserData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <SubscriptionGate>
        {role === 'management' ? <ManagementDashboard /> : <EmployeeDashboard />}
      </SubscriptionGate>
    </Layout>
  );
}
