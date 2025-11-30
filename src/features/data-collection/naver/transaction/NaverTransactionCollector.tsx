import { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { buildListUrl, buildDetailUrl } from "@shared/config/providerUrls";
import type { User, ProxyResponse } from "@shared/api/types";
import { Loader2, Pause, CheckCircle, AlertCircle, Clock, RefreshCw, FastForward } from "lucide-react";
import { useAccountCredentials } from "@features/data-collection/shared/hooks/useAccountCredentials";
import { useBuildId } from "@features/data-collection/shared/hooks/useBuildId";

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

interface LastNaverPaymentInfo {
  payId: string;
  paidAt: string;
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

interface NaverTransactionCollectorProps {
  account: User;
}

type CollectionMode = "incremental" | "full";

export const NaverTransactionCollector = ({ account }: NaverTransactionCollectorProps) => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [progress, setProgress] = useState({ total: 0, current: 0, success: 0, failed: 0, skipped: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const [collectionMode, setCollectionMode] = useState<CollectionMode>("incremental");
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

  const { getHeaders } = useAccountCredentials(account);
  const resolveBuildId = useBuildId(getHeaders);

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

      const payment: NaverPayment = {
        payId: resultData.payment?.id || resultData.order?.orderNo || payId,
        externalId: undefined,
        serviceType: serviceType,
        // statusCode는 목록 API의 status.name에서 가져옴 (상세 API는 구조가 다를 수 있음)
        statusCode: undefined,
        statusText: undefined,
        paidAt: resultData.payment?.date || new Date(resultData.order?.orderDateTime || Date.now()).toISOString(),
        merchantName: resultData.merchant?.name || resultData.productBundleGroups?.[Object.keys(resultData.productBundleGroups)[0]]?.merchantName || "Unknown",
        totalAmount: resultData.amount?.totalAmount || resultData.pay?.totalInitPayAmount || 0,
        items: [],
      };

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
                  unitPrice: po.unitPrice,
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

  const startCollection = async (mode: CollectionMode) => {
    if (isCollecting) return;
    
    setIsCollecting(true);
    setCollectionMode(mode);
    stopRequestedRef.current = false;
    setLogs([]);
    setProgress({ total: 0, current: 0, success: 0, failed: 0, skipped: 0 });
    
    try {
      const headers = getHeaders();
      
      // 마지막 저장된 결제 조회 (증분 수집 모드일 때만 사용)
      let stopAtPayId: string | null = null;
      if (mode === "incremental") {
        addLog("마지막 저장된 결제 조회 중...", "info", 0);
        const lastSaved = await invoke<LastNaverPaymentInfo | null>("get_last_naver_payment", {
          userId: account.id,
        });
        if (lastSaved) {
          stopAtPayId = lastSaved.payId;
          addLog(
            `마지막 저장된 결제: #${lastSaved.payId.slice(0, 8)}... (${new Date(lastSaved.paidAt).toLocaleString()})`,
            "info",
            0
          );
        } else {
          addLog("저장된 결제가 없어 전체 내역을 수집합니다.", "info", 0);
        }
      } else {
        addLog("전체 수집 모드: 처음부터 모든 내역을 수집합니다.", "info", 0);
      }
      
      // 1. Build ID 추출
      addLog("Build ID 추출 중...", "info", 0);
      const buildId = await resolveBuildId(account.provider);
      addLog(`Build ID 추출 완료`, "success", 0);
      
      // 2. 첫 페이지 조회하여 전체 페이지 수 확인
      addLog("페이지 정보 조회 중...", "info", 1);
      const listUrl = buildListUrl(account.provider, 1, { buildId });
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
      
      addLog(`총 ${totalPage} 페이지 발견. 최신순 수집 시작.`, "info", 0);
      
      let reachedLastSynced = false;
      
      // 3. 페이지 1부터 순차적으로 수집 (최신 → 과거)
      for (let page = 1; page <= totalPage; page++) {
        if (stopRequestedRef.current) {
          addLog("사용자 요청으로 수집 중단", "info", page);
          break;
        }
        
        if (reachedLastSynced) {
          break;
        }
        
        setCurrentPage(page);
        addLog(`${page}페이지 목록 조회 중...`, "info", page);
        
        // 페이지 목록 조회
        let pageItems: any[] = [];
        try {
             const pageUrl = buildListUrl(account.provider, page, { buildId });
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
        
        // 페이지 내 항목 순회
        for (const item of pageItems) {
             if (stopRequestedRef.current) break;
             
             const payId = item.additionalData?.payId || item._id;
             const serviceType = item.serviceType;
             const orderNo = item.additionalData?.orderNo;
             
             // 중복 체크 (증분 수집 모드)
             if (stopAtPayId && payId === stopAtPayId) {
               addLog(`이미 저장된 결제(${payId.slice(0, 8)}...)를 발견하여 수집을 중단합니다.`, "info", page, payId);
               reachedLastSynced = true;
               break;
             }
             
             // 상세 조회
             const detail = await fetchAndParseDetail(payId, serviceType, orderNo, headers);
             
             if (detail) {
                 // 목록 데이터 보강 (목록 API에서 status 정보 가져옴)
                 detail.externalId = item._id;
                 detail.statusCode = item.status?.name;
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
        
        if (reachedLastSynced) {
          addLog("마지막 저장된 결제까지 수집 완료", "success", page);
          break;
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fdfbf7] font-mono">
      {/* Header */}
      <div className="h-auto border-b-2 border-gray-800 bg-[#f6f1e9] px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-serif uppercase tracking-wide">네이버 데이터 수집</h1>
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
                            {log.payId && <span className="text-xs text-gray-500 hidden md:inline-block font-mono">#{log.payId.slice(0, 8)}...</span>}
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
