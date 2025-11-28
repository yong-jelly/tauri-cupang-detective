import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import React from "react";
import type { UnifiedPayment } from "@shared/lib/unifiedPayment";

export interface TransactionTableProps {
  /** 표시할 결제 목록 */
  payments: UnifiedPayment[];
  /** 현재 표시되는 항목 수 (페이지네이션) */
  visibleCount?: number;
  /** 더보기 버튼 클릭 핸들러 */
  onLoadMore?: () => void;
  /** 더보기 버튼 표시 여부 */
  showLoadMore?: boolean;
  /** 남은 항목 수 (더보기 버튼에 표시) */
  remainingCount?: number;
  /** 데이터 없을 때 메시지 */
  emptyMessage?: string;
  /** 컴팩트 모드 (패딩 축소) */
  compact?: boolean;
}

// 금액 포맷팅
const formatAmount = (amount: number): string => {
  return `₩${amount.toLocaleString("ko-KR")}`;
};

export const TransactionTable = ({
  payments,
  visibleCount,
  onLoadMore,
  showLoadMore = false,
  remainingCount = 0,
  emptyMessage = "거래 내역이 없습니다.",
  compact = false,
}: TransactionTableProps) => {
  const [expandedPayments, setExpandedPayments] = useState<Set<number>>(new Set());

  // payments 변경 시 확장 상태 초기화
  useEffect(() => {
    setExpandedPayments(new Set());
  }, [payments]);

  const togglePayment = (id: number) => {
    setExpandedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const displayPayments = visibleCount ? payments.slice(0, visibleCount) : payments;

  if (payments.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 font-mono italic">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-mono text-sm">
          <thead>
            <tr className="border-b-2 border-gray-800 bg-[#fdfbf7]">
              <th className={`${compact ? "p-3" : "p-4"} font-bold text-gray-800 w-32 border-r border-gray-200`}>
                날짜
              </th>
              <th className={`${compact ? "p-3" : "p-4"} font-bold text-gray-800 border-r border-gray-200`}>
                거래 내역
              </th>
              <th className={`${compact ? "p-3" : "p-4"} font-bold text-gray-800 w-40 text-right`}>
                금액
              </th>
            </tr>
          </thead>
          <tbody className="bg-[linear-gradient(transparent_95%,#ede9dd_95%)] bg-[length:100%_2.5rem]">
            {displayPayments.map((payment, idx) => {
              const isExpanded = expandedPayments.has(payment.id);
              const displayName = payment.product_name || payment.merchant_name;

              return (
                <React.Fragment key={payment.id}>
                  <tr
                    className={`h-10 cursor-pointer transition-colors ${
                      idx % 2 === 0 ? "bg-white/80" : "bg-white/60"
                    } hover:bg-yellow-50/70`}
                    onClick={() => togglePayment(payment.id)}
                  >
                    <td className={`${compact ? "px-3" : "px-4"} border-r border-gray-200 text-gray-600 align-middle`}>
                      {payment.paid_at.substring(0, 10)}
                    </td>
                    <td className={`${compact ? "px-3" : "px-4"} border-r border-gray-200 text-gray-900 font-semibold align-middle`}>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{displayName}</span>
                        {payment.items.length > 1 && (
                          <span className="ml-2 text-xs text-gray-500 font-normal flex-shrink-0">
                            외 {payment.items.length - 1}건
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`${compact ? "px-3" : "px-4"} text-right text-gray-900 font-bold align-middle`}>
                      {formatAmount(payment.total_amount)}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 bg-[#f6f1e9]">
                        <div className="space-y-3">
                          {payment.items.length > 0 ? (
                            payment.items.map((item, itemIdx) => (
                              <div
                                key={itemIdx}
                                className="flex items-start gap-4 p-4 bg-[#fffef0] border border-[#d4c4a8]"
                              >
                                {item.image_url && (
                                  <img
                                    src={item.image_url}
                                    alt={item.product_name}
                                    className="w-16 h-16 object-cover border border-gray-300"
                                  />
                                )}
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {item.product_name}
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500">
                                    수량: {item.quantity}
                                    {item.unit_price && (
                                      <> · 단가: {formatAmount(item.unit_price)}</>
                                    )}
                                    {item.brand_name && (
                                      <> · {item.brand_name}</>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  {item.line_amount && (
                                    <div className="font-bold text-gray-900">
                                      {formatAmount(item.line_amount)}
                                    </div>
                                  )}
                                  {item.rest_amount && item.rest_amount > 0 && (
                                    <div className="text-xs text-gray-500">
                                      남은 금액: {formatAmount(item.rest_amount)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-500 p-4 bg-[#fffef0] border border-[#d4c4a8]">
                              상세 항목 정보가 없습니다.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showLoadMore && remainingCount > 0 && onLoadMore && (
        <div className="p-4 bg-[#fdfbf7] border-t-2 border-gray-800 text-center">
          <button
            onClick={onLoadMore}
            className="px-6 py-2 bg-gray-900 text-[#fdfbf7] font-bold font-mono text-sm tracking-widest hover:bg-gray-800 transition-colors shadow-[3px_3px_0px_0px_rgba(31,41,55,0.6)] active:translate-x-0.5 active:translate-y-0.5"
          >
            더보기 ({remainingCount})
          </button>
        </div>
      )}
    </div>
  );
};

