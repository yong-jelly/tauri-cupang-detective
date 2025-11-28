import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Clock, X, ArrowRight, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { createPortal } from "react-dom";
import { useSearchHistory } from "../lib/useSearchHistory";

export interface GlobalSearchBoxProps {
  /** 검색 실행 시 호출되는 콜백 */
  onSearch: (query: string) => void;
  /** 검색창 placeholder 텍스트 */
  placeholder?: string;
  /** 검색 히스토리 저장 키 (localStorage) */
  storageKey?: string;
  /** 최대 히스토리 저장 개수 */
  maxHistoryItems?: number;
}

export const GlobalSearchBox = ({ 
  onSearch, 
  placeholder = "사람, 채널, 파일, 워크플로 등에서 검색",
  storageKey,
  maxHistoryItems,
}: GlobalSearchBoxProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 검색 히스토리 훅 사용
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory({
    storageKey,
    maxItems: maxHistoryItems,
  });

  // 검색 실행
  const executeSearch = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    
    addToHistory(trimmed);
    onSearch(trimmed);
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
  }, [addToHistory, onSearch]);

  // 팝업 열기
  const openPopup = useCallback(() => {
    setIsOpen(true);
    setSelectedIndex(-1);
    // 다음 프레임에서 input에 포커스
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  // 팝업 닫기
  const closePopup = useCallback(() => {
    setIsOpen(false);
    setSelectedIndex(-1);
    setQuery("");
  }, []);

  // 히스토리 항목 클릭
  const handleHistoryClick = useCallback((term: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    executeSearch(term);
  }, [executeSearch]);

  // 히스토리 항목 삭제
  const handleHistoryDelete = useCallback((term: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromHistory(term);
    setSelectedIndex((prev) => {
      if (prev >= history.length - 1) return Math.max(-1, prev - 1);
      return prev;
    });
    // 삭제 후 input에 다시 포커스
    inputRef.current?.focus();
  }, [removeFromHistory, history.length]);

  // 전체 삭제
  const handleClearAll = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearHistory();
    setSelectedIndex(-1);
    // 삭제 후 input에 다시 포커스
    inputRef.current?.focus();
  }, [clearHistory]);

  // 키보드 이벤트
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const hasHistory = history.length > 0 && !query.trim();

    switch (e.key) {
      case "ArrowDown":
        if (hasHistory) {
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < history.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        if (hasHistory) {
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev > 0 ? prev - 1 : history.length - 1
          );
        }
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < history.length && !query.trim()) {
          executeSearch(history[selectedIndex]);
        } else if (query.trim()) {
          executeSearch(query);
        }
        break;
      case "Escape":
        e.preventDefault();
        closePopup();
        break;
      case "Tab":
        e.preventDefault();
        closePopup();
        break;
    }
  }, [history, selectedIndex, query, executeSearch, closePopup]);

  // 선택된 항목이 보이도록 스크롤
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-history-item]");
      const selectedItem = items[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // 단축키 (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          closePopup();
        } else {
          openPopup();
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [openPopup, closePopup, isOpen]);

  // 팝업 열릴 때 body 스크롤 방지 및 wheel 이벤트 차단
  useEffect(() => {
    if (isOpen) {
      // 스크롤 방지
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      
      // 스크롤바 너비 계산
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      document.body.style.overflow = "hidden";
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }

      // wheel 이벤트 차단 (모달 외부)
      const handleWheel = (e: WheelEvent) => {
        // 모달 내부의 스크롤 가능한 영역이 아니면 차단
        const target = e.target as HTMLElement;
        const isInsideScrollable = target.closest("[data-scrollable]");
        if (!isInsideScrollable) {
          e.preventDefault();
        }
      };

      document.addEventListener("wheel", handleWheel, { passive: false });

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
        document.removeEventListener("wheel", handleWheel);
      };
    }
  }, [isOpen]);

  // 표시할 히스토리 (검색어가 없을 때만)
  const showHistory = !query.trim() && history.length > 0;

  // 팝업 모달 컴포넌트
  const renderModal = () => {
    if (!isOpen) return null;

    return createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] search-popup-backdrop"
        onClick={closePopup}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            closePopup();
          }
        }}
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* 백드롭 */}
        <div 
          className="absolute inset-0 bg-[#2d2416]/40 backdrop-blur-sm"
          aria-hidden="true"
        />
        
        {/* 검색 모달 */}
        <div 
          ref={modalRef}
          className="relative w-full max-w-2xl mx-4 search-popup-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 검색 입력 영역 */}
          <div className="bg-white rounded-2xl shadow-2xl border border-[#2d2416]/10 overflow-hidden">
            {/* 메인 검색창 */}
            <div className="flex items-center gap-3 p-4 border-b border-[#2d2416]/10">
              <Search className="w-5 h-5 text-[#8b7355] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 text-base text-[#2d2416] placeholder:text-[#8b7355]/50 outline-none bg-transparent"
              />
              {query && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery("");
                    setSelectedIndex(-1);
                    inputRef.current?.focus();
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#2d2416]/5 text-[#8b7355] hover:text-[#2d2416] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closePopup();
                }}
                className="p-1.5 rounded-lg hover:bg-[#2d2416]/5 text-[#8b7355] hover:text-[#2d2416] transition-colors"
                title="닫기 (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 히스토리 섹션 */}
            {showHistory && (
              <div 
                className="max-h-[50vh] overflow-y-auto"
                data-scrollable
              >
                {/* 헤더 */}
                <div className="px-4 py-3 flex items-center justify-between bg-[#faf9f5] sticky top-0">
                  <span className="text-xs font-semibold text-[#8b7355] uppercase tracking-wider">
                    최근 검색
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[#8b7355] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>전체 삭제</span>
                  </button>
                </div>

                {/* 히스토리 목록 */}
                <div ref={listRef} className="py-2">
                  {history.map((term, index) => (
                    <div
                      key={`${term}-${index}`}
                      data-history-item
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleHistoryClick(term, e)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          executeSearch(term);
                        }
                      }}
                      className={`
                        flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-100 group
                        ${selectedIndex === index 
                          ? "bg-[#c49a1a]/10" 
                          : "hover:bg-[#2d2416]/5"
                        }
                      `}
                    >
                      <Clock className={`w-4 h-4 flex-shrink-0 ${
                        selectedIndex === index ? "text-[#c49a1a]" : "text-[#8b7355]/50"
                      }`} />
                      <span className={`flex-1 text-sm truncate text-left ${
                        selectedIndex === index ? "text-[#2d2416] font-medium" : "text-[#2d2416]"
                      }`}>
                        {term}
                      </span>
                      <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-all duration-100 ${
                        selectedIndex === index 
                          ? "opacity-100 text-[#c49a1a] translate-x-0" 
                          : "opacity-0 -translate-x-2"
                      }`} />
                      <button
                        type="button"
                        onClick={(e) => handleHistoryDelete(term, e)}
                        className={`
                          p-1.5 rounded-lg hover:bg-red-50 text-[#8b7355]/30 hover:text-red-500 
                          transition-all flex-shrink-0 cursor-pointer
                          ${selectedIndex === index ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                        `}
                        title="삭제"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 검색어가 있을 때: 검색 실행 안내 */}
            {query.trim() && (
              <div className="p-4 bg-[#faf9f5]">
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    executeSearch(query);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      executeSearch(query);
                    }
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#c49a1a]/10 hover:bg-[#c49a1a]/15 cursor-pointer transition-colors"
                >
                  <Search className="w-4 h-4 text-[#c49a1a]" />
                  <span className="text-sm text-[#2d2416]">
                    "<span className="font-semibold">{query}</span>" 검색
                  </span>
                  <span className="ml-auto text-xs text-[#8b7355]">Enter</span>
                </div>
              </div>
            )}

            {/* 푸터: 키보드 단축키 안내 */}
            <div className="px-4 py-2.5 bg-[#faf9f5] border-t border-[#2d2416]/5 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-[#8b7355]/70">
                <span className="flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#2d2416]/10 text-[10px] font-semibold">
                      <ArrowUp className="w-3 h-3 inline" />
                    </kbd>
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#2d2416]/10 text-[10px] font-semibold">
                      <ArrowDown className="w-3 h-3 inline" />
                    </kbd>
                  </span>
                  <span>선택</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#2d2416]/10 text-[10px] font-semibold">Enter</kbd>
                  <span>검색</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#2d2416]/10 text-[10px] font-semibold">Esc</kbd>
                  <span>닫기</span>
                </span>
              </div>
              <a 
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-xs text-[#c49a1a] hover:underline"
              >
                자세히 알아보기
              </a>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      {/* 검색 트리거 버튼 (기본 상태) */}
      <button
        type="button"
        onClick={openPopup}
        style={{ 
          WebkitAppRegion: "no-drag",
          pointerEvents: "auto",
        } as React.CSSProperties}
        className="
          titlebar-no-drag
          flex items-center gap-2 px-4 py-2 cursor-pointer
          bg-white/60 backdrop-blur-sm border border-[#2d2416]/10 rounded-xl
          hover:bg-white hover:border-[#c49a1a]/40 hover:shadow-lg hover:shadow-[#c49a1a]/10
          hover:scale-[1.02]
          active:scale-[0.98]
          transition-all duration-200 ease-out group
          w-full max-w-md
        "
      >
        <Search className="w-4 h-4 text-[#8b7355] group-hover:text-[#c49a1a] transition-colors" />
        <span className="flex-1 text-sm text-[#8b7355]/60 text-left truncate group-hover:text-[#8b7355]">
          {placeholder}
        </span>
        <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-1 text-[10px] font-semibold text-[#8b7355]/40 bg-[#2d2416]/5 rounded-md border border-[#2d2416]/10 group-hover:border-[#c49a1a]/20 group-hover:text-[#c49a1a]/60 transition-colors">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* 검색 팝업 모달 (Portal) */}
      {renderModal()}
    </>
  );
};
