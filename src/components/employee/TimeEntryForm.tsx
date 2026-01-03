import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Lock } from 'lucide-react';

interface TimeEntryFormProps {
  onEntryAdded: () => void;
  editEntry?: {
    id: string;
    work_date: string;
    hours: number;
    note: string | null;
  } | null;
  onCancelEdit?: () => void;
  organizationId?: string;
}

export function TimeEntryForm({ onEntryAdded, editEntry, onCancelEdit, organizationId }: TimeEntryFormProps) {
  const { user, logActivity } = useAuth();
  const guard = useSubscriptionGuard();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState(editEntry?.work_date || new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState(editEntry?.hours?.toString() || '');
  const [note, setNote] = useState(editEntry?.note || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Double-check permission before submitting
    if (!guard.canWrite) {
      toast({
        title: 'Brak uprawnień',
        description: 'Trial zakończony lub brak subskrypcji. Aktywuj subskrypcję, aby dodawać wpisy.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!user) return;

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      toast({
        title: 'Błąd',
        description: 'Liczba godzin musi być między 0.5 a 24',
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

        await logActivity('time_entry_updated', `Zaktualizowano wpis: ${date}, ${hoursNum}h`, { entryId: editEntry.id, date, hours: hoursNum });

        toast({
          title: 'Sukces',
          description: 'Wpis został zaktualizowany',
        });
      } else {
        const { data, error } = await supabase
          .from('time_entries')
          .insert({
            user_id: user.id,
            work_date: date,
            hours: hoursNum,
            note: note || null,
            organization_id: organizationId,
          })
          .select()
          .single();

        if (error) throw error;

        await logActivity('time_entry_created', `Dodano wpis: ${date}, ${hoursNum}h`, { entryId: data.id, date, hours: hoursNum });

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
        description: 'Nie udało się zapisać wpisu. Sprawdź status subskrypcji.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show blocked state if no write permission
  if (!guard.canWrite) {
    return (
      <Card className="opacity-75">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Dodawanie zablokowane
          </CardTitle>
          <CardDescription>
            {guard.isTrialExpired 
              ? 'Trial zakończony – aktywuj subskrypcję, aby dodawać godziny pracy'
              : 'Brak aktywnej subskrypcji – skontaktuj się z zarządem firmy'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Funkcja dodawania i edycji wpisów jest zablokowana do czasu aktywacji subskrypcji.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {editEntry ? 'Edytuj wpis' : 'Dodaj nowy wpis'}
        </CardTitle>
        <CardDescription>
          {editEntry ? 'Zmień dane wpisu godzinowego' : 'Wprowadź datę i liczbę przepracowanych godzin'}
        </CardDescription>
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
              <p className="text-xs text-muted-foreground">Wybierz dzień pracy</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Liczba godzin</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                placeholder="np. 8"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Od 0.5 do 24 godzin</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Notatka (opcjonalnie)</Label>
            <Textarea
              id="note"
              placeholder="Opis wykonanej pracy, np. 'Praca nad projektem X'"
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
              <Button type="button" variant="outline" onClick={onCancelEdit} disabled={isLoading}>
                Anuluj
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
