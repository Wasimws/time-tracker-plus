import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2, Building2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { APP_NAME, APP_DESCRIPTION, TRIAL_DURATION_DAYS } from '@/lib/constants';
import { validatePassword, getPasswordStrength } from '@/lib/password-validation';

type SignupStep = 'credentials' | 'organization';

interface OrgCheckResult {
  exists: boolean;
  organization?: {
    id: string;
    name: string;
    code: string;
  };
}

interface InviteInfo {
  valid: boolean;
  invitation?: {
    email: string;
    role: string;
    organization: {
      id: string;
      name: string;
      code: string;
    };
  };
  error?: string;
}

// Timeout for loading states (10 seconds)
const LOADING_TIMEOUT_MS = 10000;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupStep, setSignupStep] = useState<SignupStep>('credentials');
  const [signupData, setSignupData] = useState({ email: '', password: '', fullName: '' });
  const [orgCode, setOrgCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgCheckResult, setOrgCheckResult] = useState<OrgCheckResult | null>(null);
  const [isCheckingOrg, setIsCheckingOrg] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const navigate = useNavigate();
  const { signIn, user, organization, refreshUserData } = useAuth();
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Set loading with timeout protection
  const setLoadingWithTimeout = (loading: boolean) => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    setIsLoading(loading);
    
    if (loading) {
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setError('Przekroczono czas oczekiwania. Spróbuj ponownie.');
      }, LOADING_TIMEOUT_MS);
    }
  };

  // Check invitation token on load
  useEffect(() => {
    if (inviteToken) {
      checkInvitation(inviteToken);
    }
  }, [inviteToken]);

  const checkInvitation = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('register-with-org', {
        body: { action: 'check_invite', inviteToken: token },
      });

      if (!error && data) {
        setInviteInfo(data);
        if (data.valid && data.invitation) {
          setSignupData(prev => ({ ...prev, email: data.invitation.email }));
        }
      }
    } catch (err) {
      console.error('Error checking invitation:', err);
    }
  };

  // Redirect when user is logged in AND has organization
  useEffect(() => {
    if (user && organization) {
      navigate('/dashboard');
    }
  }, [user, organization, navigate]);

  // Debounced organization check
  useEffect(() => {
    if (inviteToken || orgCode.length < 3) {
      setOrgCheckResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingOrg(true);
      try {
        const { data, error } = await supabase.functions.invoke('register-with-org', {
          body: { action: 'check_org', organizationCode: orgCode },
        });

        if (!error && data) {
          setOrgCheckResult(data);
        }
      } catch (err) {
        console.error('Error checking org:', err);
      } finally {
        setIsCheckingOrg(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [orgCode, inviteToken]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingWithTimeout(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Nieprawidłowy email lub hasło');
      } else {
        setError(error.message);
      }
      setLoadingWithTimeout(false);
    }
    // Navigation will happen via useEffect when user state updates
  };

  const handlePasswordChange = (password: string) => {
    const result = validatePassword(password);
    setPasswordErrors(result.errors);
    return result.valid;
  };

  const handleSignUpStep1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!gdprConsent) {
      setError('Musisz zaakceptować Politykę Prywatności, aby kontynuować');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const passwordRaw = formData.get('password');
    const fullNameRaw = formData.get('fullName');

    // Defensive reading - handle null/undefined values
    const password = typeof passwordRaw === 'string' ? passwordRaw : '';
    const fullName = typeof fullNameRaw === 'string' ? fullNameRaw.trim() : '';

    // For email: if we have a valid invitation, use the email from invitation (since field is disabled/readonly)
    // Otherwise, get it from the form
    let email = '';
    if (inviteInfo?.valid && inviteInfo.invitation?.email) {
      // Email comes from invitation - field is disabled so FormData may not include it
      email = inviteInfo.invitation.email;
    } else {
      const emailRaw = formData.get('email');
      email = typeof emailRaw === 'string' ? emailRaw.trim() : '';
    }

    // Validate required fields
    if (!fullName) {
      setError('Imię i nazwisko jest wymagane');
      return;
    }

    if (!email) {
      setError('Email jest wymagany');
      return;
    }

    if (!password) {
      setError('Hasło jest wymagane');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    setSignupData({ email, password, fullName });
    
    // If we have a valid invitation, skip organization step
    if (inviteInfo?.valid) {
      handleInviteSignup(email, password, fullName);
    } else {
      setSignupStep('organization');
    }
  };

  const handleInviteSignup = async (email: string, password: string, fullName: string) => {
    setLoadingWithTimeout(true);
    setError(null);

    try {
      console.log('[AUTH] Starting invite signup for:', email);
      
      // First, register the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          },
        },
      });

      console.log('[AUTH] SignUp result:', { hasSession: !!authData.session, error: authError?.message });

      if (authError) {
        if (authError.message.includes('already')) {
          setError('Ten email jest już zarejestrowany. Spróbuj się zalogować.');
        } else {
          setError(authError.message);
        }
        setLoadingWithTimeout(false);
        return;
      }

      if (!authData.session) {
        setError('Rejestracja wymaga potwierdzenia email. Sprawdź swoją skrzynkę.');
        setLoadingWithTimeout(false);
        return;
      }

      console.log('[AUTH] Session obtained, assigning to organization with invite token:', inviteToken);

      // Now assign the user to organization using the invitation
      // IMPORTANT: Pass the access token explicitly since the global client might not have the session yet
      const { data, error } = await supabase.functions.invoke('register-with-org', {
        body: {
          action: 'assign_org',
          inviteToken,
        },
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
        },
      });

      console.log('[AUTH] register-with-org result:', { data, error: error?.message });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await refreshUserData();
    } catch (err: unknown) {
      console.error('[AUTH] Invite signup error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas rejestracji';
      setError(errorMessage);
      setLoadingWithTimeout(false);
    }
  };

  const handleSignUpStep2 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent double-click
    if (isLoading) return;
    
    // Block if org exists (must use invitation)
    if (orgCheckResult?.exists) {
      setError('Aby dołączyć do istniejącej firmy, musisz otrzymać zaproszenie email od jej administratora');
      return;
    }

    // Block if still checking org
    if (isCheckingOrg) {
      setError('Poczekaj na sprawdzenie kodu firmy');
      return;
    }

    if (orgCode.length < 3) {
      setError('Kod firmy musi mieć co najmniej 3 znaki');
      return;
    }

    setLoadingWithTimeout(true);
    setError(null);

    try {
      console.log('[AUTH] Starting signup step 2 for:', signupData.email);
      
      // First, register the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: signupData.fullName,
          },
        },
      });

      console.log('[AUTH] SignUp result:', { hasSession: !!authData.session, error: authError?.message });

      if (authError) {
        if (authError.message.includes('already')) {
          setError('Ten email jest już zarejestrowany. Spróbuj się zalogować.');
        } else {
          setError(authError.message);
        }
        setLoadingWithTimeout(false);
        return;
      }

      if (!authData.session) {
        setError('Rejestracja wymaga potwierdzenia email. Sprawdź swoją skrzynkę.');
        setLoadingWithTimeout(false);
        return;
      }

      console.log('[AUTH] Session obtained, assigning to organization:', orgCode);

      // Now assign the user to an organization using the edge function
      // IMPORTANT: Pass the access token explicitly since the global client might not have the session yet
      const { data, error } = await supabase.functions.invoke('register-with-org', {
        body: {
          action: 'assign_org',
          organizationCode: orgCode,
          organizationName: orgName || orgCode,
        },
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
        },
      });

      console.log('[AUTH] register-with-org result:', { data, error: error?.message });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Refresh user data to get organization info
      await refreshUserData();

      // Navigation will happen via useEffect
    } catch (err: unknown) {
      console.error('[AUTH] Signup step 2 error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas rejestracji';
      setError(errorMessage);
      setLoadingWithTimeout(false);
    }
  };

  const handleBackToCredentials = () => {
    setSignupStep('credentials');
    setOrgCode('');
    setOrgName('');
    setOrgCheckResult(null);
    setError(null);
  };

  // Show loading while checking auth state
  if (user && !organization) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Ładowanie danych organizacji...</p>
      </div>
    );
  }

  if (user && organization) {
    return null;
  }

  const passwordStrength = signupData.password ? getPasswordStrength(signupData.password) : null;

  // Determine if Continue button should be disabled
  const isStep2ButtonDisabled = 
    isLoading || 
    isCheckingOrg || 
    orgCode.length < 3 || 
    orgCheckResult?.exists === true;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
        
        {/* Animated blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-accent/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary/15 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-accent/20 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-3000" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015]" 
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>
      
      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">{APP_NAME}</span>
          </div>
          <CardTitle>Witaj w {APP_NAME}</CardTitle>
          <CardDescription>{APP_DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {inviteInfo?.valid && inviteInfo.invitation && (
            <Alert className="mb-4 bg-primary/10 border-primary/20">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                Zostałeś zaproszony do firmy <strong>{inviteInfo.invitation.organization.name}</strong> jako{' '}
                <strong>{inviteInfo.invitation.role === 'management' ? 'Zarząd' : 'Pracownik'}</strong>.
              </AlertDescription>
            </Alert>
          )}

          {inviteInfo && !inviteInfo.valid && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{inviteInfo.error}</AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue={inviteInfo?.valid ? 'signup' : 'signin'} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Logowanie</TabsTrigger>
              <TabsTrigger value="signup" onClick={() => {
                setSignupStep('credentials');
                setError(null);
              }}>Rejestracja</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="twoj@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Hasło</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Twoje hasło"
                      required
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logowanie...
                    </>
                  ) : (
                    'Zaloguj się'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              {signupStep === 'credentials' ? (
                <form onSubmit={handleSignUpStep1} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Imię i nazwisko</Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="Jan Kowalski"
                      required
                      disabled={isLoading}
                      defaultValue={signupData.fullName}
                    />
                    <p className="text-xs text-muted-foreground">
                      Będzie widoczne dla współpracowników
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="jan.kowalski@example.com"
                      required
                      disabled={isLoading || (inviteInfo?.valid ?? false)}
                      defaultValue={signupData.email}
                    />
                    <p className="text-xs text-muted-foreground">
                      Używany do logowania i powiadomień
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Hasło</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 8 znaków, wielka litera, cyfra, znak specjalny"
                        required
                        disabled={isLoading}
                        onChange={(e) => {
                          setSignupData(prev => ({ ...prev, password: e.target.value }));
                          handlePasswordChange(e.target.value);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {passwordErrors.length > 0 && (
                      <ul className="text-xs text-destructive space-y-1">
                        {passwordErrors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    )}
                    {passwordStrength && passwordErrors.length === 0 && (
                      <p className="text-xs text-primary">✓ Hasło spełnia wymagania</p>
                    )}
                  </div>
                  
                  {/* GDPR Consent Checkbox */}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="gdpr-consent"
                      checked={gdprConsent}
                      onCheckedChange={(checked) => setGdprConsent(checked === true)}
                      disabled={isLoading}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="gdpr-consent"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Akceptuję{' '}
                        <Link to="/privacy-policy" className="text-primary hover:underline" target="_blank">
                          Politykę Prywatności
                        </Link>
                        {' '}i{' '}
                        <Link to="/cookie-policy" className="text-primary hover:underline" target="_blank">
                          Politykę Cookies
                        </Link>
                        {' '}*
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Wyrażam zgodę na przetwarzanie moich danych osobowych zgodnie z RODO
                      </p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading || passwordErrors.length > 0 || !gdprConsent}>
                    {inviteInfo?.valid ? 'Utwórz konto i dołącz' : 'Dalej - Wybór firmy'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignUpStep2} className="space-y-4">
                  <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">{signupData.fullName}</p>
                      <p className="text-muted-foreground">{signupData.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="org-code">Kod firmy</Label>
                    <div className="relative">
                      <Input
                        id="org-code"
                        type="text"
                        placeholder="np. moja-firma"
                        value={orgCode}
                        onChange={(e) => setOrgCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        required
                        disabled={isLoading}
                        className="pr-10"
                      />
                      {isCheckingOrg && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Unikalny identyfikator Twojej firmy (tylko małe litery, cyfry i myślniki)
                    </p>
                  </div>

                  {orgCheckResult && (
                    <div className={`p-3 rounded-lg border ${orgCheckResult.exists ? 'bg-destructive/10 border-destructive/20' : 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'}`}>
                      {orgCheckResult.exists ? (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                          <div>
                            <p className="font-medium text-destructive">
                              Firma już istnieje
                            </p>
                            <p className="text-sm text-destructive/80">
                              Aby dołączyć do istniejącej firmy, musisz otrzymać zaproszenie email od jej administratora
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-green-900 dark:text-green-100">
                              Utworzysz nową firmę
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Otrzymasz rolę Zarządu + {TRIAL_DURATION_DAYS} dni triala
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {orgCheckResult && !orgCheckResult.exists && (
                    <div className="space-y-2">
                      <Label htmlFor="org-name">Nazwa firmy</Label>
                      <Input
                        id="org-name"
                        type="text"
                        placeholder="np. Moja Firma Sp. z o.o."
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Wyświetlana nazwa firmy (opcjonalnie)
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToCredentials}
                      disabled={isLoading}
                    >
                      Wstecz
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1" 
                      disabled={isStep2ButtonDisabled}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Rejestracja...
                        </>
                      ) : isCheckingOrg ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sprawdzanie...
                        </>
                      ) : (
                        'Utwórz firmę i zarejestruj'
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground flex-col gap-3">
          <p>{TRIAL_DURATION_DAYS} dni bezpłatnego okresu próbnego</p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <Link to="/privacy-policy" className="hover:text-primary hover:underline">
              Polityka Prywatności
            </Link>
            <span>•</span>
            <Link to="/cookie-policy" className="hover:text-primary hover:underline">
              Polityka Cookies
            </Link>
          </div>
          <Badge variant="secondary">Multi-tenant SaaS</Badge>
        </CardFooter>
      </Card>
    </div>
  );
}
