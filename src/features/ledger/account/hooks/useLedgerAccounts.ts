import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listLedgerAccounts,
  createLedgerAccount,
  deleteLedgerAccount,
} from "../../shared";

export function useLedgerAccounts() {
  return useQuery({
    queryKey: ["ledgerAccounts"],
    queryFn: listLedgerAccounts,
  });
}

export function useCreateLedgerAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      nickname,
      password,
    }: {
      nickname: string;
      password?: string;
    }) => createLedgerAccount(nickname, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledgerAccounts"] });
    },
  });
}

export function useDeleteLedgerAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => deleteLedgerAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledgerAccounts"] });
    },
  });
}



