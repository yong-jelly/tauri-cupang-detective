export interface ColorOption {
  /** 컬러 ID */
  id: string;
  /** 실제 색상 값 (hex, rgb 등) */
  color: string;
  /** 표시될 라벨 (툴팁 등) */
  label: string;
}

export interface ColorPickerProps {
  /** 컬러 옵션 목록 */
  colors: ColorOption[];
  /** 현재 선택된 컬러 ID */
  value?: string;
  /** 선택 변경 핸들러 */
  onChange?: (colorId: string) => void;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 컬러 버튼 크기 */
  size?: "sm" | "md" | "lg";
  /** "없음" 옵션 표시 여부 */
  showNone?: boolean;
  /** "없음" 옵션의 ID (기본: "none") */
  noneId?: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

/** 기본 컬러 옵션 */
export const DEFAULT_COLORS: ColorOption[] = [
  { id: "red", color: "#dc2626", label: "빨강" },
  { id: "orange", color: "#ea580c", label: "주황" },
  { id: "yellow", color: "#ca8a04", label: "노랑" },
  { id: "green", color: "#16a34a", label: "초록" },
  { id: "blue", color: "#2563eb", label: "파랑" },
  { id: "purple", color: "#9333ea", label: "보라" },
  { id: "pink", color: "#db2777", label: "분홍" },
];

/**
 * 컬러 선택 컴포넌트
 * 태그, 라벨, 카테고리 등에 색상을 지정할 때 사용
 */
export const ColorPicker = ({
  colors = DEFAULT_COLORS,
  value,
  onChange,
  disabled = false,
  size = "md",
  showNone = true,
  noneId = "none",
  className = "",
}: ColorPickerProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const gapClasses = {
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
  };

  const allColors: ColorOption[] = showNone
    ? [{ id: noneId, color: "transparent", label: "없음" }, ...colors]
    : colors;

  return (
    <div className={`flex ${gapClasses[size]} ${className}`}>
      {allColors.map((c) => {
        const isSelected = value === c.id;
        const isNone = c.id === noneId;

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange?.(c.id)}
            disabled={disabled}
            className={`
              ${sizeClasses[size]} border-2 transition-all relative flex items-center justify-center
              ${
                isSelected
                  ? "scale-125 border-[#2d2416] ring-2 ring-[#c49a1a] ring-offset-2 shadow-lg"
                  : "border-[#d4c4a8] hover:scale-110"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            style={{
              backgroundColor: isNone ? "#f6f1e9" : c.color,
            }}
            title={c.label}
          >
            {/* "없음" 표시 */}
            {isNone && (
              <span className="text-[#8b7355] text-xs font-bold">X</span>
            )}
            
            {/* 선택됨 체크마크 (밝은 색상용) */}
            {isSelected && !isNone && (
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

