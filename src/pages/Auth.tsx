import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

type SignupStep = 'credentials' | 'organization';

interface OrgCheckResult {
  exists: boolean;
  organization?: {
    id: string;
    name: string;
    code: string;
  };
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
  const navigate = useNavigate();
  const { signIn, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Debounced organization check
  useEffect(() => {
    if (orgCode.length < 3) {
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
  }, [orgCode]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      navigate('/');
    }
  };

  const handleSignUpStep1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    setSignupData({ email, password, fullName });
    setSignupStep('organization');
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
      const { data, error } = await supabase.functions.invoke('register-with-org', {
        body: {
          action: 'register',
          email: signupData.email,
          password: signupData.password,
          fullName: signupData.fullName,
          organizationCode: orgCode,
          organizationName: orgName || orgCode,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Sign in the user
      const { error: signInError } = await signIn(signupData.email, signupData.password);
      
      if (signInError) {
        setError('Rejestracja udana, ale logowanie nie powiodło się. Spróbuj zalogować się ręcznie.');
      } else {
        navigate('/');
      }
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

  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">WorkTime</span>
          </div>
          <CardTitle>Witaj w WorkTime</CardTitle>
          <CardDescription>
            System śledzenia czasu pracy dla firm
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="signin" className="w-full">
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
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    required
                    disabled={isLoading}
                  />
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
                      disabled={isLoading}
                      defaultValue={signupData.email}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Hasło</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="Min. 6 znaków"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Dalej - Wybór firmy
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
                              Otrzymasz rolę Zarządu
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
          <p>14 dni bezpłatnego okresu próbnego</p>
          <Badge variant="secondary">Multi-tenant SaaS</Badge>
        </CardFooter>
      </Card>
    </div>
  );
}
