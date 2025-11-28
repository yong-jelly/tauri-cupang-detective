import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { SelectableChip } from "./SelectableChip";

const meta: Meta<typeof SelectableChip> = {
  title: "Shared/UI/SelectableChip",
  component: SelectableChip,
  parameters: {
    docs: {
      description: {
        component: `
토글 가능한 선택 칩 컴포넌트입니다.

## 사용 사례
- 퀵 버튼 (오늘/어제, 금액 선택 등)
- 결제 수단 선택
- 필터 태그
- 옵션 선택

## 특징
- 선택 시 황금색 배경 + 흰색 텍스트 + 그림자 + 확대 효과
- 체크마크(✓) 표시 옵션
- 아이콘/이모지 지원
- 3가지 크기 (sm, md, lg)
        `,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    label: {
      control: "text",
      description: "칩에 표시될 텍스트",
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
      description: "칩 크기",
    },
    showCheckmark: {
      control: "boolean",
      description: "선택 시 체크마크 표시 여부",
    },
    onClick: {
      action: "clicked",
      description: "클릭 이벤트 핸들러",
    },
  },
};

export default meta;
type Story = StoryObj<typeof SelectableChip>;

/** 기본 상태 */
export const Default: Story = {
  args: {
    label: "오늘",
    selected: false,
  },
};

/** 선택된 상태 */
export const Selected: Story = {
  args: {
    label: "오늘",
    selected: true,
  },
};

/** 체크마크 없이 */
export const WithoutCheckmark: Story = {
  args: {
    label: "₩10,000",
    selected: true,
    showCheckmark: false,
  },
};

/** 아이콘 포함 */
export const WithIcon: Story = {
  args: {
    label: "카드",
    selected: true,
    icon: "💳",
  },
};

/** 크기 비교 */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SelectableChip label="Small" size="sm" selected />
      <SelectableChip label="Medium" size="md" selected />
      <SelectableChip label="Large" size="lg" selected />
    </div>
  ),
};

/** 비활성화 상태 */
export const Disabled: Story = {
  args: {
    label: "비활성화",
    disabled: true,
  },
};

/** 인터랙티브 예제: 날짜 선택 */
export const DateQuickSelect: Story = {
  render: function DateQuickSelectStory() {
    const [selected, setSelected] = useState<string>("today");
    
    return (
      <div className="flex gap-2">
        <SelectableChip
          label="오늘"
          selected={selected === "today"}
          onClick={() => setSelected("today")}
        />
        <SelectableChip
          label="어제"
          selected={selected === "yesterday"}
          onClick={() => setSelected("yesterday")}
        />
        <SelectableChip
          label="이번 주"
          selected={selected === "week"}
          onClick={() => setSelected("week")}
        />
      </div>
    );
  },
};

/** 인터랙티브 예제: 금액 선택 */
export const AmountQuickSelect: Story = {
  render: function AmountQuickSelectStory() {
    const [selected, setSelected] = useState<string>("");
    const amounts = ["₩5,000", "₩10,000", "₩30,000", "₩50,000"];
    
    return (
      <div className="flex flex-wrap gap-2">
        {amounts.map((amount) => (
          <SelectableChip
            key={amount}
            label={amount}
            selected={selected === amount}
            onClick={() => setSelected(amount)}
          />
        ))}
      </div>
    );
  },
};

/** 인터랙티브 예제: 결제 수단 */
export const PaymentMethodSelect: Story = {
  render: function PaymentMethodSelectStory() {
    const [selected, setSelected] = useState<string>("");
    const methods = [
      { id: "card", label: "카드", icon: "💳" },
      { id: "cash", label: "현금", icon: "💵" },
      { id: "transfer", label: "계좌이체", icon: "🏦" },
      { id: "point", label: "포인트", icon: "🎁" },
    ];
    
    return (
      <div className="flex flex-wrap gap-2">
        {methods.map((method) => (
          <SelectableChip
            key={method.id}
            label={method.label}
            icon={method.icon}
            selected={selected === method.id}
            onClick={() => setSelected(selected === method.id ? "" : method.id)}
            size="lg"
          />
        ))}
      </div>
    );
  },
};

