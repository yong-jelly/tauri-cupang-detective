import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2 } from "lucide-react";
import type { User, NaverPaymentListItem } from "@shared/api/types";
import { PaymentListTable } from "@features/data-collection/shared/ui/PaymentListTable";

interface TransactionListPageProps {
  account: User;
}

export const TransactionListPage = ({ account }: TransactionListPageProps) => {
  const [payments, setPayments] = useState<NaverPaymentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    if (account.provider !== "naver") {
      setError("네이버 계정만 지원됩니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await invoke<NaverPaymentListItem[]>("list_naver_payments", {
        userId: account.id,
        limit: 1000,
        offset: 0,
      });
      setPayments(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadPayments}
              className="text-blue-600 hover:underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">거래 목록 조회</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <PaymentListTable payments={payments} loading={loading} />
        )}
      </div>
    </div>
  );
};

