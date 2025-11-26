import type { Meta, StoryObj } from "@storybook/react";
import { CheckCircle, AlertCircle, Clock, Info as InfoIcon } from "lucide-react";
import { RetroBadge } from "./RetroBadge";

const meta: Meta<typeof RetroBadge> = {
  title: "Shared/UI/RetroBadge",
  component: RetroBadge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "레트로/브루탈리스트 스타일의 배지 컴포넌트입니다. 상태나 태그를 표시하는 데 사용됩니다.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "success", "warning", "danger", "info"],
      description: "배지의 스타일 변형",
    },
    size: {
      control: "select",
      options: ["sm", "md"],
      description: "배지의 크기",
    },
    icon: {
      control: false,
      description: "배지 앞에 표시할 아이콘",
    },
  },
};

export default meta;
type Story = StoryObj<typeof RetroBadge>;

export const Default: Story = {
  args: {
    children: "기본",
    variant: "default",
  },
};

export const Success: Story = {
  args: {
    children: "완료",
    variant: "success",
  },
};

export const Warning: Story = {
  args: {
    children: "주의",
    variant: "warning",
  },
};

export const Danger: Story = {
  args: {
    children: "오류",
    variant: "danger",
  },
};

export const InfoVariant: Story = {
  args: {
    children: "정보",
    variant: "info",
  },
};

export const WithIcon: Story = {
  args: {
    children: "저장됨",
    variant: "success",
    icon: <CheckCircle className="w-3 h-3" />,
  },
};

export const SmallSize: Story = {
  args: {
    children: "Small",
    size: "sm",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <RetroBadge variant="default">Default</RetroBadge>
      <RetroBadge variant="success">Success</RetroBadge>
      <RetroBadge variant="warning">Warning</RetroBadge>
      <RetroBadge variant="danger">Danger</RetroBadge>
      <RetroBadge variant="info">Info</RetroBadge>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <RetroBadge variant="success" icon={<CheckCircle className="w-3 h-3" />}>완료</RetroBadge>
      <RetroBadge variant="warning" icon={<Clock className="w-3 h-3" />}>대기중</RetroBadge>
      <RetroBadge variant="danger" icon={<AlertCircle className="w-3 h-3" />}>오류</RetroBadge>
      <RetroBadge variant="info" icon={<InfoIcon className="w-3 h-3" />}>정보</RetroBadge>
    </div>
  ),
};

export const StatusExamples: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 w-20">인증 상태:</span>
        <RetroBadge variant="success" icon={<CheckCircle className="w-3 h-3" />}>저장됨</RetroBadge>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 w-20">수집 상태:</span>
        <RetroBadge variant="warning" icon={<Clock className="w-3 h-3" />}>진행중</RetroBadge>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 w-20">오류 상태:</span>
        <RetroBadge variant="danger" icon={<AlertCircle className="w-3 h-3" />}>실패</RetroBadge>
      </div>
    </div>
  ),
};

