import type { Meta, StoryObj } from '@storybook/react';
import { AccountCard } from './AccountCard';
import type { User } from '@shared/api/types';

const meta = {
  title: 'Features/Accounts/AccountCard',
  component: AccountCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '계정 정보를 표시하는 카드 컴포넌트입니다. 계정 삭제 및 인증 테스트 기능을 제공합니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    account: {
      description: '표시할 계정 정보',
      control: 'object',
    },
    onDelete: {
      description: '계정 삭제 시 호출되는 콜백 함수',
      action: 'deleted',
    },
    onTest: {
      description: '인증 테스트 시 호출되는 콜백 함수 (선택적)',
      action: 'tested',
    },
  },
} satisfies Meta<typeof AccountCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockNaverAccount: User = {
  id: 'naver-123',
  provider: 'naver',
  alias: '내 네이버 계정',
  curl: 'curl -H "Cookie: ..."',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
};

const mockCoupangAccount: User = {
  id: 'coupang-456',
  provider: 'coupang',
  alias: '내 쿠팡 계정',
  curl: 'curl -H "Cookie: ..."',
  createdAt: '2024-01-20T14:20:00Z',
  updatedAt: '2024-01-20T14:20:00Z',
};

export const NaverAccount: Story = {
  args: {
    account: mockNaverAccount,
    onDelete: (id) => console.log('Delete account:', id),
    onTest: (account) => console.log('Test account:', account),
  },
};

export const CoupangAccount: Story = {
  args: {
    account: mockCoupangAccount,
    onDelete: (id) => console.log('Delete account:', id),
    onTest: (account) => console.log('Test account:', account),
  },
};

export const WithoutTestButton: Story = {
  args: {
    account: mockNaverAccount,
    onDelete: (id) => console.log('Delete account:', id),
    // onTest prop을 제공하지 않음
  },
};

export const LongAlias: Story = {
  args: {
    account: {
      ...mockNaverAccount,
      alias: '매우 긴 계정 별칭 이름이 들어가는 경우의 테스트 케이스입니다',
    },
    onDelete: (id) => console.log('Delete account:', id),
    onTest: (account) => console.log('Test account:', account),
  },
};

