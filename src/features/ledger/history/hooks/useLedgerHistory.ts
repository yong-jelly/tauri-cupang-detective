import { useQuery } from "@tanstack/react-query";
import { listLedgerHistory } from "../../shared";

export function useLedgerHistory(entryId: string) {
  return useQuery({
    queryKey: ["ledgerHistory", entryId],
    queryFn: () => listLedgerHistory(entryId),
    enabled: !!entryId,
  });
}



