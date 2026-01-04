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

/**
 * Hook that throws if used outside ViewModeProvider
 * Use this when ViewModeProvider is guaranteed to be present
 */
export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}

/**
 * Safe hook that returns null if used outside ViewModeProvider
 * Use this in components that may render outside the provider
 */
export function useViewModeSafe(): ViewModeContextType | null {
  const context = useContext(ViewModeContext);
  return context ?? null;
}
