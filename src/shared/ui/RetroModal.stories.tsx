import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ShoppingBag, AlertTriangle, CheckCircle } from "lucide-react";
import { RetroModal, RetroModalBody } from "./RetroModal";
import { RetroButton } from "./RetroButton";

const meta: Meta<typeof RetroModal> = {
  title: "Shared/UI/RetroModal",
  component: RetroModal,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
레트로/브루탈리스트 스타일의 모달 컴포넌트입니다.

## 특징
- **크기 옵션**: sm, md, lg, xl, full 크기 지원
- **접근성**: ESC 키로 닫기, aria-modal 속성 지원
- **애니메이션**: 페이드인 + 줌인 효과
- **유연한 구조**: 헤더, 본문, 푸터 영역 구분

## 사용 예시
\`\`\`tsx
const [isOpen, setIsOpen] = useState(false);

<RetroModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="주문 상세"
  subtitle="2024년 3월 구매 내역"
  size="lg"
  footer={
    <div className="flex justify-end gap-2">
      <RetroButton variant="ghost" onClick={() => setIsOpen(false)}>닫기</RetroButton>
      <RetroButton>확인</RetroButton>
    </div>
  }
>
  <RetroModalBody>
    <p>모달 내용</p>
  </RetroModalBody>
</RetroModal>
\`\`\`
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    isOpen: {
      description: "모달 열림 여부",
      control: { type: "boolean" },
    },
    title: {
      description: "모달 제목",
      control: { type: "text" },
    },
    subtitle: {
      description: "모달 서브타이틀",
      control: { type: "text" },
    },
    size: {
      description: "모달 크기",
      control: { type: "select" },
      options: ["sm", "md", "lg", "xl", "full"],
    },
    showCloseButton: {
      description: "닫기 버튼 표시 여부",
      control: { type: "boolean" },
    },
    closeOnBackdropClick: {
      description: "배경 클릭으로 닫기 허용",
      control: { type: "boolean" },
    },
    closeOnEsc: {
      description: "ESC 키로 닫기 허용",
      control: { type: "boolean" },
    },
    onClose: {
      description: "닫기 핸들러",
      action: "closed",
    },
  },
};

export default meta;
type Story = StoryObj<typeof RetroModal>;

// 인터랙티브 컴포넌트 래퍼
const ModalWrapper = (props: Partial<React.ComponentProps<typeof RetroModal>>) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <RetroButton onClick={() => setIsOpen(true)}>모달 열기</RetroButton>
      <RetroModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="기본 모달"
        {...props}
      >
        <RetroModalBody>
          {props.children || <p className="text-gray-700">모달 내용이 여기에 표시됩니다.</p>}
        </RetroModalBody>
      </RetroModal>
    </>
  );
};

/**
 * 기본 사용 예시
 */
export const Default: Story = {
  render: () => <ModalWrapper />,
};

/**
 * 서브타이틀 포함
 */
export const WithSubtitle: Story = {
  render: () => (
    <ModalWrapper title="주문 상세" subtitle="2024년 3월 15일 · 주문번호 #2024031500001" />
  ),
};

/**
 * 작은 크기 (sm)
 */
export const SizeSmall: Story = {
  render: () => (
    <ModalWrapper title="알림" size="sm">
      <p className="text-gray-700">작은 크기의 모달입니다.</p>
    </ModalWrapper>
  ),
};

/**
 * 큰 크기 (lg)
 */
export const SizeLarge: Story = {
  render: () => (
    <ModalWrapper title="상세 보기" size="lg">
      <div className="space-y-4">
        <p className="text-gray-700">큰 크기의 모달입니다. 많은 내용을 표시할 때 적합합니다.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[#f6f1e9] border border-[#d4c4a8]">
            <div className="text-xs text-gray-500 mb-1">항목 1</div>
            <div className="font-bold font-mono">₩45,000</div>
          </div>
          <div className="p-4 bg-[#f6f1e9] border border-[#d4c4a8]">
            <div className="text-xs text-gray-500 mb-1">항목 2</div>
            <div className="font-bold font-mono">₩89,000</div>
          </div>
        </div>
      </div>
    </ModalWrapper>
  ),
};

/**
 * 매우 큰 크기 (xl)
 */
export const SizeXLarge: Story = {
  render: () => (
    <ModalWrapper title="전체 보기" subtitle="모든 데이터를 확인하세요" size="xl">
      <div className="space-y-4">
        <p className="text-gray-700">XL 크기의 모달입니다. 테이블이나 차트 등 넓은 콘텐츠에 적합합니다.</p>
        <table className="w-full border-collapse font-mono text-sm">
          <thead>
            <tr className="border-b-2 border-gray-800 bg-[#f6f1e9]">
              <th className="p-3 text-left">날짜</th>
              <th className="p-3 text-left">항목</th>
              <th className="p-3 text-right">금액</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#fdfbf7]"}>
                <td className="p-3">2024-03-{String(15 - i).padStart(2, "0")}</td>
                <td className="p-3">샘플 항목 {i}</td>
                <td className="p-3 text-right font-bold">₩{(i * 12500).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalWrapper>
  ),
};

/**
 * 푸터 포함
 */
export const WithFooter: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <RetroButton onClick={() => setIsOpen(true)}>모달 열기</RetroButton>
        <RetroModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="확인 필요"
          footer={
            <div className="flex justify-end gap-2">
              <RetroButton variant="ghost" onClick={() => setIsOpen(false)}>
                취소
              </RetroButton>
              <RetroButton onClick={() => setIsOpen(false)}>확인</RetroButton>
            </div>
          }
        >
          <RetroModalBody>
            <p className="text-gray-700">이 작업을 진행하시겠습니까?</p>
          </RetroModalBody>
        </RetroModal>
      </>
    );
  },
};

/**
 * 아이콘이 포함된 제목
 */
export const WithIconTitle: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <RetroButton onClick={() => setIsOpen(true)}>모달 열기</RetroButton>
        <RetroModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#264653]" />
              <span>구매 내역</span>
            </div>
          }
          subtitle="~1만원 가격대 · 총 15건"
        >
          <RetroModalBody>
            <p className="text-gray-700">구매 내역 목록이 여기에 표시됩니다.</p>
          </RetroModalBody>
        </RetroModal>
      </>
    );
  },
};

/**
 * 경고 모달
 */
export const WarningModal: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <RetroButton variant="danger" onClick={() => setIsOpen(true)}>
          경고 모달
        </RetroButton>
        <RetroModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span>주의</span>
            </div>
          }
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <RetroButton variant="ghost" onClick={() => setIsOpen(false)}>
                취소
              </RetroButton>
              <RetroButton variant="danger" onClick={() => setIsOpen(false)}>
                삭제
              </RetroButton>
            </div>
          }
        >
          <RetroModalBody>
            <p className="text-gray-700">
              이 작업은 되돌릴 수 없습니다. 정말로 삭제하시겠습니까?
            </p>
          </RetroModalBody>
        </RetroModal>
      </>
    );
  },
};

/**
 * 성공 모달
 */
export const SuccessModal: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <RetroButton variant="primary" onClick={() => setIsOpen(true)}>
          성공 모달
        </RetroButton>
        <RetroModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span>완료</span>
            </div>
          }
          size="sm"
          footer={
            <div className="flex justify-end">
              <RetroButton onClick={() => setIsOpen(false)}>확인</RetroButton>
            </div>
          }
        >
          <RetroModalBody>
            <p className="text-gray-700">작업이 성공적으로 완료되었습니다!</p>
          </RetroModalBody>
        </RetroModal>
      </>
    );
  },
};

/**
 * 닫기 버튼 없음
 */
export const NoCloseButton: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <RetroButton onClick={() => setIsOpen(true)}>모달 열기</RetroButton>
        <RetroModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="닫기 버튼 없음"
          showCloseButton={false}
          footer={
            <div className="flex justify-end">
              <RetroButton onClick={() => setIsOpen(false)}>확인</RetroButton>
            </div>
          }
        >
          <RetroModalBody>
            <p className="text-gray-700">
              닫기 버튼이 없습니다. 푸터의 버튼이나 배경 클릭, ESC 키로 닫을 수 있습니다.
            </p>
          </RetroModalBody>
        </RetroModal>
      </>
    );
  },
};

/**
 * 스크롤 가능한 긴 내용
 */
export const ScrollableContent: Story = {
  render: () => (
    <ModalWrapper title="긴 내용" subtitle="스크롤하여 모든 내용을 확인하세요" size="md">
      <div className="space-y-4">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="p-4 bg-[#f6f1e9] border border-[#d4c4a8]">
            <div className="font-bold text-gray-800 mb-1">항목 {i + 1}</div>
            <p className="text-sm text-gray-600">
              이것은 스크롤 테스트를 위한 샘플 내용입니다. 모달이 화면 높이를 초과하면 스크롤이 활성화됩니다.
            </p>
          </div>
        ))}
      </div>
    </ModalWrapper>
  ),
};

/**
 * 제목 없는 모달
 */
export const NoTitle: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <RetroButton onClick={() => setIsOpen(true)}>모달 열기</RetroButton>
        <RetroModal isOpen={isOpen} onClose={() => setIsOpen(false)} size="sm">
          <RetroModalBody>
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-bold text-gray-800">저장되었습니다!</p>
              <p className="text-sm text-gray-600 mt-2">변경사항이 성공적으로 저장되었습니다.</p>
            </div>
          </RetroModalBody>
        </RetroModal>
      </>
    );
  },
};

