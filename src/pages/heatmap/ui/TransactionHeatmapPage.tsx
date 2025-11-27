import { useState, useEffect, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, Grid3X3, Calendar, TrendingUp, ChevronLeft, ChevronRight, Flame, Receipt, X, Package } from "lucide-react";
import type { User, NaverPaymentListItem, CoupangPaymentListItem } from "@shared/api/types";
import type { UnifiedPayment, UnifiedPaymentItem } from "@shared/lib/unifiedPayment";
import { parseNaverPayments, parseCoupangPayments } from "@shared/lib/paymentParsers";

interface TransactionHeatmapPageProps {
  account: User;
}

interface DayData {
  date: string;
  amount: number;
  count: number;
  dayOfWeek: number;
  weekIndex: number;
}

interface TooltipData {
  x: number;
  y: number;
  data: DayData;
}

// 상품 단위 데이터 (플랫하게 펼친 형태)
interface FlattenedProduct {
  id: string;
  item: UnifiedPaymentItem;
  merchant_name: string;
  paid_at: string;
  payment_id: string;
}

// 히트맵 색상 팔레트 (금액 기반 - 진한 갈색/금색 계열)
const HEATMAP_COLORS = {
  empty: "#ebedf0",
  level0: "#f0ebe3", // 거래 없음
  level1: "#e0d4c3", // 낮음
  level2: "#c4a574", // 중간
  level3: "#a67c3d", // 높음
  level4: "#8b5a2b", // 매우 높음
  level5: "#5c3d1e", // 최고
};

