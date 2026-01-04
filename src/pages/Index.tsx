import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { EmployeeDashboard } from '@/components/employee/EmployeeDashboard';
import { ManagementDashboard } from '@/components/management/ManagementDashboard';
import { ViewModeProvider, useViewModeSafe } from '@/hooks/useViewMode';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MAX_LOADING_TIME = 15000; // 15 seconds max loading

function DashboardContent() {
  const { role } = useAuth();
  const viewMode = useViewModeSafe();

  // For employees (no ViewModeProvider) or management in employee mode, show employee dashboard
  const isEmployeeViewMode = viewMode?.isEmployeeViewMode ?? false;
  const showEmployeeDashboard = role === 'employee' || (role === 'management' && isEmployeeViewMode);

  return showEmployeeDashboard ? <EmployeeDashboard /> : <ManagementDashboard />;
}

export default function Index() {
  const { user, loading, role, refreshUserData, organization } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timeout protection for loading state
  useEffect(() => {
    if (loading && !loadingTimedOut) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('[INDEX] Loading timeout reached, forcing refresh...');
        setLoadingTimedOut(true);
        refreshUserData().catch(console.error);
      }, MAX_LOADING_TIME);
    } else if (!loading && loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading, loadingTimedOut, refreshUserData]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Redirect to auth if user has no organization (incomplete registration)
  useEffect(() => {
    if (!loading && user && !organization) {
      console.log('[INDEX] User has no organization, redirecting to auth...');
      navigate('/auth');
    }
  }, [user, loading, organization, navigate]);

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {loadingTimedOut && (
          <p className="text-sm text-muted-foreground">Ładowanie trwa dłużej niż zwykle...</p>
        )}
      </div>
    );
  }

  if (!user || !organization) {
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
