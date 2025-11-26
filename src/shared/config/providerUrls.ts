export type ProviderUrlPattern = {
  listUrl: string; // 거래 목록 URL 패턴 (page, buildId 파라미터 포함)
  detailUrl: string; // 거래 상세 URL 패턴 (paymentId 파라미터 포함)
  localPayDetailUrl: string; // LOCALPAY 거래 상세 URL 패턴 (orderNo 파라미터 포함)
  requiresBuildId: boolean; // Build ID가 필요한지 여부
};

export const PROVIDER_URL_PATTERNS: Record<string, ProviderUrlPattern> = {
  naver: {
    listUrl: "https://pay.naver.com/_next/data/{buildId}/pc/history.json?page={page}",
    detailUrl: "https://orders.pay.naver.com/orderApi/payment/detail/naverFinancial?paymentId={paymentId}",
    localPayDetailUrl: "https://orders.pay.naver.com/orderApi/orderSheet/detail/?orderNo={orderNo}",
    requiresBuildId: true,
  },
  coupang: {
    listUrl: "https://mc.coupang.com/ssr/api/myorders/model/page?requestYear=0&pageIndex=0&size=5",
    detailUrl: "https://mc.coupang.com/ssr/_next/data/{buildId}/desktop/order/{paymentId}.json?orderId={paymentId}",
    localPayDetailUrl: "",
    requiresBuildId: true,
  },
};

type ListUrlOptions = {
  buildId?: string;
};

export const buildListUrl = (provider: string, page: number, options?: ListUrlOptions): string => {
  const pattern = PROVIDER_URL_PATTERNS[provider];
  if (!pattern || !pattern.listUrl) {
    throw new Error(`${provider}의 목록 URL 패턴이 설정되지 않았습니다.`);
  }
  
  let url = pattern.listUrl;
  
  if (url.includes("{buildId}")) {
    if (!options?.buildId) {
      throw new Error(`${provider} 목록 API 호출에는 buildId가 필요합니다.`);
    }
    url = url.replace("{buildId}", options.buildId);
  }
  
  if (url.includes("{page}")) {
    url = url.replace("{page}", String(page));
  }
  
  return url;
};

type DetailUrlOptions = {
  buildId?: string;
};

export const buildDetailUrl = (
  provider: string,
  paymentId: string,
  serviceType?: string,
  orderNo?: string,
  options?: DetailUrlOptions,
): string => {
  const pattern = PROVIDER_URL_PATTERNS[provider];
  if (!pattern) {
    throw new Error(`${provider}의 URL 패턴이 설정되지 않았습니다.`);
  }

  // LOCALPAY 또는 ORDER인 경우 orderNo를 사용
  if ((serviceType === "LOCALPAY" || serviceType === "ORDER") && orderNo) {
    if (!pattern.localPayDetailUrl) {
      throw new Error(`${provider}의 ${serviceType} 상세 URL 패턴이 설정되지 않았습니다.`);
    }
    return pattern.localPayDetailUrl.replace("{orderNo}", orderNo);
  }

  // 일반적인 경우 paymentId 사용
  if (!pattern.detailUrl) {
    throw new Error(`${provider}의 상세 URL 패턴이 설정되지 않았습니다.`);
  }
  
  let url = pattern.detailUrl;
  
  if (url.includes("{buildId}")) {
    if (!options?.buildId) {
      throw new Error(`${provider} 상세 API 호출에는 buildId가 필요합니다.`);
    }
    url = url.replace("{buildId}", options.buildId);
  }
  
  if (url.includes("{paymentId}")) {
    url = url.replace("{paymentId}", paymentId);
  }
  
  return url;
};

