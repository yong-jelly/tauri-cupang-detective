import type { Meta, StoryObj } from "@storybook/react";
import { Plus, RefreshCw, Download, Upload } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { RetroButton } from "./RetroButton";

const meta: Meta<typeof PageHeader> = {
  title: "Shared/UI/PageHeader",
  component: PageHeader,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "레트로/브루탈리스트 스타일의 페이지 헤더 컴포넌트입니다. 각 페이지 상단에서 제목과 액션 버튼을 표시합니다.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "페이지 제목",
    },
    subtitle: {
      control: "text",
      description: "부제목 (제목 위에 표시)",
    },
    description: {
      control: "text",
      description: "설명 텍스트 (제목 아래에 표시)",
    },
    actions: {
      control: false,
      description: "헤더 오른쪽에 표시할 액션 버튼들",
    },
  },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: "대시보드",
  },
};

export const WithSubtitle: Story = {
  args: {
    subtitle: "데이터 분석",
    title: "지출 현황",
  },
};

export const WithDescription: Story = {
  args: {
    title: "계정 관리",
    description: "등록된 계정의 인증 정보를 관리합니다.",
  },
};

export const WithActions: Story = {
  args: {
    title: "계정 관리",
    subtitle: "설정",
    actions: (
      <>
        <RetroButton variant="secondary" icon={<RefreshCw className="w-4 h-4" />}>
          새로고침
        </RetroButton>
        <RetroButton icon={<Plus className="w-4 h-4" />}>
          계정 추가
        </RetroButton>
      </>
    ),
  },
};

export const CompleteExample: Story = {
  args: {
    subtitle: "DATA COLLECTION",
    title: "쿠팡 주문 수집",
    description: "쿠팡에서 주문 데이터를 수집합니다. 인증 정보가 유효해야 합니다.",
    actions: (
      <>
        <RetroButton variant="ghost" size="sm" icon={<Download className="w-4 h-4" />}>
          내보내기
        </RetroButton>
        <RetroButton variant="ghost" size="sm" icon={<Upload className="w-4 h-4" />}>
          가져오기
        </RetroButton>
      </>
    ),
  },
};

export const AccountsPage: Story = {
  args: {
    subtitle: "설정",
    title: "계정 관리",
    description: "네이버, 쿠팡 등의 계정을 등록하고 인증 정보를 관리합니다.",
    actions: (
      <RetroButton icon={<Plus className="w-4 h-4" />}>
        새 계정 등록
      </RetroButton>
    ),
  },
};

export const DataCollectionPage: Story = {
  args: {
    subtitle: "수집",
    title: "네이버 실험 수집",
    actions: (
      <>
        <RetroButton variant="secondary" icon={<RefreshCw className="w-4 h-4" />}>
          초기화
        </RetroButton>
        <RetroButton variant="primary" icon={<Plus className="w-4 h-4" />}>
          수집 시작
        </RetroButton>
      </>
    ),
  },
};

