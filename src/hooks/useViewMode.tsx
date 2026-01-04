import { createContext, useContext, useState, ReactNode } from 'react';

type ViewMode = 'management' | 'employee';

interface ViewModeContextType {
  viewMode: ViewMode;
  isEmployeeViewMode: boolean;
  toggleViewMode: () => void;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('management');

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'management' ? 'employee' : 'management');
  };

  const isEmployeeViewMode = viewMode === 'employee';

  return (
    <ViewModeContext.Provider value={{ viewMode, isEmployeeViewMode, toggleViewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
