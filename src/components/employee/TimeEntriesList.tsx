import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Download, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';

interface TimeEntry {
  id: string;
  work_date: string;
  hours: number;
  note: string | null;
}

interface TimeEntriesListProps {
  refreshTrigger: number;
  onEdit: (entry: TimeEntry) => void;
}

export function TimeEntriesList({ refreshTrigger, onEdit }: TimeEntriesListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
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
    if (user) {
      fetchEntries();
    }
  }, [user, selectedMonth, refreshTrigger]);

  const fetchEntries = async () => {
    if (!user) return;

    setIsLoading(true);
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('work_date', format(startDate, 'yyyy-MM-dd'))
        .lte('work_date', format(endDate, 'yyyy-MM-dd'))
        .order('work_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać wpisów',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Wpis został usunięty',
      });
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć wpisu',
        variant: 'destructive',
      });
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Data', 'Godziny', 'Notatka'],
      ...entries.map(entry => [
        entry.work_date,
        entry.hours.toString(),
        entry.note || '',
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `godziny_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Wpisy czasu pracy</CardTitle>
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
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={entries.length === 0}>
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
        ) : entries.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            Brak wpisów w wybranym miesiącu
          </p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Godziny</TableHead>
                    <TableHead className="hidden sm:table-cell">Notatka</TableHead>
                    <TableHead className="w-[100px]">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.work_date), 'd MMM yyyy', { locale: pl })}
                      </TableCell>
                      <TableCell>{entry.hours}h</TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[200px] truncate">
                        {entry.note || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(entry)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 text-right">
              <span className="text-lg font-semibold">
                Suma: {totalHours.toFixed(1)} godzin
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
