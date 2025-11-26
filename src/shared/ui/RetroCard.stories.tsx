import type { Meta, StoryObj } from "@storybook/react";
import { Database } from "lucide-react";
import { RetroCard, RetroCardHeader, RetroCardTitle, RetroCardContent, RetroCardFooter } from "./RetroCard";
import { RetroButton } from "./RetroButton";

const meta: Meta<typeof RetroCard> = {
  title: "Shared/UI/RetroCard",
  component: RetroCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "레트로/브루탈리스트 스타일의 카드 컴포넌트입니다. 헤더, 콘텐츠, 푸터 서브컴포넌트와 함께 사용할 수 있습니다.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "elevated", "outlined"],
      description: "카드의 스타일 변형",
    },
    padding: {
      control: "select",
      options: ["none", "sm", "md", "lg"],
      description: "카드의 내부 여백",
    },
  },
};

export default meta;
type Story = StoryObj<typeof RetroCard>;

export const Default: Story = {
  args: {
    children: (
      <p className="text-gray-700">기본 카드 내용입니다.</p>
    ),
  },
};

export const Elevated: Story = {
  args: {
    variant: "elevated",
    children: (
      <p className="text-gray-700">더 강조된 그림자를 가진 카드입니다.</p>
    ),
  },
};

export const Outlined: Story = {
  args: {
    variant: "outlined",
    children: (
      <p className="text-gray-700">그림자 없이 테두리만 있는 카드입니다.</p>
    ),
  },
};

export const WithHeader: Story = {
  render: () => (
    <RetroCard padding="none" className="w-80">
      <RetroCardHeader>
        <RetroCardTitle>주문 목록</RetroCardTitle>
      </RetroCardHeader>
      <RetroCardContent>
        <p className="text-sm text-gray-700">카드 내용이 여기에 표시됩니다.</p>
      </RetroCardContent>
    </RetroCard>
  ),
};

export const WithHeaderAndFooter: Story = {
  render: () => (
    <RetroCard padding="none" className="w-80">
      <RetroCardHeader>
        <RetroCardTitle>데이터 수집</RetroCardTitle>
      </RetroCardHeader>
      <RetroCardContent>
        <p className="text-sm text-gray-700">수집된 데이터가 여기에 표시됩니다.</p>
      </RetroCardContent>
      <RetroCardFooter className="flex justify-end gap-2">
        <RetroButton variant="ghost" size="sm">취소</RetroButton>
        <RetroButton size="sm">저장</RetroButton>
      </RetroCardFooter>
    </RetroCard>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <RetroCard className="w-80">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-[#264653] border-2 border-gray-800 flex items-center justify-center">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 font-serif">데이터베이스</h3>
          <p className="text-sm text-gray-600">현재 상태를 확인합니다.</p>
        </div>
      </div>
      <p className="text-sm text-gray-700">SQLite 데이터베이스가 정상적으로 연결되었습니다.</p>
    </RetroCard>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <RetroCard variant="default" className="w-48">
        <p className="text-sm font-bold mb-1">Default</p>
        <p className="text-xs text-gray-600">기본 스타일</p>
      </RetroCard>
      <RetroCard variant="elevated" className="w-48">
        <p className="text-sm font-bold mb-1">Elevated</p>
        <p className="text-xs text-gray-600">강조 스타일</p>
      </RetroCard>
      <RetroCard variant="outlined" className="w-48">
        <p className="text-sm font-bold mb-1">Outlined</p>
        <p className="text-xs text-gray-600">테두리만</p>
      </RetroCard>
    </div>
  ),
};

export const DifferentPaddings: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 items-start">
      <RetroCard padding="sm" className="w-40">
        <p className="text-xs">padding: sm</p>
      </RetroCard>
      <RetroCard padding="md" className="w-40">
        <p className="text-xs">padding: md</p>
      </RetroCard>
      <RetroCard padding="lg" className="w-40">
        <p className="text-xs">padding: lg</p>
      </RetroCard>
    </div>
  ),
};

