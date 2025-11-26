/**
 * 통합 결제 데이터 타입 정의
 * 
 * 네이버와 쿠팡의 결제/주문 데이터를 공통 형식으로 변환하기 위한 타입입니다.
 * 필드명은 테이블 컬럼처럼 소문자_언더스코어 형태를 사용합니다.
 */

import type { AccountProvider } from "@shared/api/types";

/**
 * 공통 결제 아이템 인터페이스
 * 각 결제 내 개별 상품 정보를 담습니다.
 */
export interface UnifiedPaymentItem {
  /** 아이템 순번 (1부터 시작) */
  line_no: number;
  /** 플랫폼별 상품 ID */
  product_id?: string;
  /** 상품명 */
  product_name: string;
  /** 상품 이미지 URL */
  image_url?: string;
  /** 상품 상세 페이지 URL */
  info_url?: string;
  /** 브랜드명 */
  brand_name?: string;
  /** 수량 */
  quantity: number;
  /** 단가 */
  unit_price?: number;
  /** 라인 금액 (수량 × 단가) */
  line_amount?: number;
  /** 잔여/환불 금액 */
  rest_amount?: number;
  /** 메모/비고 */
  memo?: string;
}

/**
 * 공통 결제 정보 인터페이스
 * 결제/주문 단위의 정보를 담는 메인 구조체입니다.
 */
export interface UnifiedPayment {
  /** DB 내부 PK */
  id: number;
  /** 결제 플랫폼 */
  provider: AccountProvider;
  /** 플랫폼별 결제/주문 ID (네이버: payId, 쿠팡: orderId) */
  payment_id: string;
  /** 외부 식별자 */
  external_id?: string;
  /** 상태 코드 */
  status_code?: string;
  /** 상태 텍스트 (한글) */
  status_text?: string;
  /** 상태 표시 색상 */
  status_color?: string;
  /** 결제/주문 일시 (ISO8601) */
  paid_at: string;
  /** 가맹점/판매자명 */
  merchant_name: string;
  /** 가맹점 전화번호 */
  merchant_tel?: string;
  /** 가맹점 URL */
  merchant_url?: string;
  /** 가맹점 이미지 URL */
  merchant_image_url?: string;
  /** 대표 상품명 */
  product_name?: string;
  /** 상품 수량 */
  product_count?: number;
  /** 총 결제 금액 */
  total_amount: number;
  /** 할인 금액 */
  discount_amount?: number;
  /** 잔여/환불 금액 */
  rest_amount?: number;
  /** 결제 아이템 목록 */
  items: UnifiedPaymentItem[];
}

/**
 * 월별 통계 인터페이스
 */
export interface MonthlyStats {
  month: string;
  amount: number;
  count: number;
}

/**
 * 일별 통계 인터페이스
 */
export interface DailyStats {
  date: string;
  day: number;
  amount: number;
}

/**
 * 가맹점별 통계 인터페이스
 */
export interface MerchantStats {
  name: string;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * 분기별 통계 인터페이스
 */
export interface QuarterStats {
  quarter: string;
  year: number;
  quarter_num: number;
  amount: number;
  count: number;
}

/**
 * 연도별 통계 인터페이스
 */
export interface YearStats {
  year: number;
  amount: number;
  count: number;
}

/**
 * 이동 평균이 포함된 월별 데이터
 */
export interface MonthlyStatsWithMA {
  month: string;
  amount: number;
  count: number;
  /** 3개월 이동 평균 */
  ma3: number | null;
  /** 6개월 이동 평균 */
  ma6: number | null;
  /** 12개월 이동 평균 */
  ma12: number | null;
  /** 추세 */
  trend: "up" | "down" | "stable";
  /** 변동성 (표준편차 기반) */
  volatility: number;
}

/**
 * 분기별 고가 주문 항목
 */
export interface TopExpenseItem {
  quarter: string;
  year: number;
  quarter_num: number;
  product_name: string;
  merchant_name: string;
  amount: number;
  paid_at: string;
}

/**
 * 지출 인사이트
 */
export interface SpendingInsight {
  type: "warning" | "info" | "success";
  title: string;
  description: string;
}

