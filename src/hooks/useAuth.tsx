import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ACTIVITY_LOG_COOLDOWN_MS } from '@/lib/constants';

type AppRole = 'employee' | 'management';
type ThemePreference = 'light' | 'dark' | 'system';
type SubscriptionStatus = 'active' | 'inactive' | 'trial';

interface Organization {
  id: string;
  name: string;
  code: string;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
}

interface SubscriptionInfo {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  isActive: boolean;
  hasStripeSubscription: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  organization: Organization | null;
  subscription: SubscriptionInfo | null;
  hasActiveSubscription: boolean;
  hasStripeSubscription: boolean;
  themePreference: ThemePreference;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setThemePreference: (theme: ThemePreference) => Promise<void>;
  logActivity: (actionType: string, description: string, metadata?: Record<string, unknown>) => Promise<void>;
  refreshUserData: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  
  // Track if real user-initiated login happened (vs session rehydration)
  const isRealLoginRef = useRef(false);
  // Cooldown tracking for activity logs to prevent duplicates
  const lastActivityLogRef = useRef<Map<string, number>>(new Map());

  const logActivityInternal = useCallback(async (_userId: string, actionType: string, description: string, metadata?: Record<string, unknown>) => {
    // Check cooldown to prevent duplicate entries
    const key = `${actionType}_${_userId}`;
    const now = Date.now();
    const lastLog = lastActivityLogRef.current.get(key);
    
    if (lastLog && now - lastLog < ACTIVITY_LOG_COOLDOWN_MS) {
      console.log(`[Activity] Skipped duplicate: ${actionType} (cooldown active)`);
      return;
    }
    
    lastActivityLogRef.current.set(key, now);
    
    try {
      await supabase.rpc('log_activity', {
        _action_type: actionType,
        _description: description,
        _metadata: JSON.parse(JSON.stringify(metadata || {})),
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, []);

  const fetchUserData = useCallback(async (userId: string, retryCount = 0): Promise<boolean> => {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 500;

    try {
      console.log(`[AUTH] fetchUserData attempt ${retryCount + 1} for user ${userId}`);
      
      // Fetch profile with organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, theme_preference')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[AUTH] Error fetching profile:', profileError);
        throw profileError;
      }

      if (profile?.theme_preference) {
        setThemePreferenceState(profile.theme_preference as ThemePreference);
      }

      // Fetch organization with trial info
      if (profile?.organization_id) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, code, trial_start_at, trial_end_at')
          .eq('id', profile.organization_id)
          .maybeSingle();

        if (orgError) {
          console.error('[AUTH] Error fetching organization:', orgError);
          throw orgError;
        }

        if (org) {
          const trialStartAt = org.trial_start_at ? new Date(org.trial_start_at) : null;
          const trialEndAt = org.trial_end_at ? new Date(org.trial_end_at) : null;
          
          setOrganization({
            id: org.id,
            name: org.name,
            code: org.code,
            trialStartAt,
            trialEndAt,
          });

          // Check if trial is active (from organizations table)
          const isTrialActive = trialEndAt !== null && trialEndAt > new Date();

          // Fetch subscription status - ORGANIZATION LEVEL
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('status, trial_ends_at, current_period_end')
            .eq('organization_id', profile.organization_id)
            .maybeSingle();

          if (subData) {
            // Subscription active if status is 'active' OR organization trial is still running
            const hasStripe = subData.status === 'active';
            const isActive = hasStripe || isTrialActive;
            
            setSubscription({
              status: isTrialActive && !hasStripe ? 'trial' : subData.status as SubscriptionStatus,
              trialEndsAt: trialEndAt,
              isActive,
              hasStripeSubscription: hasStripe,
            });
          } else {
            // No subscription record - check if trial is active
            setSubscription({
              status: isTrialActive ? 'trial' : 'inactive',
              trialEndsAt: trialEndAt,
              isActive: isTrialActive,
              hasStripeSubscription: false,
            });
          }
        } else {
          setOrganization(null);
          setSubscription(null);
        }
      } else {
        // User has no organization assigned yet - might need retry after registration
        console.log(`[AUTH] User ${userId} has no organization yet`);
        setOrganization(null);
        setSubscription(null);
      }

      // Fetch user role (with organization context)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('[AUTH] Error fetching role:', roleError);
        throw roleError;
      }

      if (roleData) {
        setRole(roleData.role as AppRole);
      } else {
        setRole(null);
      }

      setLoading(false);
      return true;
    } catch (error) {
      console.error('[AUTH] Error fetching user data:', error);
      
      // Retry logic for transient errors
      if (retryCount < MAX_RETRIES) {
        console.log(`[AUTH] Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchUserData(userId, retryCount + 1);
      }
      
      // After all retries failed, still turn off loading
      setLoading(false);
      return false;
    }
  }, []);

  const refreshUserData = useCallback(async (): Promise<boolean> => {
    if (user) {
      setLoading(true);
      return await fetchUserData(user.id, 0);
    }
    return false;
  }, [user, fetchUserData]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(() => {
            if (mounted) {
              fetchUserData(session.user.id);
              // Only log login if it was triggered by real user action (signIn method)
              // NOT on session rehydration (page refresh, token refresh)
              if (event === 'SIGNED_IN' && isRealLoginRef.current) {
                logActivityInternal(session.user.id, 'user_login', 'Użytkownik zalogował się');
                isRealLoginRef.current = false; // Reset flag after logging
              }
            }
          }, 0);
        } else {
          setRole(null);
          setOrganization(null);
          setSubscription(null);
          setLoading(false);
          setInitialLoadComplete(true);
        }
      }
    );

    // Get initial session - this is page load/refresh, NOT a real login
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => {
          if (mounted) setInitialLoadComplete(true);
        });
      } else {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    });

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
    };
  }, [fetchUserData, logActivityInternal]);

  const signIn = async (email: string, password: string) => {
    // Mark that this is a REAL user-initiated login
    isRealLoginRef.current = true;
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // If error, reset the flag
    if (error) {
      isRealLoginRef.current = false;
    }
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (user) {
      await logActivityInternal(user.id, 'user_logout', 'Użytkownik wylogował się');
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setOrganization(null);
    setSubscription(null);
  };

  const setThemePreference = async (theme: ThemePreference) => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ theme_preference: theme })
        .eq('id', user.id);

      setThemePreferenceState(theme);
    } catch (error) {
      console.error('Error updating theme preference:', error);
    }
  };

  const logActivity = async (actionType: string, description: string, metadata?: Record<string, unknown>) => {
    if (!user) return;
    await logActivityInternal(user.id, actionType, description, metadata);
  };

  // Compute hasActiveSubscription from subscription state
  const hasActiveSubscription = subscription?.isActive ?? false;
  const hasStripeSubscription = subscription?.hasStripeSubscription ?? false;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      role,
      organization,
      subscription,
      hasActiveSubscription,
      hasStripeSubscription,
      themePreference,
      signIn,
      signOut,
      setThemePreference,
      logActivity,
      refreshUserData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
