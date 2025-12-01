import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { PaymentListModal } from "./PaymentListModal";
import { RetroButton } from "./RetroButton";
import type { UnifiedPayment } from "@shared/lib/unifiedPayment";

const meta: Meta<typeof PaymentListModal> = {
  title: "Shared/UI/PaymentListModal",
  component: PaymentListModal,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
결제 목록을 표시하는 모달 컴포넌트입니다.

## 특징
- **헤더 요약 정보**: 날짜 범위, 거래 건수, 총 금액, 최고 금액이 헤더에 자동 표시
- **날짜 범위 자동 계산**: 결제 목록에서 최초~최종 거래 날짜를 자동 계산
- **테이블 헤더 고정**: 스크롤 시에도 날짜/거래내역/금액 헤더가 상단에 고정
- **전체 목록 표시**: 모든 결제 내역을 스크롤로 확인 가능
- **확장 가능**: 각 행을 클릭하면 상세 항목 표시
- **레트로 스타일**: RetroModal + TransactionTable 조합

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`isOpen\` | boolean | - | 모달 열림 여부 |
| \`onClose\` | () => void | - | 닫기 핸들러 |
| \`payments\` | UnifiedPayment[] | - | 결제 목록 |
| \`title\` | string | "구매 내역" | 모달 제목 |
| \`subtitle\` | string | - | 모달 서브타이틀 (선택, 요약 정보 앞에 표시) |
| \`emptyMessage\` | string | - | 빈 데이터 메시지 |

## 사용 예시
\`\`\`tsx
const [isOpen, setIsOpen] = useState(false);

<PaymentListModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  payments={filteredPayments}
  title="~1만원 구매 내역"
/>
// 헤더에 "2024.01.15 ~ 2024.03.15 · 15건 · 합계 45만원 · 최고 9,800원" 형태로 자동 표시됨
\`\`\`
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    isOpen: {
      description: "모달 열림 여부",
      control: { type: "boolean" },
    },
    title: {
      description: "모달 제목",
      control: { type: "text" },
    },
    subtitle: {
      description: "모달 서브타이틀 (요약 정보와 함께 표시)",
      control: { type: "text" },
    },
    emptyMessage: {
      description: "빈 데이터 메시지",
      control: { type: "text" },
    },
    onClose: {
      description: "닫기 핸들러",
      action: "closed",
    },
  },
};

export default meta;
type Story = StoryObj<typeof PaymentListModal>;

// Mock 데이터: ~1만원 가격대
const mockSmallPayments: UnifiedPayment[] = [
  {
    id: 1,
    provider: "naver",
    payment_id: "PAY001",
    paid_at: "2024-03-15T08:30:00",
    total_amount: 4500,
    merchant_name: "스타벅스",
    product_name: "아이스 아메리카노",
    items: [
      { id: 101, line_no: 1, product_name: "아이스 아메리카노", quantity: 1, unit_price: 4500, line_amount: 4500 },
    ],
  },
  {
    id: 2,
    provider: "naver",
    payment_id: "PAY002",
    paid_at: "2024-03-14T12:00:00",
    total_amount: 8500,
    merchant_name: "이디야커피",
    product_name: "카페라떼 외 1건",
    items: [
      { id: 102, line_no: 1, product_name: "카페라떼", quantity: 1, unit_price: 4500, line_amount: 4500 },
      { id: 103, line_no: 2, product_name: "쿠키", quantity: 1, unit_price: 4000, line_amount: 4000 },
    ],
  },
  {
    id: 3,
    provider: "naver",
    payment_id: "PAY003",
    paid_at: "2024-03-13T19:20:00",
    total_amount: 6200,
    merchant_name: "GS25",
    product_name: "편의점 결제",
    items: [
      { id: 104, line_no: 1, product_name: "삼각김밥", quantity: 2, unit_price: 1400, line_amount: 2800 },
      { id: 105, line_no: 2, product_name: "컵라면", quantity: 1, unit_price: 1600, line_amount: 1600 },
      { id: 106, line_no: 3, product_name: "음료", quantity: 1, unit_price: 1800, line_amount: 1800 },
    ],
  },
  {
    id: 4,
    provider: "naver",
    payment_id: "PAY004",
    paid_at: "2024-03-12T10:15:00",
    total_amount: 3500,
    merchant_name: "파리바게트",
    product_name: "빵",
    items: [
      { id: 107, line_no: 1, product_name: "소보로빵", quantity: 1, unit_price: 2000, line_amount: 2000 },
      { id: 108, line_no: 2, product_name: "단팥빵", quantity: 1, unit_price: 1500, line_amount: 1500 },
    ],
  },
  {
    id: 5,
    provider: "naver",
    payment_id: "PAY005",
    paid_at: "2024-03-11T14:30:00",
    total_amount: 9800,
    merchant_name: "다이소",
    product_name: "생활용품",
    items: [
      { id: 109, line_no: 1, product_name: "물티슈", quantity: 2, unit_price: 2000, line_amount: 4000 },
      { id: 110, line_no: 2, product_name: "메모지", quantity: 3, unit_price: 1000, line_amount: 3000 },
      { id: 111, line_no: 3, product_name: "볼펜", quantity: 2, unit_price: 1400, line_amount: 2800 },
    ],
  },
];

// Mock 데이터: 3~5만원 가격대
const mockMediumPayments: UnifiedPayment[] = [
  {
    id: 10,
    provider: "coupang",
    payment_id: "ORD001",
    paid_at: "2024-03-15T10:00:00",
    total_amount: 35000,
    merchant_name: "쿠팡",
    product_name: "생활용품 세트",
    items: [
      { id: 201, line_no: 1, product_name: "세제 대용량", quantity: 1, unit_price: 15000, line_amount: 15000, brand_name: "피죤" },
      { id: 202, line_no: 2, product_name: "섬유유연제", quantity: 2, unit_price: 10000, line_amount: 20000, brand_name: "다우니" },
    ],
  },
  {
    id: 11,
    provider: "naver",
    payment_id: "PAY010",
    paid_at: "2024-03-14T18:30:00",
    total_amount: 42000,
    merchant_name: "올리브영",
    product_name: "스킨케어",
    items: [
      { id: 203, line_no: 1, product_name: "토너", quantity: 1, unit_price: 18000, line_amount: 18000, brand_name: "이니스프리" },
      { id: 204, line_no: 2, product_name: "수분크림", quantity: 1, unit_price: 24000, line_amount: 24000, brand_name: "이니스프리" },
    ],
  },
  {
    id: 12,
    provider: "coupang",
    payment_id: "ORD002",
    paid_at: "2024-03-13T12:00:00",
    total_amount: 48500,
    merchant_name: "쿠팡",
    product_name: "간식 세트",
    items: [
      { id: 205, line_no: 1, product_name: "과자 선물세트", quantity: 1, unit_price: 28000, line_amount: 28000 },
      { id: 206, line_no: 2, product_name: "초콜릿", quantity: 2, unit_price: 10250, line_amount: 20500 },
    ],
  },
];

// Mock 데이터: 10~30만원 가격대
const mockLargePayments: UnifiedPayment[] = [
  {
    id: 20,
    provider: "coupang",
    payment_id: "ORD010",
    paid_at: "2024-03-10T14:00:00",
    total_amount: 156000,
    merchant_name: "쿠팡",
    product_name: "전자제품",
    items: [
      { 
        id: 301,
        line_no: 1, 
        product_name: "삼성 갤럭시 버즈2", 
        quantity: 1, 
        unit_price: 89000, 
        line_amount: 89000, 
        brand_name: "Samsung",
        image_url: "https://via.placeholder.com/100x100?text=Buds"
      },
      { 
        id: 302,
        line_no: 2, 
        product_name: "충전 케이블 3m", 
        quantity: 2, 
        unit_price: 15000, 
        line_amount: 30000 
      },
      { 
        id: 303,
        line_no: 3, 
        product_name: "케이스", 
        quantity: 1, 
        unit_price: 37000, 
        line_amount: 37000 
      },
    ],
  },
  {
    id: 21,
    provider: "coupang",
    payment_id: "ORD011",
    paid_at: "2024-03-08T11:00:00",
    total_amount: 245000,
    merchant_name: "쿠팡",
    product_name: "키보드",
    items: [
      { 
        id: 304,
        line_no: 1, 
        product_name: "로지텍 MX Keys Mini", 
        quantity: 1, 
        unit_price: 139000, 
        line_amount: 139000, 
        brand_name: "Logitech",
        image_url: "https://via.placeholder.com/100x100?text=Keyboard"
      },
      { 
        id: 305,
        line_no: 2, 
        product_name: "로지텍 MX Master 3", 
        quantity: 1, 
        unit_price: 106000, 
        line_amount: 106000, 
        brand_name: "Logitech",
        image_url: "https://via.placeholder.com/100x100?text=Mouse"
      },
    ],
  },
];

// 많은 데이터 (페이지네이션 테스트용)
const manyPayments: UnifiedPayment[] = Array.from({ length: 25 }, (_, i) => ({
  id: 100 + i,
  provider: i % 2 === 0 ? "naver" : "coupang" as const,
  payment_id: `PAY${String(100 + i).padStart(3, "0")}`,
  paid_at: `2024-03-${String(15 - Math.floor(i / 3)).padStart(2, "0")}T${String(8 + i % 12).padStart(2, "0")}:00:00`,
  total_amount: 5000 + (i * 500),
  merchant_name: ["스타벅스", "이디야", "투썸", "GS25", "CU"][i % 5],
  product_name: ["커피", "음료", "간식", "편의점 결제", "베이커리"][i % 5],
  items: [
    { 
      id: 1000 + i,
      line_no: 1, 
      product_name: ["아메리카노", "카페라떼", "케이크", "삼각김밥", "빵"][i % 5], 
      quantity: 1 + (i % 3), 
      unit_price: 3000 + (i * 100),
      line_amount: (3000 + (i * 100)) * (1 + (i % 3)),
    },
  ],
}));

// 인터랙티브 래퍼
const ModalWrapper = (props: Partial<React.ComponentProps<typeof PaymentListModal>>) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <RetroButton onClick={() => setIsOpen(true)}>목록 보기</RetroButton>
      <PaymentListModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        payments={mockSmallPayments}
        title="구매 내역"
        {...props}
      />
    </>
  );
};

/**
 * 기본 사용 예시 (~1만원 가격대)
 */
export const Default: Story = {
  render: () => (
    <ModalWrapper
      payments={mockSmallPayments}
      title="~1만원 구매 내역"
      subtitle="소액 결제 목록"
    />
  ),
};

/**
 * 중간 가격대 (3~5만원)
 */
export const MediumPrice: Story = {
  render: () => (
    <ModalWrapper
      payments={mockMediumPayments}
      title="3~5만원 구매 내역"
      subtitle="중간 가격대 결제"
    />
  ),
};

/**
 * 고가 결제 (10~30만원)
 */
export const HighPrice: Story = {
  render: () => (
    <ModalWrapper
      payments={mockLargePayments}
      title="10~30만원 구매 내역"
      subtitle="고가 결제 목록"
    />
  ),
};

/**
 * 많은 데이터 (전체 목록 스크롤)
 */
export const ManyItems: Story = {
  render: () => (
    <ModalWrapper
      payments={manyPayments}
      title="전체 구매 내역"
      subtitle="25건의 결제 내역"
    />
  ),
};

/**
 * 빈 데이터
 */
export const EmptyData: Story = {
  render: () => (
    <ModalWrapper
      payments={[]}
      title="구매 내역 없음"
      emptyMessage="해당 가격대의 구매 내역이 없습니다."
    />
  ),
};

/**
 * 커스텀 빈 메시지
 */
export const CustomEmptyMessage: Story = {
  render: () => (
    <ModalWrapper
      payments={[]}
      title="검색 결과"
      emptyMessage="🔍 조건에 맞는 결제 내역을 찾을 수 없습니다."
    />
  ),
};

/**
 * 단일 항목
 */
export const SingleItem: Story = {
  render: () => (
    <ModalWrapper
      payments={[mockSmallPayments[0]]}
      title="최근 결제"
      subtitle="1건"
    />
  ),
};

// 긴 상품명 테스트용 데이터
const mockLongNamePayments: UnifiedPayment[] = [
  {
    id: 30,
    provider: "coupang",
    payment_id: "ORD030",
    paid_at: "2024-03-15T10:00:00",
    total_amount: 45000,
    merchant_name: "쿠팡",
    product_name: "[특가세일] 삼성전자 갤럭시 워치6 클래식 47mm 블루투스 모델 실버 스마트워치 + 정품 가죽 스트랩 세트 외 3건",
    items: [
      { id: 401, line_no: 1, product_name: "[특가세일] 삼성전자 갤럭시 워치6 클래식 47mm 블루투스 모델 실버 스마트워치", quantity: 1, unit_price: 35000, line_amount: 35000 },
      { id: 402, line_no: 2, product_name: "정품 가죽 스트랩", quantity: 1, unit_price: 10000, line_amount: 10000 },
    ],
  },
  {
    id: 31,
    provider: "naver",
    payment_id: "PAY031",
    paid_at: "2024-03-14T14:30:00",
    total_amount: 89000,
    merchant_name: "네이버쇼핑",
    product_name: "애플 에어팟 프로 2세대 MagSafe 충전 케이스 포함 정품 무선 이어폰 화이트 색상 새제품 미개봉",
    items: [
      { id: 403, line_no: 1, product_name: "애플 에어팟 프로 2세대 MagSafe 충전 케이스 포함", quantity: 1, unit_price: 89000, line_amount: 89000 },
    ],
  },
  {
    id: 32,
    provider: "coupang",
    payment_id: "ORD032",
    paid_at: "2024-03-13T09:15:00",
    total_amount: 156000,
    merchant_name: "로켓배송",
    product_name: "LG 그램 노트북 파우치 15.6인치 호환 고급 네오프렌 소재 스크래치 방지 초경량 캐리어 가방",
    items: [
      { id: 404, line_no: 1, product_name: "LG 그램 노트북 파우치 15.6인치", quantity: 2, unit_price: 78000, line_amount: 156000 },
    ],
  },
];

/**
 * 긴 상품명 (텍스트 자르기 테스트)
 */
export const LongProductNames: Story = {
  render: () => (
    <ModalWrapper
      payments={mockLongNamePayments}
      title="긴 상품명 테스트"
      subtitle="텍스트가 긴 경우 잘림 처리 확인"
    />
  ),
};

/**
 * 가격대별 필터링 시뮬레이션
 */
export const PriceRangeDemo: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState<{ label: string; payments: UnifiedPayment[] } | null>(null);

    const priceRanges = [
      { label: "~1만원", payments: mockSmallPayments },
      { label: "3~5만원", payments: mockMediumPayments },
      { label: "10~30만원", payments: mockLargePayments },
    ];

    return (
      <>
        <div className="flex gap-2">
          {priceRanges.map((range) => (
            <div
              key={range.label}
              onClick={() => {
                setSelectedRange(range);
                setIsOpen(true);
              }}
              className="p-4 bg-[#f6f1e9] border border-[#d4c4a8] cursor-pointer hover:bg-[#ede5d5] transition-colors"
            >
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">{range.label}</div>
              <div className="text-xl font-bold font-mono text-gray-900 mt-1">{range.payments.length}</div>
              <div className="text-xs text-gray-500">건</div>
            </div>
          ))}
        </div>
        {selectedRange && (
          <PaymentListModal
            isOpen={isOpen}
            onClose={() => {
              setIsOpen(false);
              setSelectedRange(null);
            }}
            payments={selectedRange.payments}
            title={`${selectedRange.label} 구매 내역`}
            subtitle={`총 ${selectedRange.payments.length}건`}
          />
        )}
      </>
    );
  },
};

