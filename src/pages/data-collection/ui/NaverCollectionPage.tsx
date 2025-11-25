import { useState, useCallback, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { parseCurlCommand } from "@shared/lib/parseCurl";
import { buildListUrl, buildDetailUrl } from "@shared/config/providerUrls";
import type { User, ProxyResponse } from "@shared/api/types";
import { Loader2, Play, Pause, CheckCircle, AlertCircle, Clock } from "lucide-react";

// Rust 타입과 일치하는 인터페이스 정의
interface NaverPaymentItem {
  lineNo: number;
  productName: string;
  imageUrl?: string;
  infoUrl?: string;
  quantity: number;
  unitPrice?: number;
  lineAmount?: number;
  restAmount?: number;
  memo?: string;
}

interface NaverPayment {
  payId: string;
  externalId?: string;
  serviceType?: string;
  statusCode?: string;
  statusText?: string;
  statusColor?: string;
  paidAt: string;
  purchaserName?: string;
  merchantNo?: string;
  merchantName: string;
  merchantTel?: string;
  merchantUrl?: string;
  merchantImageUrl?: string;
  merchantPaymentId?: string;
  subMerchantName?: string;
  subMerchantUrl?: string;
  subMerchantPaymentId?: string;
  isTaxType?: boolean;
  isOverseaTransfer?: boolean;
  productName?: string;
  productCount?: number;
  productDetailUrl?: string;
  orderDetailUrl?: string;
  totalAmount: number;
  discountAmount?: number;
  cupDepositAmount?: number;
  restAmount?: number;
  payEasycardAmount?: number;
  payEasybankAmount?: number;
  payRewardPointAmount?: number;
  payChargePointAmount?: number;
  payGiftcardAmount?: number;
  benefitType?: string;
  hasPlusMembership?: boolean;
  benefitWaitingPeriod?: number;
  benefitExpectedAmount?: number;
  benefitAmount?: number;
  isMembership?: boolean;
  isBranch?: boolean;
  isLastSubscriptionRound?: boolean;
  isCafeSafePayment?: boolean;
  merchantCountryCode?: string;
  merchantCountryName?: string;
  applicationCompleted?: boolean;
  items: NaverPaymentItem[];
}

interface LogEntry {
  timestamp: string;
  page: number;
  payId?: string;
  message: string;
  status: "info" | "success" | "error";
  imageUrl?: string;
  amount?: number;
  date?: string;
}

interface NaverCollectionPageProps {
  account: User;
}

export const NaverCollectionPage = ({ account }: NaverCollectionPageProps) => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [progress, setProgress] = useState({ total: 0, current: 0, success: 0, failed: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const stopRequestedRef = useRef(false);

  const addLog = (
    message: string,
    status: "info" | "success" | "error" = "info",
    page: number = 0,
    payId?: string,
    imageUrl?: string,
    amount?: number,
    date?: string
  ) => {
    setLogs((prev) => [
      {
        timestamp: new Date().toLocaleTimeString(),
        page,
        payId,
        message,
        status,
        imageUrl,
        amount,
        date,
      },
      ...prev.slice(0, 99), // 최대 100개 유지
    ]);
  };

  const parseCurlAndGetHeaders = useCallback(() => {
    const parsed = parseCurlCommand(account.curl);
    return parsed.headers;
  }, [account.curl]);

  // 딜레이 함수
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // 상세 정보 조회 및 파싱
  const fetchAndParseDetail = async (
    payId: string,
    serviceType: string,
    orderNo: string | undefined,
    headers: Record<string, string>
  ): Promise<NaverPayment | null> => {
    try {
      const url = buildDetailUrl(account.provider, payId, serviceType, orderNo);
      const result = await invoke<ProxyResponse>("proxy_request", {
        url,
        method: "GET",
        headers,
        body: null,
      });

      if (result.status < 200 || result.status >= 300) {
        throw new Error(`HTTP ${result.status}`);
      }

      const data = JSON.parse(result.body);
      const resultData = data.result;

      // 파싱 로직 (복잡하므로 핵심만 추출하여 매핑)
      // 실제 구현에서는 더 정교한 매핑 필요
      const payment: NaverPayment = {
        payId: resultData.payment?.id || resultData.order?.orderNo || payId, // fallback
        externalId: undefined, // 목록에서 주입 필요
        serviceType: serviceType,
        statusCode: resultData.payment?.status,
        statusText: undefined, // 목록에서 주입 필요
        paidAt: resultData.payment?.date || new Date(resultData.order?.orderDateTime || Date.now()).toISOString(),
        merchantName: resultData.merchant?.name || resultData.productBundleGroups?.[Object.keys(resultData.productBundleGroups)[0]]?.merchantName || "Unknown",
        totalAmount: resultData.amount?.totalAmount || resultData.pay?.totalInitPayAmount || 0,
        items: [],
      };

      // 상세 필드 매핑 (간소화 버전, 실제로는 모든 필드 매핑 필요)
      if (resultData.merchant) {
        payment.merchantTel = resultData.merchant.tel;
        payment.merchantUrl = resultData.merchant.url;
        payment.merchantImageUrl = resultData.merchant.imageUrl;
        payment.merchantPaymentId = resultData.merchant.paymentId;
      }
      
      if (resultData.amount) {
          payment.discountAmount = resultData.amount.discountAmount;
          payment.cupDepositAmount = resultData.amount.cupDepositAmount;
          if (resultData.amount.paymentMethod) {
              payment.payEasycardAmount = resultData.amount.paymentMethod.easyCard;
              payment.payEasybankAmount = resultData.amount.paymentMethod.easyBank;
              payment.payRewardPointAmount = resultData.amount.paymentMethod.rewardPoint;
              payment.payChargePointAmount = resultData.amount.paymentMethod.chargePoint;
              payment.payGiftcardAmount = resultData.amount.paymentMethod.giftCard;
          }
      }
      
       if (resultData.pay) {
          payment.discountAmount = resultData.pay.totalDiscountAmount;
          payment.payRewardPointAmount = resultData.pay.rewardPointPayAmount;
          payment.payChargePointAmount = resultData.pay.chargePointPayAmount;
      }

      // Items 매핑
      if (resultData.product) {
          payment.productName = resultData.product.name;
          payment.productCount = resultData.product.count;
          payment.items.push({
              lineNo: 1,
              productName: resultData.product.name,
              quantity: resultData.product.count,
              lineAmount: payment.totalAmount,
          });
      } else if (resultData.productOrders) {
           resultData.productOrders.forEach((po: any, idx: number) => {
              payment.items.push({
                  lineNo: idx + 1,
                  productName: po.productName,
                  imageUrl: po.productImageUrl,
                  quantity: po.orderQuantity,
                  unitPrice: po.unitPrice, // API 확인 필요
                  lineAmount: po.orderAmount,
                  restAmount: 0,
                  memo: po.optionContents,
              });
          });
          if (payment.items.length > 0) {
              payment.productName = payment.items[0].productName + (payment.items.length > 1 ? ` 외 ${payment.items.length - 1}건` : "");
          }
      }

      return payment;
    } catch (e) {
      console.error(`Failed to fetch detail for ${payId}:`, e);
      return null;
    }
  };

  const startCollection = async () => {
    if (isCollecting) return;
    
    setIsCollecting(true);
    stopRequestedRef.current = false;
    setLogs([]);
    setProgress({ total: 0, current: 0, success: 0, failed: 0 });
    
    try {
      const headers = parseCurlAndGetHeaders();
      
      // 1. 첫 페이지 조회하여 전체 페이지 수 확인
      addLog("페이지 정보 조회 중...", "info", 1);
      const listUrl = buildListUrl(account.provider, 1);
      const listResult = await invoke<ProxyResponse>("proxy_request", {
        url: listUrl,
        method: "GET",
        headers,
        body: null,
      });
      
      if (listResult.status !== 200) {
        throw new Error(`목록 조회 실패: HTTP ${listResult.status}`);
      }
      
      const listData = JSON.parse(listResult.body);
      const totalPage = listData.pageProps?.dehydratedState?.queries?.[0]?.state?.data?.pages?.[0]?.totalPage || 1;
      
      addLog(`총 ${totalPage} 페이지 발견. 역순 수집 시작.`, "info", 1);
      
      // 2. 역순 순회
      for (let page = totalPage; page >= 1; page--) {
        if (stopRequestedRef.current) {
          addLog("사용자 요청으로 수집 중단", "info", page);
          break;
        }
        
        setCurrentPage(page);
        addLog(`${page}페이지 목록 조회 중...`, "info", page);
        
        // 페이지 목록 조회
        let pageItems: any[] = [];
        try {
             const pageUrl = buildListUrl(account.provider, page);
             const pageResult = await invoke<ProxyResponse>("proxy_request", {
                url: pageUrl,
                method: "GET",
                headers,
                body: null,
            });
            const pageData = JSON.parse(pageResult.body);
            pageItems = pageData.pageProps?.dehydratedState?.queries?.[0]?.state?.data?.pages?.[0]?.items || [];
        } catch (e) {
            addLog(`${page}페이지 목록 조회 실패: ${e}`, "error", page);
            continue;
        }

        setProgress(prev => ({ ...prev, total: prev.total + pageItems.length }));
        
        // 페이지 내 항목 순회 (최신순이므로 역순으로 처리하면 과거->현재 순 저장 가능)
        // 하지만 DB 정렬은 created_at/paid_at 기준이므로 순서는 크게 중요하지 않음
        for (const item of pageItems) {
             if (stopRequestedRef.current) break;
             
             const payId = item.additionalData?.payId || item._id;
             const serviceType = item.serviceType;
             const orderNo = item.additionalData?.orderNo;
             
             // 상세 조회
             const detail = await fetchAndParseDetail(payId, serviceType, orderNo, headers);
             
             if (detail) {
                 // 목록 데이터 보강
                 detail.externalId = item._id;
                 detail.statusText = item.status?.text;
                 detail.statusColor = item.status?.color;
                 if (item.productDetailUrl) detail.productDetailUrl = item.productDetailUrl;
                 if (item.orderDetailUrl) detail.orderDetailUrl = item.orderDetailUrl;
                 
                 // DB 저장
                 try {
                     await invoke("save_naver_payment", {
                         userId: account.id,
                         payment: detail
                     });
                     const mainItem = detail.items[0];
                     addLog(
                       `${detail.productName}`, 
                       "success", 
                       page, 
                       payId, 
                       mainItem?.imageUrl, 
                       detail.totalAmount, 
                       detail.paidAt
                     );
                     setProgress(prev => ({ ...prev, success: prev.success + 1, current: prev.current + 1 }));
                 } catch (e) {
                     addLog(`DB 저장 실패: ${e}`, "error", page, payId);
                     setProgress(prev => ({ ...prev, failed: prev.failed + 1, current: prev.current + 1 }));
                 }
             } else {
                 addLog(`상세 조회 실패`, "error", page, payId);
                 setProgress(prev => ({ ...prev, failed: prev.failed + 1, current: prev.current + 1 }));
             }
             
             // 과부하 방지 딜레이 (100ms~300ms)
             await delay(Math.random() * 200 + 100);
        }
        
        // 페이지 간 딜레이
        await delay(1000);
      }
      
      addLog("수집 완료", "success", 0);
      
    } catch (err) {
      addLog(`수집 중 오류 발생: ${err}`, "error", 0);
    } finally {
      setIsCollecting(false);
      stopRequestedRef.current = false;
    }
  };

  const stopCollection = () => {
    if (isCollecting) {
      stopRequestedRef.current = true;
      addLog("수집 중단 요청됨...", "info", currentPage || 0);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">네이버 데이터 수집</h1>
          <p className="text-sm text-gray-500">{account.alias} ({account.provider})</p>
        </div>
        <div className="flex gap-2">
             {!isCollecting ? (
                <button
                  onClick={startCollection}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Play className="w-4 h-4" />
                  수집 시작
                </button>
             ) : (
                <button
                  onClick={stopCollection}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Pause className="w-4 h-4" />
                  중단
                </button>
             )}
        </div>
      </div>

      {/* Dashboard */}
      <div className="p-6 grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500">총 처리</div>
              <div className="text-2xl font-bold">{progress.current} / {progress.total > 0 ? progress.total : '-'}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500">성공</div>
              <div className="text-2xl font-bold text-green-600">{progress.success}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500">실패</div>
              <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-500">현재 페이지</div>
              <div className="text-2xl font-bold text-blue-600">{currentPage || '-'}</div>
          </div>
      </div>

      {/* Logs */}
      <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 font-semibold text-sm text-gray-700">
                  수집 로그
              </div>
              <div className="flex-1 overflow-auto p-0">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 sticky top-0">
                          <tr>
                              <th className="px-4 py-2 w-24">시간</th>
                              <th className="px-4 py-2 w-20">페이지</th>
                              <th className="px-4 py-2">메시지</th>
                              <th className="px-4 py-2 w-24">상태</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {logs.map((log, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-gray-500 font-mono text-xs whitespace-nowrap">{log.timestamp}</td>
                                  <td className="px-4 py-2 text-gray-600 text-center">{log.page > 0 ? log.page : '-'}</td>
                                  <td className="px-4 py-2 text-gray-800">
                                      <div className="flex items-center gap-2">
                                          {log.imageUrl && (
                                              <img src={log.imageUrl} alt="상품" className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-200" />
                                          )}
                                          <div className="flex flex-col">
                                              <div className="flex items-center gap-2">
                                                  {log.date && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{new Date(log.date).toLocaleDateString()}</span>}
                                                  {log.amount !== undefined && <span className="text-xs font-medium text-blue-600">₩{log.amount.toLocaleString()}</span>}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  {log.payId && <span className="text-xs text-gray-400 hidden md:inline-block">#{log.payId.slice(0, 8)}...</span>}
                                                  <span className="text-sm">{log.message}</span>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                      {log.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />}
                                      {log.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 mx-auto" />}
                                      {log.status === 'info' && <Clock className="w-4 h-4 text-blue-500 mx-auto" />}
                                  </td>
                              </tr>
                          ))}
                          {logs.length === 0 && (
                              <tr>
                                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                                      수집을 시작하면 로그가 표시됩니다.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
    </div>
  );
};

