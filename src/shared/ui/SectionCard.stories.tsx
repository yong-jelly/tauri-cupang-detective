import type { Meta, StoryObj } from "@storybook/react";
import { Database, User, Settings, FileText, RefreshCw } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { RetroButton } from "./RetroButton";
import { RetroInput } from "./RetroInput";

const meta: Meta<typeof SectionCard> = {
  title: "Shared/UI/SectionCard",
  component: SectionCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "레트로/브루탈리스트 스타일의 섹션 카드 컴포넌트입니다. 아이콘, 제목, 설명과 함께 관련 콘텐츠를 그룹화합니다.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "섹션 제목",
    },
    description: {
      control: "text",
      description: "섹션 설명",
    },
    icon: {
      control: false,
      description: "섹션 아이콘",
    },
    actions: {
      control: false,
      description: "헤더 오른쪽에 표시할 액션 버튼들",
    },
  },
};

export default meta;
type Story = StoryObj<typeof SectionCard>;

export const Default: Story = {
  args: {
    title: "기본 섹션",
    children: (
      <p className="text-sm text-gray-700">섹션 내용이 여기에 표시됩니다.</p>
    ),
  },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};

export const WithIcon: Story = {
  args: {
    icon: <Database className="w-5 h-5 text-gray-700" />,
    title: "데이터베이스",
    description: "SQLite 데이터베이스 설정",
    children: (
      <p className="text-sm text-gray-700">데이터베이스 관련 설정을 구성합니다.</p>
    ),
  },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};

export const WithActions: Story = {
  args: {
    icon: <User className="w-5 h-5 text-gray-700" />,
    title: "계정 정보",
    description: "인증 정보 관리",
    actions: (
      <RetroButton variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />}>
        새로고침
      </RetroButton>
    ),
    children: (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">현재 등록된 계정: 3개</p>
        <p className="text-sm text-gray-500">마지막 동기화: 5분 전</p>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};

export const WithForm: Story = {
  args: {
    icon: <Settings className="w-5 h-5 text-gray-700" />,
    title: "API 설정",
    description: "외부 서비스 연동 설정",
    children: (
      <div className="space-y-4">
        <RetroInput
          label="API 키"
          placeholder="sk_live_..."
        />
        <RetroInput
          label="시크릿 키"
          type="password"
          placeholder="••••••••"
        />
        <div className="flex justify-end">
          <RetroButton size="sm">저장</RetroButton>
        </div>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};

export const WithList: Story = {
  args: {
    icon: <FileText className="w-5 h-5 text-gray-700" />,
    title: "최근 활동",
    children: (
      <ul className="space-y-2">
        {[
          { time: "10:30", action: "데이터 수집 완료 (150건)" },
          { time: "09:15", action: "인증 갱신 성공" },
          { time: "08:00", action: "자동 백업 완료" },
        ].map((item, idx) => (
          <li key={idx} className="flex items-center gap-3 text-sm border-b border-dashed border-gray-300 pb-2">
            <span className="font-mono text-xs text-gray-500">{item.time}</span>
            <span className="text-gray-700">{item.action}</span>
          </li>
        ))}
      </ul>
    ),
  },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};

export const MultipleSections: Story = {
  render: () => (
    <div className="space-y-6 w-[600px]">
      <SectionCard
        icon={<Database className="w-5 h-5 text-gray-700" />}
        title="데이터베이스"
        description="저장소 설정"
      >
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">파일 경로</dt>
            <dd className="font-mono text-gray-900">~/tauti/data.db</dd>
          </div>
          <div>
            <dt className="text-gray-500">파일 크기</dt>
            <dd className="font-mono text-gray-900">2.5 MB</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard
        icon={<Settings className="w-5 h-5 text-gray-700" />}
        title="일반 설정"
        actions={
          <RetroButton variant="ghost" size="sm">
            초기화
          </RetroButton>
        }
      >
        <p className="text-sm text-gray-700">자동 백업, 알림 등의 설정을 관리합니다.</p>
      </SectionCard>
    </div>
  ),
};

