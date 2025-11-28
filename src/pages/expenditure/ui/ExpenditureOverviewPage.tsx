import { useState, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Crown,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  ComposedChart,
  Area,
  Line,
  ReferenceLine,
} from "recharts";
import type { User, NaverPaymentListItem, CoupangPaymentListItem } from "@shared/api/types";
import type { UnifiedPayment } from "@shared/lib/unifiedPayment";
import { parseNaverPayments, parseCoupangPayments } from "@shared/lib/paymentParsers";
import { processOverviewData, formatAmount, formatChangeRate, getQuarterlyTopExpenses } from "../lib/utils";

interface ExpenditureOverviewPageProps {
  account: User;
}

// 레트로 컬러 팔레트
const RETRO_COLORS = ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51", "#8d99ae"];

// 기간 필터 타입
type PeriodFilter = "all" | "year" | "quarter" | "month";

export const ExpenditureOverviewPage = ({ account }: ExpenditureOverviewPageProps) => {
  const [payments, setPayments] = useState<UnifiedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);
  
  // 분기별 고가 주문 스크롤 ref
  const topExpensesScrollRef = useRef<HTMLDivElement>(null);
  
  // 스크롤 함수 (4개 카드 너비만큼 이동)
  const scrollTopExpenses = (direction: "left" | "right") => {
    if (topExpensesScrollRef.current) {
      // 컨테이너 너비 전체만큼 스크롤 (4개 카드가 보이므로)
      const containerWidth = topExpensesScrollRef.current.clientWidth;
      const newScrollLeft = direction === "left" 
        ? topExpensesScrollRef.current.scrollLeft - containerWidth
        : topExpensesScrollRef.current.scrollLeft + containerWidth;
      topExpensesScrollRef.current.scrollTo({ left: newScrollLeft, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const loadPayments = async () => {
      setLoading(true);
      setError(null);

      try {
        let unifiedPayments: UnifiedPayment[] = [];
        
        if (account.provider === "naver") {
          const result = await invoke<NaverPaymentListItem[]>("list_naver_payments", {
            userId: account.id,
            limit: 10000,
            offset: 0,
          });
          unifiedPayments = parseNaverPayments(result);
        } else if (account.provider === "coupang") {
          const result = await invoke<CoupangPaymentListItem[]>("list_coupang_payments", {
            userId: account.id,
            limit: 10000,
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

    loadPayments();
  }, [account]);

  // 필터링된 결제 데이터
  const filteredPayments = useMemo(() => {
    if (periodFilter === "all") return payments;

    return payments.filter((payment) => {
      const date = new Date(payment.paid_at);
      const year = date.getFullYear();
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const month = date.getMonth();

      if (periodFilter === "year") {
        return year === selectedYear;
      } else if (periodFilter === "quarter") {
        return year === selectedYear && quarter === selectedQuarter;
      } else if (periodFilter === "month") {
        const now = new Date();
        return year === now.getFullYear() && month === now.getMonth();
      }
      return true;
    });
  }, [payments, periodFilter, selectedYear, selectedQuarter]);

  // 필터링된 데이터 기반 통계 (기간 필터 영향 받음)
  const stats = useMemo(() => processOverviewData(filteredPayments), [filteredPayments]);
  const topExpenses = useMemo(() => getQuarterlyTopExpenses(filteredPayments, 5), [filteredPayments]);
  
  // 전체 데이터 기반 통계 (기간 필터 영향 받지 않음 - 핵심 지표 카드용)
  const fixedStats = useMemo(() => processOverviewData(payments), [payments]);

  // 사용 가능한 연도 목록
  const availableYears = useMemo(() => {
    const years = new Set(payments.map(p => new Date(p.paid_at).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [payments]);

  // 전체 기간 텍스트
  const periodText = useMemo(() => {
    if (payments.length === 0) return "데이터 없음";
    
    const dates = payments.map(p => new Date(p.paid_at));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    if (periodFilter === "all") {
      return `${minDate.getFullYear()}.${String(minDate.getMonth() + 1).padStart(2, "0")} ~ ${maxDate.getFullYear()}.${String(maxDate.getMonth() + 1).padStart(2, "0")}`;
    } else if (periodFilter === "year") {
      return `${selectedYear}년`;
    } else if (periodFilter === "quarter") {
      return `${selectedYear}년 ${selectedQuarter}분기`;
    } else {
      const now = new Date();
      return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    }
  }, [payments, periodFilter, selectedYear, selectedQuarter]);

  // 가격대별 분포 데이터
  const priceDistribution = useMemo(() => {
    const ranges = [
      { label: "~1만원", min: 0, max: 10000 },
      { label: "1~3만원", min: 10000, max: 30000 },
      { label: "3~5만원", min: 30000, max: 50000 },
      { label: "5~10만원", min: 50000, max: 100000 },
      { label: "10~30만원", min: 100000, max: 300000 },
      { label: "30만원~", min: 300000, max: Infinity },
    ];

    return ranges.map(range => {
      const items = filteredPayments.filter(p => p.total_amount >= range.min && p.total_amount < range.max);
      const totalAmount = items.reduce((sum, p) => sum + p.total_amount, 0);
      return {
        label: range.label,
        count: items.length,
        amount: totalAmount,
        avgAmount: items.length > 0 ? Math.round(totalAmount / items.length) : 0,
      };
    });
  }, [filteredPayments]);

  // 증감 아이콘
  const ChangeIcon = ({ rate }: { rate: number }) => {
    if (rate > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (rate < 0) return <ArrowDownRight className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  // 증감 색상
  const getChangeColor = (rate: number) => {
    if (rate > 0) return "text-red-700";
    if (rate < 0) return "text-green-700";
    return "text-gray-500";
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

  // 차트용 데이터 (전체 선택 시 모든 월, 그 외 최근 12개월)
  const chartData = periodFilter === "all" 
    ? stats.monthlyStatsWithMA 
    : stats.monthlyStatsWithMA.slice(-12);

  // 분기별로 그룹화된 고가 주문
  const groupedTopExpenses = topExpenses.reduce((acc, item) => {
    if (!acc[item.quarter]) {
      acc[item.quarter] = { year: item.year, quarterNum: item.quarterNum, items: [] };
    }
    acc[item.quarter].items.push(item);
    return acc;
  }, {} as Record<string, { year: number; quarterNum: number; items: typeof topExpenses }>);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#fdfbf7] font-serif p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 헤더 섹션 + 기간 필터 */}
        <div className="border-b-4 border-gray-800 pb-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">종합 대시보드</h1>
              <p className="text-gray-600 text-lg">
                {account.alias} ({account.provider}) · <span className="font-mono font-bold text-gray-800">{periodText}</span>
              </p>
            </div>
            
            {/* 기간 필터 */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex border-2 border-gray-800 bg-white">
                {[
                  { key: "all", label: "전체" },
                  { key: "year", label: "연도별" },
                  { key: "quarter", label: "분기별" },
                  { key: "month", label: "이번 달" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setPeriodFilter(item.key as PeriodFilter)}
                    className={`px-3 py-1.5 text-sm font-bold transition-colors ${
                      periodFilter === item.key
                        ? "bg-gray-800 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              
              {(periodFilter === "year" || periodFilter === "quarter") && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm font-mono font-bold border-2 border-gray-800 bg-white"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
              )}
              
              {periodFilter === "quarter" && (
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                  className="px-3 py-1.5 text-sm font-mono font-bold border-2 border-gray-800 bg-white"
                >
                  {[1, 2, 3, 4].map(q => (
                    <option key={q} value={q}>{q}분기</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* 구매 패턴 분석 (가격대별 분포) */}
        <div className="bg-[#fffef0] p-6 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="flex items-center justify-between mb-6 border-b-2 border-gray-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">구매 패턴 분석</h3>
              <p className="text-sm text-gray-600 mt-1">가격대별 구매 빈도와 금액 분포</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">총 거래</div>
              <div className="text-xl font-bold font-mono text-gray-900">{filteredPayments.length.toLocaleString()}건</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {priceDistribution.map((range, idx) => (
              <div key={idx} className="bg-[#f6f1e9] border border-[#d4c4a8] p-4 text-center">
                <div className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">{range.label}</div>
                <div className="text-2xl font-bold font-mono text-gray-900">{range.count.toLocaleString()}</div>
                <div className="text-[10px] text-gray-500 mt-1">건</div>
                <div className="border-t border-dashed border-gray-400 mt-3 pt-2">
                  <div className="text-xs font-mono text-gray-700">{formatAmount(range.amount)}</div>
                </div>
              </div>
            ))}
          </div>
          {/* 차트 범례 */}
          <div className="flex items-center justify-center gap-6 mb-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#264653] border border-gray-600" />
              <span className="text-gray-700 font-medium">거래 수</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#e9c46a] border border-gray-600" />
              <span className="text-gray-700 font-medium">총 금액</span>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontFamily: "Georgia, serif", fontSize: 11 }} axisLine={{ stroke: "#374151" }} tickLine={false} />
                <YAxis yAxisId="left" tickFormatter={(v) => `${v}건`} tick={{ fontFamily: "Georgia, serif", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${Math.round(v/10000)}만`} tick={{ fontFamily: "Georgia, serif", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fffef0", border: "2px solid #1f2937", borderRadius: "0", fontFamily: "Georgia, serif", boxShadow: "4px 4px 0px 0px rgba(31,41,55,1)" }}
                  labelStyle={{ fontFamily: "Georgia, serif", fontWeight: "bold", marginBottom: 4 }}
                  itemStyle={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
                  formatter={(value: number, name: string) => {
                    if (name === "거래 수") return [`${value.toLocaleString()}건`, "거래 수"];
                    return [formatAmount(value), "총 금액"];
                  }}
                />
                <Bar yAxisId="left" dataKey="count" fill="#264653" radius={[2, 2, 0, 0]} barSize={30} name="거래 수" />
                <Bar yAxisId="right" dataKey="amount" fill="#e9c46a" radius={[2, 2, 0, 0]} barSize={30} name="총 금액" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 핵심 지표 카드 (필터 영향 없음 - 현재 기준 고정) */}
        <div className="bg-[#f6f1e9] p-4 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-dashed border-[#d4c4a8]">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-700" />
              <h3 className="font-bold text-gray-800">현재 기준 핵심 지표</h3>
            </div>
            <div className="text-xs text-gray-500 font-mono">
              기준일: {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* 이번 달 */}
            <div className="bg-[#fffef0] p-5 border border-[#d4c4a8] relative group">
              <div className="absolute top-2 right-2">
                <div className="relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="hidden group-hover:block absolute right-0 top-6 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    현재 월({new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long" })})의 총 지출액입니다. 전월 대비 증감률을 함께 표시합니다.
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">이번 달</span>
                <div className={`flex items-center gap-1 text-xs font-bold ${getChangeColor(fixedStats.thisMonth.changeRate)}`}>
                  <ChangeIcon rate={fixedStats.thisMonth.changeRate} />
                  {formatChangeRate(fixedStats.thisMonth.changeRate)}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 font-mono">{formatAmount(fixedStats.thisMonth.amount)}</div>
              <div className="mt-2 text-xs text-gray-500 border-t border-dashed border-gray-400 pt-2">
                전월 {formatAmount(fixedStats.lastMonth.amount)}
              </div>
              <div className="mt-1 text-[10px] text-gray-400 font-mono">
                {new Date().getFullYear()}년 {new Date().getMonth() + 1}월
              </div>
            </div>

            {/* 3개월 이동평균 */}
            <div className="bg-[#fffef0] p-5 border border-[#d4c4a8] relative group">
              <div className="absolute top-2 right-2">
                <div className="relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="hidden group-hover:block absolute right-0 top-6 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    최근 3개월 지출의 이동평균(MA3)입니다. 단기 지출 추세를 파악하는 데 유용합니다.
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">3개월 평균</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 font-mono">{formatAmount(Math.round(fixedStats.analysis.recentMA3))}</div>
              <div className="mt-2 text-xs text-gray-500 border-t border-dashed border-gray-400 pt-2">
                최근 3개월 이동평균
              </div>
              <div className="mt-1 text-[10px] text-gray-400 font-mono">
                {(() => {
                  const now = new Date();
                  const months = [];
                  for (let i = 2; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    months.push(`${d.getMonth() + 1}월`);
                  }
                  return months.join(" ~ ");
                })()}
              </div>
            </div>

            {/* 변동성 */}
            <div className="bg-[#fffef0] p-5 border border-[#d4c4a8] relative group">
              <div className="absolute top-2 right-2">
                <div className="relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="hidden group-hover:block absolute right-0 top-6 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    월별 지출액의 표준편차를 평균으로 나눈 값입니다. 30% 이상이면 지출이 불규칙하고, 15% 이하면 안정적입니다.
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">변동성</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 font-mono">{fixedStats.analysis.volatilityPercent.toFixed(1)}%</div>
              <div className="mt-2 text-xs text-gray-500 border-t border-dashed border-gray-400 pt-2">
                {fixedStats.analysis.volatilityPercent > 30 ? "⚠️ 높음" : fixedStats.analysis.volatilityPercent > 15 ? "📊 보통" : "✅ 안정"}
              </div>
              <div className="mt-1 text-[10px] text-gray-400 font-mono">
                전체 {fixedStats.monthlyStats.length}개월 기준
              </div>
            </div>

            {/* 6개월 추세 */}
            <div className="bg-[#fffef0] p-5 border border-[#d4c4a8] relative group">
              <div className="absolute top-2 right-2">
                <div className="relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="hidden group-hover:block absolute right-0 top-6 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    최근 6개월 평균 지출과 이전 6개월 평균 지출을 비교한 증감률입니다. 양수면 지출 증가, 음수면 지출 감소 추세입니다.
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">6개월 추세</span>
                {fixedStats.analysis.trendRate > 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-600" />
                )}
              </div>
              <div className={`text-2xl font-bold font-mono ${fixedStats.analysis.trendRate > 0 ? "text-red-700" : "text-green-700"}`}>
                {formatChangeRate(fixedStats.analysis.trendRate)}
              </div>
              <div className="mt-2 text-xs text-gray-500 border-t border-dashed border-gray-400 pt-2">
                최근 6개월 vs 이전 6개월
              </div>
              <div className="mt-1 text-[10px] text-gray-400 font-mono">
                {(() => {
                  const now = new Date();
                  const recent = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                  return `${recent.getFullYear()}.${String(recent.getMonth() + 1).padStart(2, "0")} ~ 현재`;
                })()}
              </div>
            </div>
          </div>

          {/* 기간별 비교 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 이번 분기 */}
            <div className="bg-[#fffef0] p-5 border border-[#d4c4a8] relative group">
              <div className="absolute top-2 right-2">
                <div className="relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="hidden group-hover:block absolute right-0 top-6 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    현재 분기({new Date().getFullYear()}년 {Math.floor(new Date().getMonth() / 3) + 1}분기)의 총 지출액입니다. 전 분기 대비 증감률을 표시합니다.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">이번 분기</div>
              <div className="text-2xl font-bold text-gray-900 font-mono">{formatAmount(fixedStats.thisQuarter.amount)}</div>
              <div className="mt-2 text-xs text-gray-500 border-t border-dashed border-gray-400 pt-2 flex justify-between">
                <span>{fixedStats.thisQuarter.count.toLocaleString()}건</span>
                <span className={`font-bold ${getChangeColor(fixedStats.thisQuarter.changeRate)}`}>
                  {formatChangeRate(fixedStats.thisQuarter.changeRate)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-gray-400 font-mono">
                {new Date().getFullYear()}년 {Math.floor(new Date().getMonth() / 3) + 1}분기
              </div>
            </div>

            {/* 올해 누적 */}
            <div className="bg-[#fffef0] p-5 border border-[#d4c4a8] relative group">
              <div className="absolute top-2 right-2">
                <div className="relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="hidden group-hover:block absolute right-0 top-6 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    {new Date().getFullYear()}년 1월부터 현재까지의 총 지출액입니다. 전년 동기 대비 증감률을 표시합니다.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">올해 누적</div>
              <div className="text-2xl font-bold text-gray-900 font-mono">{formatAmount(fixedStats.thisYear.amount)}</div>
              <div className="mt-2 text-xs text-gray-500 border-t border-dashed border-gray-400 pt-2 flex justify-between">
                <span>{fixedStats.thisYear.count.toLocaleString()}건</span>
                <span className={`font-bold ${getChangeColor(fixedStats.thisYear.changeRate)}`}>
                  {formatChangeRate(fixedStats.thisYear.changeRate)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-gray-400 font-mono">
                {new Date().getFullYear()}년 1월 ~ 현재
              </div>
            </div>

            {/* 월 평균 */}
            <div className="bg-[#fffef0] p-5 border border-[#d4c4a8] relative group">
              <div className="absolute top-2 right-2">
                <div className="relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="hidden group-hover:block absolute right-0 top-6 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    전체 기간의 월 평균 지출액입니다. 총 지출액을 기록된 개월 수로 나눈 값입니다.
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">월 평균</div>
              <div className="text-2xl font-bold text-gray-900 font-mono">{formatAmount(fixedStats.monthlyAverage)}</div>
              <div className="mt-2 text-xs text-gray-500 border-t border-dashed border-gray-400 pt-2">
                전체 {fixedStats.monthlyStats.length}개월 기준
              </div>
              <div className="mt-1 text-[10px] text-gray-400 font-mono">
                {(() => {
                  if (fixedStats.monthlyStats.length === 0) return "-";
                  const first = fixedStats.monthlyStats[fixedStats.monthlyStats.length - 1]?.month || "-";
                  const last = fixedStats.monthlyStats[0]?.month || "-";
                  return `${first} ~ ${last}`;
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* 메인 차트 */}
        <div className="bg-[#fffef0] p-6 border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="flex items-center justify-between mb-6 border-b-2 border-gray-200 pb-4">
            <h3 className="text-lg font-bold text-gray-900">지출 추이</h3>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-[#264653]" />
                <span className="text-gray-600">월별</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-[#e9c46a]" />
                <span className="text-gray-600">3개월</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-[#e76f51]" />
                <span className="text-gray-600">6개월</span>
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#264653" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#264653" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontFamily: "serif", fontSize: 12 }} axisLine={{ stroke: "#374151" }} tickLine={false} tickFormatter={(value) => value.split(".")[1] + "월"} />
                <YAxis tickFormatter={(value) => `${Math.round(value / 10000)}만`} tick={{ fontFamily: "serif", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fffef0", border: "2px solid #1f2937", borderRadius: "0", fontFamily: "Georgia, serif", boxShadow: "4px 4px 0px 0px rgba(31,41,55,1)" }}
                  labelStyle={{ fontFamily: "Georgia, serif", fontWeight: "bold", marginBottom: 4 }}
                  itemStyle={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = { amount: "월별", ma3: "3개월 평균", ma6: "6개월 평균" };
                    return [formatAmount(Math.round(value)), labels[name] || name];
                  }}
                  labelFormatter={(label) => `${label.split(".")[0]}년 ${label.split(".")[1]}월`}
                />
                <ReferenceLine y={stats.monthlyAverage} stroke="#8d99ae" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="amount" fill="url(#colorAmount)" stroke="transparent" />
                <Bar dataKey="amount" fill="#264653" radius={[4, 4, 0, 0]} barSize={24} />
                <Line type="monotone" dataKey="ma3" stroke="#e9c46a" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="ma6" stroke="#e76f51" strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 지출 요약 + 지출처 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 지출 요약 */}
          <div className="bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="p-4 border-b-2 border-gray-800 bg-[#f6f1e9]">
              <h3 className="font-bold text-gray-800">지출 요약</h3>
            </div>
            <div className="p-4 space-y-0">
              <div className="flex items-center justify-between py-3 border-b border-dashed border-gray-300">
                <span className="text-sm font-medium text-gray-800">최고 지출 월</span>
                <div className="text-right">
                  <span className="text-lg font-bold font-mono text-red-700">{formatAmount(stats.analysis.maxMonth.amount)}</span>
                  <span className="text-xs text-gray-500 ml-2 font-mono">{stats.analysis.maxMonth.month}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-dashed border-gray-300">
                <span className="text-sm font-medium text-gray-800">최저 지출 월</span>
                <div className="text-right">
                  <span className="text-lg font-bold font-mono text-green-700">{formatAmount(stats.analysis.minMonth.amount)}</span>
                  <span className="text-xs text-gray-500 ml-2 font-mono">{stats.analysis.minMonth.month}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-dashed border-gray-300">
                <span className="text-sm font-medium text-gray-800">일 평균 지출 (이번 달)</span>
                <span className="text-lg font-bold font-mono text-gray-900">{formatAmount(stats.dailyAverageThisMonth)}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-gray-800">총 거래 건수</span>
                <span className="text-lg font-bold font-mono text-gray-900">{stats.totalCount.toLocaleString()}건</span>
              </div>
            </div>
          </div>

          {/* 지출처 분석 */}
          <div className="bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="p-4 border-b-2 border-gray-800 bg-[#f6f1e9]">
              <h3 className="font-bold text-gray-800">지출처 구성</h3>
            </div>
            <div className="p-4 flex flex-col md:flex-row items-center h-64">
              <div className="w-full h-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.merchantStats} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="amount">
                      {stats.merchantStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={RETRO_COLORS[index % RETRO_COLORS.length]} stroke="#fffef0" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fffef0", border: "2px solid #1f2937", borderRadius: "0", fontFamily: "Georgia, serif", boxShadow: "4px 4px 0px 0px rgba(31,41,55,1)" }}
                      labelStyle={{ fontFamily: "Georgia, serif", fontWeight: "bold" }}
                      itemStyle={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}
                      formatter={(value: number) => [formatAmount(value), "금액"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-44 space-y-1.5 text-sm max-h-full overflow-y-auto">
                {stats.merchantStats.map((merchant, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: RETRO_COLORS[index % RETRO_COLORS.length] }} />
                      <span className="truncate text-xs" title={merchant.name}>{merchant.name}</span>
                    </div>
                    <span className="font-bold flex-shrink-0 font-mono text-xs">{merchant.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 분기별 고가 주문 랭킹 */}
        <div className="bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <div className="p-4 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#c49a1a]" />
              <h3 className="font-bold text-gray-800">분기별 고가 주문 TOP 5</h3>
              <span className="text-xs text-gray-500 font-mono">({Object.keys(groupedTopExpenses).length}개 분기)</span>
            </div>
            {Object.keys(groupedTopExpenses).length > 4 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollTopExpenses("left")}
                  className="p-1.5 border-2 border-gray-800 bg-white hover:bg-gray-100 transition-colors"
                  aria-label="이전 분기로"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => scrollTopExpenses("right")}
                  className="p-1.5 border-2 border-gray-800 bg-white hover:bg-gray-100 transition-colors"
                  aria-label="다음 분기로"
                >
                  <ChevronRight className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            )}
          </div>
          <div className="p-4">
            {Object.keys(groupedTopExpenses).length === 0 ? (
              <div className="text-center text-gray-500 py-8 font-mono">데이터가 없습니다</div>
            ) : (
              <div 
                ref={topExpensesScrollRef}
                className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
                style={{ scrollbarWidth: "thin" }}
              >
                {Object.entries(groupedTopExpenses)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([quarter, data]) => (
                  <div key={quarter} className="bg-[#f6f1e9] border border-[#d4c4a8] p-4 w-[calc(25%-12px)] min-w-[220px] flex-shrink-0">
                    <div className="text-sm font-bold text-gray-800 mb-3 pb-2 border-b border-dashed border-[#d4c4a8] font-mono">
                      {data.year}년 {data.quarterNum}분기
                    </div>
                    <div className="space-y-3">
                      {data.items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className={`w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 border ${
                            idx === 0 ? "bg-[#e9c46a] border-[#c49a1a] text-[#5c4d3c]" : 
                            idx === 1 ? "bg-[#d4c4a8] border-[#a89880] text-[#5c4d3c]" : 
                            idx === 2 ? "bg-[#f0e6d6] border-[#d4c4a8] text-[#8b7355]" :
                            "bg-[#f8f4ed] border-[#e0d6c8] text-[#9a8a7a]"
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-800 truncate" title={item.productName}>
                              {item.productName}
                            </div>
                            <div className="text-sm font-bold text-gray-900 font-mono mt-0.5">
                              {formatAmount(item.amount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 기간별 상세 테이블 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="p-4 border-b-2 border-gray-800 bg-[#f6f1e9]">
              <h3 className="font-bold text-gray-800">월별 요약</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm font-mono">
                <thead className="bg-[#f6f1e9] sticky top-0">
                  <tr className="border-b-2 border-[#d4c4a8]">
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600">기간</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-600">금액</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-600">건수</th>
                  </tr>
                </thead>
                <tbody>
                  {(periodFilter === "all" ? stats.monthlyStats : stats.monthlyStats.slice(0, 12)).map((m, idx) => (
                    <tr key={m.month} className={idx % 2 === 0 ? "bg-[#fffef0]" : "bg-[#f6f1e9]"}>
                      <td className="px-4 py-2 text-gray-800">{m.month}</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">{formatAmount(m.amount)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{m.count}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="p-4 border-b-2 border-gray-800 bg-[#f6f1e9]">
              <h3 className="font-bold text-gray-800">분기별 요약</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm font-mono">
                <thead className="bg-[#f6f1e9] sticky top-0">
                  <tr className="border-b-2 border-[#d4c4a8]">
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600">분기</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-600">금액</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-600">건수</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.quarterlyStats.map((q, idx) => (
                    <tr key={q.quarter} className={idx % 2 === 0 ? "bg-[#fffef0]" : "bg-[#f6f1e9]"}>
                      <td className="px-4 py-2 text-gray-800">{q.year}년 {q.quarterNum}분기</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">{formatAmount(q.amount)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{q.count}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
            <div className="p-4 border-b-2 border-gray-800 bg-[#f6f1e9]">
              <h3 className="font-bold text-gray-800">연도별 요약</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm font-mono">
                <thead className="bg-[#f6f1e9] sticky top-0">
                  <tr className="border-b-2 border-[#d4c4a8]">
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600">연도</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-600">금액</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-600">건수</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.yearlyStats.map((y, idx) => (
                    <tr key={y.year} className={idx % 2 === 0 ? "bg-[#fffef0]" : "bg-[#f6f1e9]"}>
                      <td className="px-4 py-2 text-gray-800">{y.year}년</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">{formatAmount(y.amount)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{y.count}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 누적 합계 */}
        <div className="bg-[#fffef0] border-2 border-gray-800 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]">
          <div className="p-4 border-b-2 border-gray-800 bg-[#f6f1e9]">
            <h3 className="font-bold text-gray-800 text-lg">누적 합계</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">총 지출액</div>
                <div className="text-2xl font-bold text-gray-900 font-mono">{formatAmount(stats.totalAmount)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">총 거래 건수</div>
                <div className="text-2xl font-bold text-gray-900 font-mono">{stats.totalCount.toLocaleString()}건</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">월 평균</div>
                <div className="text-2xl font-bold text-gray-900 font-mono">{formatAmount(stats.monthlyAverage)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">분석 기간</div>
                <div className="text-2xl font-bold text-gray-900 font-mono">{stats.monthlyStats.length}개월</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
