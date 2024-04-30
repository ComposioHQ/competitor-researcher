"use client";

import { createContext, useState } from "react";

export const GlobalContext = createContext<any>(null);

export default function ContextProvider({ children }: { children: any }) {
  const [authenticated, setAuthenticated] = useState<boolean>();

  return (
    <GlobalContext.Provider
      value={{
        authenticated,
        setAuthenticated,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}
