import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type SubscriptionAccess = 'full' | 'view_only' | 'blocked';

export interface SubscriptionGuardState {
  /** Current access level */
  access: SubscriptionAccess;
  /** Whether the user can perform write operations (add/edit/delete) */
  canWrite: boolean;
  /** Whether the user can invite new members */
  canInvite: boolean;
  /** Whether trial is currently active */
  isTrialActive: boolean;
  /** Whether trial has expired */
  isTrialExpired: boolean;
  /** Whether there's an active Stripe subscription */
  hasActiveStripeSubscription: boolean;
  /** Days remaining in trial (0 if expired) */
  trialDaysRemaining: number;
  /** Trial end date */
  trialEndDate: Date | null;
  /** Human-readable status message */
  statusMessage: string;
  /** Whether organization is assigned */
  hasOrganization: boolean;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Central hook for checking subscription status and access permissions.
 * Uses dynamic calculation based on dates, not just DB status records.
 */
export function useSubscriptionGuard(): SubscriptionGuardState {
  const { organization, subscription, loading, hasStripeSubscription } = useAuth();

  return useMemo(() => {
    // Still loading
    if (loading) {
      return {
        access: 'blocked' as SubscriptionAccess,
        canWrite: false,
        canInvite: false,
        isTrialActive: false,
        isTrialExpired: false,
        hasActiveStripeSubscription: false,
        trialDaysRemaining: 0,
        trialEndDate: null,
        statusMessage: 'Ładowanie...',
        hasOrganization: false,
        isLoading: true,
      };
    }

    // No organization assigned
    if (!organization) {
      return {
        access: 'blocked' as SubscriptionAccess,
        canWrite: false,
        canInvite: false,
        isTrialActive: false,
        isTrialExpired: false,
        hasActiveStripeSubscription: false,
        trialDaysRemaining: 0,
        trialEndDate: null,
        statusMessage: 'Brak przypisanej firmy',
        hasOrganization: false,
        isLoading: false,
      };
    }

    const now = new Date();
    const trialEndDate = organization.trialEndAt;
    
    // Calculate trial status dynamically from dates
    const isTrialActive = trialEndDate !== null && trialEndDate > now;
    const isTrialExpired = trialEndDate !== null && trialEndDate <= now;
    
    // Calculate days remaining
    let trialDaysRemaining = 0;
    if (isTrialActive && trialEndDate) {
      const diffMs = trialEndDate.getTime() - now.getTime();
      trialDaysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    // Check for active Stripe subscription
    const hasActiveStripe = hasStripeSubscription || subscription?.hasStripeSubscription === true;

    // Determine access level
    let access: SubscriptionAccess = 'blocked';
    let statusMessage = '';

    if (hasActiveStripe) {
      // Active Stripe subscription = full access
      access = 'full';
      statusMessage = 'Subskrypcja aktywna';
    } else if (isTrialActive) {
      // Trial active = full access
      access = 'full';
      statusMessage = `Trial aktywny (${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'dzień' : trialDaysRemaining < 5 ? 'dni' : 'dni'} pozostało)`;
    } else if (isTrialExpired) {
      // Trial expired, no subscription = view only
      access = 'view_only';
      statusMessage = 'Trial zakończony – aktywuj subskrypcję';
    } else {
      // No trial, no subscription = blocked
      access = 'blocked';
      statusMessage = 'Brak aktywnej subskrypcji';
    }

    return {
      access,
      canWrite: access === 'full',
      canInvite: access === 'full',
      isTrialActive,
      isTrialExpired,
      hasActiveStripeSubscription: hasActiveStripe,
      trialDaysRemaining,
      trialEndDate,
      statusMessage,
      hasOrganization: true,
      isLoading: false,
    };
  }, [organization, subscription, loading, hasStripeSubscription]);
}
