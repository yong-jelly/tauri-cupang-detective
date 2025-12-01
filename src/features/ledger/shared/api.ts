import { invoke } from "@tauri-apps/api/core";
import type { LedgerAccount, LedgerEntry, LedgerHistory, LedgerEntryInput } from "./types";

// 가계부 계정 관리
export async function createLedgerAccount(
  nickname: string,
  password?: string
): Promise<LedgerAccount> {
  return invoke("create_ledger_account", { nickname, password });
}

export async function listLedgerAccounts(): Promise<LedgerAccount[]> {
  return invoke("list_ledger_accounts");
}

export async function verifyLedgerPassword(
  accountId: string,
  password: string
): Promise<boolean> {
  return invoke("verify_ledger_password", { accountId, password });
}

export async function updateLedgerPassword(
  accountId: string,
  password: string
): Promise<void> {
  return invoke("update_ledger_password", { accountId, password });
}

export async function checkPasswordExpiry(): Promise<void> {
  return invoke("check_password_expiry");
}

export async function deleteLedgerAccount(accountId: string): Promise<void> {
  return invoke("delete_ledger_account", { accountId });
}

// 가계부 항목 CRUD
export async function createLedgerEntry(
  accountId: string,
  entry: LedgerEntryInput
): Promise<string> {
  return invoke("create_ledger_entry", { accountId, entry });
}

export async function updateLedgerEntry(
  entryId: string,
  entry: LedgerEntryInput
): Promise<void> {
  return invoke("update_ledger_entry", { entryId, entry });
}

export async function deleteLedgerEntry(entryId: string): Promise<void> {
  return invoke("delete_ledger_entry", { entryId });
}

export async function listLedgerEntries(
  accountId: string,
  yearMonth: string
): Promise<LedgerEntry[]> {
  return invoke("list_ledger_entries", { accountId, yearMonth });
}

export async function getLedgerEntry(entryId: string): Promise<LedgerEntry | null> {
  return invoke("get_ledger_entry", { entryId });
}

// 히스토리
export async function listLedgerHistory(entryId: string): Promise<LedgerHistory[]> {
  return invoke("list_ledger_history", { entryId });
}



