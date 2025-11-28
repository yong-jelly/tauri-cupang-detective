import { useState, KeyboardEvent } from "react";

export interface TagInputProps {
  /** 현재 태그 목록 */
  value: string[];
  /** 태그 변경 핸들러 */
  onChange: (tags: string[]) => void;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 최대 태그 개수 */
  maxTags?: number;
  /** 중복 허용 여부 */
  allowDuplicates?: boolean;
  /** 태그 앞에 # 표시 여부 */
  showHashtag?: boolean;
  /** 추가 버튼 텍스트 */
  addButtonText?: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 태그 입력 컴포넌트
 * Enter 또는 추가 버튼으로 태그 추가, 클릭으로 태그 삭제
 */
export const TagInput = ({
  value,
  onChange,
  placeholder = "태그 입력 후 Enter",
  disabled = false,
  maxTags,
  allowDuplicates = false,
  showHashtag = true,
  addButtonText = "추가",
  className = "",
}: TagInputProps) => {
  const [input, setInput] = useState("");

  const canAddMore = !maxTags || value.length < maxTags;

  const addTag = () => {
    const trimmed = input.trim();
    
    if (!trimmed) return;
    if (!canAddMore) return;
    if (!allowDuplicates && value.includes(trimmed)) return;

    onChange([...value, trimmed]);
    setInput("");
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
    // Backspace로 마지막 태그 삭제
    if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className={className}>
      {/* 태그 목록 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#c49a1a]/15 text-[#8b6914] text-sm font-bold border border-[#c49a1a]/30 group"
            >
              {showHashtag ? `#${tag}` : tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                disabled={disabled}
                className="hover:text-rose-600 transition-colors disabled:opacity-50"
                title="태그 삭제"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 입력 필드 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={canAddMore ? placeholder : `최대 ${maxTags}개까지 입력 가능`}
          disabled={disabled || !canAddMore}
          className="
            flex-1 px-5 py-4 border-2 border-[#2d2416] bg-[#fffef0] text-base font-bold text-[#2d2416] 
            placeholder-[#8b7355] focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(196,154,26,1)]
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />
        <button
          type="button"
          onClick={addTag}
          disabled={disabled || !input.trim() || !canAddMore}
          className="
            px-4 py-3 bg-[#2d2416] text-[#fffef0] font-bold 
            hover:bg-[#3d3426] transition-colors
            disabled:bg-[#d4c4a8] disabled:text-[#8b7355] disabled:cursor-not-allowed
          "
        >
          {addButtonText}
        </button>
      </div>

      {/* 태그 개수 표시 */}
      {maxTags && (
        <p className="mt-2 text-xs text-[#8b7355]">
          {value.length} / {maxTags}개
        </p>
      )}
    </div>
  );
};

