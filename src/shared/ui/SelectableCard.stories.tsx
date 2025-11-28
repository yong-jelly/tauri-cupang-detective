import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { SelectableCard, SelectableCardGroup } from "./SelectableCard";

const meta: Meta<typeof SelectableCard> = {
  title: "Shared/UI/SelectableCard",
  component: SelectableCard,
  parameters: {
    docs: {
      description: {
        component: `
선택 가능한 카드 컴포넌트입니다.

## 사용 사례
- 카테고리 선택
- 플랫폼/채널 선택
- 유형 선택 (수입/지출)
- 옵션 카드

## 특징
- 선택 시 그라데이션 배경 + 링 효과 + 그림자
- "선택됨 ✓" 배지 표시
- 아이콘/이모지 지원
- 설명 텍스트 지원
- 3가지 크기 (sm, md, lg)
- SelectableCardGroup으로 그룹 관리 가능
        `,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    label: {
      control: "text",
      description: "카드 라벨",
    },
    description: {
      control: "text",
      description: "부가 설명",
    },
    selected: {
      control: "boolean",
      description: "선택 상태",
    },
    disabled: {
      control: "boolean",
      description: "비활성화 상태",
    },
    size: {
      control: "radio",
      options: ["sm", "md", "lg"],
      description: "카드 크기",
    },
    showBadge: {
      control: "boolean",
      description: "선택됨 배지 표시 여부",
    },
    onClick: {
      action: "clicked",
      description: "클릭 이벤트 핸들러",
    },
  },
};

export default meta;
type Story = StoryObj<typeof SelectableCard>;

/** 기본 상태 */
export const Default: Story = {
  args: {
    label: "식비",
    description: "외식, 식료품, 카페",
    icon: "🍜",
    selected: false,
  },
};

/** 선택된 상태 */
export const Selected: Story = {
  args: {
    label: "식비",
    description: "외식, 식료품, 카페",
    icon: "🍜",
    selected: true,
  },
};

/** 설명 없이 */
export const WithoutDescription: Story = {
  args: {
    label: "오프라인",
    icon: "🏪",
    selected: true,
  },
};

/** 아이콘 없이 */
export const WithoutIcon: Story = {
  args: {
    label: "기타",
    description: "분류하기 어려운 것들",
    selected: false,
  },
};

/** 배지 없이 */
export const WithoutBadge: Story = {
  args: {
    label: "교통",
    description: "대중교통, 주유, 택시",
    icon: "🚗",
    selected: true,
    showBadge: false,
  },
};

/** 크기 비교 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-64">
      <SelectableCard 
        label="Small" 
        description="작은 크기" 
        icon="📦" 
        size="sm" 
        selected 
      />
      <SelectableCard 
        label="Medium" 
        description="중간 크기" 
        icon="📦" 
        size="md" 
        selected 
      />
      <SelectableCard 
        label="Large" 
        description="큰 크기" 
        icon="📦" 
        size="lg" 
        selected 
      />
    </div>
  ),
};

/** 인터랙티브 예제: 카테고리 선택 */
export const CategorySelect: Story = {
  render: function CategorySelectStory() {
    const [selected, setSelected] = useState<string>("");
    
    const categories = [
      { id: "food", label: "식비", description: "외식, 식료품, 카페", icon: "🍜" },
      { id: "transport", label: "교통", description: "대중교통, 주유, 택시", icon: "🚗" },
      { id: "shopping", label: "쇼핑", description: "의류, 생필품, 가전", icon: "🛍️" },
      { id: "leisure", label: "여가", description: "문화, 취미, 여행", icon: "🎮" },
    ];
    
    return (
      <div className="grid grid-cols-2 gap-3 w-96">
        {categories.map((cat) => (
          <SelectableCard
            key={cat.id}
            label={cat.label}
            description={cat.description}
            icon={cat.icon}
            selected={selected === cat.id}
            onClick={() => setSelected(cat.id)}
          />
        ))}
      </div>
    );
  },
};

/** 인터랙티브 예제: 유형 선택 */
export const TypeSelect: Story = {
  render: function TypeSelectStory() {
    const [selected, setSelected] = useState<string>("");
    
    return (
      <div className="grid grid-cols-2 gap-4 w-96">
        <SelectableCard
          label="지출"
          description="돈을 썼어요"
          icon="💸"
          selected={selected === "expense"}
          onClick={() => setSelected("expense")}
          size="lg"
        />
        <SelectableCard
          label="수입"
          description="돈이 들어왔어요"
          icon="💰"
          selected={selected === "income"}
          onClick={() => setSelected("income")}
          size="lg"
        />
      </div>
    );
  },
};

// SelectableCardGroup 스토리
const groupMeta: Meta<typeof SelectableCardGroup> = {
  title: "Shared/UI/SelectableCardGroup",
  component: SelectableCardGroup,
};

/** SelectableCardGroup: 지출 카테고리 */
export const ExpenseCategoryGroup: Story = {
  render: function ExpenseCategoryGroupStory() {
    const [value, setValue] = useState<string>();
    
    const categories = [
      { id: "food", label: "식비", description: "외식, 식료품, 카페", icon: "🍜" },
      { id: "transport", label: "교통", description: "대중교통, 주유, 택시", icon: "🚗" },
      { id: "housing", label: "주거", description: "월세, 관리비, 공과금", icon: "🏠" },
      { id: "shopping", label: "쇼핑", description: "의류, 생필품, 가전", icon: "🛍️" },
      { id: "leisure", label: "여가", description: "문화, 취미, 여행", icon: "🎮" },
      { id: "etc", label: "기타", description: "분류하기 어려운 것들", icon: "📦" },
    ];
    
    return (
      <div className="w-[500px]">
        <SelectableCardGroup
          options={categories}
          value={value}
          onChange={setValue}
          columns={2}
        />
        <p className="mt-4 text-sm text-gray-600">
          선택된 값: {value || "없음"}
        </p>
      </div>
    );
  },
};

/** SelectableCardGroup: 플랫폼 선택 (3열) */
export const PlatformGroup: Story = {
  render: function PlatformGroupStory() {
    const [value, setValue] = useState<string>();
    
    const platforms = [
      { id: "offline", label: "오프라인", icon: "🏪" },
      { id: "online", label: "온라인 쇼핑몰", icon: "🛒" },
      { id: "social", label: "소셜", icon: "📱" },
      { id: "app", label: "앱 서비스", icon: "📲" },
      { id: "subscription", label: "구독", icon: "🔄" },
      { id: "etc", label: "기타", icon: "📦" },
    ];
    
    return (
      <div className="w-[600px]">
        <SelectableCardGroup
          options={platforms}
          value={value}
          onChange={setValue}
          columns={3}
          size="sm"
          toggleable
        />
        <p className="mt-4 text-sm text-gray-600">
          선택된 값: {value || "없음"} (토글 모드)
        </p>
      </div>
    );
  },
};

/** SelectableCardGroup: 수입 카테고리 */
export const IncomeCategoryGroup: Story = {
  render: function IncomeCategoryGroupStory() {
    const [value, setValue] = useState<string>();
    
    const categories = [
      { id: "salary", label: "급여", description: "월급, 상여금", icon: "💵" },
      { id: "side", label: "부수입", description: "프리랜서, 아르바이트", icon: "💼" },
      { id: "investment", label: "투자", description: "배당, 이자 수익", icon: "📈" },
      { id: "gift", label: "용돈/선물", description: "받은 용돈, 선물", icon: "🎀" },
    ];
    
    return (
      <div className="w-[500px]">
        <SelectableCardGroup
          options={categories}
          value={value}
          onChange={setValue}
          columns={2}
        />
      </div>
    );
  },
};

