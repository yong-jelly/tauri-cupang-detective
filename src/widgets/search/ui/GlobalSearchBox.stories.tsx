import type { Meta, StoryObj } from "@storybook/react";
import { GlobalSearchBox } from "./GlobalSearchBox";
import { useEffect } from "react";

// storybook action 대체 함수
const actionFn = () => () => {};

const meta: Meta<typeof GlobalSearchBox> = {
  title: "Widgets/Search/GlobalSearchBox",
  component: GlobalSearchBox,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
전역 검색 입력 컴포넌트입니다. 헤더 영역에 배치되어 상품 검색 기능을 제공합니다.

### 주요 기능
- **검색 실행**: Enter 키 또는 검색 아이콘 클릭으로 검색 실행
- **검색 히스토리**: 최근 검색어를 localStorage에 저장하고 드롭다운으로 표시
- **단축키 지원**: ⌘K (macOS) / Ctrl+K (Windows)로 검색창 포커스
- **히스토리 관리**: 개별 항목 삭제 및 전체 삭제 가능
- **마우스 클릭 지원**: 검색창, 히스토리 항목, 삭제 버튼 모두 마우스 클릭 가능

### 사용 예시
\`\`\`tsx
import { GlobalSearchBox } from "@widgets/search";

<GlobalSearchBox 
  onSearch={(query) => console.log("검색:", query)} 
  placeholder="상품 검색... (⌘K)"
/>
\`\`\`
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    onSearch: {
      description: "검색 실행 시 호출되는 콜백 함수",
      action: "searched",
    },
    placeholder: {
      description: "검색창 placeholder 텍스트",
      control: "text",
      table: {
        defaultValue: { summary: "상품 검색..." },
      },
    },
    storageKey: {
      description: "검색 히스토리를 저장할 localStorage 키",
      control: "text",
      table: {
        defaultValue: { summary: "tauti_search_history" },
      },
    },
    maxHistoryItems: {
      description: "최대 히스토리 저장 개수",
      control: { type: "number", min: 1, max: 50 },
      table: {
        defaultValue: { summary: "10" },
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[400px] p-8 bg-[#f8f6f1]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 검색창 상태
 */
export const Default: Story = {
  args: {
    onSearch: actionFn(),
    placeholder: "상품 검색... (⌘K)",
  },
};

/**
 * 커스텀 placeholder가 적용된 검색창
 */
export const CustomPlaceholder: Story = {
  args: {
    onSearch: actionFn(),
    placeholder: "거래 내역 검색...",
  },
};

/**
 * 히스토리가 있는 상태 (포커스 시 드롭다운 표시)
 *
 * 실제 동작을 확인하려면 검색어를 입력하고 Enter를 누른 후,
 * 검색창을 클릭하면 히스토리 드롭다운이 표시됩니다.
 */
export const WithHistory: Story = {
  args: {
    onSearch: actionFn(),
    placeholder: "상품 검색...",
    storageKey: "storybook_search_history",
  },
  decorators: [
    (Story) => {
      // 스토리북용 히스토리 데이터 설정
      useEffect(() => {
        localStorage.setItem(
          "storybook_search_history",
          JSON.stringify(["아이패드", "맥북 프로", "에어팟", "애플워치", "아이폰 15"])
        );
        return () => {
          localStorage.removeItem("storybook_search_history");
        };
      }, []);

      return (
        <div className="w-[400px] p-8 bg-[#f8f6f1]">
          <p className="text-xs text-[#8b7355] mb-4">
            💡 검색창을 클릭하면 히스토리 드롭다운이 표시됩니다
          </p>
          <Story />
        </div>
      );
    },
  ],
};

/**
 * 타이틀바 영역에 배치된 검색창 시뮬레이션
 */
export const InTitlebar: Story = {
  args: {
    onSearch: actionFn(),
    placeholder: "상품 검색... (⌘K)",
  },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <div className="h-12 bg-[#f8f6f1] border-b border-[#2d2416]/5 flex items-center justify-center px-4">
          <Story />
        </div>
        <div className="h-40 bg-[#fffef0] flex items-center justify-center text-[#8b7355] text-sm">
          콘텐츠 영역
        </div>
      </div>
    ),
  ],
};

/**
 * 다크 배경에서의 검색창
 */
export const OnDarkBackground: Story = {
  args: {
    onSearch: actionFn(),
    placeholder: "검색어를 입력하세요",
  },
  decorators: [
    (Story) => (
      <div className="w-[400px] p-8 bg-[#2d2416]">
        <Story />
      </div>
    ),
  ],
};

/**
 * 좁은 너비에서의 검색창
 */
export const NarrowWidth: Story = {
  args: {
    onSearch: actionFn(),
    placeholder: "검색...",
  },
  decorators: [
    (Story) => (
      <div className="w-[250px] p-4 bg-[#f8f6f1]">
        <Story />
      </div>
    ),
  ],
};

