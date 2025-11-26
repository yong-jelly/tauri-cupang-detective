import type { Meta, StoryObj } from "@storybook/react";
import { Play, Trash2, Settings, Plus } from "lucide-react";
import { RetroButton } from "./RetroButton";

const meta: Meta<typeof RetroButton> = {
  title: "Shared/UI/RetroButton",
  component: RetroButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "레트로/브루탈리스트 스타일의 버튼 컴포넌트입니다. 다양한 변형과 크기를 지원합니다.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "danger", "ghost"],
      description: "버튼의 스타일 변형",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "버튼의 크기",
    },
    loading: {
      control: "boolean",
      description: "로딩 상태 표시",
    },
    disabled: {
      control: "boolean",
      description: "비활성화 상태",
    },
    icon: {
      control: false,
      description: "버튼 앞에 표시할 아이콘",
    },
  },
};

export default meta;
type Story = StoryObj<typeof RetroButton>;

export const Primary: Story = {
  args: {
    children: "기본 버튼",
    variant: "primary",
  },
};

export const Secondary: Story = {
  args: {
    children: "보조 버튼",
    variant: "secondary",
  },
};

export const Danger: Story = {
  args: {
    children: "삭제",
    variant: "danger",
    icon: <Trash2 className="w-4 h-4" />,
  },
};

export const Ghost: Story = {
  args: {
    children: "고스트",
    variant: "ghost",
  },
};

export const WithIcon: Story = {
  args: {
    children: "수집 시작",
    variant: "primary",
    icon: <Play className="w-4 h-4" />,
  },
};

export const Loading: Story = {
  args: {
    children: "처리 중...",
    variant: "primary",
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: "비활성화",
    variant: "secondary",
    disabled: true,
  },
};

export const Small: Story = {
  args: {
    children: "작은 버튼",
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    children: "큰 버튼",
    size: "lg",
    icon: <Plus className="w-5 h-5" />,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <RetroButton variant="primary">Primary</RetroButton>
      <RetroButton variant="secondary">Secondary</RetroButton>
      <RetroButton variant="danger">Danger</RetroButton>
      <RetroButton variant="ghost">Ghost</RetroButton>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <RetroButton size="sm">Small</RetroButton>
      <RetroButton size="md">Medium</RetroButton>
      <RetroButton size="lg">Large</RetroButton>
    </div>
  ),
};

export const IconButtons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <RetroButton icon={<Play className="w-4 h-4" />}>시작</RetroButton>
      <RetroButton variant="secondary" icon={<Settings className="w-4 h-4" />}>설정</RetroButton>
      <RetroButton variant="danger" icon={<Trash2 className="w-4 h-4" />}>삭제</RetroButton>
    </div>
  ),
};

