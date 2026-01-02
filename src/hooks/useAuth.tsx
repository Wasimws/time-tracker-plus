import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'employee' | 'management';
type ThemePreference = 'light' | 'dark' | 'system';
type SubscriptionStatus = 'active' | 'inactive' | 'trial';

interface Organization {
  id: string;
  name: string;
  code: string;
}

interface SubscriptionInfo {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  organization: Organization | null;
  subscription: SubscriptionInfo | null;
  hasActiveSubscription: boolean;
  themePreference: ThemePreference;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setThemePreference: (theme: ThemePreference) => Promise<void>;
  logActivity: (actionType: string, description: string, metadata?: Record<string, unknown>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  const logActivityInternal = useCallback(async (userId: string, actionType: string, description: string, metadata?: Record<string, unknown>) => {
    try {
      await supabase.rpc('log_activity', {
        _action_type: actionType,
        _description: description,
        _metadata: metadata || {},
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile with organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, theme_preference')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.theme_preference) {
        setThemePreferenceState(profile.theme_preference as ThemePreference);
      }

      // Fetch organization
      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('id, name, code')
          .eq('id', profile.organization_id)
          .maybeSingle();

        if (org) {
          setOrganization(org);
        }

        // Fetch subscription status - ORGANIZATION LEVEL
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('status, trial_ends_at')
          .eq('organization_id', profile.organization_id)
          .maybeSingle();

        if (subData) {
          const trialEndsAt = subData.trial_ends_at ? new Date(subData.trial_ends_at) : null;
          const isActive = subData.status === 'active' || 
            (subData.status === 'trial' && trialEndsAt !== null && trialEndsAt > new Date());
          
          setSubscription({
            status: subData.status as SubscriptionStatus,
            trialEndsAt,
            isActive,
          });
        } else {
          // No subscription found for organization
          setSubscription({
            status: 'inactive',
            trialEndsAt: null,
            isActive: false,
          });
        }
      } else {
        // User has no organization assigned yet
        setOrganization(null);
        setSubscription(null);
      }

      // Fetch user role (with organization context)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role as AppRole);
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (user) {
      setLoading(true);
      await fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  useEffect(() => {
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
            if (event === 'SIGNED_IN') {
              logActivityInternal(session.user.id, 'user_login', 'Użytkownik zalogował się');
            }
          }, 0);
        } else {
          setRole(null);
          setOrganization(null);
          setSubscription(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => authSubscription.unsubscribe();
  }, [fetchUserData, logActivityInternal]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
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

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      role,
      organization,
      subscription,
      hasActiveSubscription,
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
