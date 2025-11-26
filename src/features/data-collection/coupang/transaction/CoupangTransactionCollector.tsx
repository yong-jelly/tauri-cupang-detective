import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { User, ProxyResponse } from "@shared/api/types";
import { Play, Pause, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useAccountCredentials } from "@features/data-collection/shared/hooks/useAccountCredentials";

// 쿠팡 주문 항목 인터페이스
interface CoupangPaymentItem {
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

// 쿠팡 주문 인터페이스
interface CoupangPayment {
  orderId: string;
  externalId?: string;
  statusCode?: string;
  statusText?: string;
  statusColor?: string;
  orderedAt: string;
  merchantName: string;
  merchantTel?: string;
  merchantUrl?: string;
  merchantImageUrl?: string;
  productName?: string;
  productCount?: number;
  productDetailUrl?: string;
  orderDetailUrl?: string;
  totalAmount: number;
  discountAmount?: number;
  restAmount?: number;
  items: CoupangPaymentItem[];
}

interface LastCoupangPaymentInfo {
  orderId: string;
  orderedAt: string;
}

interface LogEntry {
  timestamp: string;
  page: number;
  orderId?: string;
  message: string;
  status: "info" | "success" | "error";
  imageUrl?: string;
  amount?: number;
  date?: string;
}

interface CoupangTransactionCollectorProps {
  account: User;
}

export const CoupangTransactionCollector = ({ account }: CoupangTransactionCollectorProps) => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [progress, setProgress] = useState({ total: 0, current: 0, success: 0, failed: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const [buildId, setBuildId] = useState<string | null>(null);
  const stopRequestedRef = useRef(false);

  const addLog = (
    message: string,
    status: "info" | "success" | "error" = "info",
    page: number = 0,
    orderId?: string,
    imageUrl?: string,
    amount?: number,
    date?: string
  ) => {
    setLogs((prev) => [
      {
        timestamp: new Date().toLocaleTimeString(),
        page,
        orderId,
        message,
        status,
        imageUrl,
        amount,
        date,
      },
      ...prev.slice(0, 99), // 최대 100개 유지
    ]);
  };

  const { getHeaders, loading: credentialsLoading, error: credentialsError } = useAccountCredentials(account);

  // 딜레이 함수
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Build ID 추출 (최초 1회만)
  const fetchBuildId = useCallback(async (headers: Record<string, string>): Promise<string> => {
    if (buildId) {
      return buildId;
    }

    // 첫 번째 주문 ID로 Build ID 추출 (임시로 첫 페이지의 첫 주문 사용)
    const tempListUrl = `https://mc.coupang.com/ssr/api/myorders/model/page?requestYear=0&pageIndex=0&size=1`;
    const tempListResult = await invoke<ProxyResponse>("proxy_request", {
      url: tempListUrl,
      method: "GET",
      headers,
      body: null,
    });

    if (tempListResult.status !== 200) {
      throw new Error(`Build ID 추출을 위한 목록 조회 실패: HTTP ${tempListResult.status}`);
    }

    const tempListData = JSON.parse(tempListResult.body);
    const firstOrder = tempListData.orderList?.[0];
    
    if (!firstOrder) {
      throw new Error("주문이 없어 Build ID를 추출할 수 없습니다");
    }

    const orderId = String(firstOrder.orderId);
    const htmlUrl = `https://mc.coupang.com/ssr/desktop/order/${orderId}`;
    const htmlResult = await invoke<ProxyResponse>("proxy_request", {
      url: htmlUrl,
      method: "GET",
      headers,
      body: null,
    });

    if (htmlResult.status < 200 || htmlResult.status >= 300) {
      throw new Error(`HTML 페이지 조회 실패: HTTP ${htmlResult.status}`);
    }

    const html = htmlResult.body;
    const buildIdMatch = html.match(/_next\/static\/([^\/]+)\/_buildManifest\.js/);
    
    if (!buildIdMatch || !buildIdMatch[1]) {
      throw new Error("Build ID를 찾을 수 없습니다");
    }

    const extractedBuildId = buildIdMatch[1];
    setBuildId(extractedBuildId);
    return extractedBuildId;
  }, [buildId]);

  // 상세 정보 조회 및 파싱
  const fetchAndParseDetail = async (
    orderId: string,
    buildId: string,
    headers: Record<string, string>
  ): Promise<CoupangPayment | null> => {
    try {
      // Build ID를 사용하여 JSON API 호출
      const jsonUrl = `https://mc.coupang.com/ssr/_next/data/${buildId}/desktop/order/${orderId}.json?orderId=${orderId}`;
      const jsonResult = await invoke<ProxyResponse>("proxy_request", {
        url: jsonUrl,
        method: "GET",
        headers,
        body: null,
      });

      if (jsonResult.status < 200 || jsonResult.status >= 300) {
        throw new Error(`JSON API 호출 실패: HTTP ${jsonResult.status}`);
      }

      const data = JSON.parse(jsonResult.body);
      
      // pageProps.domains.order.entity.entities에서 주문 정보 찾기
      const entities = data.pageProps?.domains?.order?.entity?.entities;
      if (!entities) {
        return null;
      }

      const orderEntity = entities[orderId] || entities[String(orderId)];
      if (!orderEntity) {
        return null;
      }

      const paymentEntity = data.pageProps?.domains?.payment?.entities?.[orderId] || data.pageProps?.domains?.payment?.entities?.[String(orderId)];

      // 파싱 로직
      const order: CoupangPayment = {
        orderId: String(orderEntity.orderId),
        externalId: String(orderEntity.orderId),
        statusCode: orderEntity.allCanceled ? "CANCELED" : orderEntity.allReceipted ? "RECEIPTED" : "ORDERED",
        statusText: orderEntity.allCanceled ? "취소됨" : orderEntity.allReceipted ? "수령완료" : "주문완료",
        orderedAt: new Date(orderEntity.orderedAt).toISOString(),
        merchantName: orderEntity.title || "쿠팡",
        totalAmount: paymentEntity?.totalPayedAmount || orderEntity.totalProductPrice || 0,
        items: [],
      };

      // Items 매핑
      if (orderEntity.deliveryGroupList) {
        let lineNo = 1;
        orderEntity.deliveryGroupList.forEach((group: any) => {
          if (group.productList) {
            group.productList.forEach((product: any) => {
              order.items.push({
                lineNo: lineNo++,
                productName: product.productName,
                imageUrl: product.imagePath || undefined,
                quantity: product.quantity,
                unitPrice: product.unitPrice,
                lineAmount: product.combinedUnitPrice ? product.combinedUnitPrice * product.quantity : (product.unitPrice * product.quantity),
                memo: product.brandInfo?.brandName || undefined,
              });
            });
          }
        });
      }

      if (order.items.length > 0) {
        order.productName = order.items[0].productName + (order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : "");
        order.productCount = order.items.length;
      }

      // 결제 정보 보강
      if (paymentEntity) {
        if (paymentEntity.payedPayment?.rocketBankPayment) {
          order.merchantName = paymentEntity.payedPayment.rocketBankPayment.bankName || order.merchantName;
        }
      }

      return order;
    } catch (e) {
      console.error(`Failed to fetch detail for ${orderId}:`, e);
      return null;
    }
  };

  const startCollection = async () => {
    if (isCollecting) return;
    
    setIsCollecting(true);
    stopRequestedRef.current = false;
    setLogs([]);
    setProgress({ total: 0, current: 0, success: 0, failed: 0 });
    setBuildId(null); // 수집 시작 시 Build ID 초기화
    
    try {
      const headers = getHeaders();
      
      addLog("마지막 저장된 주문 조회 중...", "info", 0);
      const lastSaved = await invoke<LastCoupangPaymentInfo | null>("get_last_coupang_payment", {
        userId: account.id,
      });
      if (lastSaved) {
        addLog(
          `마지막 저장된 주문: #${lastSaved.orderId} (${new Date(lastSaved.orderedAt).toLocaleString()})`,
          "info",
          0
        );
      } else {
        addLog("저장된 주문이 없어 전체 내역을 수집합니다.", "info", 0);
      }
      const stopAtOrderId = lastSaved?.orderId ?? null;
      
      // 1. Build ID 추출 (최초 1회만)
      addLog("Build ID 추출 중...", "info", 0);
      const extractedBuildId = await fetchBuildId(headers);
      addLog(`Build ID 추출 완료: ${extractedBuildId}`, "success", 0);
      
      // 2. pageIndex를 0부터 시작하여 계속 증가시키며 수집
      //    주문 목록이 비어있을 때까지 반복 (마지막 페이지를 미리 알 필요 없음)
      let pageIndex = 0;
      const pageSize = 5;
      
      addLog("주문 목록 수집 시작...", "info", 0);
      
      let reachedLastSynced = false;
      
      while (!stopRequestedRef.current && !reachedLastSynced) {
        setCurrentPage(pageIndex + 1);
        addLog(`pageIndex=${pageIndex} 목록 조회 중...`, "info", pageIndex + 1);
        
        // pageIndex를 URL 파라미터로 사용하여 페이지 조회
        const listUrl = `https://mc.coupang.com/ssr/api/myorders/model/page?requestYear=0&pageIndex=${pageIndex}&size=${pageSize}`;
        const listResult = await invoke<ProxyResponse>("proxy_request", {
          url: listUrl,
          method: "GET",
          headers,
          body: null,
        });
        
        if (listResult.status !== 200) {
          addLog(`pageIndex=${pageIndex} 조회 실패: HTTP ${listResult.status}`, "error", pageIndex + 1);
          break;
        }
        
        const listData = JSON.parse(listResult.body);
        const orderList = listData.orderList || [];
        
        // 주문 목록이 비어있으면 더 이상 페이지가 없으므로 종료
        if (orderList.length === 0) {
          addLog(`주문이 없어 수집 종료 (pageIndex: ${pageIndex})`, "info", pageIndex + 1);
          break;
        }
        
        setProgress(prev => ({ ...prev, total: prev.total + orderList.length }));
        
        // 페이지 내 주문 순회
        for (const orderItem of orderList) {
          if (stopRequestedRef.current) {
            addLog("사용자 요청으로 수집 중단", "info", pageIndex + 1);
            break;
          }
          
          const orderId = String(orderItem.orderId);
          
          if (stopAtOrderId && orderId === stopAtOrderId) {
            addLog(`이미 저장된 주문(${orderId})을 발견하여 이후 수집을 중단합니다.`, "info", pageIndex + 1, orderId);
            reachedLastSynced = true;
            break;
          }
          
          // 상세 조회
          const detail = await fetchAndParseDetail(orderId, extractedBuildId, headers);
          
          if (detail) {
            // DB 저장
            try {
              await invoke("save_coupang_payment", {
                userId: account.id,
                payment: {
                  orderId: detail.orderId,
                  externalId: detail.externalId,
                  statusCode: detail.statusCode,
                  statusText: detail.statusText,
                  statusColor: detail.statusColor,
                  orderedAt: detail.orderedAt,
                  merchantName: detail.merchantName,
                  merchantTel: detail.merchantTel,
                  merchantUrl: detail.merchantUrl,
                  merchantImageUrl: detail.merchantImageUrl,
                  productName: detail.productName,
                  productCount: detail.productCount,
                  productDetailUrl: detail.productDetailUrl,
                  orderDetailUrl: detail.orderDetailUrl,
                  totalAmount: detail.totalAmount,
                  discountAmount: detail.discountAmount,
                  restAmount: detail.restAmount,
                  items: detail.items.map(item => ({
                    lineNo: item.lineNo,
                    productName: item.productName,
                    imageUrl: item.imageUrl,
                    infoUrl: item.infoUrl,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    lineAmount: item.lineAmount,
                    restAmount: item.restAmount,
                    memo: item.memo,
                  })),
                },
              });
              
              const mainItem = detail.items[0];
              addLog(
                `${detail.productName}`, 
                "success", 
                pageIndex + 1, 
                orderId, 
                mainItem?.imageUrl, 
                detail.totalAmount, 
                detail.orderedAt
              );
              setProgress(prev => ({ ...prev, success: prev.success + 1, current: prev.current + 1 }));
            } catch (e) {
              addLog(`DB 저장 실패: ${e}`, "error", pageIndex + 1, orderId);
              setProgress(prev => ({ ...prev, failed: prev.failed + 1, current: prev.current + 1 }));
            }
          } else {
            addLog(`상세 조회 실패`, "error", pageIndex + 1, orderId);
            setProgress(prev => ({ ...prev, failed: prev.failed + 1, current: prev.current + 1 }));
          }
          
          // 과부하 방지 딜레이 (100ms~300ms)
          await delay(Math.random() * 200 + 100);
        }
        
        if (reachedLastSynced) {
          addLog("마지막 저장된 주문까지 수집 완료", "success", pageIndex + 1);
          break;
        }
        
        // pageIndex를 증가시켜 다음 페이지로 이동
        pageIndex++;
        
        // 페이지 간 딜레이
        await delay(500);
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
          <h1 className="text-xl font-semibold text-gray-900">쿠팡 데이터 수집</h1>
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
                                                  {log.orderId && <span className="text-xs text-gray-400 hidden md:inline-block">#{log.orderId.slice(0, 8)}...</span>}
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

