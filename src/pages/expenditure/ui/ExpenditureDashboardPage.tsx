import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, TrendingUp, Receipt, Calendar, PieChart as PieChartIcon, ChevronLeft, ChevronRight, FileX2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { User, NaverPaymentListItem, CoupangPaymentListItem } from "@shared/api/types";
import type { UnifiedPayment } from "@shared/lib/unifiedPayment";
import { parseNaverPayments, parseCoupangPayments } from "@shared/lib/paymentParsers";
import { processExpenditureData } from "../lib/utils";
import { TransactionTable } from "@shared/ui";

interface ExpenditureDashboardPageProps {
  account: User;
}

const RETRO_COLORS = ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51", "#8d99ae"];

export const ExpenditureDashboardPage = ({ account }: ExpenditureDashboardPageProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<UnifiedPayment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      try {
        let unifiedPayments: UnifiedPayment[] = [];
        
        if (account.provider === "naver") {
          const result = await invoke<NaverPaymentListItem[]>("list_naver_payments", {
            userId: account.id,
            limit: 2000,
            offset: 0,
          });
          unifiedPayments = parseNaverPayments(result);
        } else if (account.provider === "coupang") {
          const result = await invoke<CoupangPaymentListItem[]>("list_coupang_payments", {
            userId: account.id,
            limit: 2000,
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

  // 날짜 변경 시 visibleCount 초기화
  useEffect(() => {
    setVisibleCount(10);
  }, [selectedDate]);

  const stats = useMemo(() => processExpenditureData(payments, selectedDate), [payments, selectedDate]);

  // DB에 있는 월 목록 계산
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    payments.forEach((payment) => {
      const date = new Date(payment.paid_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.add(key);
    });
    return Array.from(months).sort();
  }, [payments]);

  // 현재 선택된 월의 키
  const currentMonthKey = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}`;
  }, [selectedDate]);

  // 이전/다음 월 이동 가능 여부
  const canGoPrev = useMemo(() => {
    if (availableMonths.length === 0) return false;
    const currentIndex = availableMonths.indexOf(currentMonthKey);
    if (currentIndex === -1) {
      return availableMonths.some((m) => m < currentMonthKey);
    }
    return currentIndex > 0;
  }, [availableMonths, currentMonthKey]);

  const canGoNext = useMemo(() => {
    if (availableMonths.length === 0) return false;
    const currentIndex = availableMonths.indexOf(currentMonthKey);
    if (currentIndex === -1) {
      return availableMonths.some((m) => m > currentMonthKey);
    }
    return currentIndex < availableMonths.length - 1;
  }, [availableMonths, currentMonthKey]);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    
    const currentIndex = availableMonths.indexOf(currentMonthKey);
    let targetKey: string;
    
    if (currentIndex === -1) {
      const prevMonths = availableMonths.filter((m) => m < currentMonthKey);
      targetKey = prevMonths[prevMonths.length - 1];
    } else {
      targetKey = availableMonths[currentIndex - 1];
    }
    
    const [year, month] = targetKey.split("-").map(Number);
    setSelectedDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    
    const currentIndex = availableMonths.indexOf(currentMonthKey);
    let targetKey: string;
    
    if (currentIndex === -1) {
      const nextMonths = availableMonths.filter((m) => m > currentMonthKey);
      targetKey = nextMonths[0];
    } else {
      targetKey = availableMonths[currentIndex + 1];
    }
    
    const [year, month] = targetKey.split("-").map(Number);
    setSelectedDate(new Date(year, month - 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    
    if (availableMonths.includes(todayKey)) {
      setSelectedDate(today);
    } else if (availableMonths.length > 0) {
      const latestKey = availableMonths[availableMonths.length - 1];
      const [year, month] = latestKey.split("-").map(Number);
      setSelectedDate(new Date(year, month - 1, 1));
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 20);
  };

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
          <div className="w-full h-px bg-gray-800 my-4"></div>
          <p className="text-sm text-gray-600">계정 설정을 확인해주세요.</p>
        </div>
      </div>
    );
  }

  // 해당 월에 데이터가 없는 경우 빈 화면
  const isEmptyMonth = stats.totalCount === 0;

  // 헤더 컴포넌트 (공통)
  const renderHeader = () => (
    <div className="border-b-4 border-gray-800 pb-4 flex justify-between items-end">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">월별 지출 현황</h1>
        <p className="text-gray-600 text-lg italic">
          {account.alias} ({account.provider})
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-white border-2 border-gray-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]">
          <button
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            className={`p-2 transition-colors border-r-2 border-gray-800 ${
              canGoPrev 
                ? "hover:bg-gray-100 text-gray-800" 
                : "text-gray-300 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 py-2 font-bold text-xl text-gray-900 min-w-[140px] text-center font-serif">
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
          </div>
          <button
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className={`p-2 transition-colors border-l-2 border-gray-800 ${
              canGoNext 
                ? "hover:bg-gray-100 text-gray-800" 
                : "text-gray-300 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={handleToday}
          className="px-4 py-2 bg-gray-800 text-white font-bold text-sm border-2 border-gray-800 hover:bg-gray-700 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
        >
          최근
        </button>
      </div>
    </div>
  );

  // 빈 화면 전용 UI
  if (isEmptyMonth) {
    return (
      <div className="relative flex-1 h-full overflow-y-auto bg-[#fdfbf7] font-serif p-8">
        {/* 배경 패턴 */}
        <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto space-y-8">
          {renderHeader()}
          
          {/* 빈 상태 표시 */}
          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-[#fffef0] p-12 border-4 border-double border-gray-800 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] text-center max-w-lg">
              {/* 장식적 상단 라인 */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px w-12 bg-gray-400" />
                <FileX2 className="w-16 h-16 text-gray-400" strokeWidth={1} />
                <div className="h-px w-12 bg-gray-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-800 mb-4 tracking-tight">
                {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
              </h2>
              
              <div className="w-16 h-0.5 bg-gray-800 mx-auto mb-4" />
              
              <p className="text-lg text-gray-600 mb-2">
                기록된 거래 내역이 없습니다
              </p>
              <p className="text-sm text-gray-500 italic">
                이 기간에는 결제 데이터가 수집되지 않았습니다.
              </p>
              
              {/* 장식적 하단 */}
              <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
                <div className="flex justify-center gap-6 text-gray-400">
                  <div className="text-center">
                    <Receipt className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-xs">0건</span>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-xs">₩0</span>
                  </div>
                  <div className="text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-xs">-</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 안내 메시지 */}
            {availableMonths.length > 0 && (
              <p className="mt-8 text-sm text-gray-500">
                <span className="font-mono">↑ ↓</span> 버튼으로 데이터가 있는 월로 이동할 수 있습니다
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 h-full overflow-y-auto bg-[#fdfbf7] font-serif p-8">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto space-y-8">
        {/* 헤더 섹션 */}
        {renderHeader()}

        {/* 요약 카드 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#fffef0] p-6 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-3 mb-4 text-gray-600">
              <Receipt className="w-6 h-6" />
              <span className="font-bold uppercase tracking-wider text-sm">총 지출액</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 font-mono">
              ₩{stats.totalAmount.toLocaleString()}
            </div>
            <div className="mt-2 text-sm text-gray-500 border-t border-dashed border-gray-400 pt-2">
              총 {stats.totalCount}건의 거래
            </div>
          </div>

          <div className="bg-[#fffef0] p-6 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-3 mb-4 text-gray-600">
              <TrendingUp className="w-6 h-6" />
              <span className="font-bold uppercase tracking-wider text-sm">일 평균 지출</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 font-mono">
              ₩{Math.round(stats.totalAmount / new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()).toLocaleString()}
            </div>
            <div className="mt-2 text-sm text-gray-500 border-t border-dashed border-gray-400 pt-2">
              {selectedDate.getMonth() + 1}월 기준
            </div>
          </div>

          <div className="bg-[#fffef0] p-6 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="flex items-center gap-3 mb-4 text-gray-600">
              <Calendar className="w-6 h-6" />
              <span className="font-bold uppercase tracking-wider text-sm">최다 지출처</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 truncate">
              {stats.merchantStats[0]?.name || "-"}
            </div>
            <div className="mt-2 text-sm text-gray-500 border-t border-dashed border-gray-400 pt-2 flex justify-between">
              <span className="font-mono">₩{stats.merchantStats[0]?.amount.toLocaleString() || 0}</span>
              <span className="font-mono">{stats.merchantStats[0]?.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#fffef0] p-6 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b-2 border-gray-100 pb-2">
              <TrendingUp className="w-5 h-5" />
              일별 지출 추이 ({selectedDate.getMonth() + 1}월)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontFamily: "serif", fontSize: 12 }}
                    axisLine={{ stroke: "#374151" }}
                    tickLine={false}
                    unit="일"
                  />
                  <YAxis
                    tickFormatter={(value) => `${value / 10000}만`}
                    tick={{ fontFamily: "serif", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "2px solid #1f2937",
                      borderRadius: "0",
                      fontFamily: "serif",
                      boxShadow: "4px 4px 0px 0px rgba(31,41,55,1)",
                    }}
                    formatter={(value: number) => [`₩${value.toLocaleString()}`, "지출액"]}
                    labelFormatter={(label) => `${selectedDate.getMonth() + 1}월 ${label}일`}
                  />
                  <Bar dataKey="amount" fill="#264653" radius={[2, 2, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 지출처 분석 */}
          <div className="bg-[#fffef0] p-6 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b-2 border-gray-100 pb-2">
              <PieChartIcon className="w-5 h-5" />
              지출처 구성
            </h3>
            <div className="flex flex-col md:flex-row items-center h-64">
              <div className="w-full h-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.merchantStats as any[]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="amount"
                    >
                      {stats.merchantStats.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={RETRO_COLORS[index % RETRO_COLORS.length]}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "2px solid #1f2937",
                        borderRadius: "0",
                        fontFamily: "serif",
                        boxShadow: "4px 4px 0px 0px rgba(31,41,55,1)",
                      }}
                      formatter={(value: number) => [`₩${value.toLocaleString()}`, "금액"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-48 space-y-2 text-sm max-h-full overflow-y-auto pr-2">
                {stats.merchantStats.map((merchant, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: RETRO_COLORS[index % RETRO_COLORS.length] }}
                      />
                      <span className="truncate" title={merchant.name}>
                        {merchant.name}
                      </span>
                    </div>
                    <span className="font-bold flex-shrink-0">{merchant.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 거래 장부 */}
        <div className="bg-white border-2 border-gray-800 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
          <div className="p-6 border-b-2 border-gray-800 bg-[#f6f1e9]">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3 font-serif">
              <Receipt className="w-6 h-6" />
              거래 장부
            </h3>
            <p className="text-sm text-gray-500 font-mono mt-2">
              {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 거래 기록
            </p>
          </div>
          <TransactionTable
            payments={stats.sortedPayments}
            visibleCount={visibleCount}
            showLoadMore={visibleCount < stats.sortedPayments.length}
            remainingCount={stats.sortedPayments.length - visibleCount}
            onLoadMore={handleLoadMore}
            emptyMessage="해당 기간에는 거래 내역이 없습니다."
          />
        </div>
      </div>
    </div>
  );
};
