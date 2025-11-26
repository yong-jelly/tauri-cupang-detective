import { useCallback, useState } from "react";

export const useClipboardCopy = () => {
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedValue(text);
      setTimeout(() => setCopiedValue(null), 2000);
    } catch (error) {
      console.error("클립보드 복사 실패:", error);
    }
  }, []);

  return { copiedValue, copy };
};

