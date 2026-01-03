import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { useTrialLimits } from '@/hooks/useTrialLimits';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, UserPlus, Loader2, X, RefreshCw, Clock, CheckCircle, XCircle, Lock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Invitation {
  id: string;
  email: string;
  role: 'employee' | 'management';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export function InvitationManagement() {
  const { session, organization } = useAuth();
  const guard = useSubscriptionGuard();
  const limits = useTrialLimits();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'employee' | 'management'>('employee');

  const fetchInvitations = async () => {
    if (!organization) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Update expired status locally
      const now = new Date();
      const updatedInvitations = (data || []).map(inv => ({
        ...inv,
        status: inv.status === 'pending' && new Date(inv.expires_at) < now ? 'expired' : inv.status,
      })) as Invitation[];

      setInvitations(updatedInvitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać zaproszeń',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [organization]);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double-click
    if (isSending) return;
    
    // Double-check permission before sending
    if (!guard.canInvite) {
      toast({
        title: 'Brak uprawnień',
        description: 'Trial zakończony lub brak subskrypcji. Aktywuj subskrypcję, aby zapraszać użytkowników.',
        variant: 'destructive',
      });
      return;
    }

    // Check trial limits
    if (!limits.canSendInvitation) {
      toast({
        title: 'Limit osiągnięty',
        description: `Osiągnięto limit ${limits.maxInvitations} zaproszeń w trialu. Aktywuj subskrypcję, aby zapraszać więcej.`,
        variant: 'destructive',
      });
      return;
    }
    
    if (!session || !email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Błąd',
        description: 'Wprowadź poprawny adres email',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { email: email.trim().toLowerCase(), role },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Zaproszenie wysłane',
        description: `Zaproszenie zostało wysłane do ${email}`,
      });

      setEmail('');
      setRole('employee');
      fetchInvitations();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się wysłać zaproszenia',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Zaproszenie anulowane',
        description: 'Zaproszenie zostało anulowane',
      });

      fetchInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się anulować zaproszenia',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Oczekuje</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Zaakceptowane</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-muted text-muted-foreground"><Clock className="h-3 w-3 mr-1" />Wygasło</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Anulowane</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const invitationLimitReached = limits.limitsApply && !limits.canSendInvitation;

  return (
    <div className="space-y-6">
      <Card className={!guard.canInvite || invitationLimitReached ? 'opacity-75' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {guard.canInvite && !invitationLimitReached ? (
              <UserPlus className="h-5 w-5" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
            Zaproś pracownika
            {limits.limitsApply && (
              <Badge variant="outline" className="ml-2">
                {limits.invitationCount}/{limits.maxInvitations} w trialu
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {!guard.canInvite 
              ? 'Zapraszanie zablokowane – aktywuj subskrypcję'
              : invitationLimitReached
              ? 'Osiągnięto limit zaproszeń w trialu'
              : 'Wyślij zaproszenie email do nowego członka zespołu'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!guard.canInvite ? (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                {guard.isTrialExpired 
                  ? 'Trial zakończony – aktywuj subskrypcję, aby zapraszać nowych użytkowników'
                  : 'Brak aktywnej subskrypcji – funkcja zapraszania jest zablokowana'
                }
              </AlertDescription>
            </Alert>
          ) : invitationLimitReached ? (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-600">
                Osiągnięto limit {limits.maxInvitations} zaproszeń w trialu. Aktywuj subskrypcję, aby zapraszać więcej użytkowników.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSendInvitation} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email">Email pracownika</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="jan.kowalski@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSending}
                />
                <p className="text-xs text-muted-foreground">
                  Link z zaproszeniem zostanie wysłany na ten adres
                </p>
              </div>
              <div className="w-full sm:w-48 space-y-2">
                <Label htmlFor="invite-role">Rola</Label>
                <Select value={role} onValueChange={(v) => setRole(v as 'employee' | 'management')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Pracownik</SelectItem>
                    <SelectItem value="management">Zarząd</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Uprawnienia użytkownika
                </p>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={isSending || !email}>
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {isSending ? 'Wysyłanie...' : 'Wyślij'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historia zaproszeń</CardTitle>
              <CardDescription>
                Lista wszystkich zaproszeń wysłanych z Twojej organizacji
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchInvitations} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nie wysłano jeszcze żadnych zaproszeń</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Rola</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Wygasa</TableHead>
                    <TableHead>Data wysłania</TableHead>
                    <TableHead className="w-[100px]">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>
                        <Badge variant={invitation.role === 'management' ? 'default' : 'secondary'}>
                          {invitation.role === 'management' ? 'Zarząd' : 'Pracownik'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(invitation.expires_at), 'd MMM yyyy', { locale: pl })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(invitation.created_at), 'd MMM yyyy HH:mm', { locale: pl })}
                      </TableCell>
                      <TableCell>
                        {invitation.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvitation(invitation.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
