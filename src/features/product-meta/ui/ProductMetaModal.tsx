import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Tag,
  Folder,
  FileText,
  Link,
  Star,
  Loader2,
  Trash2,
  Save,
  Check,
  Clock,
} from "lucide-react";
import type { AccountProvider, ProductMetaInput } from "@shared/api/types";
import { useProductMeta, useCategories, useTagSearch } from "../shared/hooks";

/** 날짜 문자열을 읽기 쉬운 형태로 포맷 */
const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // 1분 이내
  if (diff < 60 * 1000) {
    return "방금 전";
  }
  // 1시간 이내
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}분 전`;
  }
  // 24시간 이내
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}시간 전`;
  }
  // 7일 이내
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days}일 전`;
  }
  // 그 외
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export interface ProductMetaModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 플랫폼 (naver | coupang) */
  provider: AccountProvider;
  /** 상품 아이템 ID */
  itemId: number;
  /** 상품명 (표시용) */
  productName: string;
  /** 저장 완료 후 콜백 */
  onSaved?: () => void;
}

/**
 * 상품 메타데이터 편집 모달
 */
export const ProductMetaModal = ({
  isOpen,
  onClose,
  provider,
  itemId,
  productName,
  onSaved,
}: ProductMetaModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // 훅 사용
  const { meta, loading, saving, save, remove } = useProductMeta(provider, itemId);
  const { categories, loading: categoriesLoading } = useCategories();
  const { suggestions, search: searchTags, clear: clearSuggestions } = useTagSearch();

  // 폼 상태
  const [memo, setMemo] = useState("");
  const [url, setUrl] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 메타데이터 로드 시 폼 초기화
  useEffect(() => {
    if (meta) {
      setMemo(meta.memo || "");
      setUrl(meta.url || "");
      setRating(meta.rating || null);
      setTags(meta.tags || []);
      setSelectedCategoryIds(meta.categories.map((c) => c.id));
    } else {
      setMemo("");
      setUrl("");
      setRating(null);
      setTags([]);
      setSelectedCategoryIds([]);
    }
  }, [meta]);

  // 태그 입력 시 자동완성 검색
  useEffect(() => {
    if (tagInput.trim()) {
      searchTags(tagInput);
      setShowSuggestions(true);
    } else {
      clearSuggestions();
      setShowSuggestions(false);
    }
  }, [tagInput, searchTags, clearSuggestions]);

  // 태그 추가
  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
    setShowSuggestions(false);
  }, [tags]);

  // 태그 삭제
  const removeTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }, []);

  // 카테고리 토글
  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  // 저장
  const handleSave = async () => {
    const input: ProductMetaInput = {
      memo: memo || null,
      url: url || null,
      rating: rating,
      tags,
      categoryIds: selectedCategoryIds,
    };

    try {
      await save(input);
      onSaved?.();
      onClose();
    } catch {
      // 에러는 훅에서 처리됨
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!meta) return;
    if (!confirm("이 상품의 메타데이터를 삭제하시겠습니까?")) return;

    try {
      await remove();
      onSaved?.();
      onClose();
    } catch {
      // 에러는 훅에서 처리됨
    }
  };

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-[#2d2416]/60 backdrop-blur-sm" />

      {/* 모달 */}
      <div
        ref={modalRef}
        className="relative w-full max-w-xl bg-[#fffef0] border-4 border-[#2d2416] shadow-[8px_8px_0px_0px_rgba(45,36,22,1)] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b-4 border-[#2d2416] bg-[#f6f1e9]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-[#2d2416] uppercase tracking-wider">
                상품 정보 관리
              </h2>
              {meta && (
                <span className="inline-flex items-center gap-1 text-xs text-[#8b7355]/80 bg-[#2d2416]/5 px-2 py-0.5 rounded">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(meta.updatedAt)}
                </span>
              )}
            </div>
            <p className="text-sm text-[#8b7355] truncate mt-1">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border-2 border-[#2d2416] bg-[#fffef0] hover:bg-red-50 text-[#2d2416] hover:text-red-600 hover:border-red-600 transition-colors ml-4 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading || categoriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#c49a1a]" />
            </div>
          ) : (
            <>
              {/* 별점 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-[#2d2416] uppercase tracking-wider mb-3">
                  <Star className="w-4 h-4" />
                  별점
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(rating === value ? null : value)}
                      className={`w-8 h-8 flex items-center justify-center border-2 font-bold text-sm transition-colors ${
                        rating !== null && value <= rating
                          ? "bg-[#c49a1a] border-[#c49a1a] text-white"
                          : "bg-white border-[#2d2416]/20 text-[#8b7355] hover:border-[#c49a1a]"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#8b7355] mt-2">1~10점으로 평가 (선택사항)</p>
              </div>

              {/* 태그 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-[#2d2416] uppercase tracking-wider mb-3">
                  <Tag className="w-4 h-4" />
                  태그
                </label>
                <div className="relative">
                  <div className="flex flex-wrap gap-2 p-3 border-2 border-[#2d2416]/20 bg-white min-h-[48px]">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[#c49a1a]/10 text-[#2d2416] text-sm font-medium border border-[#c49a1a]/30"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && tagInput.trim()) {
                          e.preventDefault();
                          addTag(tagInput);
                        }
                      }}
                      placeholder={tags.length === 0 ? "태그 입력 후 Enter" : ""}
                      className="flex-1 min-w-[100px] outline-none bg-transparent text-sm"
                    />
                  </div>
                  {/* 자동완성 목록 */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-[#2d2416] shadow-[4px_4px_0px_0px_rgba(45,36,22,1)] z-10 max-h-40 overflow-y-auto">
                      {suggestions
                        .filter((s) => !tags.includes(s))
                        .map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => addTag(suggestion)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-[#c49a1a]/10 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 카테고리 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-[#2d2416] uppercase tracking-wider mb-3">
                  <Folder className="w-4 h-4" />
                  카테고리
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const isSelected = selectedCategoryIds.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className={`inline-flex items-center gap-2 px-3 py-2 border-2 font-medium text-sm transition-colors ${
                          isSelected
                            ? "bg-[#2d2416] border-[#2d2416] text-white"
                            : "bg-white border-[#2d2416]/20 text-[#2d2416] hover:border-[#2d2416]"
                        }`}
                      >
                        {category.color && (
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        {category.name}
                        {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 메모 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-[#2d2416] uppercase tracking-wider mb-3">
                  <FileText className="w-4 h-4" />
                  메모
                </label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="상품에 대한 메모를 입력하세요"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-[#2d2416]/20 bg-white text-[#2d2416] placeholder:text-[#8b7355]/50 outline-none focus:border-[#c49a1a] transition-colors resize-none"
                />
              </div>

              {/* URL */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-[#2d2416] uppercase tracking-wider mb-3">
                  <Link className="w-4 h-4" />
                  관련 URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 border-2 border-[#2d2416]/20 bg-white text-[#2d2416] placeholder:text-[#8b7355]/50 outline-none focus:border-[#c49a1a] transition-colors"
                />
                <p className="text-xs text-[#8b7355] mt-2">리뷰, 블로그 글 등 관련 링크</p>
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between px-6 py-4 border-t-4 border-[#2d2416] bg-[#f6f1e9]">
          <div>
            {meta && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-red-500 text-red-500 font-bold text-sm uppercase tracking-wider hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-[#2d2416]/30 text-[#8b7355] font-bold text-sm uppercase tracking-wider hover:border-[#2d2416] hover:text-[#2d2416] transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-6 py-2 bg-[#2d2416] border-2 border-[#2d2416] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#c49a1a] hover:border-[#c49a1a] disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              저장
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

