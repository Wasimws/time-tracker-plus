import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { supabase } from '@/integrations/supabase/client';
import {
  TRIAL_MAX_EMPLOYEES,
  TRIAL_MAX_TIME_ENTRIES,
  TRIAL_MAX_INVITATIONS,
} from '@/lib/constants';

export interface TrialLimitsState {
  // Current counts
  employeeCount: number;
  timeEntryCount: number;
  invitationCount: number;
  
  // Limits
  maxEmployees: number;
  maxTimeEntries: number;
  maxInvitations: number;
  
  // Remaining
  remainingEmployees: number;
  remainingTimeEntries: number;
  remainingInvitations: number;
  
  // Can add more?
  canAddEmployee: boolean;
  canAddTimeEntry: boolean;
  canSendInvitation: boolean;
  
  // Are limits applied? (only during trial)
  limitsApply: boolean;
  
  // Loading
  isLoading: boolean;
  
  // Refresh function
  refresh: () => Promise<void>;
}

/**
 * Hook for checking and enforcing trial limits.
 * Limits only apply during trial period, not with active Stripe subscription.
 */
export function useTrialLimits(): TrialLimitsState {
  const { organization } = useAuth();
  const guard = useSubscriptionGuard();
  
  const [employeeCount, setEmployeeCount] = useState(0);
  const [timeEntryCount, setTimeEntryCount] = useState(0);
  const [invitationCount, setInvitationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCounts = async () => {
    if (!organization?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch counts in parallel
      const [employeesRes, entriesRes, invitationsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id),
        supabase
          .from('time_entries')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id),
        supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .in('status', ['pending', 'accepted']),
      ]);

      setEmployeeCount(employeesRes.count || 0);
      setTimeEntryCount(entriesRes.count || 0);
      setInvitationCount(invitationsRes.count || 0);
    } catch (error) {
      console.error('Error fetching trial limits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [organization?.id]);

  // Limits only apply during trial (not with active Stripe subscription)
  const limitsApply = guard.isTrialActive && !guard.hasActiveStripeSubscription;

  // Calculate remaining
  const remainingEmployees = limitsApply ? Math.max(0, TRIAL_MAX_EMPLOYEES - employeeCount) : Infinity;
  const remainingTimeEntries = limitsApply ? Math.max(0, TRIAL_MAX_TIME_ENTRIES - timeEntryCount) : Infinity;
  const remainingInvitations = limitsApply ? Math.max(0, TRIAL_MAX_INVITATIONS - invitationCount) : Infinity;

  // Can add more?
  const canAddEmployee = !limitsApply || employeeCount < TRIAL_MAX_EMPLOYEES;
  const canAddTimeEntry = !limitsApply || timeEntryCount < TRIAL_MAX_TIME_ENTRIES;
  const canSendInvitation = !limitsApply || invitationCount < TRIAL_MAX_INVITATIONS;

  return {
    employeeCount,
    timeEntryCount,
    invitationCount,
    maxEmployees: TRIAL_MAX_EMPLOYEES,
    maxTimeEntries: TRIAL_MAX_TIME_ENTRIES,
    maxInvitations: TRIAL_MAX_INVITATIONS,
    remainingEmployees: limitsApply ? remainingEmployees : Infinity,
    remainingTimeEntries: limitsApply ? remainingTimeEntries : Infinity,
    remainingInvitations: limitsApply ? remainingInvitations : Infinity,
    canAddEmployee,
    canAddTimeEntry,
    canSendInvitation,
    limitsApply,
    isLoading,
    refresh: fetchCounts,
  };
}
