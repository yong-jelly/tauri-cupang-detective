import { useMemo } from "react";
import { ShoppingBag } from "lucide-react";
import { RetroModal, RetroModalBody } from "./RetroModal";
import { TransactionTable } from "./TransactionTable";
import type { UnifiedPayment } from "@shared/lib/unifiedPayment";
import type { AccountProvider } from "@shared/api/types";

export interface PaymentListModalProps {
  /** 모달 열림 여부 */
  isOpen: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 결제 목록 */
  payments: UnifiedPayment[];
  /** 플랫폼 provider (메타데이터 관리용, 없으면 payments에서 자동 추출) */
  provider?: AccountProvider;
  /** 모달 제목 */
  title?: string;
  /** 모달 서브타이틀 */
  subtitle?: string;
  /** 빈 데이터 메시지 */
  emptyMessage?: string;
}

// 금액 포맷팅
const formatAmount = (amount: number): string => {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억원`;
  }
  if (amount >= 10000) {
    return `${Math.round(amount / 10000).toLocaleString()}만원`;
  }
  return `₩${amount.toLocaleString("ko-KR")}`;
};

/**
 * 결제 목록을 표시하는 모달 컴포넌트
 * RetroModal과 TransactionTable을 조합한 복합 컴포넌트입니다.
 * 헤더 영역에 거래 건수, 총 금액, 최대 금액이 표시됩니다.
 * 
 * @example
 * ```tsx
 * <PaymentListModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   payments={filteredPayments}
 *   title="~1만원 구매 내역"
 *   subtitle="소액 결제 목록"
 * />
 * ```
 */
export const PaymentListModal = ({
  isOpen,
  onClose,
  payments,
  provider: providerProp,
  title = "구매 내역",
  subtitle,
  emptyMessage = "해당 조건에 맞는 구매 내역이 없습니다.",
}: PaymentListModalProps) => {
  // provider가 명시적으로 전달되지 않으면 payments에서 추출
  const provider = useMemo(() => {
    if (providerProp) return providerProp;
    if (payments.length > 0 && payments[0].provider) {
      return payments[0].provider;
    }
    return undefined;
  }, [providerProp, payments]);

  // 헤더에 표시할 요약 통계 계산 (건수, 금액, 날짜 범위)
  const summary = useMemo(() => {
    if (payments.length === 0) return null;
    
    const totalAmount = payments.reduce((sum, p) => sum + p.total_amount, 0);
    const maxAmount = Math.max(...payments.map(p => p.total_amount));
    
    // 날짜 범위 계산
    const dates = payments.map(p => new Date(p.paid_at).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    const formatDate = (d: Date) => 
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    
    const dateRange = formatDate(minDate) === formatDate(maxDate)
      ? formatDate(minDate)
      : `${formatDate(minDate)} ~ ${formatDate(maxDate)}`;
    
    return {
      count: payments.length,
      totalAmount,
      maxAmount,
      dateRange,
    };
  }, [payments]);

  // 헤더에 표시할 요약 문자열 생성
  const summaryText = summary
    ? `${summary.dateRange} · ${summary.count.toLocaleString()}건 · 합계 ${formatAmount(summary.totalAmount)} · 최고 ${formatAmount(summary.maxAmount)}`
    : "";

  // subtitle과 summaryText 조합
  const displaySubtitle = subtitle
    ? `${subtitle} · ${summaryText}`
    : summaryText;

  return (
    <RetroModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-[#264653]" />
          <span>{title}</span>
        </div>
      }
      subtitle={displaySubtitle || undefined}
      size="xl"
    >
      {/* 거래 목록 (전체 표시, 테이블 헤더 고정) */}
      <RetroModalBody padding={false}>
        <TransactionTable
          payments={payments}
          provider={provider}
          emptyMessage={emptyMessage}
          compact
        />
      </RetroModalBody>
    </RetroModal>
  );
};

