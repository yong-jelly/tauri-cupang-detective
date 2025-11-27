import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SearchResponse, SearchResultItem } from "@shared/api/types";
import { SearchResultsView } from "./SearchResultsView";

interface SearchResultsPageProps {
  query: string;
  onClose: () => void;
}

/**
 * 검색 결과 페이지 컨테이너 컴포넌트
 * Tauri API를 통해 데이터를 로드하고 SearchResultsView에 전달
 */
export const SearchResultsPage = ({ query, onClose }: SearchResultsPageProps) => {
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const searchProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await invoke<SearchResponse>("search_products", {
          query,
          limit: 100,
        });
        setResults(response.items);
        setTotal(response.total);
      } catch (err) {
        console.error("검색 실패:", err);
        setError("검색 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      searchProducts();
    }
  }, [query]);

  return (
    <SearchResultsView
      query={query}
      results={results}
      total={total}
      loading={loading}
      error={error}
      onClose={onClose}
    />
  );
};
