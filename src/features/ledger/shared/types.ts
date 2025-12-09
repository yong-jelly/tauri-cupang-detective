// 가계부 계정 타입
export interface LedgerAccount {
  id: string;
  nickname: string;
  passwordHash?: string;
  passwordExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 가계부 항목 타입
export interface LedgerEntry {
  id: string;
  accountId: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  title: string;
  category: string;
  platform?: "offline" | "online_shopping" | "social" | "app" | "subscription" | "etc";
  url?: string;
  merchant?: string;
  paymentMethod?: string;
  memo?: string;
  color?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// 가계부 히스토리 타입
export interface LedgerHistory {
  id: string;
  entryId: string;
  action: "create" | "update" | "delete";
  snapshotBefore?: string;
  snapshotAfter?: string;
  createdAt: string;
}

// 가계부 항목 생성/수정용 타입 (id 제외)
export type LedgerEntryInput = Omit<LedgerEntry, "id" | "createdAt" | "updatedAt">;









