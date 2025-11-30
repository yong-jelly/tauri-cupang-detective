import { type ReactNode, type HTMLAttributes, forwardRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface RetroModalProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** 모달 열림 여부 */
  isOpen: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 모달 제목 */
  title?: ReactNode;
  /** 모달 서브타이틀 */
  subtitle?: string;
  /** 모달 크기 */
  size?: ModalSize;
  /** 닫기 버튼 표시 여부 */
  showCloseButton?: boolean;
  /** 배경 클릭으로 닫기 허용 */
  closeOnBackdropClick?: boolean;
  /** ESC 키로 닫기 허용 */
  closeOnEsc?: boolean;
  /** 푸터 영역 */
  footer?: ReactNode;
  /** 모달 내용 */
  children: ReactNode;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  full: "max-w-[calc(100vw-4rem)]",
};

/**
 * 레트로/브루탈리스트 스타일의 모달 컴포넌트
 * 
 * @example
 * ```tsx
 * <RetroModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="주문 상세"
 *   subtitle="2024년 3월 구매 내역"
 *   size="lg"
 * >
 *   <p>모달 내용</p>
 * </RetroModal>
 * ```
 */
export const RetroModal = forwardRef<HTMLDivElement, RetroModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      subtitle,
      size = "md",
      showCloseButton = true,
      closeOnBackdropClick = true,
      closeOnEsc = true,
      footer,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    // ESC 키 핸들러
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (closeOnEsc && e.key === "Escape") {
          onClose();
        }
      },
      [closeOnEsc, onClose]
    );

    // ESC 키 이벤트 등록
    useEffect(() => {
      if (isOpen) {
        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";
      }
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }, [isOpen, handleKeyDown]);

    // 배경 클릭 핸들러
    const handleBackdropClick = (e: React.MouseEvent) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    };

    if (!isOpen) return null;

    const modalContent = (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        <div
          ref={ref}
          className={`
            relative w-full ${sizeStyles[size]}
            bg-[#fffef0] border-2 border-gray-800 
            shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]
            animate-in zoom-in-95 slide-in-from-bottom-4 duration-200
            flex flex-col max-h-[80vh]
            ${className}
          `}
          {...props}
        >
          {/* 헤더 */}
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between px-5 py-4 border-b-2 border-gray-800 bg-[#f6f1e9] flex-shrink-0">
              <div className="flex-1 min-w-0 pr-4">
                {title && (
                  <h2
                    id="modal-title"
                    className="text-lg font-bold text-gray-900 font-serif truncate"
                  >
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-gray-600 font-mono truncate">
                    {subtitle}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-1.5 -m-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors border border-transparent hover:border-gray-400"
                  aria-label="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* 본문 */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

          {/* 푸터 */}
          {footer && (
            <div className="px-5 py-4 border-t-2 border-gray-800 bg-[#f6f1e9] flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }
);

RetroModal.displayName = "RetroModal";

// 모달 본문 서브컴포넌트
interface RetroModalBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** 패딩 여부 */
  padding?: boolean;
  children: ReactNode;
}

export const RetroModalBody = forwardRef<HTMLDivElement, RetroModalBodyProps>(
  ({ padding = true, children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${padding ? "p-5" : ""} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

RetroModalBody.displayName = "RetroModalBody";