// 요일 레이블
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export const TransactionHeatmapPage = ({ account }: TransactionHeatmapPageProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<UnifiedPayment[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        let unifiedPayments: UnifiedPayment[] = [];
        
        if (account.provider === "naver") {
          const result = await invoke<NaverPaymentListItem[]>("list_naver_payments", {
            userId: account.id,
            limit: 5000,
            offset: 0,
          });
          unifiedPayments = parseNaverPayments(result);
        } else if (account.provider === "coupang") {
          const result = await invoke<CoupangPaymentListItem[]>("list_coupang_payments", {
            userId: account.id,
            limit: 5000,
            offset: 0,
          });
          unifiedPayments = parseCoupangPayments(result);
        } else {
          setError("지원하지 않는 플랫폼입니다.");
          setLoading(false);
          return;
        }
        
        setPayments(unifiedPayments);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [account]);

  // 사용 가능한 연도 목록
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    payments.forEach((payment) => {
      const year = new Date(payment.paid_at).getFullYear();
      years.add(year);
    });
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    if (!sortedYears.includes(new Date().getFullYear())) {
      sortedYears.unshift(new Date().getFullYear());
    }
    return sortedYears;
  }, [payments]);

  // 선택된 연도의 일별 데이터 집계
  const { stats, maxAmount, weeklyData, monthLabels } = useMemo(() => {
    const dailyMap = new Map<string, { amount: number; count: number }>();
    
    payments
      .filter((p) => new Date(p.paid_at).getFullYear() === selectedYear)
      .forEach((payment) => {
        const dateKey = payment.paid_at.substring(0, 10);
        const existing = dailyMap.get(dateKey) || { amount: 0, count: 0 };
        dailyMap.set(dateKey, {
          amount: existing.amount + payment.total_amount,
          count: existing.count + 1,
        });
      });

    const startDate = new Date(selectedYear, 0, 1);
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const endDate = new Date(selectedYear, 11, 31);
    
    const weeks: DayData[][] = [];
    let currentWeek: DayData[] = [];
    let weekIndex = 0;
    
    const current = new Date(startDate);
    let totalAmount = 0;
    let totalCount = 0;
    let maxDayAmount = 0;
    let activeDays = 0;
    let maxStreak = 0;
    let currentStreak = 0;

    const monthPositions: { month: number; weekIndex: number }[] = [];
    let lastMonth = -1;

    while (current <= endDate || currentWeek.length > 0) {
      const dateStr = current.toISOString().substring(0, 10);
      const dayOfWeek = current.getDay();
      const isInYear = current.getFullYear() === selectedYear;
      
      if (isInYear && current.getMonth() !== lastMonth) {
        monthPositions.push({ month: current.getMonth(), weekIndex });
        lastMonth = current.getMonth();
      }

      const dayData = dailyMap.get(dateStr);
      const data: DayData = {
        date: dateStr,
        amount: isInYear ? (dayData?.amount || 0) : 0,
        count: isInYear ? (dayData?.count || 0) : 0,
        dayOfWeek,
        weekIndex,
      };

      if (isInYear) {
        totalAmount += data.amount;
        totalCount += data.count;
        if (data.amount > maxDayAmount) {
          maxDayAmount = data.amount;
        }
        if (data.count > 0) {
          activeDays++;
          currentStreak++;
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
          }
        } else {
          currentStreak = 0;
        }
      }

      currentWeek.push(data);

      if (dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
        weekIndex++;
      }

      current.setDate(current.getDate() + 1);
      
      if (current.getFullYear() > selectedYear && dayOfWeek !== 6) {
        while (currentWeek.length < 7) {
          currentWeek.push({
            date: current.toISOString().substring(0, 10),
            amount: 0,
            count: 0,
            dayOfWeek: currentWeek.length,
            weekIndex,
          });
          current.setDate(current.getDate() + 1);
        }
        weeks.push(currentWeek);
        break;
      }
    }

    return {
      stats: {
        totalAmount,
        totalCount,
        activeDays,
        maxStreak,
        avgPerActiveDay: activeDays > 0 ? Math.round(totalAmount / activeDays) : 0,
      },
      maxAmount: maxDayAmount,
      weeklyData: weeks,
      monthLabels: monthPositions,
    };
  }, [payments, selectedYear]);

  // 선택된 날짜의 거래 목록
  const selectedDatePayments = useMemo(() => {
    if (!selectedDate) return [];
    return payments
      .filter((p) => p.paid_at.substring(0, 10) === selectedDate)
      .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
  }, [payments, selectedDate]);

  // 선택된 날짜의 상품 목록 (플랫하게 펼침)
  const selectedDateProducts = useMemo(() => {
    if (!selectedDate) return [];
    const products: FlattenedProduct[] = [];
    
    selectedDatePayments.forEach((payment) => {
      // 아이템이 있으면 각각을 개별 상품으로
      if (payment.items.length > 0) {
        payment.items.forEach((item, idx) => {
          products.push({
            id: `${payment.payment_id}-${idx}`,
            item,
            merchant_name: payment.merchant_name,
            paid_at: payment.paid_at,
            payment_id: payment.payment_id,
          });
        });
      } else {
        // 아이템이 없으면 결제 자체를 상품처럼 취급
        products.push({
          id: payment.payment_id,
          item: {
            line_no: 1,
            product_name: payment.product_name || payment.merchant_name,
            quantity: 1,
            line_amount: payment.total_amount,
            unit_price: payment.total_amount,
            image_url: payment.merchant_image_url,
          },
          merchant_name: payment.merchant_name,
          paid_at: payment.paid_at,
          payment_id: payment.payment_id,
        });
      }
    });
    
    return products;
  }, [selectedDatePayments, selectedDate]);

  // 선택된 날짜의 통계
  const selectedDateStats = useMemo(() => {
    if (!selectedDate) return null;
    const total = selectedDatePayments.reduce((sum, p) => sum + p.total_amount, 0);
    const productCount = selectedDateProducts.length;
    return {
      total,
      orderCount: selectedDatePayments.length,
      productCount,
    };
  }, [selectedDatePayments, selectedDateProducts, selectedDate]);

  const getColorLevel = useCallback(
    (amount: number, dateStr: string): string => {
      const date = new Date(dateStr);
      if (date.getFullYear() !== selectedYear) {
        return HEATMAP_COLORS.empty;
      }
      if (amount === 0) return HEATMAP_COLORS.level0;
      if (maxAmount === 0) return HEATMAP_COLORS.level1;
      
      const ratio = amount / maxAmount;
      if (ratio < 0.15) return HEATMAP_COLORS.level1;
      if (ratio < 0.35) return HEATMAP_COLORS.level2;
      if (ratio < 0.55) return HEATMAP_COLORS.level3;
      if (ratio < 0.75) return HEATMAP_COLORS.level4;
      return HEATMAP_COLORS.level5;
    },
    [maxAmount, selectedYear]
  );

  const handleCellHover = useCallback(
    (e: React.MouseEvent, data: DayData) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        data,
      });
      setHoveredDate(data.date);
    },
    []
  );

  const handleCellLeave = useCallback(() => {
    setTooltip(null);
    setHoveredDate(null);
  }, []);

  const handleCellClick = useCallback((data: DayData) => {
    const isInYear = new Date(data.date).getFullYear() === selectedYear;
    if (isInYear && data.count > 0) {
      setSelectedDate(data.date);
    }
  }, [selectedYear]);

  const canGoPrev = availableYears.includes(selectedYear - 1) || selectedYear > availableYears[availableYears.length - 1];
  const canGoNext = selectedYear < new Date().getFullYear();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#fdfbf7]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-[#fdfbf7]">
        <div className="text-center p-8 border-4 border-double border-gray-800 bg-white max-w-md">
          <p className="text-red-700 font-serif text-lg mb-4">{error}</p>
          <div className="w-full h-px bg-gray-800 my-4" />
          <p className="text-sm text-gray-600">계정 설정을 확인해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#fdfbf7] font-serif p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 헤더 */}
        <div className="border-b-4 border-gray-800 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2 flex items-center gap-3">
              <Grid3X3 className="w-10 h-10" />
              거래 히트맵
            </h1>
            <p className="text-gray-600 text-lg italic">
              {account.alias}의 {selectedYear}년 거래 패턴
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border-2 border-gray-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                disabled={!canGoPrev}
                className={`p-2 transition-colors border-r-2 border-gray-800 ${
                  canGoPrev ? "hover:bg-gray-100 text-gray-800" : "text-gray-300 cursor-not-allowed"
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-6 py-2 font-bold text-xl text-gray-900 min-w-[100px] text-center font-serif">
                {selectedYear}년
              </div>
              <button
                onClick={() => setSelectedYear((y) => y + 1)}
                disabled={!canGoNext}
                className={`p-2 transition-colors border-l-2 border-gray-800 ${
                  canGoNext ? "hover:bg-gray-100 text-gray-800" : "text-gray-300 cursor-not-allowed"
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#fffef0] p-5 border-2 border-gray-800 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-2 mb-3 text-gray-600">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">총 지출</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 font-mono">
              ₩{stats.totalAmount.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">{stats.totalCount}건의 거래</div>
          </div>

          <div className="bg-[#fffef0] p-5 border-2 border-gray-800 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-2 mb-3 text-gray-600">
              <Calendar className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">거래일</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 font-mono">{stats.activeDays}일</div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedYear === new Date().getFullYear()
                ? `올해 ${Math.round(
                    (new Date().getTime() - new Date(selectedYear, 0, 1).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}일 중`
                : "365일 중"}
            </div>
          </div>

          <div className="bg-[#fffef0] p-5 border-2 border-gray-800 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-2 mb-3 text-gray-600">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-bold uppercase tracking-wider text-xs">최장 연속</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 font-mono">{stats.maxStreak}일</div>
            <div className="text-xs text-gray-500 mt-1">연속 거래 기록</div>
          </div>

          <div className="bg-[#fffef0] p-5 border-2 border-gray-800 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-2 mb-3 text-gray-600">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">거래일 평균</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 font-mono">
              ₩{stats.avgPerActiveDay.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">거래가 있는 날 기준</div>
          </div>
        </div>

        {/* 히트맵 - 가운데 정렬 */}
        <div className="bg-[#fffef0] p-6 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="flex justify-center overflow-x-auto">
            <div className="inline-block">
              {/* 히트맵 그리드 */}
              <div className="flex relative pt-6">
                {/* 요일 레이블 */}
                <div className="flex flex-col gap-[3px] mr-2 mt-0">
                  {WEEKDAY_LABELS.map((day, idx) => (
                    <div
                      key={day}
                      className="h-[11px] text-[10px] text-gray-500 font-mono flex items-center justify-end pr-1"
                      style={{ visibility: idx % 2 === 1 ? "visible" : "hidden" }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* 주별 컬럼 */}
                <div className="flex gap-[3px] relative">
                  {/* 월 레이블 */}
                  {monthLabels.map(({ month, weekIndex }) => (
                    <div
                      key={`month-label-${month}`}
                      className="absolute text-[10px] text-gray-500 font-mono"
                      style={{
                        left: `${weekIndex * 14}px`,
                        top: "-18px",
                      }}
                    >
                      {["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"][month]}
                    </div>
                  ))}

                  {weeklyData.map((week, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-[3px]">
                      {week.map((day) => {
                        const isInYear = new Date(day.date).getFullYear() === selectedYear;
                        const isHovered = hoveredDate === day.date;
                        const isSelected = selectedDate === day.date;
                        const hasData = day.count > 0;
                        return (
                          <div
                            key={day.date}
                            className={`w-[11px] h-[11px] rounded-[2px] transition-all duration-100 ${
                              hasData && isInYear ? "cursor-pointer" : "cursor-default"
                            } ${isHovered ? "ring-2 ring-gray-600 ring-offset-1" : ""} ${
                              isSelected ? "ring-2 ring-[#c49a1a] ring-offset-1" : ""
                            }`}
                            style={{
                              backgroundColor: getColorLevel(day.amount, day.date),
                              opacity: isInYear ? 1 : 0.3,
                            }}
                            onMouseEnter={(e) => isInYear && handleCellHover(e, day)}
                            onMouseLeave={handleCellLeave}
                            onClick={() => handleCellClick(day)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* 범례 */}
              <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-600">
                <span className="font-mono">적음</span>
                {Object.values(HEATMAP_COLORS)
                  .slice(1)
                  .map((color, idx) => (
                    <div
                      key={idx}
                      className="w-[11px] h-[11px] rounded-[2px]"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                <span className="font-mono">많음</span>
              </div>
            </div>
          </div>
        </div>

        {/* 선택된 날짜의 상품 히스토리 */}
        {selectedDate && selectedDateStats && (
          <div className="bg-white border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] animate-in slide-in-from-top-4 duration-300">
            {/* 헤더 */}
            <div className="p-4 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-gray-700" />
                <div>
                  <h3 className="font-bold text-gray-900">
                    {new Date(selectedDate).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "long",
                    })}
                  </h3>
                  <p className="text-sm text-gray-600 font-mono">
                    {selectedDateStats.productCount}개 상품 · {selectedDateStats.orderCount}건 주문 · ₩{selectedDateStats.total.toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 hover:bg-gray-200 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* 상품 그리드 */}
            <div className="p-4 max-h-[500px] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {selectedDateProducts.map((product, idx) => (
                  <div
                    key={product.id}
                    className="bg-[#fdfbf7] border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-[#c49a1a] transition-all group"
                    style={{
                      animationDelay: `${idx * 30}ms`,
                    }}
                  >
                    {/* 상품 이미지 */}
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {product.item.image_url ? (
                        <img
                          src={product.item.image_url}
                          alt={product.item.product_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            target.nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#f0ebe3] to-[#e0d4c3] ${product.item.image_url ? "hidden" : ""}`}>
                        <Package className="w-10 h-10 text-[#8b7355]/50" />
                      </div>
                      {/* 수량 배지 */}
                      {product.item.quantity > 1 && (
                        <div className="absolute top-2 right-2 bg-[#2d2416] text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                          x{product.item.quantity}
                        </div>
                      )}
                    </div>

                    {/* 상품 정보 */}
                    <div className="p-3">
                      <div className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight min-h-[2.5rem]">
                        {product.item.product_name}
                      </div>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <div className="text-lg font-bold text-[#2d2416] font-mono">
                            ₩{(product.item.line_amount || product.item.unit_price || 0).toLocaleString()}
                          </div>
                          {product.item.quantity > 1 && product.item.unit_price && (
                            <div className="text-[10px] text-gray-400 font-mono">
                              @₩{product.item.unit_price.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-[10px] text-gray-400 truncate">
                          {product.merchant_name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {new Date(product.paid_at).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedDateProducts.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                해당 날짜에 구매한 상품이 없습니다.
              </div>
            )}
          </div>
        )}

        {/* 툴팁 */}
        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-sm font-mono">
              <div className="font-bold mb-1">
                {new Date(tooltip.data.date).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </div>
              {tooltip.data.count > 0 ? (
                <>
                  <div>₩{tooltip.data.amount.toLocaleString()}</div>
                  <div className="text-gray-400">{tooltip.data.count}건의 거래</div>
                  <div className="text-[10px] text-[#c49a1a] mt-1">클릭하여 상세 보기</div>
                </>
              ) : (
                <div className="text-gray-400">거래 없음</div>
              )}
            </div>
            <div
              className="w-2 h-2 bg-gray-900 mx-auto"
              style={{ transform: "rotate(45deg) translateY(-4px)" }}
            />
          </div>
        )}

        {/* 거래 없는 경우 안내 */}
        {stats.totalCount === 0 && (
          <div className="text-center py-12 text-gray-500 font-mono">
            {selectedYear}년에는 거래 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};
