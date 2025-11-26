import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { buildDetailUrl } from "@shared/config/providerUrls";
import type { User, ProxyResponse } from "@shared/api/types";
import { Loader2, Play, Copy, Check } from "lucide-react";
import { useAccountCredentials } from "@features/data-collection/shared/hooks/useAccountCredentials";
import { useClipboardCopy } from "@features/data-collection/shared/hooks/useClipboardCopy";
import { useBuildId } from "@features/data-collection/shared/hooks/useBuildId";

interface CoupangExperimentalCollectorProps {
  account: User;
}

interface CoupangProduct {
  productId: number;
  vendorItemId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  imagePath: string | null;
  brandInfo?: {
    brandName: string;
  };
  productType: string;
}

interface CoupangOrderListResponse {
  pageIndex: number;
  size: number;
  orderList: Array<{
    orderId: number;
    memberId: string;
    title: string;
    orderedAt: number;
    hiddenOrder: boolean;
    totalProductPrice: number;
    allCanceled: boolean;
    allReceipted: boolean;
    deliveryGroupList: Array<{
      shipmentBoxId: string;
      invoiceNumber: string;
      invoiceStatus: string;
      productList: Array<CoupangProduct>;
    }>;
  }>;
  hasNext: boolean;
}

export const CoupangExperimentalCollector = ({ account }: CoupangExperimentalCollectorProps) => {
  const [loading, setLoading] = useState(false);
  const [listData, setListData] = useState<CoupangOrderListResponse | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const { copiedValue: copiedUrl, copy: copyToClipboard } = useClipboardCopy();
  
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailBuildId, setDetailBuildId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const { getHeaders, loading: credentialsLoading, error: credentialsError } = useAccountCredentials(account);
  const resolveBuildId = useBuildId(getHeaders);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const headers = getHeaders();
      const url = "https://mc.coupang.com/ssr/api/myorders/model/page?requestYear=0&pageIndex=0&size=5";

      const result = await invoke<ProxyResponse>("proxy_request", {
        url,
        method: "GET",
        headers,
        body: null,
      });

      if (result.status >= 200 && result.status < 300) {
        const data = JSON.parse(result.body);
        setListData(data);
      } else {
        setListError(`HTTP ${result.status}: ${result.body.substring(0, 200)}`);
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [account.provider, account.curl, getHeaders]);

  const fetchDetail = useCallback(async (orderId: string) => {
    setDetailLoading(true);
    setSelectedOrderId(orderId);
    setDetailError(null);
    setDetailData(null);
    setDetailBuildId(null);

    try {
      const headers = getHeaders();
      
      // Build ID 추출 (공통 훅 사용)
      const buildId = await resolveBuildId(account.provider, orderId);
        setDetailBuildId(buildId);

      // Build ID를 사용하여 JSON API 호출
      const jsonUrl = buildDetailUrl(account.provider, orderId, undefined, undefined, { buildId });
      const jsonResult = await invoke<ProxyResponse>("proxy_request", {
        url: jsonUrl,
        method: "GET",
        headers,
        body: null,
      });

      if (jsonResult.status >= 200 && jsonResult.status < 300) {
        const data = JSON.parse(jsonResult.body);
        setDetailData(data);
      } else {
        setDetailError(`JSON API 호출 실패: HTTP ${jsonResult.status}`);
      }
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  }, [account.provider, getHeaders, resolveBuildId]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fdfbf7] font-mono">
      {/* Header */}
      <div className="h-16 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-serif uppercase tracking-wide">데이터 수집 (쿠팡)</h1>
            <p className="text-sm text-gray-600 tracking-wider">{account.alias}</p>
          </div>
          {detailBuildId && (
            <div className="px-3 py-1.5 bg-[#2a9d8f] border-2 border-gray-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.4)]">
              <div className="text-xs text-white/70 uppercase tracking-wider">Build ID</div>
              <div className="text-sm font-mono font-bold text-white">{detailBuildId}</div>
            </div>
          )}
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
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">주문 목록 JSON</h2>
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
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">주문 상세 JSON</h2>
              {selectedOrderId && detailBuildId && (
                <button
                  onClick={() =>
                    copyToClipboard(
                      buildDetailUrl(account.provider, selectedOrderId, undefined, undefined, { buildId: detailBuildId }),
                    )
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-700 bg-white border-2 border-gray-800 hover:bg-gray-100 transition-colors"
                  title="클릭하여 URL 복사"
                >
                  {copiedUrl ===
                  buildDetailUrl(account.provider, selectedOrderId, undefined, undefined, { buildId: detailBuildId }) ? (
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
                  {selectedOrderId && detailBuildId && (
                    <div className="mb-3 p-2 bg-[#e9c46a]/20 border-2 border-[#e9c46a] text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-700 font-bold uppercase tracking-wider">API URL:</span>
                        <code className="text-gray-800 flex-1 break-all text-right">
                          {buildDetailUrl(account.provider, selectedOrderId, undefined, undefined, { buildId: detailBuildId })}
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
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">주문 목록</h2>
            </div>
            <div className="flex-1 overflow-auto">
              {!listData ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-500 italic">
                  데이터가 없습니다.
                </div>
              ) : listData.orderList && listData.orderList.length > 0 ? (
                <div className="divide-y-2 divide-gray-300">
                  {listData.orderList.map((order) => (
                    <div key={order.orderId} className="p-4 hover:bg-[#f6f1e9] transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-xs text-gray-600 mb-1 font-mono">
                            {new Date(order.orderedAt).toLocaleDateString()} · 주문번호 {order.orderId}
                          </div>
                          <h3 className="text-sm font-bold text-gray-900">{order.title}</h3>
                        </div>
                        <button
                          onClick={() => fetchDetail(String(order.orderId))}
                          className="text-xs px-3 py-1.5 font-bold uppercase tracking-wider bg-gray-800 text-[#fffef0] border-2 border-gray-800 hover:bg-gray-700 transition-colors"
                        >
                          상세보기
                        </button>
                      </div>
                      
                      <div className="space-y-2 mt-3">
                        {order.deliveryGroupList.map((group, groupIdx) => (
                          <div key={`${group.shipmentBoxId}-${groupIdx}`} className="space-y-2">
                            {group.productList.map((product, productIdx) => (
                              <div key={`${product.vendorItemId}-${productIdx}`} className="flex gap-3 bg-white border border-gray-300 p-2">
                                {product.imagePath && (
                                  <img 
                                    src={product.imagePath} 
                                    alt={product.productName}
                                    className="w-12 h-12 object-cover bg-white border-2 border-gray-800"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-900 line-clamp-2 font-medium" title={product.productName}>
                                    {product.productName}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1 flex items-center gap-2 font-mono">
                                    <span>{product.quantity}개</span>
                                    <span>₩{product.unitPrice.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-400 flex justify-between items-center text-sm">
                        <span className="text-gray-600 uppercase tracking-wider text-xs">총 결제금액</span>
                        <span className="font-bold text-gray-900 font-mono">₩{order.totalProductPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-500 italic">
                  주문 내역이 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* Detail Table */}
          <div className="flex-1 flex flex-col bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-gray-800 bg-[#f6f1e9]">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">주문 상세</h2>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {detailLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-800" />
                </div>
              ) : detailError ? (
                <div className="text-sm text-[#e76f51] font-bold">{detailError}</div>
              ) : detailData?.pageProps?.domains?.order?.entity?.entities ? (
                (() => {
                  // entities에서 주문 ID 찾기 (selectedOrderId 우선, 없으면 activeOrderId 또는 첫 번째 ID 사용)
                  const entities = detailData.pageProps.domains.order.entity.entities;
                  const entityKeys = Object.keys(entities);
                  
                  let orderId: string | null = null;
                  if (selectedOrderId) {
                    // selectedOrderId와 정확히 일치하는 키 찾기
                    orderId = entityKeys.find(key => key === selectedOrderId || key === String(selectedOrderId)) || null;
                  }
                  
                  // selectedOrderId로 찾지 못했으면 activeOrderId 또는 첫 번째 ID 사용
                  if (!orderId) {
                    const activeOrderId = detailData.pageProps.domains.order?.list?.activeOrderId;
                    if (activeOrderId) {
                      orderId = entityKeys.find(key => key === String(activeOrderId)) || null;
                    }
                  }
                  
                  // 여전히 없으면 첫 번째 키 사용
                  if (!orderId && entityKeys.length > 0) {
                    orderId = entityKeys[0];
                  }
                  
                  if (!orderId) {
                    return <div className="text-sm text-gray-500 italic">주문 정보를 찾을 수 없습니다.</div>;
                  }
                  
                  const orderEntity = entities[orderId];
                  const paymentEntity = detailData.pageProps.domains.payment?.entities?.[orderId];
                  
                  if (!orderEntity) {
                    return <div className="text-sm text-gray-500 italic">주문 정보를 찾을 수 없습니다.</div>;
                  }

                  return (
                    <div className="space-y-4 text-sm">
                      {/* 주문 정보 */}
                      <div>
                        <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">주문 정보</div>
                        <div className="bg-white border-2 border-gray-800 p-3 space-y-2">
                          {orderEntity.orderId && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">주문번호:</span>
                              <span className="font-medium">{orderEntity.orderId}</span>
                            </div>
                          )}
                          {orderEntity.title && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">주문명:</span>
                              <span className="font-medium">{orderEntity.title}</span>
                            </div>
                          )}
                          {orderEntity.orderedAt && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">주문일시:</span>
                              <span className="font-medium">
                                {new Date(orderEntity.orderedAt).toLocaleString("ko-KR")}
                              </span>
                            </div>
                          )}
                          {orderEntity.totalProductPrice !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">상품 총액:</span>
                              <span className="font-medium">₩{orderEntity.totalProductPrice.toLocaleString()}</span>
                            </div>
                          )}
                          {orderEntity.allCanceled !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">전체 취소:</span>
                              <span className="font-medium">{orderEntity.allCanceled ? "예" : "아니오"}</span>
                            </div>
                          )}
                          {orderEntity.allReceipted !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">전체 수령:</span>
                              <span className="font-medium">{orderEntity.allReceipted ? "예" : "아니오"}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 상품 목록 */}
                      {orderEntity.deliveryGroupList && orderEntity.deliveryGroupList.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">상품 목록</div>
                          {orderEntity.deliveryGroupList.map((group: any, groupIdx: number) => (
                            <div key={groupIdx} className="mb-4">
                              {group.productList && group.productList.length > 0 && (
                                <>
                                  {group.deliveryCompany && (
                                    <div className="text-xs text-gray-600 mb-2 font-mono">
                                      배송사: {group.deliveryCompany.companyName || group.deliveryCompany.familyName}
                                    </div>
                                  )}
                                  {group.productList.map((product: any, productIdx: number) => (
                                    <div key={productIdx} className="bg-white border-2 border-gray-800 p-3 space-y-2 mb-2">
                                      <div className="flex items-start gap-3">
                                        {product.imagePath && (
                                          <img
                                            src={product.imagePath}
                                            alt={product.productName || "상품 이미지"}
                                            className="w-16 h-16 object-cover rounded border border-gray-200"
                                          />
                                        )}
                                        <div className="flex-1">
                                          {product.productName && (
                                            <div className="font-medium text-gray-900 mb-1">
                                              {product.productName}
                                            </div>
                                          )}
                                          {product.vendorItemName && product.vendorItemName !== product.productName && (
                                            <div className="text-xs text-gray-500 mb-1">
                                              {product.vendorItemName}
                                            </div>
                                          )}
                                          {product.brandInfo?.brandName && (
                                            <div className="text-xs text-gray-500 mb-1">
                                              브랜드: {product.brandInfo.brandName}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="pt-2 border-t border-gray-200 space-y-1">
                                        {product.quantity !== undefined && (
                                          <div className="flex justify-between text-xs">
                                            <span className="text-gray-600">수량:</span>
                                            <span className="font-medium">{product.quantity}개</span>
                                          </div>
                                        )}
                                        {product.unitPrice !== undefined && (
                                          <div className="flex justify-between text-xs">
                                            <span className="text-gray-600">단가:</span>
                                            <span className="font-medium">₩{product.unitPrice.toLocaleString()}</span>
                                          </div>
                                        )}
                                        {product.discountedUnitPrice !== undefined && product.discountedUnitPrice !== product.unitPrice && (
                                          <div className="flex justify-between text-xs">
                                            <span className="text-gray-600">할인가:</span>
                                            <span className="font-medium text-red-600">₩{product.discountedUnitPrice.toLocaleString()}</span>
                                          </div>
                                        )}
                                        {product.combinedUnitPrice !== undefined && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">최종 단가:</span>
                                            <span className="font-medium">₩{product.combinedUnitPrice.toLocaleString()}</span>
                                          </div>
                                        )}
                                        {product.quantity !== undefined && product.combinedUnitPrice !== undefined && (
                                          <div className="flex justify-between pt-1 border-t border-gray-200">
                                            <span className="text-gray-600 font-medium">소계:</span>
                                            <span className="font-bold">₩{(product.quantity * product.combinedUnitPrice).toLocaleString()}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 결제 정보 */}
                      {paymentEntity && (
                        <div>
                          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">결제 정보</div>
                          <div className="bg-white border-2 border-gray-800 p-3 space-y-2">
                            {paymentEntity.totalPayedAmount !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">총 결제금액:</span>
                                <span className="font-bold text-lg">₩{paymentEntity.totalPayedAmount.toLocaleString()}</span>
                              </div>
                            )}
                            {paymentEntity.totalOrderAmount !== undefined && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">주문금액:</span>
                                <span className="text-gray-700">₩{paymentEntity.totalOrderAmount.toLocaleString()}</span>
                              </div>
                            )}
                            {paymentEntity.paidAt && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">결제일시:</span>
                                <span className="text-gray-700">
                                  {new Date(paymentEntity.paidAt).toLocaleString("ko-KR")}
                                </span>
                              </div>
                            )}
                            {paymentEntity.payedPayment && (
                              <div className="pt-2 border-t border-gray-200">
                                <div className="text-xs text-gray-500 mb-2">결제 수단:</div>
                                <div className="space-y-1 text-xs">
                                  {paymentEntity.payedPayment.rocketBankPayment && (
                                    <div className="flex justify-between">
                                      <span>로켓뱅크 ({paymentEntity.payedPayment.rocketBankPayment.bankName}):</span>
                                      <span>₩{paymentEntity.payedPayment.rocketBankPayment.payedPrice?.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {paymentEntity.payedPayment.couponPayment && (
                                    <div className="flex justify-between">
                                      <span>쿠폰:</span>
                                      <span>₩{paymentEntity.payedPayment.couponPayment.payedPrice?.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {paymentEntity.payedPayment.rocketBalancePayment && (
                                    <div className="flex justify-between">
                                      <span>로켓잔액:</span>
                                      <span>₩{paymentEntity.payedPayment.rocketBalancePayment.payedPrice?.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {paymentEntity.payedPayment.coupangCashPayment && (
                                    <div className="flex justify-between">
                                      <span>쿠팡캐시:</span>
                                      <span>₩{paymentEntity.payedPayment.coupangCashPayment.payedPrice?.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {paymentEntity.wowBenefit && (
                              <div className="pt-2 border-t border-gray-200">
                                <div className="text-xs text-gray-500 mb-1">WOW 혜택:</div>
                                {paymentEntity.wowBenefit.instantDiscountPrice > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span>즉시 할인:</span>
                                    <span className="text-red-600">-₩{paymentEntity.wowBenefit.instantDiscountPrice.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 배송지 정보 */}
                      {orderEntity.deliveryDestination && (
                        <div>
                          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">배송지 정보</div>
                          <div className="bg-white border-2 border-gray-800 p-3 space-y-2">
                            {orderEntity.deliveryDestination.zipCode && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">우편번호:</span>
                                <span className="font-medium">{orderEntity.deliveryDestination.zipCode}</span>
                              </div>
                            )}
                            {orderEntity.deliveryDestination.address && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">주소:</span>
                                <span className="font-medium text-xs text-right">{orderEntity.deliveryDestination.address}</span>
                              </div>
                            )}
                            {orderEntity.deliveryDestination.addressMain && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">기본주소:</span>
                                <span className="text-gray-700 text-right">{orderEntity.deliveryDestination.addressMain}</span>
                              </div>
                            )}
                            {orderEntity.deliveryDestination.addressDetail && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">상세주소:</span>
                                <span className="text-gray-700 text-right">{orderEntity.deliveryDestination.addressDetail}</span>
                              </div>
                            )}
                            {orderEntity.deliveryDestination.shippingMessage && (
                              <div className="pt-2 border-t border-gray-200">
                                <div className="text-xs text-gray-500 mb-1">배송 메시지:</div>
                                {orderEntity.deliveryDestination.shippingMessage.normalMessage && (
                                  <div className="text-xs text-gray-700">
                                    일반: {orderEntity.deliveryDestination.shippingMessage.normalMessage}
                                  </div>
                                )}
                                {orderEntity.deliveryDestination.shippingMessage.dawnMessage && (
                                  <div className="text-xs text-gray-700">
                                    새벽: {orderEntity.deliveryDestination.shippingMessage.dawnMessage}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
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
