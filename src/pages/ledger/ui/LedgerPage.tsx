import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  List,
  FileText,
} from "lucide-react";
import type { User } from "@shared/api/types";

// 가계부 항목 타입
interface LedgerEntry {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  title: string;
  category: string;
  platform?: "offline" | "online_shopping" | "social" | "app" | "subscription" | "etc";
  url?: string;
  merchant?: string;
  quantity?: number;
  unitPrice?: number;
  paymentMethod?: string;
  memo?: string;
  tags: string[];
  color?: string;
  imageUrl?: string;
}

// 카테고리 정의
const EXPENSE_CATEGORIES = [
  { id: "food", label: "식비", icon: "🍜" },
  { id: "transport", label: "교통", icon: "🚗" },
  { id: "housing", label: "주거", icon: "🏠" },
  { id: "shopping", label: "쇼핑", icon: "🛍️" },
  { id: "leisure", label: "여가", icon: "🎮" },
  { id: "medical", label: "의료", icon: "💊" },
  { id: "education", label: "교육", icon: "📚" },
  { id: "finance", label: "금융", icon: "🏦" },
  { id: "social", label: "경조사", icon: "🎁" },
  { id: "etc", label: "기타", icon: "📦" },
];

const INCOME_CATEGORIES = [
  { id: "salary", label: "급여", icon: "💵" },
  { id: "side", label: "부수입", icon: "💼" },
  { id: "investment", label: "투자", icon: "📈" },
  { id: "gift", label: "용돈/선물", icon: "🎀" },
  { id: "refund", label: "환급", icon: "🔄" },
  { id: "etc", label: "기타", icon: "✨" },
];

const COLORS = [
  { id: "none", color: "transparent", label: "없음" },
  { id: "red", color: "#dc2626", label: "빨강" },
  { id: "orange", color: "#ea580c", label: "주황" },
  { id: "yellow", color: "#ca8a04", label: "노랑" },
  { id: "green", color: "#16a34a", label: "초록" },
  { id: "blue", color: "#2563eb", label: "파랑" },
  { id: "purple", color: "#9333ea", label: "보라" },
];

type ViewMode = "fold" | "giro";

interface LedgerPageProps {
  account: User;
}

