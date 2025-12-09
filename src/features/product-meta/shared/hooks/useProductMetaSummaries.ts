import { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AccountProvider, ProductMetaSummary } from "@shared/api/types";

interface UseProductMetaSummariesReturn {
  summaries: Map<number, ProductMetaSummary>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasMeta: (itemId: number) => boolean;
  getSummary: (itemId: number) => ProductMetaSummary | undefined;
}

/**
 * 특정 provider의 모든 상품 메타데이터 요약 정보를 관리하는 훅
 */
export const useProductMetaSummaries = (
  provider: AccountProvider
): UseProductMetaSummariesReturn => {
  const [summaries, setSummaries] = useState<ProductMetaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<ProductMetaSummary[]>("list_product_meta_summaries", {
        provider,
      });
      setSummaries(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  // itemId를 키로 하는 Map으로 변환 (빠른 조회)
  const summaryMap = useMemo(() => {
    const map = new Map<number, ProductMetaSummary>();
    summaries.forEach((s) => map.set(s.itemId, s));
    return map;
  }, [summaries]);

  const hasMeta = useCallback(
    (itemId: number): boolean => summaryMap.has(itemId),
    [summaryMap]
  );

  const getSummary = useCallback(
    (itemId: number): ProductMetaSummary | undefined => summaryMap.get(itemId),
    [summaryMap]
  );

  return {
    summaries: summaryMap,
    loading,
    error,
    refresh: loadSummaries,
    hasMeta,
    getSummary,
  };
};







