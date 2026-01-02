import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { EmployeeDashboard } from '@/components/employee/EmployeeDashboard';
import { ManagementDashboard } from '@/components/management/ManagementDashboard';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, loading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
