import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, TrendingUp, Receipt, Calendar, PieChart as PieChartIcon, ChevronLeft, ChevronRight } from "lucide-react";
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
import type { User, NaverPaymentListItem } from "@shared/api/types";
import { processExpenditureData } from "../lib/utils";

interface ExpenditureDashboardPageProps {
  account: User;
}

const RETRO_COLORS = ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51", "#8d99ae"];

export const ExpenditureDashboardPage = ({ account }: ExpenditureDashboardPageProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<NaverPaymentListItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      if (account.provider !== "naver") {
        setError("현재 네이버 계정만 지원됩니다.");
        setLoading(false);
        return;
      }

      try {
        const result = await invoke<NaverPaymentListItem[]>("list_naver_payments", {
          userId: account.id,
          limit: 2000, // 충분히 많은 데이터 조회
          offset: 0,
        });
        setPayments(result);
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

  const handlePrevMonth = () => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const handleToday = () => {
    setSelectedDate(new Date());
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

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#fdfbf7] font-serif p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 헤더 섹션 */}
        <div className="border-b-4 border-gray-800 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">지출 현황부</h1>
            <p className="text-gray-600 text-lg italic">
              {account.alias} ({account.provider})
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border-2 border-gray-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 transition-colors border-r-2 border-gray-800"
              >
                <ChevronLeft className="w-5 h-5 text-gray-800" />
              </button>
              <div className="px-4 py-2 font-bold text-xl text-gray-900 min-w-[140px] text-center font-serif">
                {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
              </div>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 transition-colors border-l-2 border-gray-800"
              >
                <ChevronRight className="w-5 h-5 text-gray-800" />
              </button>
            </div>
            <button
              onClick={handleToday}
              className="px-4 py-2 bg-gray-800 text-white font-bold text-sm border-2 border-gray-800 hover:bg-gray-700 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            >
              오늘
            </button>
          </div>
        </div>

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
              ₩
              {(stats.totalAmount / new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()).toFixed(0).toLocaleString().split('.')[0]}
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
                      data={stats.merchantStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="amount"
                    >
                      {stats.merchantStats.map((entry, index) => (
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-sm">
              <thead>
                <tr className="border-b-2 border-gray-800 bg-[#fdfbf7]">
                  <th className="p-4 font-bold text-gray-800 w-32 border-r border-gray-200">날짜</th>
                  <th className="p-4 font-bold text-gray-800 border-r border-gray-200">거래 내역</th>
                  <th className="p-4 font-bold text-gray-800 w-40 text-right">금액</th>
                </tr>
              </thead>
              <tbody className="bg-[linear-gradient(transparent_95%,#ede9dd_95%)] bg-[length:100%_2.5rem]">
                {stats.sortedPayments.slice(0, visibleCount).map((payment, idx) => (
                  <tr
                    key={payment.id}
                    className={`h-10 transition-colors ${
                      idx % 2 === 0 ? "bg-white/80" : "bg-white/60"
                    } hover:bg-yellow-50/70`}
                  >
                    <td className="px-4 border-r border-gray-200 text-gray-600 align-middle">
                      {payment.paidAt.substring(0, 10)}
                    </td>
                    <td className="px-4 border-r border-gray-200 text-gray-900 font-semibold align-middle truncate">
                      {payment.productName || payment.merchantName}
                      {payment.items.length > 1 && (
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          외 {payment.items.length - 1}건
                        </span>
                      )}
                    </td>
                    <td className="px-4 text-right text-gray-900 font-bold align-middle">
                      ₩{payment.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {visibleCount < stats.sortedPayments.length && (
            <div className="p-4 bg-[#fdfbf7] border-t-2 border-gray-800 text-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2 bg-gray-900 text-[#fdfbf7] font-bold font-mono text-sm tracking-widest hover:bg-gray-800 transition-colors shadow-[3px_3px_0px_0px_rgba(31,41,55,0.6)] active:translate-x-0.5 active:translate-y-0.5"
              >
                더보기 ({stats.sortedPayments.length - visibleCount})
              </button>
            </div>
          )}
          
          {stats.sortedPayments.length === 0 && (
            <div className="p-8 text-center text-gray-500 font-mono border-t-2 border-gray-800 italic">
              해당 기간에는 거래 내역이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

