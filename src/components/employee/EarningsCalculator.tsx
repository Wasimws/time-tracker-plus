import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';

export function EarningsCalculator() {
  const { user } = useAuth();
  const [hourlyRate, setHourlyRate] = useState('');
  const [totalHours, setTotalHours] = useState(0);
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
      fetchTotalHours();
    }
  }, [user, selectedMonth]);

  const fetchTotalHours = async () => {
    if (!user) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('hours')
        .eq('user_id', user.id)
        .gte('work_date', format(startDate, 'yyyy-MM-dd'))
        .lte('work_date', format(endDate, 'yyyy-MM-dd'));

      if (error) throw error;

      const total = data?.reduce((sum, entry) => sum + Number(entry.hours), 0) || 0;
      setTotalHours(total);
    } catch (error) {
      console.error('Error fetching hours:', error);
    }
  };

  const rate = parseFloat(hourlyRate) || 0;
  const earnings = totalHours * rate;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Kalkulator zarobków
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="month">Miesiąc</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Stawka godzinowa (PLN)</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              min="0"
              placeholder="np. 50"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Przepracowane godziny</p>
            <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
          </div>
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Szacowane zarobki</p>
            <p className="text-2xl font-bold text-primary">
              {earnings.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
