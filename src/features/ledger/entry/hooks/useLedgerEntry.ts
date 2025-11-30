import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLedgerEntry,
  createLedgerEntry,
  updateLedgerEntry,
  type LedgerEntry,
  type LedgerEntryInput,
} from "../../shared";

export function useLedgerEntry(entryId?: string) {
  return useQuery({
    queryKey: ["ledgerEntry", entryId],
    queryFn: () => getLedgerEntry(entryId!),
    enabled: !!entryId,
  });
}

export function useCreateLedgerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      entry,
    }: {
      accountId: string;
      entry: LedgerEntryInput;
    }) => createLedgerEntry(accountId, entry),
    onSuccess: (_, variables) => {
      const yearMonth = variables.entry.date.substring(0, 7);
      queryClient.invalidateQueries({
        queryKey: ["ledgerEntries", variables.accountId, yearMonth],
      });
    },
  });
}

export function useUpdateLedgerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      entry,
    }: {
      entryId: string;
      entry: LedgerEntryInput;
    }) => updateLedgerEntry(entryId, entry),
    onSuccess: (_, variables) => {
      const yearMonth = variables.entry.date.substring(0, 7);
      queryClient.invalidateQueries({
        queryKey: ["ledgerEntries"],
      });
      queryClient.invalidateQueries({
        queryKey: ["ledgerEntry", variables.entryId],
      });
    },
  });
}