// 목업 데이터 생성
const generateMockData = (): LedgerEntry[] => {
  const now = new Date();
  const entries: LedgerEntry[] = [];
  
  entries.push(
    {
      id: "1",
      type: "income",
      amount: 3500000,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-25`,
      title: "월급",
      category: "salary",
      tags: ["정기"],
      color: "green",
      paymentMethod: "transfer",
    },
    {
      id: "2",
      type: "expense",
      amount: 32000,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      title: "쿠팡 생필품",
      category: "shopping",
      platform: "online_shopping",
      url: "https://www.coupang.com/...",
      merchant: "쿠팡",
      tags: ["생필품", "정기구매"],
      color: "blue",
      paymentMethod: "card",
    },
    {
      id: "3",
      type: "expense",
      amount: 5500,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      title: "스타벅스 아메리카노",
      category: "food",
      platform: "offline",
      merchant: "스타벅스 강남점",
      tags: ["카페"],
      paymentMethod: "card",
    },
    {
      id: "4",
      type: "expense",
      amount: 15000,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.max(1, now.getDate() - 1)).padStart(2, "0")}`,
      title: "점심 식사",
      category: "food",
      platform: "offline",
      merchant: "맛있는 식당",
      tags: ["외식", "점심"],
      paymentMethod: "card",
    },
    {
      id: "5",
      type: "expense",
      amount: 2500,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.max(1, now.getDate() - 1)).padStart(2, "0")}`,
      title: "지하철",
      category: "transport",
      tags: ["출퇴근"],
      paymentMethod: "card",
    },
    {
      id: "6",
      type: "income",
      amount: 150000,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.max(1, now.getDate() - 2)).padStart(2, "0")}`,
      title: "프리랜서 작업",
      category: "side",
      tags: ["부업"],
      color: "purple",
      paymentMethod: "transfer",
    },
    {
      id: "7",
      type: "expense",
      amount: 89000,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.max(1, now.getDate() - 3)).padStart(2, "0")}`,
      title: "넷플릭스 연간 구독",
      category: "leisure",
      platform: "subscription",
      tags: ["구독", "OTT"],
      color: "red",
      paymentMethod: "card",
    },
  );
  
  return entries;
};

export const LedgerPage = ({ account }: LedgerPageProps) => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LedgerEntry[]>(generateMockData);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("fold");

  // 월 포맷팅
  const formatMonthDisplay = (yearMonth: string): string => {
    const [year, month] = yearMonth.split("-");
    return `${year}년 ${parseInt(month)}월`;
  };

  // 금액 포맷팅
  const formatAmount = (amount: number, type?: "income" | "expense"): string => {
    const prefix = type === "income" ? "+" : type === "expense" ? "-" : "";
    return `${prefix}₩${amount.toLocaleString("ko-KR")}`;
  };

  // 날짜 포맷팅
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  const getDayOfWeek = (dateStr: string): string => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const date = new Date(dateStr);
    return days[date.getDay()];
  };

  // 월별 필터링된 항목
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => entry.date.startsWith(selectedMonth));
  }, [entries, selectedMonth]);

  // 일별 그룹화
  const entriesByDate = useMemo(() => {
    const groups: Record<string, LedgerEntry[]> = {};
    filteredEntries.forEach(entry => {
      if (!groups[entry.date]) groups[entry.date] = [];
      groups[entry.date].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  // 월별 통계
  const monthlyStats = useMemo(() => {
    const income = filteredEntries
      .filter(e => e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0);
    const expense = filteredEntries
      .filter(e => e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredEntries]);

  // 사용 가능한 월 목록
  const availableMonths = useMemo(() => {
    const months = new Set(entries.map(e => e.date.substring(0, 7)));
    const now = new Date();
    months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    return [...months].sort().reverse();
  }, [entries]);

  // 누적 잔액 계산
  const entriesWithBalance = useMemo(() => {
    let runningBalance = 0;
    const sorted = [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map(entry => {
      runningBalance += entry.type === "income" ? entry.amount : -entry.amount;
      return { ...entry, runningBalance };
    }).reverse();
  }, [filteredEntries]);

  const navigateMonth = (direction: -1 | 1) => {
    const currentIdx = availableMonths.indexOf(selectedMonth);
    const newIdx = currentIdx - direction;
    if (newIdx >= 0 && newIdx < availableMonths.length) {
      setSelectedMonth(availableMonths[newIdx]);
    } else if (direction === 1 && currentIdx === 0) {
      const [year, month] = selectedMonth.split("-").map(Number);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      setSelectedMonth(`${nextYear}-${String(nextMonth).padStart(2, "0")}`);
    } else if (direction === -1 && currentIdx === availableMonths.length - 1) {
      const [year, month] = selectedMonth.split("-").map(Number);
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      setSelectedMonth(`${prevYear}-${String(prevMonth).padStart(2, "0")}`);
    }
  };

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const handleAddEntry = () => {
    navigate(`/account/${account.id}/ledger/new`);
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm("이 항목을 삭제하시겠습니까?")) {
      setEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const getCategoryInfo = (type: "income" | "expense", categoryId: string) => {
    const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return categories.find(c => c.id === categoryId) || { label: categoryId, icon: "📋" };
  };

  const sortedDates = Object.keys(entriesByDate).sort().reverse();

  return (
    <div className="flex-1 h-full overflow-hidden bg-[#fdfbf7] font-mono flex flex-col">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      
      {/* 헤더 - 밝은 톤 */}
      <div className="relative flex-shrink-0 bg-[#f6f1e9] border-b-2 border-[#d4c4a8] px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {/* 타이틀 & 추가 버튼 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold tracking-wide text-[#5c4d3c]">📒 가계부</h1>
              <span className="text-xs text-[#8b7355] bg-[#d4c4a8]/50 px-2 py-0.5">
                {account.alias}
              </span>
            </div>
            <button
              onClick={handleAddEntry}
              className="flex items-center gap-2 px-4 py-2 bg-[#c49a1a] hover:bg-[#d4aa2a] text-white font-bold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              수기 입력
            </button>
          </div>

          {/* 월 선택 + 보기 모드 토글 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1.5 hover:bg-[#d4c4a8]/50 rounded transition-colors text-[#5c4d3c]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-base font-bold min-w-[120px] text-center text-[#2d2416]">
                {formatMonthDisplay(selectedMonth)}
              </div>
              <button
                onClick={() => navigateMonth(1)}
                className="p-1.5 hover:bg-[#d4c4a8]/50 rounded transition-colors text-[#5c4d3c]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 보기 모드 토글 */}
            <div className="inline-flex border border-[#d4c4a8] bg-[#fffef0] text-sm">
              <button
                onClick={() => setViewMode("fold")}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-bold transition-colors ${
                  viewMode === "fold"
                    ? "bg-[#c49a1a] text-white"
                    : "text-[#8b7355] hover:bg-[#e8dcc8]"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                접기
              </button>
              <button
                onClick={() => setViewMode("giro")}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-bold transition-colors ${
                  viewMode === "giro"
                    ? "bg-[#c49a1a] text-white"
                    : "text-[#8b7355] hover:bg-[#e8dcc8]"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                장부
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 월별 요약 */}
      <div className="relative flex-shrink-0 bg-[#fffef0] border-b border-[#e8dcc8] px-6 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-6">
            {/* 수입 */}
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-[#8b7355]">수입</span>
              <span className="text-base font-black text-emerald-600 tabular-nums">
                +₩{monthlyStats.income.toLocaleString()}
              </span>
            </div>
            
            {/* 지출 */}
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span className="text-xs text-[#8b7355]">지출</span>
              <span className="text-base font-black text-rose-600 tabular-nums">
                -₩{monthlyStats.expense.toLocaleString()}
              </span>
            </div>
            
            {/* 잔액 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8b7355]">잔액</span>
              <span className={`text-base font-black tabular-nums ${
                monthlyStats.balance >= 0 ? "text-[#2d2416]" : "text-rose-600"
              }`}>
                {monthlyStats.balance >= 0 ? "+" : ""}₩{monthlyStats.balance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 거래 목록 */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {sortedDates.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="text-5xl mb-4 opacity-40">📒</div>
              <p className="text-[#8b7355]">이 달의 기록이 없습니다</p>
              <button
                onClick={handleAddEntry}
                className="mt-4 text-sm text-[#c49a1a] hover:underline font-bold"
              >
                첫 번째 항목 추가하기 →
              </button>
            </div>
          ) : viewMode === "fold" ? (
            // 접기 모드
            <div className="px-6 py-4 space-y-3">
              {sortedDates.map(dateKey => {
                const dayEntries = entriesByDate[dateKey];
                const dayIncome = dayEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
                const dayExpense = dayEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
                const isExpanded = expandedDays.has(dateKey);

                return (
                  <div 
                    key={dateKey} 
                    className="bg-[#fffef0] border border-[#d4c4a8] overflow-hidden"
                  >
                    {/* 일별 헤더 */}
                    <button
                      onClick={() => toggleDay(dateKey)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f6f1e9] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-bold text-[#5c4d3c]">
                          {formatDate(dateKey)}
                          <span className="text-[#8b7355] font-normal ml-1">({getDayOfWeek(dateKey)})</span>
                        </div>
                        <span className="text-xs text-[#8b7355]">{dayEntries.length}건</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {dayIncome > 0 && (
                          <span className="text-sm font-bold text-emerald-600 tabular-nums">+{dayIncome.toLocaleString()}</span>
                        )}
                        {dayExpense > 0 && (
                          <span className="text-sm font-bold text-rose-600 tabular-nums">-{dayExpense.toLocaleString()}</span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#8b7355]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#8b7355]" />
                        )}
                      </div>
                    </button>

                    {/* 항목 목록 */}
                    {isExpanded && (
                      <div className="border-t border-[#e8dcc8]">
                        {dayEntries.map(entry => {
                          const colorInfo = COLORS.find(c => c.id === entry.color);
                          const categoryInfo = getCategoryInfo(entry.type, entry.category);
                          
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center gap-3 px-4 py-3 border-b border-dashed border-[#e8dcc8] last:border-b-0 hover:bg-[#f6f1e9]/50 group"
                            >
                              {/* 컬러 인디케이터 */}
                              {colorInfo && colorInfo.id !== "none" && (
                                <div
                                  className="w-1 h-10 flex-shrink-0"
                                  style={{ backgroundColor: colorInfo.color }}
                                />
                              )}
                              
                              {/* 카테고리 아이콘 */}
                              <div className="text-xl flex-shrink-0">{categoryInfo.icon}</div>
                              
                              {/* 내용 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#2d2416] truncate text-sm">{entry.title}</span>
                                  {entry.merchant && (
                                    <span className="text-xs text-[#8b7355] truncate">@ {entry.merchant}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-[#8b7355]">{categoryInfo.label}</span>
                                  {entry.tags.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      {entry.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="text-xs text-[#c49a1a]">#{tag}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* 금액 */}
                              <div className={`text-sm font-black tabular-nums ${
                                entry.type === "income" ? "text-emerald-600" : "text-rose-600"
                              }`}>
                                {formatAmount(entry.amount, entry.type)}
                              </div>
                              
                              {/* 삭제 버튼 */}
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-rose-100 transition-all"
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // 장부 스타일 (연속적인 레트로 가계부)
            <div className="bg-[#fffef5]">
              {/* 장부 헤더 - 고정 */}
              <div className="sticky top-0 z-10 bg-[#f6f1e9] border-b-2 border-[#c49a1a]">
                <div className="grid grid-cols-12 gap-0 text-xs font-bold text-[#5c4d3c] uppercase tracking-wider">
                  <div className="col-span-2 px-4 py-2 border-r border-[#d4c4a8]">날 짜</div>
                  <div className="col-span-4 px-4 py-2 border-r border-[#d4c4a8]">적 요</div>
                  <div className="col-span-2 px-4 py-2 border-r border-[#d4c4a8] text-right">수 입</div>
                  <div className="col-span-2 px-4 py-2 border-r border-[#d4c4a8] text-right">지 출</div>
                  <div className="col-span-2 px-4 py-2 text-right">잔 액</div>
                </div>
              </div>

              {/* 장부 내용 */}
              <div>
                {entriesWithBalance.map((entry, idx) => {
                  const categoryInfo = getCategoryInfo(entry.type, entry.category);
                  const colorInfo = COLORS.find(c => c.id === entry.color);
                  const prevEntry = entriesWithBalance[idx - 1];
                  const showDate = idx === 0 || entry.date !== prevEntry?.date;
                  
                  return (
                    <div 
                      key={entry.id}
                      className={`grid grid-cols-12 gap-0 hover:bg-[#f6f1e9]/70 group transition-colors ${
                        showDate ? "border-t border-[#d4c4a8]" : ""
                      }`}
                    >
                      {/* 날짜 */}
                      <div className="col-span-2 px-4 py-3 border-r border-[#e8dcc8]">
                        {showDate ? (
                          <div>
                            <div className="font-bold text-[#5c4d3c] text-sm">{formatDate(entry.date)}</div>
                            <div className="text-xs text-[#8b7355]">{getDayOfWeek(entry.date)}</div>
                          </div>
                        ) : (
                          <div className="text-[#d4c4a8] text-center">〃</div>
                        )}
                      </div>
                      
                      {/* 적요 */}
                      <div className="col-span-4 px-4 py-3 border-r border-[#e8dcc8]">
                        <div className="flex items-start gap-2">
                          {colorInfo && colorInfo.id !== "none" && (
                            <div 
                              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: colorInfo.color }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">{categoryInfo.icon}</span>
                              <span className="font-bold text-[#2d2416] text-sm truncate">{entry.title}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-[#8b7355]">{categoryInfo.label}</span>
                              {entry.merchant && (
                                <span className="text-xs text-[#a09080] truncate">@ {entry.merchant}</span>
                              )}
                            </div>
                            {entry.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {entry.tags.map(tag => (
                                  <span key={tag} className="text-xs text-[#c49a1a]">#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-100 transition-all flex-shrink-0"
                            title="삭제"
                          >
                            <X className="w-3 h-3 text-rose-400" />
                          </button>
                        </div>
                      </div>
                      
                      {/* 수입 */}
                      <div className="col-span-2 px-4 py-3 border-r border-[#e8dcc8] text-right flex items-center justify-end">
                        {entry.type === "income" ? (
                          <span className="font-bold text-emerald-600 tabular-nums">
                            {entry.amount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[#d4c4a8]">-</span>
                        )}
                      </div>
                      
                      {/* 지출 */}
                      <div className="col-span-2 px-4 py-3 border-r border-[#e8dcc8] text-right flex items-center justify-end">
                        {entry.type === "expense" ? (
                          <span className="font-bold text-rose-600 tabular-nums">
                            {entry.amount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[#d4c4a8]">-</span>
                        )}
                      </div>
                      
                      {/* 잔액 */}
                      <div className="col-span-2 px-4 py-3 text-right flex items-center justify-end">
                        <span className={`font-bold tabular-nums ${
                          entry.runningBalance >= 0 ? "text-[#5c4d3c]" : "text-rose-600"
                        }`}>
                          {entry.runningBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 월 합계 푸터 */}
              <div className="sticky bottom-0 bg-[#f6f1e9] border-t-2 border-[#c49a1a]">
                <div className="grid grid-cols-12 gap-0 font-bold">
                  <div className="col-span-2 px-4 py-3 border-r border-[#d4c4a8] text-[#5c4d3c] uppercase tracking-wider text-xs">
                    월 합계
                  </div>
                  <div className="col-span-4 px-4 py-3 border-r border-[#d4c4a8] text-[#8b7355] text-sm">
                    {filteredEntries.length}건
                  </div>
                  <div className="col-span-2 px-4 py-3 border-r border-[#d4c4a8] text-right text-emerald-600 tabular-nums">
                    {monthlyStats.income.toLocaleString()}
                  </div>
                  <div className="col-span-2 px-4 py-3 border-r border-[#d4c4a8] text-right text-rose-600 tabular-nums">
                    {monthlyStats.expense.toLocaleString()}
                  </div>
                  <div className={`col-span-2 px-4 py-3 text-right tabular-nums ${
                    monthlyStats.balance >= 0 ? "text-[#2d2416]" : "text-rose-600"
                  }`}>
                    {monthlyStats.balance.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
