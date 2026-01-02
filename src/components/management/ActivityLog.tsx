import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Activity, User, Clock, Shield, FileText, LogIn, LogOut, UserPlus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ActivityLogEntry {
  id: string;
  user_id: string | null;
  action_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
}

const actionTypeIcons: Record<string, typeof Activity> = {
  user_registered: UserPlus,
  user_login: LogIn,
  user_logout: LogOut,
  time_entry_created: Clock,
  time_entry_updated: Edit,
  time_entry_deleted: Trash2,
  role_changed: Shield,
  subscription_changed: FileText,
};

const actionTypeLabels: Record<string, string> = {
  user_registered: 'Rejestracja',
  user_login: 'Logowanie',
  user_logout: 'Wylogowanie',
  time_entry_created: 'Nowy wpis',
  time_entry_updated: 'Edycja wpisu',
  time_entry_deleted: 'Usunięcie wpisu',
  role_changed: 'Zmiana roli',
  subscription_changed: 'Zmiana subskrypcji',
};

export function ActivityLog() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          id,
          user_id,
          action_type,
          description,
          metadata,
          created_at,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs((data as unknown as ActivityLogEntry[]) || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać dziennika aktywności',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getActionBadgeVariant = (actionType: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (actionType.includes('deleted')) return 'destructive';
    if (actionType.includes('created') || actionType.includes('registered')) return 'default';
    if (actionType.includes('login') || actionType.includes('logout')) return 'secondary';
    return 'outline';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Dziennik aktywności
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            Brak wpisów w dzienniku aktywności
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Data</TableHead>
                  <TableHead className="w-[120px]">Typ</TableHead>
                  <TableHead>Użytkownik</TableHead>
                  <TableHead className="hidden md:table-cell">Opis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => {
                  const IconComponent = actionTypeIcons[log.action_type] || Activity;
                  const userName = log.profiles?.full_name || log.profiles?.email || 'System';

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'd MMM yyyy, HH:mm', { locale: pl })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action_type)} className="flex items-center gap-1 w-fit">
                          <IconComponent className="h-3 w-3" />
                          <span className="hidden sm:inline">
                            {actionTypeLabels[log.action_type] || log.action_type}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{userName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {log.description}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
