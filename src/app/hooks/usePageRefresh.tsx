
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface RefreshContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const PageRefreshProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    // In a real app with server data, this would trigger a re-fetch.
    // For localStorage, we can use it to re-render components.
    setRefreshKey(prevKey => prevKey + 1);
  }, []);

  return (
    <RefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
};

export const usePageRefresh = (): RefreshContextType => {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('usePageRefresh must be used within a PageRefreshProvider');
  }
  return context;
};
