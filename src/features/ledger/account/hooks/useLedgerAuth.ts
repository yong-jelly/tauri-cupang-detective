import { useState, useCallback } from "react";
import { verifyLedgerPassword, checkPasswordExpiry, updateLedgerPassword } from "../../shared";

export function useLedgerAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<Record<string, boolean>>({});

  const checkExpiry = useCallback(async () => {
    await checkPasswordExpiry();
  }, []);

  const verifyPassword = useCallback(
    async (accountId: string, password: string): Promise<boolean> => {
      const isValid = await verifyLedgerPassword(accountId, password);
      if (isValid) {
        setIsAuthenticated((prev) => ({ ...prev, [accountId]: true }));
      }
      return isValid;
    },
    []
  );

  const updatePassword = useCallback(
    async (accountId: string, password: string): Promise<void> => {
      await updateLedgerPassword(accountId, password);
    },
    []
  );

  const setAuthenticated = useCallback((accountId: string, value: boolean) => {
    setIsAuthenticated((prev) => ({ ...prev, [accountId]: value }));
  }, []);

  const isAccountAuthenticated = useCallback(
    (accountId: string) => {
      return isAuthenticated[accountId] ?? false;
    },
    [isAuthenticated]
  );

  return {
    verifyPassword,
    updatePassword,
    setAuthenticated,
    isAccountAuthenticated,
    checkExpiry,
  };
}

