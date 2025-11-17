import React, { createContext, useContext, useState, useCallback } from "react";

interface ShareContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const ShareContext = createContext<ShareContextType | undefined>(undefined);

export function ShareProvider({ children }: { children: React.ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <ShareContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </ShareContext.Provider>
  );
}

export function useShare() {
  const context = useContext(ShareContext);
  if (!context) {
    throw new Error("useShare must be used within ShareProvider");
  }
  return context;
}
