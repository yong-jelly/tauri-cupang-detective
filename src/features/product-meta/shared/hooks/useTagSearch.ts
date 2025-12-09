import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface UseTagSearchReturn {
  suggestions: string[];
  loading: boolean;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

/**
 * 태그 자동완성 검색을 위한 훅
 */
export const useTagSearch = (): UseTagSearchReturn => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<string[]>("search_tags", {
        query: query.trim(),
        limit: 10,
      });
      setSuggestions(result);
    } catch (err) {
      console.error("태그 검색 실패:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    loading,
    search,
    clear,
  };
};







