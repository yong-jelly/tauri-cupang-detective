import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { User, UserListResponse } from "@shared/api/types";

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<UserListResponse>("list_users");
      setAccounts(result.users);
    } catch (err) {
      console.error("계정 목록 로드 실패:", err);
      setError("계정 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAccount = useCallback(async (id: string): Promise<boolean> => {
    try {
      await invoke("delete_user", { id });
      await loadAccounts();
      return true;
    } catch (err) {
      console.error("계정 삭제 실패:", err);
      alert("계정 삭제에 실패했습니다.");
      return false;
    }
  }, [loadAccounts]);

  const updateAccount = useCallback(async (id: string, alias: string): Promise<User | null> => {
    try {
      const updatedUser = await invoke<User>("update_user", { id, alias });
      await loadAccounts();
      return updatedUser;
    } catch (err) {
      console.error("계정 수정 실패:", err);
      throw new Error("계정 수정에 실패했습니다.");
    }
  }, [loadAccounts]);

  return {
    accounts,
    loading,
    error,
    loadAccounts,
    deleteAccount,
    updateAccount,
  };
};

