import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AccountProvider, ProductMeta, ProductMetaInput } from "@shared/api/types";

interface UseProductMetaReturn {
  meta: ProductMeta | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  refresh: () => Promise<void>;
  save: (input: ProductMetaInput) => Promise<ProductMeta>;
  remove: () => Promise<void>;
}

/**
 * 개별 상품의 메타데이터를 관리하는 훅
 */
export const useProductMeta = (
  provider: AccountProvider,
  itemId: number
): UseProductMetaReturn => {
  const [meta, setMeta] = useState<ProductMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<ProductMeta | null>("get_product_meta", {
        provider,
        itemId,
      });
      setMeta(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [provider, itemId]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const save = useCallback(
    async (input: ProductMetaInput): Promise<ProductMeta> => {
      setSaving(true);
      setError(null);
      try {
        const result = await invoke<ProductMeta>("save_product_meta", {
          provider,
          itemId,
          input,
        });
        setMeta(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setSaving(false);
      }
    },
    [provider, itemId]
  );

  const remove = useCallback(async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      await invoke("delete_product_meta", { provider, itemId });
      setMeta(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [provider, itemId]);

  return {
    meta,
    loading,
    error,
    saving,
    refresh: loadMeta,
    save,
    remove,
  };
};







