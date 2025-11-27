import { useState, useEffect, useCallback } from "react";

const DEFAULT_STORAGE_KEY = "tauti_search_history";
const DEFAULT_MAX_ITEMS = 10;

interface UseSearchHistoryOptions {
  /** localStorage에 저장할 키 */
  storageKey?: string;
  /** 최대 저장 항목 수 */
  maxItems?: number;
}

interface UseSearchHistoryReturn {
  /** 현재 검색 히스토리 목록 */
  history: string[];
  /** 히스토리에 검색어 추가 */
  addToHistory: (term: string) => void;
  /** 히스토리에서 특정 검색어 삭제 */
  removeFromHistory: (term: string) => void;
  /** 전체 히스토리 초기화 */
  clearHistory: () => void;
}

/**
 * 검색 히스토리를 관리하는 훅
 * localStorage에 저장되어 앱 재시작 후에도 유지됨
 *
 * @example
 * ```tsx
 * const { history, addToHistory, removeFromHistory } = useSearchHistory();
 *
 * // 검색 실행 시
 * const handleSearch = (query: string) => {
 *   addToHistory(query);
 *   // 검색 로직...
 * };
 * ```
 */
export const useSearchHistory = (
  options: UseSearchHistoryOptions = {}
): UseSearchHistoryReturn => {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    maxItems = DEFAULT_MAX_ITEMS,
  } = options;

  const [history, setHistory] = useState<string[]>([]);

  // 마운트 시 localStorage에서 히스토리 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch {
      setHistory([]);
    }
  }, [storageKey]);

  // localStorage에 히스토리 저장
  const saveHistory = useCallback(
    (newHistory: string[]) => {
      setHistory(newHistory);
      try {
        localStorage.setItem(storageKey, JSON.stringify(newHistory));
      } catch (e) {
        console.error("검색 히스토리 저장 실패:", e);
      }
    },
    [storageKey]
  );

  // 히스토리에 추가 (중복 제거, 최대 개수 제한)
  const addToHistory = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;

      setHistory((prev) => {
        const filtered = prev.filter((h) => h !== trimmed);
        const newHistory = [trimmed, ...filtered].slice(0, maxItems);
        try {
          localStorage.setItem(storageKey, JSON.stringify(newHistory));
        } catch (e) {
          console.error("검색 히스토리 저장 실패:", e);
        }
        return newHistory;
      });
    },
    [maxItems, storageKey]
  );

  // 히스토리에서 삭제
  const removeFromHistory = useCallback(
    (term: string) => {
      setHistory((prev) => {
        const newHistory = prev.filter((h) => h !== term);
        try {
          localStorage.setItem(storageKey, JSON.stringify(newHistory));
        } catch (e) {
          console.error("검색 히스토리 저장 실패:", e);
        }
        return newHistory;
      });
    },
    [storageKey]
  );

  // 전체 히스토리 초기화
  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
};

