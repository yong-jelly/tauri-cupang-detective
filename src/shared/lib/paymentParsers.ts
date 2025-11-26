/**
 * 플랫폼별 결제 데이터 파서
 * 
 * 네이버와 쿠팡의 결제 데이터를 공통 형식(UnifiedPayment)으로 변환합니다.
 */

import type { 
  AccountProvider, 
  NaverPaymentListItem, 
  CoupangPaymentListItem,
  PaymentItem,
  CoupangPaymentItem 
} from "@shared/api/types";
import type { UnifiedPayment, UnifiedPaymentItem } from "./unifiedPayment";

/**
 * 네이버 결제 아이템을 공통 형식으로 변환
 */
const parseNaverPaymentItem = (item: PaymentItem): UnifiedPaymentItem => ({
  line_no: item.lineNo,
  product_name: item.productName,
  image_url: item.imageUrl ?? undefined,
  info_url: item.infoUrl ?? undefined,
  quantity: item.quantity,
  unit_price: item.unitPrice ?? undefined,
  line_amount: item.lineAmount ?? undefined,
  rest_amount: item.restAmount ?? undefined,
  memo: item.memo ?? undefined,
});

/**
 * 쿠팡 결제 아이템을 공통 형식으로 변환
 */
const parseCoupangPaymentItem = (item: CoupangPaymentItem): UnifiedPaymentItem => ({
  line_no: item.lineNo,
  product_id: item.productId ?? undefined,
  product_name: item.productName,
  image_url: item.imageUrl ?? undefined,
  info_url: item.infoUrl ?? undefined,
  brand_name: item.brandName ?? undefined,
  quantity: item.quantity,
  // 쿠팡은 최종 단가(combinedUnitPrice)를 우선 사용
  unit_price: item.combinedUnitPrice ?? item.discountedUnitPrice ?? item.unitPrice ?? undefined,
  line_amount: item.lineAmount ?? undefined,
  rest_amount: item.restAmount ?? undefined,
  memo: item.memo ?? undefined,
});

/**
 * 단일 네이버 결제를 공통 형식으로 변환
 */
export const parseNaverPayment = (payment: NaverPaymentListItem): UnifiedPayment => ({
  id: payment.id,
  provider: "naver",
  payment_id: payment.payId,
  external_id: payment.externalId ?? undefined,
  status_code: payment.statusCode ?? undefined,
  status_text: payment.statusText ?? undefined,
  status_color: payment.statusColor ?? undefined,
  paid_at: payment.paidAt,
  merchant_name: payment.merchantName,
  product_name: payment.productName ?? undefined,
  product_count: payment.productCount ?? undefined,
  total_amount: payment.totalAmount,
  discount_amount: payment.discountAmount ?? undefined,
  items: payment.items.map(parseNaverPaymentItem),
});

/**
 * 단일 쿠팡 결제를 공통 형식으로 변환
 */
export const parseCoupangPayment = (payment: CoupangPaymentListItem): UnifiedPayment => ({
  id: payment.id,
  provider: "coupang",
  payment_id: payment.orderId,
  external_id: payment.externalId ?? undefined,
  status_code: payment.statusCode ?? undefined,
  status_text: payment.statusText ?? undefined,
  status_color: payment.statusColor ?? undefined,
  // 쿠팡은 실제 결제 시간(paidAt)이 있으면 사용, 없으면 주문 시간(orderedAt) 사용
  paid_at: payment.paidAt ?? payment.orderedAt,
  merchant_name: payment.merchantName,
  merchant_tel: payment.merchantTel ?? undefined,
  merchant_url: payment.merchantUrl ?? undefined,
  merchant_image_url: payment.merchantImageUrl ?? undefined,
  product_name: payment.productName ?? undefined,
  product_count: payment.productCount ?? undefined,
  total_amount: payment.totalAmount,
  discount_amount: payment.discountAmount ?? undefined,
  rest_amount: payment.restAmount ?? undefined,
  items: payment.items.map(parseCoupangPaymentItem),
});

/**
 * 네이버 결제 목록을 공통 형식으로 변환
 */
export const parseNaverPayments = (payments: NaverPaymentListItem[]): UnifiedPayment[] => {
  return payments.map(parseNaverPayment);
};

/**
 * 쿠팡 결제 목록을 공통 형식으로 변환
 */
export const parseCoupangPayments = (payments: CoupangPaymentListItem[]): UnifiedPayment[] => {
  return payments.map(parseCoupangPayment);
};

/**
 * 플랫폼에 따라 적절한 파서를 선택하여 변환
 * 
 * @param payments - 플랫폼별 결제 데이터 배열
 * @param provider - 결제 플랫폼 ("naver" | "coupang")
 * @returns 통합 형식의 결제 데이터 배열
 */
export const parsePayments = (
  payments: NaverPaymentListItem[] | CoupangPaymentListItem[],
  provider: AccountProvider
): UnifiedPayment[] => {
  if (provider === "naver") {
    return parseNaverPayments(payments as NaverPaymentListItem[]);
  } else {
    return parseCoupangPayments(payments as CoupangPaymentListItem[]);
  }
};

