import { ReactNode } from "react";

export interface SelectableCardProps {
  /** 카드에 표시될 라벨 */
  label: string;
  /** 부가 설명 */
  description?: string;
  /** 아이콘 또는 이모지 */
  icon?: ReactNode;
  /** 선택 여부 */
  selected?: boolean;
  /** 클릭 핸들러 */
  onClick?: () => void;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 카드 크기 */
  size?: "sm" | "md" | "lg";
  /** 선택됨 배지 표시 여부 */
  showBadge?: boolean;
  /** 배지 텍스트 (기본: "선택됨 ✓") */
  badgeText?: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 선택 가능한 카드 컴포넌트
 * 카테고리, 플랫폼, 유형 선택 등에 사용
 */
export const SelectableCard = ({
  label,
  description,
  icon,
  selected = false,
  onClick,
  disabled = false,
  size = "md",
  showBadge = true,
  badgeText = "선택됨 ✓",
  className = "",
}: SelectableCardProps) => {
  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const iconSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const labelSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        group border-2 text-left transition-all hover:scale-[1.02] relative overflow-hidden
        ${sizeClasses[size]}
        ${
          selected
            ? "border-[#c49a1a] bg-gradient-to-br from-[#c49a1a]/20 to-[#c49a1a]/5 shadow-[4px_4px_0px_0px_rgba(196,154,26,0.8)] scale-[1.02] ring-2 ring-[#c49a1a]/30"
            : "border-[#d4c4a8] bg-[#fffef0] hover:border-[#2d2416] hover:shadow-[3px_3px_0px_0px_rgba(45,36,22,0.3)]"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      {/* 선택됨 배지 */}
      {selected && showBadge && (
        <div className="absolute top-0 right-0 bg-[#c49a1a] text-white text-xs font-bold px-2 py-0.5">
          {badgeText}
        </div>
      )}
      
      <div className="flex items-start gap-3">
        {icon && (
          <span className={`${iconSizes[size]} transition-transform ${selected ? "scale-110" : "group-hover:scale-110"}`}>
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className={`font-bold ${labelSizes[size]} ${selected ? "text-[#8b6914]" : "text-[#2d2416]"} truncate`}>
            {label}
          </div>
          {description && (
            <div className={`text-sm mt-0.5 ${selected ? "text-[#a67c00]" : "text-[#8b7355]"} truncate`}>
              {description}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export interface SelectableCardGroupProps<T extends string> {
  /** 선택 옵션들 */
  options: Array<{
    id: T;
    label: string;
    description?: string;
    icon?: ReactNode;
  }>;
  /** 현재 선택된 값 */
  value?: T;
  /** 선택 변경 핸들러 */
  onChange?: (value: T) => void;
  /** 그리드 컬럼 수 */
  columns?: 1 | 2 | 3;
  /** 카드 크기 */
  size?: "sm" | "md" | "lg";
  /** 토글 모드 (같은 항목 클릭 시 선택 해제) */
  toggleable?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 선택 가능한 카드 그룹 컴포넌트
 * 여러 카드 중 하나를 선택하는 UI
 */
export function SelectableCardGroup<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
  size = "md",
  toggleable = false,
  className = "",
}: SelectableCardGroupProps<T>) {
  const columnClasses = {
    1: "grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
  };

  const handleClick = (id: T) => {
    if (toggleable && value === id) {
      onChange?.(undefined as unknown as T);
    } else {
      onChange?.(id);
    }
  };

  return (
    <div className={`grid gap-3 ${columnClasses[columns]} ${className}`}>
      {options.map((option) => (
        <SelectableCard
          key={option.id}
          label={option.label}
          description={option.description}
          icon={option.icon}
          selected={value === option.id}
          onClick={() => handleClick(option.id)}
          size={size}
        />
      ))}
    </div>
  );
}

