import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Clock, X, ArrowRight, Trash2 } from "lucide-react";
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
  placeholder = "상품 검색...",
  storageKey,
  maxHistoryItems,
}: GlobalSearchBoxProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 검색 히스토리 훅 사용
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory({
    storageKey,
    maxItems: maxHistoryItems,
  });

  // 드롭다운 표시 조건
  const showDropdown = isOpen && history.length > 0 && !query.trim();

  // 검색 실행
  const executeSearch = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    
    addToHistory(trimmed);
    onSearch(trimmed);
    setQuery(trimmed);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  }, [addToHistory, onSearch]);

  // 드롭다운 열기
  const openDropdown = useCallback(() => {
    setIsOpen(true);
    setSelectedIndex(-1);
  }, []);

  // 드롭다운 닫기
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSelectedIndex(-1);
  }, []);

  // 히스토리 항목 클릭
  const handleHistoryClick = useCallback((term: string) => {
    executeSearch(term);
  }, [executeSearch]);

  // 히스토리 항목 삭제
  const handleHistoryDelete = useCallback((term: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromHistory(term);
    // 삭제 후 선택 인덱스 조정
    setSelectedIndex((prev) => {
      if (prev >= history.length - 1) return Math.max(-1, prev - 1);
      return prev;
    });
  }, [removeFromHistory, history.length]);

  // 전체 삭제
  const handleClearAll = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearHistory();
    setSelectedIndex(-1);
  }, [clearHistory]);

  // 키보드 이벤트
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown) {
      // 드롭다운이 없을 때는 Enter만 처리
      if (e.key === "Enter") {
        executeSearch(query);
      } else if (e.key === "Escape") {
        closeDropdown();
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < history.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : history.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < history.length) {
          executeSearch(history[selectedIndex]);
        } else if (query.trim()) {
          executeSearch(query);
        }
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        inputRef.current?.blur();
        break;
      case "Tab":
        closeDropdown();
        break;
    }
  }, [showDropdown, history, selectedIndex, query, executeSearch, closeDropdown]);

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

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };

    if (isOpen) {
      // mousedown 사용하여 클릭 시작 시 감지
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, closeDropdown]);

  // 단축키 (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        openDropdown();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [openDropdown]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full max-w-md"
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      {/* 검색 입력창 */}
      <div 
        onMouseDown={() => {
          inputRef.current?.focus();
          openDropdown();
        }}
        className={`
          flex items-center gap-2 px-3 py-1.5 cursor-text
          bg-[#2d2416]/5 border border-[#2d2416]/20 rounded-lg
          transition-all duration-200
          ${isOpen ? "bg-white border-[#2d2416]/40 shadow-sm" : "hover:bg-[#2d2416]/10"}
        `}
      >
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (query.trim()) {
              executeSearch(query);
            } else {
              inputRef.current?.focus();
              openDropdown();
            }
          }}
          className="p-0.5 rounded hover:bg-[#2d2416]/10 text-[#8b7355] hover:text-[#c49a1a] transition-colors flex-shrink-0 cursor-pointer"
          title="검색"
        >
          <Search className="w-4 h-4" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-[#2d2416] placeholder:text-[#8b7355]/60 outline-none"
        />
        {query && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuery("");
              setSelectedIndex(-1);
              inputRef.current?.focus();
            }}
            className="p-0.5 rounded hover:bg-[#2d2416]/10 text-[#8b7355] hover:text-[#2d2416] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-[#8b7355]/60 bg-[#2d2416]/5 rounded border border-[#2d2416]/10">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      {/* 히스토리 드롭다운 */}
      {showDropdown && (
        <div 
          className="absolute top-full left-0 right-0 mt-1 bg-[#fffef0] border border-[#2d2416]/20 rounded-lg shadow-lg overflow-hidden z-50"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          onMouseDown={(e) => {
            // 드롭다운 내부 클릭 시 input blur 방지
            e.preventDefault();
          }}
        >
          {/* 헤더: 최근 검색 + 전체 삭제 버튼 */}
          <div className="px-3 py-2 border-b border-[#2d2416]/10 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8b7355] uppercase tracking-wider">
              최근 검색 (↑↓ 탐색, Enter 선택)
            </span>
            <button
              type="button"
              onMouseDown={handleClearAll}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[#8b7355] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="전체 삭제"
            >
              <Trash2 className="w-3 h-3" />
              <span>전체 삭제</span>
            </button>
          </div>
          
          {/* 히스토리 목록 */}
          <div ref={listRef} className="max-h-64 overflow-y-auto">
            {history.map((term, index) => (
              <div
                key={`${term}-${index}`}
                data-history-item
                onMouseDown={() => handleHistoryClick(term)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                  ${selectedIndex === index 
                    ? "bg-[#2d2416]/10" 
                    : "hover:bg-[#2d2416]/5"
                  }
                `}
              >
                <Clock className="w-4 h-4 text-[#8b7355]/50 flex-shrink-0" />
                <span className="flex-1 text-sm text-[#2d2416] truncate text-left">{term}</span>
                <ArrowRight className={`w-4 h-4 text-[#8b7355]/30 flex-shrink-0 transition-opacity ${
                  selectedIndex === index ? "opacity-100" : "opacity-0"
                }`} />
                
                {/* 개별 삭제 버튼 */}
                <button
                  type="button"
                  onMouseDown={(e) => handleHistoryDelete(term, e)}
                  className="p-1.5 rounded hover:bg-red-50 text-[#8b7355]/40 hover:text-red-500 transition-all flex-shrink-0"
                  title="삭제"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
