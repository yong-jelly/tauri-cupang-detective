import type { Meta, StoryObj } from "@storybook/react";
import { TrendingUp, Receipt, Calendar, Database } from "lucide-react";
import { StatCard } from "./StatCard";

const meta: Meta<typeof StatCard> = {
  title: "Shared/UI/StatCard",
  component: StatCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "레트로/브루탈리스트 스타일의 통계 카드 컴포넌트입니다. 대시보드에서 주요 지표를 표시하는 데 사용됩니다.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "success", "danger", "info"],
      description: "값의 색상 변형",
    },
    label: {
      control: "text",
      description: "지표의 레이블",
    },
    value: {
      control: "text",
      description: "지표의 값",
    },
    suffix: {
      control: "text",
      description: "값 뒤에 붙는 단위",
    },
    description: {
      control: "text",
      description: "추가 설명",
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  args: {
    label: "총 처리",
    value: "125 / 200",
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const WithIcon: Story = {
  args: {
    label: "총 지출액",
    value: "₩1,234,567",
    icon: <Receipt className="w-4 h-4" />,
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const Success: Story = {
  args: {
    label: "성공",
    value: 150,
    variant: "success",
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const Danger: Story = {
  args: {
    label: "실패",
    value: 5,
    variant: "danger",
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const WithDescription: Story = {
  args: {
    label: "일 평균 지출",
    value: "₩45,000",
    description: "12월 기준",
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const WithSuffix: Story = {
  args: {
    label: "파일 크기",
    value: "2.5",
    suffix: "MB",
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const DashboardExample: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        label="총 처리"
        value="125 / 200"
        icon={<Database className="w-4 h-4" />}
      />
      <StatCard
        label="성공"
        value={150}
        variant="success"
        icon={<TrendingUp className="w-4 h-4" />}
      />
      <StatCard
        label="실패"
        value={5}
        variant="danger"
      />
      <StatCard
        label="현재 페이지"
        value={12}
        variant="info"
        icon={<Calendar className="w-4 h-4" />}
      />
    </div>
  ),
};

export const ExpenditureExample: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        label="총 지출액"
        value="₩1,234,567"
        icon={<Receipt className="w-4 h-4" />}
        description="총 45건의 거래"
      />
      <StatCard
        label="일 평균 지출"
        value="₩41,152"
        icon={<TrendingUp className="w-4 h-4" />}
        description="12월 기준"
      />
      <StatCard
        label="최다 지출처"
        value="쿠팡"
        icon={<Calendar className="w-4 h-4" />}
        description="₩456,789 (37%)"
      />
    </div>
  ),
};

