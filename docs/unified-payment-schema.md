# 통합 결제 데이터 스키마 (Unified Payment Schema)

## 개요

네이버와 쿠팡의 결제/주문 데이터를 공통 형식으로 변환하여 동일한 대시보드 컴포넌트에서 사용할 수 있도록 합니다.

## 설계 원칙

1. **필드 네이밍**: 테이블 컬럼처럼 `소문자_언더스코어` 형태 사용
2. **타입 안정성**: TypeScript의 강타입 시스템 활용
3. **확장성**: 향후 다른 플랫폼 추가 시 쉽게 확장 가능한 구조
4. **호환성**: 기존 유틸리티 함수와의 호환성 유지

---

## 공통 데이터 타입

### unified_payment_item (결제 아이템)

각 결제 내 개별 상품 정보를 담는 구조체입니다.

| 컬럼명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `line_no` | number | ✓ | 아이템 순번 (1부터 시작) |
| `product_id` | string | | 플랫폼별 상품 ID |
| `product_name` | string | ✓ | 상품명 |
| `image_url` | string | | 상품 이미지 URL |
| `info_url` | string | | 상품 상세 페이지 URL |
| `brand_name` | string | | 브랜드명 |
| `quantity` | number | ✓ | 수량 |
| `unit_price` | number | | 단가 |
| `line_amount` | number | | 라인 금액 (수량 × 단가) |
| `rest_amount` | number | | 잔여/환불 금액 |
| `memo` | string | | 메모/비고 |

### unified_payment (결제 정보)

결제/주문 단위의 정보를 담는 메인 구조체입니다.

| 컬럼명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `id` | number | ✓ | DB 내부 PK |
| `provider` | "naver" \| "coupang" | ✓ | 결제 플랫폼 |
| `payment_id` | string | ✓ | 플랫폼별 결제/주문 ID |
| `external_id` | string | | 외부 식별자 |
| `status_code` | string | | 상태 코드 |
| `status_text` | string | | 상태 텍스트 (한글) |
| `status_color` | string | | 상태 표시 색상 |
| `paid_at` | string | ✓ | 결제/주문 일시 (ISO8601) |
| `merchant_name` | string | ✓ | 가맹점/판매자명 |
| `merchant_tel` | string | | 가맹점 전화번호 |
| `merchant_url` | string | | 가맹점 URL |
| `merchant_image_url` | string | | 가맹점 이미지 URL |
| `product_name` | string | | 대표 상품명 |
| `product_count` | number | | 상품 수량 |
| `total_amount` | number | ✓ | 총 결제 금액 |
| `discount_amount` | number | | 할인 금액 |
| `rest_amount` | number | | 잔여/환불 금액 |
| `items` | unified_payment_item[] | ✓ | 결제 아이템 목록 |

---

## 필드 매핑 테이블

### 네이버 → 공통 (unified_payment)

| 공통 필드 | 네이버 필드 | 변환 로직 |
|-----------|-------------|-----------|
| `id` | `id` | 그대로 사용 |
| `provider` | - | "naver" 고정 |
| `payment_id` | `payId` | 그대로 사용 |
| `external_id` | `externalId` | 그대로 사용 |
| `status_code` | `statusCode` | 그대로 사용 |
| `status_text` | `statusText` | 그대로 사용 |
| `status_color` | `statusColor` | 그대로 사용 |
| `paid_at` | `paidAt` | 그대로 사용 |
| `merchant_name` | `merchantName` | 그대로 사용 |
| `product_name` | `productName` | 그대로 사용 |
| `product_count` | `productCount` | 그대로 사용 |
| `total_amount` | `totalAmount` | 그대로 사용 |
| `discount_amount` | `discountAmount` | 그대로 사용 |
| `items` | `items` | 아이템 변환 적용 |

### 쿠팡 → 공통 (unified_payment)

