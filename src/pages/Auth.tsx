import { useState, useEffect, useRef, forwardRef } from 'react';
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
import { Clock, Loader2, Building2, CheckCircle2, AlertCircle, Eye, EyeOff, Home, ArrowLeft, UserPlus, Plus } from 'lucide-react';
import { APP_NAME, APP_DESCRIPTION, TRIAL_DURATION_DAYS } from '@/lib/constants';
import { validatePassword, getPasswordStrength } from '@/lib/password-validation';

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

type OrgSelectionMode = 'choice' | 'join' | 'create';

const Auth = forwardRef<HTMLDivElement>(function Auth(_props, ref) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [signupData, setSignupData] = useState({ email: '', password: '', fullName: '' });
  const [orgCode, setOrgCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgCheckResult, setOrgCheckResult] = useState<OrgCheckResult | null>(null);
  const [isCheckingOrg, setIsCheckingOrg] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [orgSelectionMode, setOrgSelectionMode] = useState<OrgSelectionMode>('choice');
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const navigate = useNavigate();
  const { signIn, user, organization, refreshUserData, loading: authLoading } = useAuth();
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  // User logged in AND has organization -> go to dashboard
  useEffect(() => {
    if (user && organization) {
      navigate('/dashboard');
    }
  }, [user, organization, navigate]);

  // User logged in, email verified, but no organization -> show org selection
  const isEmailVerified = user?.email_confirmed_at != null;
  const showOrgSelectionScreen = user && isEmailVerified && !organization && !authLoading;

  // Debounced organization check for CREATE mode only
  useEffect(() => {
    if (orgSelectionMode !== 'create' || orgCode.length < 3) {
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
  }, [orgCode, orgSelectionMode]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Nieprawidłowy email lub hasło');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Email nie został potwierdzony. Sprawdź swoją skrzynkę email i kliknij link aktywacyjny.');
      } else {
        setError(error.message);
      }
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/account`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccessMessage('Link do resetowania hasła został wysłany na podany adres email.');
        setForgotPasswordEmail('');
      }
    } catch (err) {
      setError('Wystąpił błąd podczas wysyłania emaila');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (password: string) => {
    const result = validatePassword(password);
    setPasswordErrors(result.errors);
    return result.valid;
  };

  // Simple registration: only email + password + fullName
  // NO organization assignment, NO company creation
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!gdprConsent) {
      setError('Musisz zaakceptować Politykę Prywatności, aby kontynuować');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const passwordRaw = formData.get('password');
    const fullNameRaw = formData.get('fullName');

    const password = typeof passwordRaw === 'string' ? passwordRaw : '';
    const fullName = typeof fullNameRaw === 'string' ? fullNameRaw.trim() : '';

    let email = '';
    if (inviteInfo?.valid && inviteInfo.invitation?.email) {
      email = inviteInfo.invitation.email;
    } else {
      const emailRaw = formData.get('email');
      email = typeof emailRaw === 'string' ? emailRaw.trim() : '';
    }

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

    setIsLoading(true);

    try {
      // Store invite token in metadata if present
      const metadata: Record<string, string> = { full_name: fullName };
      if (inviteToken) {
        metadata.pending_invite_token = inviteToken;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth${inviteToken ? `?invite=${inviteToken}` : ''}`,
          data: metadata,
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

      // If auto-confirm is disabled (production), show verification message
      if (!authData.session) {
        setSuccessMessage('Konto zostało utworzone! Sprawdź swoją skrzynkę email i kliknij link aktywacyjny, aby dokończyć rejestrację.');
        setIsLoading(false);
        return;
      }

      // Auto-confirmed (dev mode): user is logged in, will see org selection screen
      // The useEffect will detect user without org and show the selection screen
      await refreshUserData();
      setIsLoading(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas rejestracji';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Handle organization assignment for verified users
  const handleJoinWithInvitation = async () => {
    if (!inviteToken || !user) {
      setError('Brak tokenu zaproszenia. Użyj linku z emaila zaproszenia.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Sesja wygasła. Zaloguj się ponownie.');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('register-with-org', {
        body: {
          action: 'assign_org',
          inviteToken,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await refreshUserData();
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas dołączania do firmy';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle creating new organization
  const handleCreateOrganization = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const trimmedName = orgName.trim();
    const trimmedCode = orgCode.trim();

    // Frontend validation
    if (!trimmedName) {
      setError('Nazwa firmy jest wymagana');
      return;
    }

    if (trimmedCode.length < 3) {
      setError('Kod firmy musi mieć co najmniej 3 znaki');
      return;
    }

    if (isCheckingOrg) {
      setError('Poczekaj na sprawdzenie kodu firmy');
      return;
    }

    if (orgCheckResult?.exists) {
      setError('Firma o tym kodzie już istnieje. Użyj innego kodu.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Sesja wygasła. Zaloguj się ponownie.');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('register-with-org', {
        body: {
          action: 'assign_org',
          organizationCode: trimmedCode.toLowerCase(),
          organizationName: trimmedName,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await refreshUserData();
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił błąd podczas tworzenia firmy';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setError(null);
    setOrgSelectionMode('choice');
    setOrgCode('');
    setOrgName('');
    setOrgCheckResult(null);
  };

  // Loading state during initial auth check
  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Sprawdzanie sesji...</p>
      </div>
    );
  }

  // User logged in but email not verified
  if (user && !isEmailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">{APP_NAME}</span>
            </div>
            <CardTitle>Potwierdź swój email</CardTitle>
            <CardDescription>
              Wysłaliśmy link aktywacyjny na adres <strong>{user.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-primary/10 border-primary/20">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                Kliknij link w wiadomości email, aby aktywować konto i kontynuować rejestrację.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              Nie otrzymałeś emaila? Sprawdź folder spam lub{' '}
              <Button 
                variant="link" 
                className="p-0 h-auto" 
                onClick={async () => {
                  const { error } = await supabase.auth.resend({ type: 'signup', email: user.email! });
                  if (error) {
                    setError('Nie udało się wysłać ponownie emaila');
                  } else {
                    setSuccessMessage('Email aktywacyjny został wysłany ponownie');
                  }
                }}
              >
                wyślij ponownie
              </Button>
            </p>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert className="bg-primary/10 border-primary/20">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="ghost" onClick={handleLogout}>
              Wyloguj się
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // User verified but no organization - MANDATORY org selection screen
  if (showOrgSelectionScreen) {
    const hasInvitation = inviteToken && inviteInfo?.valid;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">{APP_NAME}</span>
            </div>
            <CardTitle>
              {orgSelectionMode === 'choice' && 'Wybierz firmę'}
              {orgSelectionMode === 'join' && 'Dołącz do firmy'}
              {orgSelectionMode === 'create' && 'Utwórz nową firmę'}
            </CardTitle>
            <CardDescription>
              {orgSelectionMode === 'choice' && 'Aby korzystać z aplikacji, musisz należeć do firmy'}
              {orgSelectionMode === 'join' && 'Użyj linku zaproszenia otrzymanego emailem'}
              {orgSelectionMode === 'create' && 'Stwórz własną organizację i zaproś pracowników'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Choice screen */}
            {orgSelectionMode === 'choice' && (
              <div className="space-y-4">
                {hasInvitation && inviteInfo?.invitation && (
                  <div className="p-4 rounded-lg border bg-primary/5 border-primary/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="font-medium">Masz zaproszenie</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Zostałeś zaproszony do firmy <strong>{inviteInfo.invitation.organization.name}</strong> jako{' '}
                      <strong>{inviteInfo.invitation.role === 'management' ? 'Zarząd' : 'Pracownik'}</strong>
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={handleJoinWithInvitation}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Dołączanie...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Dołącz do {inviteInfo.invitation.organization.name}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full h-auto py-4 flex flex-col items-start gap-1"
                  onClick={() => setOrgSelectionMode('join')}
                >
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    <span className="font-medium">Dołącz do istniejącej firmy</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-normal">
                    Musisz otrzymać zaproszenie email od administratora
                  </span>
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full h-auto py-4 flex flex-col items-start gap-1"
                  onClick={() => setOrgSelectionMode('create')}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">Utwórz nową firmę</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-normal">
                    Otrzymasz rolę Zarządu + {TRIAL_DURATION_DAYS} dni triala
                  </span>
                </Button>
              </div>
            )}

            {/* Join screen - explain invitation process */}
            {orgSelectionMode === 'join' && (
              <div className="space-y-4">
                <Alert>
                  <Building2 className="h-4 w-4" />
                  <AlertDescription>
                    Aby dołączyć do istniejącej firmy, poproś jej administratora o wysłanie Ci zaproszenia email. 
                    Po otrzymaniu zaproszenia kliknij link w wiadomości.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setOrgSelectionMode('choice');
                    setError(null);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wróć
                </Button>
              </div>
            )}

            {/* Create organization screen */}
            {orgSelectionMode === 'create' && (
              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">
                    Nazwa firmy <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="org-name"
                    type="text"
                    placeholder="np. Moja Firma Sp. z o.o."
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  {orgName.trim() === '' && orgName.length > 0 && (
                    <p className="text-xs text-destructive">Nazwa firmy nie może być pusta</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-code">
                    Kod firmy <span className="text-destructive">*</span>
                  </Label>
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
                      minLength={3}
                    />
                    {isCheckingOrg && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min. 3 znaki, tylko małe litery, cyfry i myślniki
                  </p>
                </div>

                {orgCheckResult && (
                  <div className={`p-3 rounded-lg border ${orgCheckResult.exists ? 'bg-destructive/10 border-destructive/20' : 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'}`}>
                    {orgCheckResult.exists ? (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                        <div>
                          <p className="font-medium text-destructive">Kod jest już zajęty</p>
                          <p className="text-sm text-destructive/80">
                            Wybierz inny kod dla swojej firmy
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-900 dark:text-green-100">Kod dostępny</p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Możesz utworzyć firmę z tym kodem
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={
                    isLoading || 
                    isCheckingOrg || 
                    orgCode.length < 3 || 
                    orgName.trim() === '' || 
                    orgCheckResult?.exists === true
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Tworzenie firmy...
                    </>
                  ) : (
                    'Utwórz firmę'
                  )}
                </Button>

                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setOrgSelectionMode('choice');
                    setOrgCode('');
                    setOrgName('');
                    setOrgCheckResult(null);
                    setError(null);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Wróć
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="ghost" onClick={handleLogout}>
              Wyloguj się
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // User with organization - redirect will happen via useEffect
  if (user && organization) {
    return null;
  }

  const passwordStrength = signupData.password ? getPasswordStrength(signupData.password) : null;

  // Main login/register screen
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-accent/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary/15 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-accent/20 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-3000" />
        <div 
          className="absolute inset-0 opacity-[0.015]" 
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>
      
      <Link to="/" className="absolute top-4 left-4 z-10">
        <Button variant="outline" className="gap-2">
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Strona główna</span>
        </Button>
      </Link>

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

          {successMessage && (
            <Alert className="mb-4 bg-primary/10 border-primary/20">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>{successMessage}</AlertDescription>
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
                setError(null);
                setSuccessMessage(null);
              }}>Rejestracja</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              {showForgotPassword ? (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold">Zapomniałeś hasła?</h3>
                    <p className="text-sm text-muted-foreground">
                      Podaj swój adres email, a wyślemy Ci link do resetowania hasła.
                    </p>
                  </div>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="twoj@email.com"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Wysyłanie...
                        </>
                      ) : (
                        'Wyślij link resetujący'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setError(null);
                        setSuccessMessage(null);
                      }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Wróć do logowania
                    </Button>
                  </form>
                </div>
              ) : (
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
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 text-sm"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setError(null);
                        setSuccessMessage(null);
                      }}
                    >
                      Zapomniałem hasła
                    </Button>
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
              )}
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
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
                    </label>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || passwordErrors.length > 0 || !gdprConsent}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rejestracja...
                    </>
                  ) : (
                    'Zarejestruj się'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
});

export default Auth;
