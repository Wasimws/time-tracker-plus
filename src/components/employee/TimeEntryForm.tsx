import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';

interface TimeEntryFormProps {
  onEntryAdded: () => void;
  editEntry?: {
    id: string;
    work_date: string;
    hours: number;
    note: string | null;
  } | null;
  onCancelEdit?: () => void;
}

export function TimeEntryForm({ onEntryAdded, editEntry, onCancelEdit }: TimeEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState(editEntry?.work_date || new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState(editEntry?.hours?.toString() || '');
  const [note, setNote] = useState(editEntry?.note || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      toast({
        title: 'Błąd',
        description: 'Liczba godzin musi być między 0 a 24',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (editEntry) {
        const { error } = await supabase
          .from('time_entries')
          .update({
            work_date: date,
            hours: hoursNum,
            note: note || null,
          })
          .eq('id', editEntry.id);

        if (error) throw error;

        toast({
          title: 'Sukces',
          description: 'Wpis został zaktualizowany',
        });
      } else {
        const { error } = await supabase
          .from('time_entries')
          .insert({
            user_id: user.id,
            work_date: date,
            hours: hoursNum,
            note: note || null,
          });

        if (error) throw error;

        toast({
          title: 'Sukces',
          description: 'Wpis został dodany',
        });
      }

      setDate(new Date().toISOString().split('T')[0]);
      setHours('');
      setNote('');
      onEntryAdded();
      onCancelEdit?.();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać wpisu',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {editEntry ? 'Edytuj wpis' : 'Dodaj nowy wpis'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Liczba godzin</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                placeholder="8"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Notatka (opcjonalnie)</Label>
            <Textarea
              id="note"
              placeholder="Opis wykonanej pracy..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {editEntry ? 'Zapisz zmiany' : 'Dodaj wpis'}
            </Button>
            {editEntry && onCancelEdit && (
              <Button type="button" variant="outline" onClick={onCancelEdit}>
                Anuluj
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
