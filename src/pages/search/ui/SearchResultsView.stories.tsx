import type { Meta, StoryObj } from "@storybook/react";
import { SearchResultsView } from "./SearchResultsView";
import type { SearchResultItem } from "@shared/api/types";

// storybook action 대체 함수
const actionFn = () => () => {};

// Mock 데이터
const mockResults: SearchResultItem[] = [
  {
    id: 1,
    provider: "naver",
    productName: "Apple 아이패드 프로 12.9인치 (6세대) Wi-Fi 256GB",
    imageUrl: "https://shopping-phinf.pstatic.net/main_3246594/32465940556.20230208092938.jpg",
    merchantName: "애플 공식 스토어",
    paidAt: "2024-11-15T14:30:00Z",
    quantity: 1,
    unitPrice: 1729000,
    lineAmount: 1729000,
  },
  {
    id: 2,
    provider: "coupang",
    productName: "삼성전자 갤럭시 버즈3 프로 SM-R630",
    imageUrl: "https://thumbnail6.coupangcdn.com/thumbnails/remote/230x230ex/image/retail/images/2024/07/08/8/3/e78c6ad0-f47b-42ab-8e2c-e56a3e5b5d21.jpg",
    merchantName: "삼성전자 공식 판매점",
    paidAt: "2024-11-10T09:15:00Z",
    quantity: 2,
    unitPrice: 289000,
    lineAmount: 578000,
  },
  {
    id: 3,
    provider: "naver",
    productName: "로지텍 MX Master 3S 무선 마우스 (그래파이트)",
    imageUrl: null,
    merchantName: "로지텍 코리아",
    paidAt: "2024-10-28T16:45:00Z",
    quantity: 1,
    unitPrice: 159000,
    lineAmount: 159000,
  },
  {
    id: 4,
    provider: "coupang",
    productName: "소니 WH-1000XM5 무선 노이즈 캔슬링 헤드폰 블랙",
    imageUrl: "https://thumbnail6.coupangcdn.com/thumbnails/remote/230x230ex/image/retail/images/2022/05/17/15/6/b09f1c3b-7c31-4c71-a4b3-5f1d5e7f2d3a.jpg",
    merchantName: "소니스토어 공식",
    paidAt: "2024-10-20T11:20:00Z",
    quantity: 1,
    unitPrice: 498000,
    lineAmount: 498000,
  },
  {
    id: 5,
    provider: "naver",
    productName: "애플 에어팟 프로 2세대 (USB-C)",
    imageUrl: "https://shopping-phinf.pstatic.net/main_3851912/38519125618.20231012163222.jpg",
    merchantName: "애플 공식 스토어",
    paidAt: "2024-09-15T08:00:00Z",
    quantity: 1,
    unitPrice: 359000,
    lineAmount: 359000,
  },
  {
    id: 6,
    provider: "coupang",
    productName: "닌텐도 스위치 OLED 모델 화이트",
    imageUrl: null,
    merchantName: "닌텐도 공식",
    paidAt: "2024-09-01T19:30:00Z",
    quantity: 1,
    unitPrice: 415000,
    lineAmount: 415000,
  },
];

const meta: Meta<typeof SearchResultsView> = {
  title: "Pages/Search/SearchResultsView",
  component: SearchResultsView,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `
검색 결과를 표시하는 UI 컴포넌트입니다.

### 주요 기능
- **검색 결과 표시**: 네이버/쿠팡 통합 검색 결과 표시
- **통계 카드**: 총 결과 수, 금액, 수량, 기간 정보 표시
- **필터링**: 도메인(네이버/쿠팡)별 필터
- **정렬**: 날짜, 금액, 이름 기준 정렬
- **뷰 모드**: 리스트/그리드 뷰 전환
- **닫기 버튼**: 우측 상단 닫기 버튼으로 검색 모드 종료

### 사용 예시
\`\`\`tsx
import { SearchResultsView } from "@pages/search";

<SearchResultsView
  query="아이패드"
  results={searchResults}
  total={searchResults.length}
  loading={false}
  error={null}
  onClose={() => setSearchMode(false)}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    query: {
      description: "검색 쿼리 문자열",
      control: "text",
    },
    results: {
      description: "검색 결과 아이템 배열",
      control: "object",
    },
    total: {
      description: "전체 검색 결과 수",
      control: "number",
    },
    loading: {
      description: "로딩 상태",
      control: "boolean",
    },
    error: {
      description: "에러 메시지 (있을 경우)",
      control: "text",
    },
    onClose: {
      description: "닫기 버튼 클릭 시 호출되는 콜백",
      action: "closed",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 검색 결과가 있는 기본 상태
 */
export const Default: Story = {
  args: {
    query: "애플",
    results: mockResults,
    total: mockResults.length,
    loading: false,
    error: null,
    onClose: actionFn(),
  },
};

/**
 * 로딩 중 상태
 */
export const Loading: Story = {
  args: {
    query: "아이패드",
    results: [],
    total: 0,
    loading: true,
    error: null,
    onClose: actionFn(),
  },
};

/**
 * 에러 상태
 */
export const Error: Story = {
  args: {
    query: "검색어",
    results: [],
    total: 0,
    loading: false,
    error: "검색 중 오류가 발생했습니다. 네트워크 연결을 확인해 주세요.",
    onClose: actionFn(),
  },
};

/**
 * 검색 결과 없음
 */
export const NoResults: Story = {
  args: {
    query: "존재하지않는상품명",
    results: [],
    total: 0,
    loading: false,
    error: null,
    onClose: actionFn(),
  },
};

/**
 * 네이버 결과만 있는 경우
 */
export const NaverOnly: Story = {
  args: {
    query: "애플",
    results: mockResults.filter(r => r.provider === "naver"),
    total: 3,
    loading: false,
    error: null,
    onClose: actionFn(),
  },
};

/**
 * 쿠팡 결과만 있는 경우
 */
export const CoupangOnly: Story = {
  args: {
    query: "삼성",
    results: mockResults.filter(r => r.provider === "coupang"),
    total: 3,
    loading: false,
    error: null,
    onClose: actionFn(),
  },
};

/**
 * 이미지가 없는 결과들
 */
export const WithoutImages: Story = {
  args: {
    query: "상품",
    results: mockResults.map(r => ({ ...r, imageUrl: null })),
    total: mockResults.length,
    loading: false,
    error: null,
    onClose: actionFn(),
  },
};

/**
 * 대량의 검색 결과 (스크롤 테스트)
 */
export const ManyResults: Story = {
  args: {
    query: "전자제품",
    results: Array.from({ length: 50 }, (_, i) => ({
      ...mockResults[i % mockResults.length],
      id: i + 1,
      productName: `상품 ${i + 1} - ${mockResults[i % mockResults.length].productName}`,
    })),
    total: 50,
    loading: false,
    error: null,
    onClose: actionFn(),
  },
};

/**
 * 단일 결과
 */
export const SingleResult: Story = {
  args: {
    query: "아이패드 프로",
    results: [mockResults[0]],
    total: 1,
    loading: false,
    error: null,
    onClose: actionFn(),
  },
};

