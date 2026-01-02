import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const navigate = useNavigate();
  const { signIn, user, organization, refreshUserData } = useAuth();

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
      navigate('/');
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
    setIsLoading(true);
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
      setIsLoading(false);
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

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

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
    setIsLoading(true);
    setError(null);

    try {
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

      if (authError) {
        if (authError.message.includes('already')) {
          setError('Ten email jest już zarejestrowany. Spróbuj się zalogować.');
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.session) {
        setError('Rejestracja wymaga potwierdzenia email. Sprawdź swoją skrzynkę.');
        setIsLoading(false);
        return;
      }

      // Now assign the user to organization using the invitation
      const { data, error } = await supabase.functions.invoke('register-with-org', {
        body: {
          action: 'assign_org',
          inviteToken,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await refreshUserData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas rejestracji';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpStep2 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (orgCode.length < 3) {
      setError('Kod firmy musi mieć co najmniej 3 znaki');
      setIsLoading(false);
      return;
    }

    try {
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

      if (authError) {
        if (authError.message.includes('already')) {
          setError('Ten email jest już zarejestrowany. Spróbuj się zalogować.');
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.session) {
        setError('Rejestracja wymaga potwierdzenia email. Sprawdź swoją skrzynkę.');
        setIsLoading(false);
        return;
      }

      // Now assign the user to an organization using the edge function
      const { data, error } = await supabase.functions.invoke('register-with-org', {
        body: {
          action: 'assign_org',
          organizationCode: orgCode,
          organizationName: orgName || orgCode,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Refresh user data to get organization info
      await refreshUserData();

      // Navigation will happen via useEffect
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas rejestracji';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && organization) {
    return null;
  }

  const passwordStrength = signupData.password ? getPasswordStrength(signupData.password) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
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
                    placeholder="jan@firma.pl"
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="jan@firma.pl"
                      required
                      disabled={isLoading || (inviteInfo?.valid ?? false)}
                      defaultValue={signupData.email}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Hasło</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 8 znaków, duże i małe litery, cyfra, znak specjalny"
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
                  <Button type="submit" className="w-full" disabled={isLoading || passwordErrors.length > 0}>
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
                        placeholder="np. mojafirma"
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
                      Tylko małe litery, cyfry i myślniki
                    </p>
                  </div>

                  {orgCheckResult && (
                    <div className={`p-3 rounded-lg border ${orgCheckResult.exists ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' : 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'}`}>
                      {orgCheckResult.exists ? (
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-900 dark:text-blue-100">
                              Dołączysz do firmy: {orgCheckResult.organization?.name}
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              Otrzymasz rolę Pracownika
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
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
                        placeholder="Nazwa Twojej Firmy Sp. z o.o."
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        disabled={isLoading}
                      />
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
                      disabled={isLoading || orgCode.length < 3}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Rejestracja...
                        </>
                      ) : (
                        orgCheckResult?.exists ? 'Dołącz do firmy' : 'Utwórz firmę i zarejestruj'
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground flex-col gap-2">
          <p>{TRIAL_DURATION_DAYS} dni bezpłatnego okresu próbnego</p>
          <Badge variant="secondary">Multi-tenant SaaS</Badge>
        </CardFooter>
      </Card>
    </div>
  );
}
