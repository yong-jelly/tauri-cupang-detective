import { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, ChevronDown, ChevronRight, Receipt, Tag, Star } from "lucide-react";
import type { User, NaverPaymentListItem, CoupangPaymentListItem, AccountProvider } from "@shared/api/types";
import type { UnifiedPayment } from "@shared/lib/unifiedPayment";
import { parseNaverPayments, parseCoupangPayments } from "@shared/lib/paymentParsers";
import { ProductMetaModal, useProductMetaSummaries } from "@features/product-meta";
import React from "react";

// 모달에서 사용할 아이템 정보
interface SelectedItem {
  provider: AccountProvider;
  itemId: number;
  productName: string;
}

interface TransactionListPageProps {
  account: User;
}

export const TransactionListPage = ({ account }: TransactionListPageProps) => {
  const [payments, setPayments] = useState<UnifiedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPayments, setExpandedPayments] = useState<Set<number>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  
  // 상품 메타데이터 모달 상태
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  
  // 상품 메타데이터 요약 정보
  const { getSummary, refresh: refreshSummaries } = useProductMetaSummaries(account.provider);

  // 상품 메타데이터 모달 열기
  const openMetaModal = useCallback((itemId: number, productName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem({
      provider: account.provider,
      itemId,
      productName,
    });
    setMetaModalOpen(true);
  }, [account.provider]);

  // 상품 메타데이터 모달 닫기
  const closeMetaModal = useCallback(() => {
    setMetaModalOpen(false);
    setSelectedItem(null);
  }, []);

  // 메타데이터 저장 후 콜백
  const handleMetaSaved = useCallback(() => {
    refreshSummaries();
  }, [refreshSummaries]);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let unifiedPayments: UnifiedPayment[] = [];
      
      if (account.provider === "naver") {
        const result = await invoke<NaverPaymentListItem[]>("list_naver_payments", {
          userId: account.id,
          limit: 10000,
          offset: 0,
        });
        unifiedPayments = parseNaverPayments(result);
      } else if (account.provider === "coupang") {
        const result = await invoke<CoupangPaymentListItem[]>("list_coupang_payments", {
          userId: account.id,
          limit: 10000,
          offset: 0,
        });
        unifiedPayments = parseCoupangPayments(result);
      } else {
        setError("지원하지 않는 플랫폼입니다.");
        setLoading(false);
        return;
      }
      
      setPayments(unifiedPayments);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

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
    const groups: Record<string, UnifiedPayment[]> = {};
    payments.forEach((payment) => {
      const yearMonth = formatYearMonth(payment.paid_at);
      if (!groups[yearMonth]) {
        groups[yearMonth] = [];
      }
      groups[yearMonth].push(payment);
    });
    return groups;
  }, [payments]);

  // 총 지출금액 계산
  const totalAmount = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.total_amount, 0);
  }, [payments]);

  // 기간 계산
  const dateRange = useMemo(() => {
    if (payments.length === 0) return null;
    const dates = payments.map((p) => new Date(p.paid_at)).sort((a, b) => a.getTime() - b.getTime());
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
      totals[yearMonth] = items.reduce((sum, p) => sum + p.total_amount, 0);
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
      <div className="flex items-center justify-center h-full bg-[#fdfbf7]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-[#fdfbf7]">
        <div className="text-center p-8 border-4 border-double border-gray-800 bg-white max-w-md">
          <p className="text-red-700 font-serif text-lg mb-4">{error}</p>
          <div className="w-full h-px bg-gray-800 my-4"></div>
          <button
            onClick={loadPayments}
            className="px-4 py-2 border-2 border-gray-800 bg-white hover:bg-gray-100 font-bold text-sm"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const sortedMonths = Object.keys(groupedByMonth).sort().reverse();

  return (
    <div className="relative flex-1 h-full overflow-y-auto bg-[#fdfbf7] font-serif p-8">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto space-y-8">
        {/* 헤더 섹션 */}
        <div className="border-b-4 border-gray-800 pb-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">거래 목록</h1>
              <p className="text-gray-600 text-lg">
                {account.alias} ({account.provider}) · <span className="font-mono font-bold text-gray-800">
                  {dateRange ? `${dateRange.start} ~ ${dateRange.end}` : "데이터 없음"}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600 font-mono">{payments.length.toLocaleString()}건</span>
            </div>
          </div>
        </div>

        {/* 총 지출금액 헤더 */}
        <div className="bg-[#fffef0] p-6 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="flex items-center justify-between mb-4 border-b-2 border-gray-200 pb-4">
            <h3 className="text-lg font-bold text-gray-900">총 지출금액</h3>
            {dateRange && (
              <span className="text-sm text-gray-500 font-mono">
                {dateRange.start} ~ {dateRange.end}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-6">
            <div className="text-4xl font-bold text-gray-900 font-mono">{formatAmount(totalAmount)}</div>
            <div className="text-sm text-gray-500 border-l-2 border-gray-300 pl-6">
              월 평균 <span className="font-bold font-mono text-gray-800">{formatAmount(Math.round(monthlyAverage))}</span>
            </div>
          </div>
        </div>

        {/* 월별 목록 */}
        <div className="space-y-6">
          {sortedMonths.map((yearMonth) => {
            const monthPayments = groupedByMonth[yearMonth];
            const monthTotal = monthlyTotals[yearMonth];
            const isMonthExpanded = expandedMonths.has(yearMonth);
            const displayPayments = isMonthExpanded ? monthPayments : monthPayments.slice(0, 5);
            const hasMore = monthPayments.length > 5;

            return (
              <div key={yearMonth} className="bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
                {/* 월별 헤더 */}
                <div className="px-6 py-4 border-b-2 border-gray-800 bg-[#f6f1e9]">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">{yearMonth}</span>
                    <span className="text-sm font-mono font-bold text-gray-700">합계: {formatAmount(monthTotal)}</span>
                  </div>
                </div>

                {/* 거래 목록 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-800 bg-[#fdfbf7]">
                        <th className="p-4 font-bold text-gray-800 w-32 border-r border-gray-200">날짜</th>
                        <th className="p-4 font-bold text-gray-800 border-r border-gray-200">거래 내역</th>
                        <th className="p-4 font-bold text-gray-800 w-40 text-right">금액</th>
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
                              <td className="px-4 border-r border-gray-200 text-gray-600 align-middle">
                                {formatDate(payment.paid_at)}
                              </td>
                              <td className="px-4 border-r border-gray-200 text-gray-900 font-semibold align-middle">
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
                              <td className="px-4 text-right text-gray-900 font-bold align-middle">
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
                                          <div className="flex items-start gap-3">
                                            {/* 태그/메모 관리 버튼 */}
                                            {(() => {
                                              const summary = getSummary(item.id);
                                              const hasMeta = !!summary;
                                              const hasRating = summary?.rating != null;
                                              
                                              return (
                                                <button
                                                  type="button"
                                                  onClick={(e) => openMetaModal(item.id, item.product_name, e)}
                                                  className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-colors ${
                                                    hasMeta
                                                      ? "bg-[#c49a1a] border border-[#c49a1a] text-white hover:bg-[#a6820f] shadow-sm"
                                                      : "border border-[#c49a1a]/50 text-[#c49a1a] hover:bg-[#c49a1a]/10 hover:border-[#c49a1a]"
                                                  }`}
                                                  title="태그/메모 관리"
                                                >
                                                  {hasRating ? (
                                                    <>
                                                      <Star className="w-3 h-3 fill-current" />
                                                      <span>{summary.rating}</span>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Tag className="w-3 h-3" />
                                                      <span>관리</span>
                                                    </>
                                                  )}
                                                </button>
                                              );
                                            })()}
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

                {/* 더보기 버튼 */}
                {hasMore && !isMonthExpanded && (
                  <div className="px-6 py-4 border-t-2 border-[#d4c4a8] bg-[#f6f1e9]">
                    <button
                      onClick={() => toggleMonth(yearMonth)}
                      className="w-full text-center text-sm font-bold text-gray-700 hover:text-gray-900"
                    >
                      ▼ 더보기 ({monthPayments.length - 5}건)
                    </button>
                  </div>
                )}
                {hasMore && isMonthExpanded && (
                  <div className="px-6 py-4 border-t-2 border-[#d4c4a8] bg-[#f6f1e9]">
                    <button
                      onClick={() => toggleMonth(yearMonth)}
                      className="w-full text-center text-sm font-bold text-gray-600 hover:text-gray-800"
                    >
                      ▲ 접기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 상품 메타데이터 모달 */}
      {selectedItem && (
        <ProductMetaModal
          isOpen={metaModalOpen}
          onClose={closeMetaModal}
          provider={selectedItem.provider}
          itemId={selectedItem.itemId}
          productName={selectedItem.productName}
          onSaved={handleMetaSaved}
        />
      )}
    </div>
  );
};
