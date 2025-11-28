import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, Grid3X3, Calendar, TrendingUp, Flame, Receipt, Package, LayoutGrid, Table, ShoppingBag, Sparkles } from "lucide-react";
import { useResizeObserver } from "@react-hookz/web";
import type { User, NaverPaymentListItem, CoupangPaymentListItem } from "@shared/api/types";
import type { UnifiedPayment, UnifiedPaymentItem } from "@shared/lib/unifiedPayment";
import { parseNaverPayments, parseCoupangPayments } from "@shared/lib/paymentParsers";

interface TransactionHeatmapPageProps {
  account: User;
}

// 월-일 기반 데이터 (모든 연도 합산)
interface MonthDayData {
  monthDay: string; // "MM-DD" 형식
  month: number;
  day: number;
  amount: number;
  count: number;
  years: number[]; // 거래가 있는 연도 목록
}

interface TooltipData {
  x: number;
  y: number;
  data: MonthDayData;
}

// 상품 단위 데이터 (플랫하게 펼친 형태)
interface FlattenedProduct {
  id: string;
  item: UnifiedPaymentItem;
  merchant_name: string;
  paid_at: string;
  payment_id: string;
  year: number;
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

// 각 월의 일수 (윤년 제외)
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

type ViewMode = "products" | "table";

// 오늘 날짜를 MM-DD 형식으로
const getTodayMonthDay = () => {
  const today = new Date();
  return `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export const TransactionHeatmapPage = ({ account }: TransactionHeatmapPageProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<UnifiedPayment[]>([]);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoveredMonthDay, setHoveredMonthDay] = useState<string | null>(null);
  const [selectedMonthDay, setSelectedMonthDay] = useState<string | null>(getTodayMonthDay());
  const [viewMode, setViewMode] = useState<ViewMode>("products");
  
  // 히트맵 컨테이너 크기 측정
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // 상품/테이블 스크롤 컨테이너 ref
  const contentScrollRef = useRef<HTMLDivElement>(null);
  
  useResizeObserver(heatmapContainerRef, (entry) => {
    if (entry.contentRect) {
      setContainerWidth(entry.contentRect.width);
    }
  });

  // 선택 날짜나 뷰 모드 변경 시 스크롤 맨 위로
  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [selectedMonthDay, viewMode]);

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

  // 모든 연도의 월-일별 데이터 집계
  const { stats, topThreshold, scaleMax, monthDayMap, hasLeapYearData } = useMemo(() => {
    const map = new Map<string, { amount: number; count: number; years: Set<number> }>();
    let totalAmount = 0;
    let totalCount = 0;
    let hasLeapData = false;
    
    payments.forEach((payment) => {
      const date = new Date(payment.paid_at);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      const monthDay = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      
      // 2월 29일 데이터 확인
      if (month === 2 && day === 29) {
        hasLeapData = true;
      }
      
      const existing = map.get(monthDay) || { amount: 0, count: 0, years: new Set<number>() };
      existing.amount += payment.total_amount;
      existing.count += 1;
      existing.years.add(year);
      map.set(monthDay, existing);
      
      totalAmount += payment.total_amount;
      totalCount += 1;
    });
    
    // 모든 금액을 배열로 수집 (0 제외)
    const amounts = Array.from(map.values())
      .map((d) => d.amount)
      .filter((a) => a > 0)
      .sort((a, b) => b - a); // 내림차순 정렬
    
    // Top 5 기준값 계산 (상위 5개는 최고 레벨로 고정)
    const TOP_N = 5;
    const threshold = amounts.length > TOP_N ? amounts[TOP_N - 1] : amounts[0] || 0;
    
    // Top 5를 제외한 나머지 중 최대값 (색상 스케일의 기준)
    const remainingAmounts = amounts.slice(TOP_N);
    const maxForScale = remainingAmounts.length > 0 ? remainingAmounts[0] : threshold;
    
    // 거래가 있는 일수
    const activeDays = map.size;
    
    // 데이터가 있는 연도 목록
    const allYears = new Set<number>();
    payments.forEach((p) => allYears.add(new Date(p.paid_at).getFullYear()));
    const sortedYears = Array.from(allYears).sort((a, b) => a - b);
    const minYear = sortedYears[0] || null;
    const maxYear = sortedYears[sortedYears.length - 1] || null;
    
    return {
      stats: {
        totalAmount,
        totalCount,
        activeDays,
        yearCount: allYears.size,
        years: sortedYears,
        minYear,
        maxYear,
        avgPerActiveDay: activeDays > 0 ? Math.round(totalAmount / activeDays) : 0,
      },
      topThreshold: threshold, // 이 금액 이상이면 Top 5
      scaleMax: maxForScale, // 나머지 색상 스케일의 최대값
      monthDayMap: map,
      hasLeapYearData: hasLeapData,
    };
  }, [payments]);

  // 히트맵 그리드 데이터 생성 (12월 x 31일)
  const heatmapGrid = useMemo(() => {
    const grid: MonthDayData[][] = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthData: MonthDayData[] = [];
      // 해당 월의 일수 (2월은 윤년 데이터가 있으면 29일)
      const daysInMonth = month === 2 && hasLeapYearData ? 29 : DAYS_IN_MONTH[month - 1];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const monthDay = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const data = monthDayMap.get(monthDay);
        
        monthData.push({
          monthDay,
          month,
          day,
          amount: data?.amount || 0,
          count: data?.count || 0,
          years: data ? Array.from(data.years).sort((a, b) => b - a) : [],
        });
      }
      
      grid.push(monthData);
    }
    
    return grid;
  }, [monthDayMap, hasLeapYearData]);

  // 선택된 월-일의 결제 목록 (모든 연도)
  const selectedMonthDayPayments = useMemo(() => {
    if (!selectedMonthDay) return [];
    const [month, day] = selectedMonthDay.split("-").map(Number);
    
    return payments
      .filter((p) => {
        const date = new Date(p.paid_at);
        return date.getMonth() + 1 === month && date.getDate() === day;
      })
      .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
  }, [payments, selectedMonthDay]);

  // 선택된 월-일의 상품 목록 (플랫하게 펼침)
  const selectedMonthDayProducts = useMemo(() => {
    if (!selectedMonthDay) return [];
    const products: FlattenedProduct[] = [];
    
    selectedMonthDayPayments.forEach((payment) => {
      const year = new Date(payment.paid_at).getFullYear();
      
      if (payment.items.length > 0) {
        payment.items.forEach((item, idx) => {
          products.push({
            id: `${payment.payment_id}-${idx}`,
            item,
            merchant_name: payment.merchant_name,
            paid_at: payment.paid_at,
            payment_id: payment.payment_id,
            year,
          });
        });
      } else {
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
          year,
        });
      }
    });
    
    return products;
  }, [selectedMonthDayPayments, selectedMonthDay]);

  // 선택된 월-일의 통계
  const selectedMonthDayStats = useMemo(() => {
    if (!selectedMonthDay) return null;
    const total = selectedMonthDayPayments.reduce((sum, p) => sum + p.total_amount, 0);
    const productCount = selectedMonthDayProducts.length;
    const years = [...new Set(selectedMonthDayPayments.map((p) => new Date(p.paid_at).getFullYear()))].sort((a, b) => b - a);
    
    return {
      total,
      orderCount: selectedMonthDayPayments.length,
      productCount,
      years,
    };
  }, [selectedMonthDayPayments, selectedMonthDayProducts, selectedMonthDay]);

  // Top 5는 최고 레벨, 나머지는 scaleMax 기준으로 분포
  const getColorLevel = useCallback(
    (amount: number): string => {
      if (amount === 0) return HEATMAP_COLORS.level0;
      
      // Top 5에 해당하면 최고 레벨
      if (amount >= topThreshold) return HEATMAP_COLORS.level5;
      
      // 나머지는 scaleMax 기준으로 비율 계산
      if (scaleMax === 0) return HEATMAP_COLORS.level1;
      
      const ratio = amount / scaleMax;
      if (ratio < 0.25) return HEATMAP_COLORS.level1;
      if (ratio < 0.50) return HEATMAP_COLORS.level2;
      if (ratio < 0.75) return HEATMAP_COLORS.level3;
      return HEATMAP_COLORS.level4;
    },
    [topThreshold, scaleMax]
  );

  const handleCellHover = useCallback(
    (e: React.MouseEvent, data: MonthDayData) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        data,
      });
      setHoveredMonthDay(data.monthDay);
    },
    []
  );

  const handleCellLeave = useCallback(() => {
    setTooltip(null);
    setHoveredMonthDay(null);
  }, []);

  const handleCellClick = useCallback((data: MonthDayData) => {
    setSelectedMonthDay(data.monthDay);
  }, []);

  // 동적 셀 크기 계산 - 너비는 컨테이너 채움, 높이는 고정
  const { cellWidth, cellHeight, cellGap } = useMemo(() => {
    const fixedHeight = 16; // 높이 고정 (컴팩트)
    const gap = 2;
    
    if (containerWidth === 0) return { cellWidth: 20, cellHeight: fixedHeight, cellGap: gap };
    
    const dayCount = 31;
    const labelWidth = 32; // 월 레이블 공간
    const availableWidth = containerWidth - labelWidth;
    
    // 너비는 컨테이너를 정확히 채우도록 계산
    const totalGapWidth = (dayCount - 1) * gap;
    const width = Math.floor((availableWidth - totalGapWidth) / dayCount);
    
    return { cellWidth: Math.max(12, width), cellHeight: fixedHeight, cellGap: gap };
  }, [containerWidth]);

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
    <div className="relative flex-1 h-full overflow-y-auto bg-[#fdfbf7] font-serif p-8">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto space-y-8">
        {/* 헤더 */}
        <div className="border-b-4 border-gray-800 pb-4">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2 flex items-center gap-3">
            <Grid3X3 className="w-10 h-10" />
            연간 거래 캘린더
          </h1>
          <p className="text-gray-600 text-lg">
            <span className="italic">{account.alias}</span>
            {stats.minYear && stats.maxYear && (
              <span className="ml-2 font-mono text-base">
                · {stats.minYear === stats.maxYear 
                    ? `${stats.minYear}년` 
                    : `${stats.minYear} - ${stats.maxYear}년`}
                <span className="text-gray-400 ml-1">({stats.yearCount}년간 데이터)</span>
              </span>
            )}
          </p>
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
              <span className="font-bold uppercase tracking-wider text-xs">수집 기간</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 font-mono">
              {stats.minYear && stats.maxYear 
                ? (stats.minYear === stats.maxYear 
                    ? `${stats.minYear}` 
                    : `${stats.minYear}-${stats.maxYear}`)
                : "-"}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.yearCount > 0 ? `${stats.yearCount}년간의 데이터` : "데이터 없음"}
            </div>
          </div>

          <div className="bg-[#fffef0] p-5 border-2 border-gray-800 shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-2 mb-3 text-gray-600">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-bold uppercase tracking-wider text-xs">거래일</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 font-mono">{stats.activeDays}일</div>
            <div className="text-xs text-gray-500 mt-1">365일 중 거래가 있는 날</div>
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

        {/* 히트맵 - 월 x 일 그리드 (가로 꽉 채움, 세로 컴팩트) */}
        <div 
          ref={heatmapContainerRef}
          className="bg-[#fffef0] p-4 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]"
        >
          <div className="w-full">
            {/* 일 레이블 (상단) - 5의 배수만 표시 */}
            <div 
              className="flex mb-1"
              style={{ marginLeft: `32px`, gap: `${cellGap}px` }}
            >
              {Array.from({ length: 31 }, (_, i) => (
                <div
                  key={i}
                  className="text-gray-400 font-mono text-center"
                  style={{ 
                    width: `${cellWidth}px`,
                    fontSize: "9px",
                    visibility: (i + 1) % 5 === 0 || i === 0 ? "visible" : "hidden",
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* 히트맵 그리드 */}
            <div>
              {heatmapGrid.map((monthData, monthIdx) => (
                <div 
                  key={monthIdx} 
                  className="flex items-center"
                  style={{ marginBottom: `${cellGap}px` }}
                >
                  {/* 월 레이블 */}
                  <div 
                    className="text-gray-500 font-mono w-8 shrink-0 text-right pr-2 text-[10px]"
                  >
                    {monthIdx + 1}월
                  </div>
                  
                  {/* 일별 셀 */}
                  <div className="flex" style={{ gap: `${cellGap}px` }}>
                    {monthData.map((dayData) => {
                      const isHovered = hoveredMonthDay === dayData.monthDay;
                      const isSelected = selectedMonthDay === dayData.monthDay;
                      const hasData = dayData.count > 0;
                      
                      return (
                        <div
                          key={dayData.monthDay}
                          className={`rounded-[2px] transition-all duration-75 cursor-pointer ${
                            hasData ? "hover:brightness-110" : "hover:brightness-95"
                          } ${isHovered ? "ring-1 ring-gray-500" : ""} ${
                            isSelected ? "ring-2 ring-[#c49a1a]" : ""
                          }`}
                          style={{
                            width: `${cellWidth}px`,
                            height: `${cellHeight}px`,
                            backgroundColor: getColorLevel(dayData.amount),
                          }}
                          onMouseEnter={(e) => handleCellHover(e, dayData)}
                          onMouseLeave={handleCellLeave}
                          onClick={() => handleCellClick(dayData)}
                        />
                      );
                    })}
                    
                    {/* 빈 셀로 31일까지 채우기 */}
                    {Array.from({ length: 31 - monthData.length }, (_, i) => (
                      <div
                        key={`empty-${monthIdx}-${i}`}
                        className="rounded-[2px]"
                        style={{
                          width: `${cellWidth}px`,
                          height: `${cellHeight}px`,
                          backgroundColor: HEATMAP_COLORS.empty,
                          opacity: 0.15,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 범례 */}
            {/* 범례 */}
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span className="text-[10px] text-gray-400 italic">
                거래 금액 기준으로 색상이 표시됩니다
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono">적음</span>
                <div className="flex gap-1">
                  {Object.values(HEATMAP_COLORS)
                    .slice(1)
                    .map((color, idx) => (
                      <div
                        key={idx}
                        className="rounded-[2px]"
                        style={{ 
                          backgroundColor: color,
                          width: "14px",
                          height: `${cellHeight}px`,
                        }}
                      />
                    ))}
                </div>
                <span className="font-mono">많음</span>
              </div>
            </div>
          </div>
        </div>

        {/* 선택된 월-일의 상세 내역 */}
        {selectedMonthDay && (
          <div className="bg-white border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] animate-in slide-in-from-top-4 duration-300">
            {/* 헤더 */}
            <div className="p-4 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-gray-700" />
                <div>
                  <h3 className="font-bold text-gray-900">
                    매년 {parseInt(selectedMonthDay.split("-")[0])}월 {parseInt(selectedMonthDay.split("-")[1])}일
                  </h3>
                  {selectedMonthDayStats && selectedMonthDayStats.productCount > 0 ? (
                    <p className="text-sm text-gray-600 font-mono">
                      {selectedMonthDayStats.productCount}개 상품 · {selectedMonthDayStats.orderCount}건 주문 · ₩{selectedMonthDayStats.total.toLocaleString()}
                      <span className="ml-2 text-gray-400">
                        ({selectedMonthDayStats.years.join(", ")}년)
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      아직 구매 기록이 없는 날이에요
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* 뷰 모드 토글 */}
                <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                  <button
                    onClick={() => setViewMode("products")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "products"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    상품
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "table"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Table className="w-4 h-4" />
                    테이블
                  </button>
                </div>
              </div>
            </div>

            {/* 상품 그리드 뷰 */}
            {viewMode === "products" && (
              <div ref={contentScrollRef} className="p-4 max-h-[500px] overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {selectedMonthDayProducts.map((product, idx) => (
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
                        {/* 연도 배지 */}
                        <div className="absolute top-2 left-2 bg-[#2d2416]/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                          {product.year}
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedMonthDayProducts.length === 0 && (
                  <div className="py-16 px-8 text-center">
                    <div className="relative inline-block">
                      <div className="absolute -top-2 -right-2 animate-bounce">
                        <Sparkles className="w-6 h-6 text-[#c49a1a]" />
                      </div>
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#f0ebe3] to-[#e0d4c3] flex items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-[#8b7355]/60" />
                      </div>
                    </div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      이 날은 지갑이 쉬는 날! 💤
                    </p>
                    <p className="text-sm text-gray-500">
                      {parseInt(selectedMonthDay?.split("-")[0] || "1")}월 {parseInt(selectedMonthDay?.split("-")[1] || "1")}일에는<br />
                      구매 기록이 없어요
                    </p>
                    <div className="mt-4 text-xs text-gray-400 font-mono">
                      절약한 당신, 멋져요 ✨
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 테이블 뷰 */}
            {viewMode === "table" && (
              <div ref={contentScrollRef} className="max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 border-b border-gray-200">연도</th>
                      <th className="px-4 py-3 border-b border-gray-200">상품명</th>
                      <th className="px-4 py-3 border-b border-gray-200">판매처</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-right">수량</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-right">금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedMonthDayProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 font-medium">
                          {product.year}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.item.image_url ? (
                              <img
                                src={product.item.image_url}
                                alt=""
                                className="w-10 h-10 rounded object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <span className="text-sm text-gray-900 line-clamp-2">
                              {product.item.product_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">
                          {product.merchant_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">
                          {product.item.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono font-medium">
                          ₩{(product.item.line_amount || product.item.unit_price || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {selectedMonthDayProducts.length === 0 && (
                  <div className="py-16 px-8 text-center">
                    <div className="relative inline-block">
                      <div className="absolute -top-2 -right-2 animate-bounce">
                        <Sparkles className="w-6 h-6 text-[#c49a1a]" />
                      </div>
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#f0ebe3] to-[#e0d4c3] flex items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-[#8b7355]/60" />
                      </div>
                    </div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      이 날은 지갑이 쉬는 날! 💤
                    </p>
                    <p className="text-sm text-gray-500">
                      {parseInt(selectedMonthDay?.split("-")[0] || "1")}월 {parseInt(selectedMonthDay?.split("-")[1] || "1")}일에는<br />
                      구매 기록이 없어요
                    </p>
                    <div className="mt-4 text-xs text-gray-400 font-mono">
                      절약한 당신, 멋져요 ✨
                    </div>
                  </div>
                )}
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
                {tooltip.data.month}월 {tooltip.data.day}일
              </div>
              {tooltip.data.count > 0 ? (
                <>
                  <div>₩{tooltip.data.amount.toLocaleString()}</div>
                  <div className="text-gray-400">{tooltip.data.count}건의 거래</div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {tooltip.data.years.join(", ")}년
                  </div>
                </>
              ) : (
                <div className="text-gray-400">거래 없음 💤</div>
              )}
              <div className="text-[10px] text-[#c49a1a] mt-1">클릭하여 선택</div>
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
            수집된 거래 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};
