import React, { createContext, useContext, useState } from 'react';

interface DemoContextType {
  isDemoMode: boolean;
  enterApp: () => void;
  exitToWelcome: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const enterApp = () => setIsDemoMode(true);
  const exitToWelcome = () => setIsDemoMode(false);

  return (
    <DemoContext.Provider value={{ isDemoMode, enterApp, exitToWelcome }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within DemoProvider');
  }
  return context;
}