| 공통 필드 | 쿠팡 필드 | 변환 로직 |
|-----------|-----------|-----------|
| `id` | `id` | 그대로 사용 |
| `provider` | - | "coupang" 고정 |
| `payment_id` | `orderId` | 그대로 사용 |
| `external_id` | `externalId` | 그대로 사용 |
| `status_code` | `statusCode` | 그대로 사용 |
| `status_text` | `statusText` | 그대로 사용 |
| `status_color` | `statusColor` | 그대로 사용 |
| `paid_at` | `orderedAt` | 그대로 사용 (쿠팡은 주문일시 기준) |
| `merchant_name` | `merchantName` | 그대로 사용 |
| `product_name` | `productName` | 그대로 사용 |
| `product_count` | `productCount` | 그대로 사용 |
| `total_amount` | `totalAmount` | 그대로 사용 |
| `discount_amount` | `discountAmount` | 그대로 사용 |
| `items` | `items` | 아이템 변환 적용 |

### 아이템 필드 매핑 (unified_payment_item)

| 공통 필드 | 네이버 필드 | 쿠팡 필드 |
|-----------|-------------|-----------|
| `line_no` | `lineNo` | `lineNo` |
| `product_id` | - | `productId` |
| `product_name` | `productName` | `productName` |
| `image_url` | `imageUrl` | `imageUrl` |
| `info_url` | `infoUrl` | `infoUrl` |
| `brand_name` | - | `brandName` |
| `quantity` | `quantity` | `quantity` |
| `unit_price` | `unitPrice` | `combinedUnitPrice` \|\| `unitPrice` |
| `line_amount` | `lineAmount` | `lineAmount` |
| `rest_amount` | `restAmount` | `restAmount` |
| `memo` | `memo` | `memo` |

---

## 사용 예시

### 1. 데이터 로드 및 변환

```typescript
import { invoke } from "@tauri-apps/api/core";
import { parseNaverPayments, parseCoupangPayments } from "@shared/lib/paymentParsers";
import type { UnifiedPayment } from "@shared/lib/unifiedPayment";

// 플랫폼에 따라 데이터 로드 및 변환
const loadPayments = async (provider: "naver" | "coupang", userId: string): Promise<UnifiedPayment[]> => {
  if (provider === "naver") {
    const data = await invoke("list_naver_payments", { userId, limit: 2000, offset: 0 });
    return parseNaverPayments(data);
  } else {
    const data = await invoke("list_coupang_payments", { userId, limit: 2000, offset: 0 });
    return parseCoupangPayments(data);
  }
};
```

### 2. 유틸리티 함수 사용

```typescript
import { processExpenditureData, processOverviewData } from "@pages/expenditure/lib/utils";

// 월별 현황 데이터 처리
const monthlyStats = processExpenditureData(unifiedPayments, selectedDate);

// 종합 대시보드 데이터 처리
const overviewStats = processOverviewData(unifiedPayments);
```

### 3. 컴포넌트에서 사용

```typescript
// ExpenditureDashboardPage.tsx
const { account } = props;
const payments = await loadPayments(account.provider, account.id);
const stats = processExpenditureData(payments, selectedDate);

// 이제 stats를 사용하여 차트, 테이블 등 렌더링
```

---

## 파일 구조

```
src/
├── shared/
│   ├── api/
│   │   └── types.ts              # CoupangPaymentListItem 추가
│   └── lib/
│       ├── unifiedPayment.ts     # 공통 타입 정의
│       └── paymentParsers.ts     # 플랫폼별 파서
├── pages/
│   └── expenditure/
│       ├── lib/
│       │   └── utils.ts          # UnifiedPayment 타입으로 수정
│       └── ui/
│           ├── ExpenditureDashboardPage.tsx  # 쿠팡 지원 추가
│           └── ExpenditureOverviewPage.tsx   # 쿠팡 지원 추가
src-tauri/
└── src/
    └── lib.rs                    # list_coupang_payments 추가
```

---

## 확장 가이드

### 새로운 플랫폼 추가 시

1. `AccountProvider` 타입에 새 플랫폼 추가
2. `XxxPaymentListItem` 타입 정의
3. `parseXxxPayments()` 파서 함수 구현
4. `list_xxx_payments` Rust API 추가
5. 컴포넌트에서 새 플랫폼 분기 처리

### 새로운 필드 추가 시

1. `unified_payment` 또는 `unified_payment_item`에 필드 추가
2. 각 플랫폼 파서에서 매핑 로직 추가
3. 유틸리티 함수에서 새 필드 활용
4. 이 문서의 매핑 테이블 업데이트

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2025-11-26 | 초기 설계 및 구현 |

