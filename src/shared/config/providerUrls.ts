export type ProviderUrlPattern = {
  listUrl: string; // 거래 목록 URL 패턴 (page 파라미터 포함)
  detailUrl: string; // 거래 상세 URL 패턴 (paymentId 파라미터 포함)
  localPayDetailUrl: string; // LOCALPAY 거래 상세 URL 패턴 (orderNo 파라미터 포함)
};

export const PROVIDER_URL_PATTERNS: Record<string, ProviderUrlPattern> = {
  naver: {
    listUrl: "https://pay.naver.com/_next/data/-zAFhYDMaEPAVkegiUG4i/pc/history.json?page={page}",
    detailUrl: "https://orders.pay.naver.com/orderApi/payment/detail/naverFinancial?paymentId={paymentId}",
    localPayDetailUrl: "https://orders.pay.naver.com/orderApi/orderSheet/detail/?orderNo={orderNo}",
  },
  coupang: {
    listUrl: "",
    detailUrl: "",
    localPayDetailUrl: "",
  },
};

export const buildListUrl = (provider: string, page: number): string => {
  const pattern = PROVIDER_URL_PATTERNS[provider];
  if (!pattern || !pattern.listUrl) {
    throw new Error(`${provider}의 목록 URL 패턴이 설정되지 않았습니다.`);
  }
  return pattern.listUrl.replace("{page}", String(page));
};

export const buildDetailUrl = (
  provider: string,
  paymentId: string,
  serviceType?: string,
  orderNo?: string,
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
  return pattern.detailUrl.replace("{paymentId}", paymentId);
};

