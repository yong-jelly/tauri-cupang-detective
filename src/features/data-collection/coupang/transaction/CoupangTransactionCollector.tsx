import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { User, ProxyResponse } from "@shared/api/types";
import { Play, Pause, CheckCircle, AlertCircle, Clock, Loader2, RefreshCw, FastForward } from "lucide-react";
import { useAccountCredentials } from "@features/data-collection/shared/hooks/useAccountCredentials";

// 쿠팡 주문 항목 인터페이스
interface CoupangPaymentItem {
  lineNo: number;
  productId?: string;
  vendorItemId?: string;
  productName: string;
  imageUrl?: string;
  infoUrl?: string;
  brandName?: string;
  quantity: number;
  unitPrice?: number;
  discountedUnitPrice?: number;
  combinedUnitPrice?: number;
  lineAmount?: number;
  restAmount?: number;
  memo?: string;
}

// 쿠팡 주문/결제 인터페이스
interface CoupangPayment {
  orderId: string;
  externalId?: string;
  statusCode?: string;
  statusText?: string;
  statusColor?: string;
  orderedAt: string;
  paidAt?: string;
  merchantName: string;
  merchantTel?: string;
  merchantUrl?: string;
  merchantImageUrl?: string;
  productName?: string;
  productCount?: number;
  productDetailUrl?: string;
  orderDetailUrl?: string;
  totalAmount: number;
  totalOrderAmount?: number;
  totalCancelAmount?: number;
  discountAmount?: number;
  restAmount?: number;
  mainPayType?: string;
  payRocketBalanceAmount?: number;
  payCardAmount?: number;
  payCouponAmount?: number;
  payCoupangCashAmount?: number;
  payRocketBankAmount?: number;
  wowInstantDiscount?: number;
  rewardCashAmount?: number;
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

type CollectionMode = "incremental" | "full";

export const CoupangTransactionCollector = ({ account }: CoupangTransactionCollectorProps) => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [progress, setProgress] = useState({ total: 0, current: 0, success: 0, failed: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [collectionMode, setCollectionMode] = useState<CollectionMode>("incremental");
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
          // vendor 정보 추출 (첫 번째 그룹에서)
          if (lineNo === 1 && group.vendor) {
            order.merchantTel = group.vendor.repPhoneNum || undefined;
          }

          if (group.productList) {
            group.productList.forEach((product: any) => {
              order.items.push({
                lineNo: lineNo++,
                productId: product.productId ? String(product.productId) : undefined,
                vendorItemId: product.vendorItemId ? String(product.vendorItemId) : undefined,
                productName: product.productName,
                imageUrl: product.imagePath || undefined,
                brandName: product.brandInfo?.brandName || undefined,
                quantity: product.quantity,
                unitPrice: product.unitPrice,
                discountedUnitPrice: product.discountedUnitPrice,
                combinedUnitPrice: product.combinedUnitPrice,
                lineAmount: product.combinedUnitPrice 
                  ? product.combinedUnitPrice * product.quantity 
                  : (product.unitPrice * product.quantity),
                memo: product.vendorItemName || undefined,
              });
            });
          }
        });
      }

      if (order.items.length > 0) {
        order.productName = order.items[0].productName + (order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : "");
        order.productCount = order.items.length;
      }

      // 결제 정보 파싱
      if (paymentEntity) {
        order.paidAt = paymentEntity.paidAt ? new Date(paymentEntity.paidAt).toISOString() : undefined;
        order.mainPayType = paymentEntity.mainPayType || undefined;
        order.totalOrderAmount = paymentEntity.totalOrderAmount || undefined;
        order.totalCancelAmount = paymentEntity.totalCancelAmount || undefined;

        // 결제 수단별 금액 파싱
        const payedPayment = paymentEntity.payedPayment;
        if (payedPayment) {
          // 쿠페이머니 (로켓잔액)
          if (payedPayment.rocketBalancePayment?.payedPrice) {
            order.payRocketBalanceAmount = payedPayment.rocketBalancePayment.payedPrice;
          }
          // 카드 결제
          if (payedPayment.cardPayment?.payedPrice) {
            order.payCardAmount = payedPayment.cardPayment.payedPrice;
          }
          // 쿠폰 결제
          if (payedPayment.couponPayment?.payedPrice) {
            order.payCouponAmount = payedPayment.couponPayment.payedPrice;
          }
          // 쿠팡캐시 결제
          if (payedPayment.coupangCashPayment?.payedPrice) {
            order.payCoupangCashAmount = payedPayment.coupangCashPayment.payedPrice;
          }
          // 로켓뱅크 결제
          if (payedPayment.rocketBankPayment?.payedPrice) {
            order.payRocketBankAmount = payedPayment.rocketBankPayment.payedPrice;
          }
        }

        // WOW 혜택 정보
        if (paymentEntity.wowBenefit?.instantDiscountPrice) {
          order.wowInstantDiscount = paymentEntity.wowBenefit.instantDiscountPrice;
        }

        // 적립 예정 캐시
        if (paymentEntity.rewardCash?.amount) {
          order.rewardCashAmount = paymentEntity.rewardCash.amount;
        }
      }

      return order;
    } catch (e) {
      console.error(`Failed to fetch detail for ${orderId}:`, e);
      return null;
    }
  };

  const startCollection = async (mode: CollectionMode) => {
    if (isCollecting) return;
    
    setIsCollecting(true);
    setCollectionMode(mode);
    stopRequestedRef.current = false;
    setLogs([]);
    setProgress({ total: 0, current: 0, success: 0, failed: 0 });
    setBuildId(null); // 수집 시작 시 Build ID 초기화
    
    try {
      const headers = getHeaders();
      
      // 마지막 저장된 주문 조회 (증분 수집 모드일 때만 사용)
      let stopAtOrderId: string | null = null;
      if (mode === "incremental") {
        addLog("마지막 저장된 주문 조회 중...", "info", 0);
        const lastSaved = await invoke<LastCoupangPaymentInfo | null>("get_last_coupang_payment", {
          userId: account.id,
        });
        if (lastSaved) {
          stopAtOrderId = lastSaved.orderId;
          addLog(
            `마지막 저장된 주문: #${lastSaved.orderId} (${new Date(lastSaved.orderedAt).toLocaleString()})`,
            "info",
            0
          );
        } else {
          addLog("저장된 주문이 없어 전체 내역을 수집합니다.", "info", 0);
        }
      } else {
        addLog("전체 수집 모드: 처음부터 모든 내역을 수집합니다.", "info", 0);
      }
      
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
          
          // 중복 체크 (증분 수집 모드)
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
                  paidAt: detail.paidAt,
                  merchantName: detail.merchantName,
                  merchantTel: detail.merchantTel,
                  merchantUrl: detail.merchantUrl,
                  merchantImageUrl: detail.merchantImageUrl,
                  productName: detail.productName,
                  productCount: detail.productCount,
                  productDetailUrl: detail.productDetailUrl,
                  orderDetailUrl: detail.orderDetailUrl,
                  totalAmount: detail.totalAmount,
                  totalOrderAmount: detail.totalOrderAmount,
                  totalCancelAmount: detail.totalCancelAmount,
                  discountAmount: detail.discountAmount,
                  restAmount: detail.restAmount,
                  mainPayType: detail.mainPayType,
                  payRocketBalanceAmount: detail.payRocketBalanceAmount,
                  payCardAmount: detail.payCardAmount,
                  payCouponAmount: detail.payCouponAmount,
                  payCoupangCashAmount: detail.payCoupangCashAmount,
                  payRocketBankAmount: detail.payRocketBankAmount,
                  wowInstantDiscount: detail.wowInstantDiscount,
                  rewardCashAmount: detail.rewardCashAmount,
                  items: detail.items.map(item => ({
                    lineNo: item.lineNo,
                    productId: item.productId,
                    vendorItemId: item.vendorItemId,
                    productName: item.productName,
                    imageUrl: item.imageUrl,
                    infoUrl: item.infoUrl,
                    brandName: item.brandName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountedUnitPrice: item.discountedUnitPrice,
                    combinedUnitPrice: item.combinedUnitPrice,
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fdfbf7] font-mono">
      {/* Header */}
      <div className="h-auto border-b-2 border-gray-800 bg-[#f6f1e9] px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-serif uppercase tracking-wide">쿠팡 데이터 수집</h1>
            <p className="text-sm text-gray-600 tracking-wider">{account.alias} ({account.provider})</p>
          </div>
          {isCollecting && (
            <button
              onClick={stopCollection}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#e76f51] text-white border-2 border-gray-800 hover:bg-[#e63946] transition-colors shadow-[3px_3px_0px_0px_rgba(31,41,55,0.4)]"
            >
              <Pause className="w-4 h-4" />
              중단
            </button>
          )}
        </div>
        
        {/* 수집 모드 선택 */}
        {!isCollecting && (
          <div className="flex gap-3">
            <button
              onClick={() => startCollection("incremental")}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#2a9d8f] text-white border-2 border-gray-800 hover:bg-[#264653] transition-colors shadow-[3px_3px_0px_0px_rgba(31,41,55,0.4)]"
            >
              <FastForward className="w-4 h-4" />
              새 내역만 수집
              <span className="text-[10px] opacity-75 normal-case">(마지막 이후부터)</span>
            </button>
            <button
              onClick={() => startCollection("full")}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#264653] text-white border-2 border-gray-800 hover:bg-[#1d3557] transition-colors shadow-[3px_3px_0px_0px_rgba(31,41,55,0.4)]"
            >
              <RefreshCw className="w-4 h-4" />
              처음부터 수집
              <span className="text-[10px] opacity-75 normal-case">(전체 재수집)</span>
            </button>
          </div>
        )}
        
        {isCollecting && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {collectionMode === "incremental" ? "새 내역 수집 중..." : "전체 수집 중..."}
            </span>
          </div>
        )}
      </div>

      {/* Dashboard */}
      <div className="p-6 grid grid-cols-5 gap-4">
        <div className="bg-[#fffef0] p-4 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="text-xs text-gray-600 uppercase tracking-wider font-bold">총 처리</div>
          <div className="text-2xl font-bold text-gray-900 font-mono mt-1">{progress.current} / {progress.total > 0 ? progress.total : '-'}</div>
        </div>
        <div className="bg-[#fffef0] p-4 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="text-xs text-gray-600 uppercase tracking-wider font-bold">성공</div>
          <div className="text-2xl font-bold text-[#2a9d8f] font-mono mt-1">{progress.success}</div>
        </div>
        <div className="bg-[#fffef0] p-4 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="text-xs text-gray-600 uppercase tracking-wider font-bold">실패</div>
          <div className="text-2xl font-bold text-[#e76f51] font-mono mt-1">{progress.failed}</div>
        </div>
        <div className="bg-[#fffef0] p-4 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="text-xs text-gray-600 uppercase tracking-wider font-bold">현재 페이지</div>
          <div className="text-2xl font-bold text-[#264653] font-mono mt-1">{currentPage || '-'}</div>
        </div>
        <div className="bg-[#fffef0] p-4 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="text-xs text-gray-600 uppercase tracking-wider font-bold">수집 모드</div>
          <div className="text-sm font-bold text-[#264653] mt-1">
            {collectionMode === "incremental" ? "증분 수집" : "전체 수집"}
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
        <div className="bg-[#fffef0] border-2 border-gray-800 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b-2 border-gray-800 bg-[#f6f1e9] font-bold text-xs text-gray-800 uppercase tracking-wider">
            수집 로그
          </div>
          <div className="flex-1 overflow-auto p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#f6f1e9] text-gray-700 sticky top-0 border-b-2 border-gray-800">
                <tr>
                  <th className="px-4 py-2 w-24 text-xs uppercase tracking-wider font-bold">시간</th>
                  <th className="px-4 py-2 w-20 text-xs uppercase tracking-wider font-bold">페이지</th>
                  <th className="px-4 py-2 text-xs uppercase tracking-wider font-bold">메시지</th>
                  <th className="px-4 py-2 w-24 text-xs uppercase tracking-wider font-bold">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {logs.map((log, idx) => (
                  <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white/80' : 'bg-white/60'} hover:bg-yellow-50/70 transition-colors`}>
                    <td className="px-4 py-2 text-gray-600 font-mono text-xs whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-4 py-2 text-gray-700 text-center font-bold">{log.page > 0 ? log.page : '-'}</td>
                    <td className="px-4 py-2 text-gray-800">
                      <div className="flex items-center gap-2">
                        {log.imageUrl && (
                          <img src={log.imageUrl} alt="상품" className="w-8 h-8 object-cover flex-shrink-0 border-2 border-gray-800" />
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            {log.date && <span className="text-xs text-gray-600 bg-[#e9c46a]/30 px-1.5 py-0.5 border border-[#e9c46a]">{new Date(log.date).toLocaleDateString()}</span>}
                            {log.amount !== undefined && <span className="text-xs font-bold text-[#264653]">₩{log.amount.toLocaleString()}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {log.orderId && <span className="text-xs text-gray-500 hidden md:inline-block font-mono">#{log.orderId.slice(0, 8)}...</span>}
                            <span className="text-sm font-medium">{log.message}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {log.status === 'success' && <CheckCircle className="w-4 h-4 text-[#2a9d8f] mx-auto" />}
                      {log.status === 'error' && <AlertCircle className="w-4 h-4 text-[#e76f51] mx-auto" />}
                      {log.status === 'info' && <Clock className="w-4 h-4 text-[#264653] mx-auto" />}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 italic">
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
