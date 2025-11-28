import type { Meta, StoryObj } from "@storybook/react";
import { TransactionTable } from "./TransactionTable";
import type { UnifiedPayment } from "@shared/lib/unifiedPayment";

const meta: Meta<typeof TransactionTable> = {
  title: "Shared/TransactionTable",
  component: TransactionTable,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
거래 내역을 표시하는 테이블 컴포넌트입니다.

## 특징
- **확장/축소**: 각 행을 클릭하면 상세 항목 정보가 표시됩니다.
- **페이지네이션**: \`visibleCount\`와 \`onLoadMore\`를 통해 더보기 기능을 지원합니다.
- **레트로 스타일**: 앱의 전체적인 디자인 언어와 일관된 스타일을 적용합니다.

## 사용 예시
\`\`\`tsx
<TransactionTable
  payments={payments}
  visibleCount={10}
  showLoadMore={payments.length > 10}
  remainingCount={payments.length - 10}
  onLoadMore={() => setVisibleCount(prev => prev + 10)}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    payments: {
      description: "표시할 결제 목록 (UnifiedPayment[])",
      control: false,
    },
    visibleCount: {
      description: "현재 표시되는 항목 수 (페이지네이션용)",
      control: { type: "number" },
    },
    showLoadMore: {
      description: "더보기 버튼 표시 여부",
      control: { type: "boolean" },
    },
    remainingCount: {
      description: "남은 항목 수 (더보기 버튼에 표시)",
      control: { type: "number" },
    },
    emptyMessage: {
      description: "데이터 없을 때 표시할 메시지",
      control: { type: "text" },
    },
    compact: {
      description: "컴팩트 모드 (패딩 축소)",
      control: { type: "boolean" },
    },
    onLoadMore: {
      description: "더보기 버튼 클릭 핸들러",
      action: "loadMore",
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-white border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] max-w-4xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TransactionTable>;

// Mock 데이터
const mockPayments: UnifiedPayment[] = [
  {
    id: 1,
    payment_id: "PAY001",
    paid_at: "2024-03-15T10:30:00",
    total_amount: 45000,
    merchant_name: "스타벅스",
    product_name: "아메리카노 외 2건",
    items: [
      {
        line_no: 1,
        product_name: "아이스 아메리카노",
        quantity: 2,
        unit_price: 4500,
        line_amount: 9000,
      },
      {
        line_no: 2,
        product_name: "카페라떼",
        quantity: 1,
        unit_price: 5000,
        line_amount: 5000,
      },
      {
        line_no: 3,
        product_name: "치즈케이크",
        quantity: 1,
        unit_price: 6500,
        line_amount: 6500,
      },
    ],
  },
  {
    id: 2,
    payment_id: "PAY002",
    paid_at: "2024-03-14T18:45:00",
    total_amount: 89000,
    merchant_name: "쿠팡",
    product_name: "무선 이어폰",
    items: [
      {
        line_no: 1,
        product_name: "삼성 갤럭시 버즈2",
        quantity: 1,
        unit_price: 89000,
        line_amount: 89000,
        brand_name: "Samsung",
        image_url: "https://via.placeholder.com/100x100?text=Buds",
      },
    ],
  },
  {
    id: 3,
    payment_id: "PAY003",
    paid_at: "2024-03-13T12:00:00",
    total_amount: 12500,
    merchant_name: "배달의민족",
    product_name: "김치찌개 정식",
    items: [
      {
        line_no: 1,
        product_name: "김치찌개 정식",
        quantity: 1,
        unit_price: 9000,
        line_amount: 9000,
      },
      {
        line_no: 2,
        product_name: "공기밥 추가",
        quantity: 1,
        unit_price: 1000,
        line_amount: 1000,
      },
      {
        line_no: 3,
        product_name: "배달팁",
        quantity: 1,
        unit_price: 2500,
        line_amount: 2500,
      },
    ],
  },
  {
    id: 4,
    payment_id: "PAY004",
    paid_at: "2024-03-12T09:15:00",
    total_amount: 156000,
    merchant_name: "올리브영",
    product_name: "스킨케어 세트",
    items: [
      {
        line_no: 1,
        product_name: "토너",
        quantity: 1,
        unit_price: 28000,
        line_amount: 28000,
        brand_name: "이니스프리",
      },
      {
        line_no: 2,
        product_name: "세럼",
        quantity: 1,
        unit_price: 45000,
        line_amount: 45000,
        brand_name: "이니스프리",
      },
      {
        line_no: 3,
        product_name: "수분크림",
        quantity: 2,
        unit_price: 38000,
        line_amount: 76000,
        brand_name: "이니스프리",
      },
    ],
  },
  {
    id: 5,
    payment_id: "PAY005",
    paid_at: "2024-03-11T20:30:00",
    total_amount: 35000,
    merchant_name: "GS25",
    product_name: "편의점 결제",
    items: [],
  },
];

// 더 많은 데이터
const manyPayments: UnifiedPayment[] = [
  ...mockPayments,
  {
    id: 6,
    payment_id: "PAY006",
    paid_at: "2024-03-10T14:00:00",
    total_amount: 23000,
    merchant_name: "교보문고",
    product_name: "책 구매",
    items: [
      {
        line_no: 1,
        product_name: "클린 코드",
        quantity: 1,
        unit_price: 23000,
        line_amount: 23000,
      },
    ],
  },
  {
    id: 7,
    payment_id: "PAY007",
    paid_at: "2024-03-09T11:30:00",
    total_amount: 8500,
    merchant_name: "이디야커피",
    product_name: "아메리카노",
    items: [
      {
        line_no: 1,
        product_name: "아이스 아메리카노 (L)",
        quantity: 2,
        unit_price: 4250,
        line_amount: 8500,
      },
    ],
  },
  {
    id: 8,
    payment_id: "PAY008",
    paid_at: "2024-03-08T19:00:00",
    total_amount: 67000,
    merchant_name: "CGV",
    product_name: "영화 관람",
    items: [
      {
        line_no: 1,
        product_name: "듄: 파트2 (IMAX)",
        quantity: 2,
        unit_price: 18000,
        line_amount: 36000,
      },
      {
        line_no: 2,
        product_name: "콤보 세트",
        quantity: 1,
        unit_price: 15000,
        line_amount: 15000,
      },
    ],
  },
];

/**
 * 기본 사용 예시
 */
export const Default: Story = {
  args: {
    payments: mockPayments,
  },
};

/**
 * 컴팩트 모드
 */
export const Compact: Story = {
  args: {
    payments: mockPayments,
    compact: true,
  },
};

/**
 * 더보기 버튼 포함
 */
export const WithLoadMore: Story = {
  args: {
    payments: manyPayments,
    visibleCount: 5,
    showLoadMore: true,
    remainingCount: 3,
  },
};

/**
 * 빈 데이터
 */
export const Empty: Story = {
  args: {
    payments: [],
    emptyMessage: "해당 기간에는 거래 내역이 없습니다.",
  },
};

/**
 * 커스텀 빈 메시지
 */
export const CustomEmptyMessage: Story = {
  args: {
    payments: [],
    emptyMessage: "🔍 검색 결과가 없습니다.",
  },
};

/**
 * 단일 항목
 */
export const SingleItem: Story = {
  args: {
    payments: [mockPayments[1]],
  },
};

/**
 * 상세 정보 없는 항목
 */
export const NoItemDetails: Story = {
  args: {
    payments: [mockPayments[4]], // GS25 - items가 빈 배열
  },
};

