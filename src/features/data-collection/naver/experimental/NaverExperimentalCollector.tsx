import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { buildListUrl, buildDetailUrl } from "@shared/config/providerUrls";
import type { User, ProxyResponse } from "@shared/api/types";
import { Loader2, Play, ExternalLink, Copy, Check } from "lucide-react";
import { useAccountCredentials } from "@features/data-collection/shared/hooks/useAccountCredentials";
import { useClipboardCopy } from "@features/data-collection/shared/hooks/useClipboardCopy";
import { useBuildId } from "@features/data-collection/shared/hooks/useBuildId";

interface PaymentItem {
  _id: string;
  serviceType: string;
  status: {
    name: string;
    text: string;
    color: string;
  };
  merchantNo: string;
  merchantName: string;
  product: {
    name: string;
    imgUrl?: string;
    infoUrl?: string;
    price?: number;
    restAmount: number;
  };
  date: number;
  orderDetailUrl?: string;
  additionalData?: {
    payId?: string;
    orderNo?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface PaymentListResponse {
  pageProps: {
    dehydratedState: {
      queries: Array<{
        state: {
          data: {
            pages: Array<{
              items: PaymentItem[];
              itemCount: number;
              totalPage: number;
              curPage: number;
            }>;
          };
        };
      }>;
    };
  };
}

interface PaymentDetailResponse {
  code: string;
  message: string;
  result: {
    // 일반 결제 (naverFinancial)
    payment?: {
      id: string;
      date: string;
      status: string;
      purchaserName: string;
    };
    merchant?: {
      name: string;
      url?: string;
      imageUrl?: string;
      paymentId: string;
      tel?: string;
      subMerchant?: {
        name: string;
        url?: string;
        paymentId: string;
      } | null;
    };
    product?: {
      name: string;
      count: number;
    };
    amount?: {
      totalAmount: number;
      discountAmount: number;
      cupDepositAmount: number;
      paymentMethod: {
        easyCard: number;
        easyBank: number;
        rewardPoint: number;
        chargePoint: number;
        giftCard: number;
      };
    };
    // LOCALPAY
    order?: {
      orderNo: string;
      orderDateTime: number;
      saleChannelType: string;
      serviceType: string;
      pendingPayment: boolean;
      failedPendingPayment: boolean;
      orderClosed: boolean;
      scheduledChannelType?: string;
      [key: string]: any;
    };
    productOrders?: Array<{
      productOrderNo: string;
      payDateTime: number;
      productOrderStatusType: string;
      productName: string;
      productUrl?: string;
      productImageUrl?: string;
      merchantNo: number;
      orderAmount: number;
      productAmount: number;
      orderQuantity: number;
      optionContents?: string;
      exposureStatusType?: string;
      exposureText?: string;
      [key: string]: any;
    }>;
    productBundleGroups?: Record<
      string,
      {
        merchantName: string;
        merchantNo: number;
        merchantUrl?: string;
        merchantTelNo?: string;
        merchantImageUrl?: string;
        [key: string]: any;
      }
    >;
    pay?: {
      totalInitPayAmount: number;
      totalProductAmount: number;
      deliveryFeeAmount: number;
      totalDiscountAmount: number;
      rewardPointPayAmount: number;
      chargePointPayAmount: number;
      rechargePointAmount?: number;
      rechargePointAdmission?: {
        rechargePointBankName?: string;
        maskedRechargePointAccountNo?: string;
      };
      [key: string]: any;
    };
    deliveryAddress?: {
      exposureDeliveryAddress: boolean;
      receiverName?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

interface NaverExperimentalCollectorProps {
  account: User;
}

export const NaverExperimentalCollector = ({ account }: NaverExperimentalCollectorProps) => {
  const [loading, setLoading] = useState(false);
  const [listData, setListData] = useState<PaymentListResponse | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null);
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<PaymentDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const { copiedValue: copiedUrl, copy: copyToClipboard } = useClipboardCopy();

  const { getHeaders } = useAccountCredentials(account);
  const resolveBuildId = useBuildId(getHeaders);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const headers = getHeaders();
      const buildId = await resolveBuildId(account.provider);
      const url = buildListUrl(account.provider, 1, { buildId });
      const result = await invoke<ProxyResponse>("proxy_request", {
        url,
        method: "GET",
        headers,
        body: null,
      });

      if (result.status >= 200 && result.status < 300) {
        const data = JSON.parse(result.body) as PaymentListResponse;
        setListData(data);
      } else {
        setListError(`HTTP ${result.status}: ${result.body.substring(0, 200)}`);
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [account.provider, getHeaders, resolveBuildId]);

  const fetchDetail = useCallback(
    async (paymentId: string, serviceType?: string, orderNo?: string) => {
      setDetailLoading(true);
      setDetailError(null);
      setSelectedPaymentId(paymentId);
      setSelectedServiceType(serviceType || null);
      setSelectedOrderNo(orderNo || null);
      try {
        const headers = getHeaders();
        // 네이버 상세 URL은 buildId가 필요 없음 (orders.pay.naver.com은 별도 도메인)
        const url = buildDetailUrl(account.provider, paymentId, serviceType, orderNo);
        const result = await invoke<ProxyResponse>("proxy_request", {
          url,
          method: "GET",
          headers,
          body: null,
        });

        if (result.status >= 200 && result.status < 300) {
          const data = JSON.parse(result.body) as PaymentDetailResponse;
          setDetailData(data);
        } else {
          setDetailError(`HTTP ${result.status}: ${result.body.substring(0, 200)}`);
        }
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : String(err));
      } finally {
        setDetailLoading(false);
      }
    },
    [account.provider, getHeaders],
  );

  const items = listData?.pageProps?.dehydratedState?.queries?.[0]?.state?.data?.pages?.[0]?.items || [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fdfbf7] font-mono">
      {/* Header */}
      <div className="h-16 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-serif uppercase tracking-wide">데이터 수집 (네이버)</h1>
          <p className="text-sm text-gray-600 tracking-wider">{account.alias} ({account.provider})</p>
        </div>
        <button
          onClick={fetchList}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-gray-800 text-[#fffef0] border-2 border-gray-800 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-[3px_3px_0px_0px_rgba(31,41,55,0.4)]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              조회 중...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              테스트 (1페이지)
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4 p-4">
        {/* Left Column */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* List JSON */}
          <div className="flex-1 flex flex-col bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">거래 목록 JSON</h2>
              {listData && (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(listData, null, 2))}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-700 bg-white border-2 border-gray-800 hover:bg-gray-100 transition-colors"
                  title="클릭하여 JSON 전체 복사"
                >
                  {copiedUrl === JSON.stringify(listData, null, 2) ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>복사</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {listError ? (
                <div className="text-sm text-[#e76f51] font-bold">{listError}</div>
              ) : listData ? (
                <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-words">
                  {JSON.stringify(listData, null, 2)}
                </pre>
              ) : (
                <div className="text-sm text-gray-500 italic">테스트 버튼을 눌러 데이터를 조회하세요.</div>
              )}
            </div>
          </div>

          {/* Detail JSON */}
          <div className="flex-1 flex flex-col bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">거래 상세 JSON</h2>
              {selectedPaymentId && (
                <button
                  onClick={() =>
                    copyToClipboard(
                      buildDetailUrl(account.provider, selectedPaymentId, selectedServiceType || undefined, selectedOrderNo || undefined),
                    )
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-700 bg-white border-2 border-gray-800 hover:bg-gray-100 transition-colors"
                  title="클릭하여 URL 복사"
                >
                  {copiedUrl ===
                  buildDetailUrl(account.provider, selectedPaymentId, selectedServiceType || undefined, selectedOrderNo || undefined) ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>URL 복사</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {detailLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-800" />
                </div>
              ) : detailError ? (
                <div className="text-sm text-[#e76f51] font-bold">{detailError}</div>
              ) : detailData ? (
                <>
                  {selectedPaymentId && (
                    <div className="mb-3 p-2 bg-[#e9c46a]/20 border-2 border-[#e9c46a] text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-700 font-bold uppercase tracking-wider">API URL:</span>
                        <code className="text-gray-800 flex-1 break-all text-right">
                          {buildDetailUrl(
                            account.provider,
                            selectedPaymentId,
                            selectedServiceType || undefined,
                            selectedOrderNo || undefined,
                          )}
                        </code>
                      </div>
                    </div>
                  )}
                  <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-words">
                    {JSON.stringify(detailData, null, 2)}
                  </pre>
                </>
              ) : (
                <div className="text-sm text-gray-500 italic">목록에서 항목을 선택하면 상세 정보가 표시됩니다.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* List Table */}
          <div className="flex-1 flex flex-col bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-gray-800 bg-[#f6f1e9]">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">거래 목록</h2>
            </div>
            <div className="flex-1 overflow-auto">
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-500 italic">
                  데이터가 없습니다.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[#f6f1e9] sticky top-0 border-b-2 border-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">상품명</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">가격</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">상태</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">날짜</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {items.map((item, idx) => {
                      const payId = item.additionalData?.payId || item._id;
                      return (
                        <tr key={item._id} className={`${idx % 2 === 0 ? 'bg-white/80' : 'bg-white/60'} hover:bg-yellow-50/70 transition-colors`}>
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-900">{item.product.name}</div>
                            <div className="text-xs text-gray-600">{item.merchantName}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-900 font-mono font-bold">
                            ₩{item.product?.price?.toLocaleString() ?? '0'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-bold border-2 ${
                                item.status.color === "BLACK"
                                  ? "bg-gray-100 text-gray-800 border-gray-800"
                                  : "bg-[#2a9d8f] text-white border-gray-800"
                              }`}
                            >
                              {item.status.text}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 font-mono">
                            {new Date(item.date).toLocaleDateString("ko-KR")}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                const serviceType = item.serviceType;
                                const orderNo = item.additionalData?.orderNo;
                                fetchDetail(payId, serviceType, orderNo);
                              }}
                              className="text-xs px-3 py-1.5 font-bold uppercase tracking-wider bg-gray-800 text-[#fffef0] border-2 border-gray-800 hover:bg-gray-700 transition-colors"
                            >
                              상세보기
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Detail Table */}
          <div className="flex-1 flex flex-col bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-gray-800 bg-[#f6f1e9]">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">거래 상세</h2>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {detailLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-800" />
                </div>
              ) : detailError ? (
                <div className="text-sm text-[#e76f51] font-bold">{detailError}</div>
              ) : detailData?.result ? (
                <div className="space-y-4 text-sm">
                  {/* LOCALPAY 응답 */}
                  {detailData.result.order ? (
                    <>
                      {/* 주문 정보 */}
                      <div>
                        <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">주문 정보</div>
                        <div className="bg-white border-2 border-gray-800 p-3 space-y-2">
                          {detailData.result.order.orderNo && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">주문번호:</span>
                              <span className="font-medium">{detailData.result.order.orderNo}</span>
                            </div>
                          )}
                          {detailData.result.order.orderDateTime && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">주문일시:</span>
                              <span className="font-medium">
                                {new Date(detailData.result.order.orderDateTime).toLocaleString("ko-KR")}
                              </span>
                            </div>
                          )}
                          {detailData.result.order.saleChannelType && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">판매채널:</span>
                              <span className="font-medium">{detailData.result.order.saleChannelType}</span>
                            </div>
                          )}
                          {detailData.result.order.serviceType && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">서비스 타입:</span>
                              <span className="font-medium">{detailData.result.order.serviceType}</span>
                            </div>
                          )}
                          {detailData.result.order.orderClosed !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">주문 종료:</span>
                              <span className="font-medium">{detailData.result.order.orderClosed ? "예" : "아니오"}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 상품 주문 정보 */}
                      {detailData.result.productOrders && detailData.result.productOrders.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">상품 주문</div>
                          {detailData.result.productOrders.map((productOrder, idx) => (
                            <div key={idx} className="bg-white border-2 border-gray-800 p-3 space-y-2 mb-2">
                              <div className="flex items-start gap-3">
                                {productOrder.productImageUrl && (
                                  <img
                                    src={productOrder.productImageUrl}
                                    alt={productOrder.productName || "상품 이미지"}
                                    className="w-16 h-16 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1">
                                  {productOrder.productName && (
                                    <div className="flex justify-between mb-1">
                                      <span className="text-gray-600">상품명:</span>
                                      <span className="font-medium">{productOrder.productName}</span>
                                    </div>
                                  )}
                                  {productOrder.productOrderNo && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-500">주문번호:</span>
                                      <span className="text-gray-700">{productOrder.productOrderNo}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {productOrder.payDateTime && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">결제일시:</span>
                                  <span className="font-medium">
                                    {new Date(productOrder.payDateTime).toLocaleString("ko-KR")}
                                  </span>
                                </div>
                              )}
                              {productOrder.productOrderStatusType && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">주문 상태:</span>
                                  <span className="font-medium">{productOrder.productOrderStatusType}</span>
                                </div>
                              )}
                              {productOrder.exposureStatusType && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">표시 상태:</span>
                                  <span className="font-medium">{productOrder.exposureStatusType}</span>
                                </div>
                              )}
                              {productOrder.exposureText && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">상태 설명:</span>
                                  <span className="font-medium text-xs">{productOrder.exposureText}</span>
                                </div>
                              )}
                              {productOrder.orderAmount !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">주문금액:</span>
                                  <span className="font-medium">₩{productOrder.orderAmount.toLocaleString()}</span>
                                </div>
                              )}
                              {productOrder.productAmount !== undefined && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">상품금액:</span>
                                  <span className="text-gray-700">₩{productOrder.productAmount.toLocaleString()}</span>
                                </div>
                              )}
                              {productOrder.orderQuantity !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">수량:</span>
                                  <span className="font-medium">{productOrder.orderQuantity}</span>
                                </div>
                              )}
                              {productOrder.optionContents && (
                                <div className="pt-2 border-t border-gray-200">
                                  <div className="text-xs text-gray-500 mb-1">옵션:</div>
                                  <div className="text-xs font-medium text-gray-700">{productOrder.optionContents}</div>
                                </div>
                              )}
                              {productOrder.productUrl && (
                                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                  <span className="text-gray-600 text-xs">상품 URL:</span>
                                  <a
                                    href={productOrder.productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-xs"
                                  >
                                    <span>열기</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                              {productOrder.purchaseDecisionDateTime && (
                                <div className="flex justify-between text-xs pt-2 border-t border-gray-200">
                                  <span className="text-gray-500">구매확정일시:</span>
                                  <span className="text-gray-700">
                                    {new Date(productOrder.purchaseDecisionDateTime).toLocaleString("ko-KR")}
                                  </span>
                                </div>
                              )}
                              {productOrder.reviewWritten !== undefined && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">리뷰 작성:</span>
                                  <span className="text-gray-700">{productOrder.reviewWritten ? "완료" : "미작성"}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 결제 정보 */}
                      {detailData.result.pay && (
                        <div>
                          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">결제 금액</div>
                          <div className="bg-white border-2 border-gray-800 p-3 space-y-2">
                            {detailData.result.pay.totalInitPayAmount !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">총 결제금액:</span>
                                <span className="font-bold text-lg">
                                  ₩{detailData.result.pay.totalInitPayAmount.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {detailData.result.pay.totalProductAmount !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">상품금액:</span>
                                <span className="font-medium">₩{detailData.result.pay.totalProductAmount.toLocaleString()}</span>
                              </div>
                            )}
                            {detailData.result.pay.deliveryFeeAmount !== undefined && detailData.result.pay.deliveryFeeAmount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">배송비:</span>
                                <span className="font-medium">₩{detailData.result.pay.deliveryFeeAmount.toLocaleString()}</span>
                              </div>
                            )}
                            {detailData.result.pay.totalDiscountAmount !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">할인금액:</span>
                                <span className="font-medium">₩{detailData.result.pay.totalDiscountAmount.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="pt-2 border-t border-gray-200">
                              <div className="text-xs text-gray-500 mb-2">결제 수단:</div>
                              <div className="space-y-1 text-xs">
                                {detailData.result.pay.rewardPointPayAmount > 0 && (
                                  <div className="flex justify-between">
                                    <span>리워드 포인트:</span>
                                    <span>₩{detailData.result.pay.rewardPointPayAmount.toLocaleString()}</span>
                                  </div>
                                )}
                                {detailData.result.pay.chargePointPayAmount > 0 && (
                                  <div className="flex justify-between">
                                    <span>충전 포인트:</span>
                                    <span>₩{detailData.result.pay.chargePointPayAmount.toLocaleString()}</span>
                                  </div>
                                )}
                                {detailData.result.pay.rechargePointAmount && detailData.result.pay.rechargePointAmount > 0 && (
                                  <div className="flex justify-between">
                                    <span>충전 금액:</span>
                                    <span>₩{detailData.result.pay.rechargePointAmount.toLocaleString()}</span>
                                  </div>
                                )}
                                {detailData.result.pay.rechargePointAdmission && (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <div className="text-xs text-gray-500 mb-1">충전 계좌:</div>
                                    {detailData.result.pay.rechargePointAdmission.rechargePointBankName && (
                                      <div className="flex justify-between">
                                        <span>은행:</span>
                                        <span>{detailData.result.pay.rechargePointAdmission.rechargePointBankName}</span>
                                      </div>
                                    )}
                                    {detailData.result.pay.rechargePointAdmission.maskedRechargePointAccountNo && (
                                      <div className="flex justify-between">
                                        <span>계좌번호:</span>
                                        <span>{detailData.result.pay.rechargePointAdmission.maskedRechargePointAccountNo}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 배송지 정보 */}
                      {detailData.result.deliveryAddress && !detailData.result.deliveryAddress.deliveryNothing && (
                        <div>
                          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">배송지 정보</div>
                          <div className="bg-white border-2 border-gray-800 p-3 space-y-2">
                            {detailData.result.deliveryAddress.receiverName && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">수령인:</span>
                                <span className="font-medium">{detailData.result.deliveryAddress.receiverName}</span>
                              </div>
                            )}
                            {detailData.result.deliveryAddress.addressName && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">주소지명:</span>
                                <span className="font-medium">{detailData.result.deliveryAddress.addressName}</span>
                              </div>
                            )}
                            {detailData.result.deliveryAddress.receiverTelNo1 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">연락처:</span>
                                <span className="font-medium">{detailData.result.deliveryAddress.receiverTelNo1}</span>
                              </div>
                            )}
                            {detailData.result.deliveryAddress.zipCode && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">우편번호:</span>
                                <span className="font-medium">{detailData.result.deliveryAddress.zipCode}</span>
                              </div>
                            )}
                            {detailData.result.deliveryAddress.baseAddress && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">기본주소:</span>
                                <span className="font-medium text-xs text-right">{detailData.result.deliveryAddress.baseAddress}</span>
                              </div>
                            )}
                            {detailData.result.deliveryAddress.detailAddress && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">상세주소:</span>
                                <span className="font-medium text-xs text-right">{detailData.result.deliveryAddress.detailAddress}</span>
                              </div>
                            )}
                            {detailData.result.deliveryAddress.deliveryMemos && detailData.result.deliveryAddress.deliveryMemos.length > 0 && (
                              <div className="pt-2 border-t border-gray-200">
                                <div className="text-xs text-gray-500 mb-1">배송 메모:</div>
                                {detailData.result.deliveryAddress.deliveryMemos.map((memo: string, idx: number) => (
                                  <div key={idx} className="text-xs text-gray-700">{memo}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 가맹점 정보 */}
                      {detailData.result.productBundleGroups &&
                        Object.values(detailData.result.productBundleGroups).length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">가맹점 정보</div>
                            {Object.values(detailData.result.productBundleGroups).map((merchant, idx) => (
                              <div key={idx} className="bg-white border-2 border-gray-800 p-3 space-y-2">
                                {merchant.merchantName && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">가맹점명:</span>
                                    <span className="font-medium">{merchant.merchantName}</span>
                                  </div>
                                )}
                                {merchant.merchantTelNo && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">전화번호:</span>
                                    <span className="font-medium">{merchant.merchantTelNo}</span>
                                  </div>
                                )}
                                {merchant.deliveryFee !== undefined && merchant.deliveryFee !== null && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">배송비:</span>
                                    <span className="font-medium">₩{merchant.deliveryFee.toLocaleString()}</span>
                                  </div>
                                )}
                                {merchant.merchantUrl && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-600">URL:</span>
                                    <a
                                      href={merchant.merchantUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                    >
                                      <span className="text-xs">열기</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </>
                  ) : (
                    <>
                      {/* 일반 결제 응답 */}
                      {detailData.result.payment && (
                    <div>
                      <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">결제 정보</div>
                      <div className="bg-white border-2 border-gray-800 p-3 space-y-2">
                        {detailData.result.payment.id && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">결제 ID:</span>
                            <span className="font-medium">{detailData.result.payment.id}</span>
                          </div>
                        )}
                        {detailData.result.payment.date && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">결제일:</span>
                            <span className="font-medium">{detailData.result.payment.date}</span>
                          </div>
                        )}
                        {detailData.result.payment.status && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">상태:</span>
                            <span className="font-medium">{detailData.result.payment.status}</span>
                          </div>
                        )}
                        {detailData.result.payment.purchaserName && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">구매자:</span>
                            <span className="font-medium">{detailData.result.payment.purchaserName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {detailData.result.product && (
                    <div>
                      <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">상품 정보</div>
                      <div className="bg-white border-2 border-gray-800 p-3 space-y-2">
                        {detailData.result.product.name && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">상품명:</span>
                            <span className="font-medium">{detailData.result.product.name}</span>
                          </div>
                        )}
                        {detailData.result.product.count !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">수량:</span>
                            <span className="font-medium">{detailData.result.product.count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {detailData.result.amount && (
                    <div>
                      <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">결제 금액</div>
                      <div className="bg-white border-2 border-gray-800 p-3 space-y-2">
                        {detailData.result.amount.totalAmount !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">총 결제금액:</span>
                            <span className="font-bold text-lg">₩{detailData.result.amount.totalAmount.toLocaleString()}</span>
                          </div>
                        )}
                        {detailData.result.amount.discountAmount !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">할인금액:</span>
                            <span className="font-medium">₩{detailData.result.amount.discountAmount.toLocaleString()}</span>
                          </div>
                        )}
                        {detailData.result.amount.paymentMethod && (
                          <div className="pt-2 border-t border-gray-200">
                            <div className="text-xs text-gray-500 mb-2">결제 수단:</div>
                            <div className="space-y-1 text-xs">
                              {detailData.result.amount.paymentMethod.rewardPoint > 0 && (
                                <div className="flex justify-between">
                                  <span>리워드 포인트:</span>
                                  <span>₩{detailData.result.amount.paymentMethod.rewardPoint.toLocaleString()}</span>
                                </div>
                              )}
                              {detailData.result.amount.paymentMethod.chargePoint > 0 && (
                                <div className="flex justify-between">
                                  <span>충전 포인트:</span>
                                  <span>₩{detailData.result.amount.paymentMethod.chargePoint.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {detailData.result.merchant && (
                    <div>
                      <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">가맹점 정보</div>
                      <div className="bg-white border-2 border-gray-800 p-3 space-y-2">
                        {detailData.result.merchant.name && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">가맹점명:</span>
                            <span className="font-medium">{detailData.result.merchant.name}</span>
                          </div>
                        )}
                        {detailData.result.merchant.url && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">URL:</span>
                            <a
                              href={detailData.result.merchant.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                            >
                              <span className="text-xs">열기</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">목록에서 항목을 선택하면 상세 정보가 표시됩니다.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

