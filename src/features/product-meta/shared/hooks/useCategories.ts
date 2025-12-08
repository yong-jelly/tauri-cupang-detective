import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Category } from "@shared/api/types";

interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createCategory: (name: string, color?: string) => Promise<Category>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

/**
 * 카테고리 목록을 관리하는 훅
 */
export const useCategories = (): UseCategoriesReturn => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<Category[]>("list_categories");
      setCategories(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const createCategory = useCallback(async (name: string, color?: string): Promise<Category> => {
    const category = await invoke<Category>("create_category", { name, color });
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    return category;
  }, []);

  const deleteCategory = useCallback(async (categoryId: string): Promise<void> => {
    await invoke("delete_category", { categoryId });
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  }, []);

  return {
    categories,
    loading,
    error,
    refresh: loadCategories,
    createCategory,
    deleteCategory,
  };
};





