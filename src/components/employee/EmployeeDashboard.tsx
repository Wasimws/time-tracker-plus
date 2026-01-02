import { useState } from 'react';
import { TimeEntryForm } from './TimeEntryForm';
import { TimeEntriesList } from './TimeEntriesList';
import { EarningsCalculator } from './EarningsCalculator';

interface TimeEntry {
  id: string;
  work_date: string;
  hours: number;
  note: string | null;
}

export function EmployeeDashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const handleEntryAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel pracownika</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <TimeEntryForm
            onEntryAdded={handleEntryAdded}
            editEntry={editingEntry}
            onCancelEdit={() => setEditingEntry(null)}
          />
          <EarningsCalculator />
        </div>
        
        <TimeEntriesList
          refreshTrigger={refreshTrigger}
          onEdit={setEditingEntry}
        />
      </div>
    </div>
  );
}
