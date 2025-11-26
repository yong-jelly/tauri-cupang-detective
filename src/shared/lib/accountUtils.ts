import type { AccountProvider } from "@shared/api/types";

export const getProviderIcon = (provider: AccountProvider | string): string => {
  switch (provider) {
    case "naver":
      return "🟢";
    case "coupang":
      return "🟠";
    default:
      return "⚪";
  }
};

export const getProviderName = (provider: AccountProvider | string): string => {
  switch (provider) {
    case "naver":
      return "네이버";
    case "coupang":
      return "쿠팡";
    default:
      return provider;
  }
};

export const formatRegisteredAt = (value: string): string => {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

