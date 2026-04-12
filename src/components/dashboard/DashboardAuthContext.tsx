"use client";

import { createContext, useContext } from "react";

const DashboardAuthContext = createContext<string | null>(null);

export function DashboardAuthProvider({
  clientId,
  children,
}: {
  clientId: string;
  children: React.ReactNode;
}) {
  return (
    <DashboardAuthContext.Provider value={clientId}>
      {children}
    </DashboardAuthContext.Provider>
  );
}

export function useDashboardClientId(): string {
  const v = useContext(DashboardAuthContext);
  if (!v) {
    throw new Error("useDashboardClientId must be used within DashboardAuthProvider");
  }
  return v;
}
