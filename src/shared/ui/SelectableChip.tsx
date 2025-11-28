import { ReactNode } from "react";

export interface SelectableChipProps {
  /** 칩에 표시될 라벨 */
  label: string;
  /** 선택 여부 */
  selected?: boolean;
  /** 클릭 핸들러 */
  onClick?: () => void;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 칩 크기 */
  size?: "sm" | "md" | "lg";
  /** 선택 시 체크마크 표시 여부 */
  showCheckmark?: boolean;
  /** 라벨 앞에 표시될 아이콘/이모지 */
  icon?: ReactNode;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 토글 가능한 선택 칩 컴포넌트
 * 퀵 버튼, 결제 수단, 날짜 선택 등에 사용
 */
export const SelectableChip = ({
  label,
  selected = false,
  onClick,
  disabled = false,
  size = "md",
  showCheckmark = true,
  icon,
  className = "",
}: SelectableChipProps) => {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-xs",
    lg: "px-5 py-2.5 text-sm",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        font-bold border-2 transition-all inline-flex items-center gap-1.5
        ${sizeClasses[size]}
        ${
          selected
            ? "border-[#c49a1a] bg-[#c49a1a] text-white shadow-[2px_2px_0px_0px_rgba(139,105,20,1)] scale-105"
            : "border-[#d4c4a8] text-[#8b7355] hover:border-[#c49a1a] hover:bg-[#c49a1a]/10"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {selected && showCheckmark && <span>✓</span>}
      {label}
    </button>
  );
};

