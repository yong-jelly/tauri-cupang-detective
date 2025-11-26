import type { Meta, StoryObj } from "@storybook/react";
import { RetroInput, RetroTextarea, RetroSelect } from "./RetroInput";

const meta: Meta<typeof RetroInput> = {
  title: "Shared/UI/RetroInput",
  component: RetroInput,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "레트로/브루탈리스트 스타일의 입력 필드 컴포넌트들입니다. Input, Textarea, Select를 지원합니다.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    label: {
      control: "text",
      description: "입력 필드 레이블",
    },
    error: {
      control: "text",
      description: "에러 메시지",
    },
    hint: {
      control: "text",
      description: "힌트 메시지",
    },
    disabled: {
      control: "boolean",
      description: "비활성화 상태",
    },
    placeholder: {
      control: "text",
      description: "플레이스홀더 텍스트",
    },
  },
};

export default meta;
type Story = StoryObj<typeof RetroInput>;

export const Default: Story = {
  args: {
    placeholder: "텍스트를 입력하세요",
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithLabel: Story = {
  args: {
    label: "이메일",
    placeholder: "example@email.com",
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithHint: Story = {
  args: {
    label: "비밀번호",
    type: "password",
    hint: "8자 이상 입력해주세요",
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const WithError: Story = {
  args: {
    label: "이메일",
    defaultValue: "invalid-email",
    error: "올바른 이메일 형식이 아닙니다",
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = {
  args: {
    label: "읽기 전용",
    value: "비활성화된 필드",
    disabled: true,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const TextareaDefault: Story = {
  render: () => (
    <div className="w-80">
      <RetroTextarea
        label="메모"
        placeholder="내용을 입력하세요..."
        hint="최대 500자까지 입력 가능합니다"
      />
    </div>
  ),
};

export const TextareaWithError: Story = {
  render: () => (
    <div className="w-80">
      <RetroTextarea
        label="cURL 명령"
        placeholder="curl 'https://...' -H 'Cookie: ...' ..."
        rows={6}
        error="유효하지 않은 cURL 형식입니다"
      />
    </div>
  ),
};

export const SelectDefault: Story = {
  render: () => (
    <div className="w-80">
      <RetroSelect label="플랫폼 선택">
        <option value="">선택하세요</option>
        <option value="naver">네이버</option>
        <option value="coupang">쿠팡</option>
        <option value="kakao">카카오</option>
      </RetroSelect>
    </div>
  ),
};

export const SelectWithHint: Story = {
  render: () => (
    <div className="w-80">
      <RetroSelect
        label="테이블"
        hint="조회할 테이블을 선택하세요"
      >
        <option value="accounts">accounts</option>
        <option value="credentials">credentials</option>
        <option value="metadata">metadata</option>
      </RetroSelect>
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <div className="w-96 space-y-4 p-6 bg-[#fffef0] border-2 border-gray-800">
      <RetroInput
        label="계정 이름"
        placeholder="예: 내 네이버 계정"
      />
      <RetroSelect label="플랫폼">
        <option value="naver">네이버</option>
        <option value="coupang">쿠팡</option>
      </RetroSelect>
      <RetroTextarea
        label="cURL 명령"
        placeholder="curl 'https://...' -H 'Cookie: ...' ..."
        rows={4}
        hint="브라우저 개발자 도구에서 복사한 cURL 명령을 붙여넣으세요"
      />
    </div>
  ),
};

