import React, { createContext, useContext, useEffect, useState } from 'react';

import { fetchModuleStatus } from '../api/modules';

interface ModuleStatusContextValue {
  isModuleEnabled: (key: string) => boolean;
}

const ModuleStatusContext = createContext<ModuleStatusContextValue>({ isModuleEnabled: () => true });

export function ModuleStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchModuleStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  const isModuleEnabled = (key: string) => status[key] ?? true;

  return <ModuleStatusContext.Provider value={{ isModuleEnabled }}>{children}</ModuleStatusContext.Provider>;
}

export function useModuleStatus() {
  return useContext(ModuleStatusContext);
}
