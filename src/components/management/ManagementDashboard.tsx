import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, Users, Clock, Settings, Activity } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import { UserManagement } from './UserManagement';
import { ActivityLog } from './ActivityLog';

interface EmployeeStats {
  userId: string;
  email: string;
  fullName: string;
  totalHours: number;
}

export function ManagementDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<EmployeeStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: format(date, 'LLLL yyyy', { locale: pl }),
    };
  });

  useEffect(() => {
    fetchStats();
  }, [selectedMonth]);

  const fetchStats = async () => {
    setIsLoading(true);
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (profilesError) throw profilesError;

      // Fetch all time entries for the month
      const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select('user_id, hours')
        .gte('work_date', format(startDate, 'yyyy-MM-dd'))
        .lte('work_date', format(endDate, 'yyyy-MM-dd'));

      if (entriesError) throw entriesError;

      // Aggregate hours by user
      const hoursMap = new Map<string, number>();
      entries?.forEach(entry => {
        const current = hoursMap.get(entry.user_id) || 0;
        hoursMap.set(entry.user_id, current + Number(entry.hours));
      });

      // Combine profiles with hours
      const employeeStats: EmployeeStats[] = (profiles || []).map(profile => ({
        userId: profile.id,
        email: profile.email,
        fullName: profile.full_name || 'Brak nazwy',
        totalHours: hoursMap.get(profile.id) || 0,
      }));

      // Sort by hours descending
      employeeStats.sort((a, b) => b.totalHours - a.totalHours);
      setStats(employeeStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać statystyk',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Pracownik', 'Email', 'Godziny'],
      ...stats.map(employee => [
        employee.fullName,
        employee.email,
        employee.totalHours.toString(),
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zestawienie_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalAllHours = stats.reduce((sum, emp) => sum + emp.totalHours, 0);
  const employeesWithHours = stats.filter(emp => emp.totalHours > 0).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel zarządu</h1>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Statystyki
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Użytkownicy
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Dziennik
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Wszyscy pracownicy</p>
                    <p className="text-2xl font-bold">{stats.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aktywni w miesiącu</p>
                    <p className="text-2xl font-bold">{employeesWithHours}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Suma godzin</p>
                    <p className="text-2xl font-bold">{totalAllHours.toFixed(1)}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Zestawienie pracowników</CardTitle>
              <div className="flex gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={exportToCSV} disabled={stats.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : stats.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Brak pracowników w systemie
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pracownik</TableHead>
                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                        <TableHead className="text-right">Godziny</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.map(employee => (
                        <TableRow key={employee.userId}>
                          <TableCell className="font-medium">{employee.fullName}</TableCell>
                          <TableCell className="hidden sm:table-cell">{employee.email}</TableCell>
                          <TableCell className="text-right">{employee.totalHours.toFixed(1)}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
