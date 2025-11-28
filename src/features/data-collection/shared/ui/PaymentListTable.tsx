import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { NaverPaymentListItem } from "@shared/api/types";

interface PaymentListTableProps {
  payments: NaverPaymentListItem[];
  loading?: boolean;
}

export const PaymentListTable = ({ payments, loading }: PaymentListTableProps) => {
  const [expandedPayments, setExpandedPayments] = useState<Set<number>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // 날짜 포맷팅
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}.${month}.${day}`;
    } catch {
      return dateStr;
    }
  };

  const formatYearMonth = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    } catch {
      return dateStr.substring(0, 7);
    }
  };

  // 금액 포맷팅
  const formatAmount = (amount: number): string => {
    return `₩${amount.toLocaleString("ko-KR")}`;
  };

  // 월별로 그룹화
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, NaverPaymentListItem[]> = {};
    payments.forEach((payment) => {
      const yearMonth = formatYearMonth(payment.paidAt);
      if (!groups[yearMonth]) {
        groups[yearMonth] = [];
      }
      groups[yearMonth].push(payment);
    });
    return groups;
  }, [payments]);

  // 총 지출금액 계산
  const totalAmount = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.totalAmount, 0);
  }, [payments]);

  // 기간 계산
  const dateRange = useMemo(() => {
    if (payments.length === 0) return null;
    const dates = payments.map((p) => new Date(p.paidAt)).sort((a, b) => a.getTime() - b.getTime());
    const start = dates[0];
    const end = dates[dates.length - 1];
    return {
      start: formatDate(start.toISOString()),
      end: formatDate(end.toISOString()),
    };
  }, [payments]);

  // 월 평균 계산
  const monthlyAverage = useMemo(() => {
    if (payments.length === 0) return 0;
    const monthCount = Object.keys(groupedByMonth).length;
    return monthCount > 0 ? totalAmount / monthCount : 0;
  }, [totalAmount, groupedByMonth]);

  // 월별 합계 계산
  const monthlyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.entries(groupedByMonth).forEach(([yearMonth, items]) => {
      totals[yearMonth] = items.reduce((sum, p) => sum + p.totalAmount, 0);
    });
    return totals;
  }, [groupedByMonth]);

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

  const toggleMonth = (yearMonth: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(yearMonth)) {
        next.delete(yearMonth);
      } else {
        next.add(yearMonth);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">거래 내역이 없습니다.</div>
      </div>
    );
  }

  const sortedMonths = Object.keys(groupedByMonth).sort().reverse();

  return (
    <div className="space-y-6">
      {/* 총 지출금액 헤더 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">총 지출금액</h2>
          {dateRange && (
            <span className="text-sm text-gray-500">
              {dateRange.start} ~ {dateRange.end}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-4">
          <div className="text-3xl font-bold text-gray-900">{formatAmount(totalAmount)}</div>
          <div className="text-sm text-gray-500">
            (월 평균 {formatAmount(Math.round(monthlyAverage))})
          </div>
        </div>
      </div>

      {/* 월별 목록 */}
      <div className="space-y-4">
        {sortedMonths.map((yearMonth) => {
          const monthPayments = groupedByMonth[yearMonth];
          const monthTotal = monthlyTotals[yearMonth];
          const isMonthExpanded = expandedMonths.has(yearMonth);
          const displayPayments = isMonthExpanded ? monthPayments : monthPayments.slice(0, 5);
          const hasMore = monthPayments.length > 5;

          return (
            <div key={yearMonth} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* 월별 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">{yearMonth}</span>
                  <span className="text-sm text-gray-500">합계: {formatAmount(monthTotal)}</span>
                </div>
              </div>

              {/* 거래 목록 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        날짜
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        내역
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        금액
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayPayments.map((payment) => {
                      const isExpanded = expandedPayments.has(payment.id);
                      const displayName = payment.productName || payment.merchantName;

                      return (
                        <React.Fragment key={payment.id}>
                          <tr
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => togglePayment(payment.id)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(payment.paidAt)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                <span>{displayName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                              {formatAmount(payment.totalAmount)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={3} className="px-6 py-4 bg-white">
                                <div className="space-y-3">
                                  {payment.items.length > 0 ? (
                                    payment.items.map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200"
                                      >
                                        {item.imageUrl && (
                                          <img
                                            src={item.imageUrl}
                                            alt={item.productName}
                                            className="w-16 h-16 object-cover rounded"
                                          />
                                        )}
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900">
                                            {item.productName}
                                          </div>
                                          <div className="mt-1 text-sm text-gray-500">
                                            수량: {item.quantity}
                                            {item.unitPrice && (
                                              <> · 단가: {formatAmount(item.unitPrice)}</>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          {item.lineAmount && (
                                            <div className="font-medium text-gray-900">
                                              {formatAmount(item.lineAmount)}
                                            </div>
                                          )}
                                          {item.restAmount && item.restAmount > 0 && (
                                            <div className="text-xs text-gray-500">
                                              남은 금액: {formatAmount(item.restAmount)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm text-gray-500 p-4 bg-white rounded-lg border border-gray-200">
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

              {/* 더보기 버튼 */}
              {hasMore && !isMonthExpanded && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => toggleMonth(yearMonth)}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    더보기 ({monthPayments.length - 5}개 더)
                  </button>
                </div>
              )}
              {hasMore && isMonthExpanded && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => toggleMonth(yearMonth)}
                    className="w-full text-center text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    접기
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

