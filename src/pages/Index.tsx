import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { EmployeeDashboard } from '@/components/employee/EmployeeDashboard';
import { ManagementDashboard } from '@/components/management/ManagementDashboard';
import { ViewModeProvider, useViewMode } from '@/hooks/useViewMode';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function DashboardContent() {
  const { role } = useAuth();
  const { isEmployeeViewMode } = useViewMode();

  // If management user is in employee view mode, show employee dashboard
  const showEmployeeDashboard = role === 'employee' || (role === 'management' && isEmployeeViewMode);

  return showEmployeeDashboard ? <EmployeeDashboard /> : <ManagementDashboard />;
}

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
      setTimeout(() => {
        refreshUserData();
      }, 2000);
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

  // Only wrap with ViewModeProvider for management users
  const content = (
    <Layout>
      <SubscriptionGate allowViewOnly>
        <DashboardContent />
      </SubscriptionGate>
    </Layout>
  );

  return role === 'management' ? (
    <ViewModeProvider>{content}</ViewModeProvider>
  ) : (
    content
  );
}
