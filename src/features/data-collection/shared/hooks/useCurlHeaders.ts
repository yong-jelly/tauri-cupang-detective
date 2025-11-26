import { useCallback } from "react";
import { parseCurlCommand } from "@shared/lib/parseCurl";

export const useCurlHeaders = (curl: string) => {
  return useCallback(() => {
    const parsed = parseCurlCommand(curl);
    return parsed.headers;
  }, [curl]);
};

