import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listLedgerEntries, deleteLedgerEntry } from "../../shared";

export function useLedgerEntries(accountId: string, yearMonth: string) {
  return useQuery({
    queryKey: ["ledgerEntries", accountId, yearMonth],
    queryFn: () => listLedgerEntries(accountId, yearMonth),
    enabled: !!accountId && !!yearMonth,
  });
}

export function useDeleteLedgerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => deleteLedgerEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledgerEntries"] });
    },
  });
}



