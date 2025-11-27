import { useState, useMemo } from "react";
import { 
  X, Search, Package, Loader2, ShoppingBag, TrendingUp, Calendar, ShoppingCart, Wallet,
  List, Grid3X3, ArrowUpDown, Filter, ChevronDown
} from "lucide-react";
import type { SearchResultItem } from "@shared/api/types";

export interface SearchStats {
  totalCount: number;
  naverCount: number;
  coupangCount: number;
  totalAmount: number;
  totalQuantity: number;
  dateRange: { oldest: string; newest: string } | null;
}

export type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "name-asc" | "name-desc";
export type ProviderFilter = "all" | "naver" | "coupang";
export type ViewMode = "list" | "grid";

export interface SearchResultsViewProps {
  /** 검색 쿼리 */
  query: string;
  /** 검색 결과 아이템 목록 */
  results: SearchResultItem[];
  /** 전체 결과 수 */
  total: number;
  /** 로딩 상태 */
  loading?: boolean;
  /** 에러 메시지 */
  error?: string | null;
  /** 닫기 버튼 클릭 시 호출 */
  onClose: () => void;
}

const sortLabels: Record<SortOption, string> = {
  "date-desc": "최신순",
  "date-asc": "오래된순",
  "amount-desc": "금액 높은순",
  "amount-asc": "금액 낮은순",
  "name-asc": "이름 가나다순",
  "name-desc": "이름 역순",
};

const providerLabels: Record<ProviderFilter, string> = {
  "all": "전체",
  "naver": "네이버",
  "coupang": "쿠팡",
};

/**
 * 검색 결과 UI 컴포넌트
 * 데이터 로딩 로직 없이 순수하게 UI만 담당
 */
export const SearchResultsView = ({ 
  query, 
  results, 
  total, 
  loading = false, 
  error = null,
  onClose 
}: SearchResultsViewProps) => {
  // 필터/정렬/뷰 상태
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // 필터링 및 정렬된 결과
  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...results];

    // 도메인 필터
    if (providerFilter !== "all") {
      filtered = filtered.filter(r => r.provider === providerFilter);
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "date-desc":
          return new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime();
        case "date-asc":
          return new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime();
        case "amount-desc":
          return (b.lineAmount || 0) - (a.lineAmount || 0);
        case "amount-asc":
          return (a.lineAmount || 0) - (b.lineAmount || 0);
        case "name-asc":
          return a.productName.localeCompare(b.productName, "ko");
        case "name-desc":
          return b.productName.localeCompare(a.productName, "ko");
        default:
          return 0;
      }
    });

    return filtered;
  }, [results, providerFilter, sortOption]);

  // 통계 계산 (필터링된 결과 기준)
  const stats = useMemo<SearchStats>(() => {
    const naverItems = filteredAndSortedResults.filter(r => r.provider === "naver");
    const coupangItems = filteredAndSortedResults.filter(r => r.provider === "coupang");
    
    const totalAmount = filteredAndSortedResults.reduce((sum, item) => sum + (item.lineAmount || 0), 0);
    const totalQuantity = filteredAndSortedResults.reduce((sum, item) => sum + item.quantity, 0);
    
    let dateRange: { oldest: string; newest: string } | null = null;
    if (filteredAndSortedResults.length > 0) {
      const dates = filteredAndSortedResults.map(r => new Date(r.paidAt).getTime()).filter(d => !isNaN(d));
      if (dates.length > 0) {
        const oldest = new Date(Math.min(...dates)).toISOString();
        const newest = new Date(Math.max(...dates)).toISOString();
        dateRange = { oldest, newest };
      }
    }
    
    return {
      totalCount: filteredAndSortedResults.length,
      naverCount: naverItems.length,
      coupangCount: coupangItems.length,
      totalAmount,
      totalQuantity,
      dateRange,
    };
  }, [filteredAndSortedResults]);

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return "-";
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };

  const formatCompactPrice = (price: number) => {
    if (price >= 1000000) {
      return (price / 10000).toFixed(0) + "만원";
    }
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };

  const formatShortDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("ko-KR", {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const getProviderBadge = (provider: string, size: "sm" | "md" = "sm") => {
    const styles = {
      naver: "bg-[#03c75a]/10 text-[#03c75a] border-[#03c75a]/30",
      coupang: "bg-[#e31836]/10 text-[#e31836] border-[#e31836]/30",
    };
    const names = {
      naver: "네이버",
      coupang: "쿠팡",
    };
    const sizeClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2 py-1 text-xs";
    return (
      <span className={`${sizeClass} font-bold uppercase tracking-wider border rounded ${styles[provider as keyof typeof styles] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
        {names[provider as keyof typeof names] || provider}
      </span>
    );
  };

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-[#fdfbf7] font-mono">
      {/* 헤더 */}
      <div className="flex-shrink-0 px-8 py-6 border-b-4 border-[#2d2416] bg-[#fffef0]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#2d2416] flex items-center justify-center">
              <Search className="w-6 h-6 text-[#c49a1a]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#2d2416] tracking-tight uppercase">검색 결과</h1>
              <p className="text-[#8b7355] text-sm mt-1">
                "<span className="font-bold text-[#2d2416]">{query}</span>"에 대한 검색 결과 
                {!loading && <span className="ml-2 font-bold text-[#c49a1a]">{total}건</span>}
                {providerFilter !== "all" && (
                  <span className="ml-2 text-[#8b7355]">({providerLabels[providerFilter]} 필터 적용)</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border-2 border-[#2d2416] bg-[#fffef0] hover:bg-red-50 text-[#2d2416] hover:text-red-600 hover:border-red-600 transition-colors shadow-[2px_2px_0px_0px_rgba(45,36,22,1)]"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#c49a1a]" />
              <span className="text-[#8b7355] font-bold uppercase tracking-wider text-sm">검색 중...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-6 bg-red-50 border-2 border-red-200 flex items-center justify-center">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-600 font-bold text-lg">{error}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#e8dcc8] border-2 border-[#2d2416] flex items-center justify-center">
                <Package className="w-8 h-8 text-[#5c4d3c]" />
              </div>
              <p className="text-[#5c4d3c] text-lg mb-2">검색 결과가 없습니다</p>
              <p className="text-[#8b7355] text-sm">다른 검색어로 다시 시도해 보세요</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 통계 카드 영역 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 총 결과 */}
                <div className="bg-[#fffef0] border-2 border-[#2d2416] p-4 shadow-[3px_3px_0px_0px_rgba(45,36,22,1)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-[#2d2416] flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-[#c49a1a]" />
                    </div>
                    <span className="text-[10px] font-bold text-[#8b7355] uppercase tracking-wider">총 결과</span>
                  </div>
                  <div className="text-2xl font-bold text-[#2d2416]">{stats.totalCount}<span className="text-sm ml-1">건</span></div>
                  <div className="flex gap-2 mt-2 text-[10px]">
                    <span className="px-1.5 py-0.5 bg-[#03c75a]/10 text-[#03c75a] border border-[#03c75a]/30 rounded font-bold">
                      네이버 {stats.naverCount}
                    </span>
                    <span className="px-1.5 py-0.5 bg-[#e31836]/10 text-[#e31836] border border-[#e31836]/30 rounded font-bold">
                      쿠팡 {stats.coupangCount}
                    </span>
                  </div>
                </div>

                {/* 총 금액 */}
                <div className="bg-[#fffef0] border-2 border-[#2d2416] p-4 shadow-[3px_3px_0px_0px_rgba(45,36,22,1)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-[#c49a1a] flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-[#2d2416]" />
                    </div>
                    <span className="text-[10px] font-bold text-[#8b7355] uppercase tracking-wider">총 금액</span>
                  </div>
                  <div className="text-2xl font-bold text-[#2d2416]">{formatCompactPrice(stats.totalAmount)}</div>
                  <div className="text-[10px] text-[#8b7355] mt-2">
                    {new Intl.NumberFormat("ko-KR").format(stats.totalAmount)}원
                  </div>
                </div>

                {/* 총 수량 */}
                <div className="bg-[#fffef0] border-2 border-[#2d2416] p-4 shadow-[3px_3px_0px_0px_rgba(45,36,22,1)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-[#2a9d8f] flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-[#8b7355] uppercase tracking-wider">총 수량</span>
                  </div>
                  <div className="text-2xl font-bold text-[#2d2416]">{stats.totalQuantity}<span className="text-sm ml-1">개</span></div>
                  <div className="text-[10px] text-[#8b7355] mt-2">
                    평균 {stats.totalCount > 0 ? (stats.totalQuantity / stats.totalCount).toFixed(1) : 0}개/건
                  </div>
                </div>

                {/* 기간 */}
                <div className="bg-[#fffef0] border-2 border-[#2d2416] p-4 shadow-[3px_3px_0px_0px_rgba(45,36,22,1)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-[#e76f51] flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-[#8b7355] uppercase tracking-wider">기간</span>
                  </div>
                  {stats.dateRange ? (
                    <>
                      <div className="text-sm font-bold text-[#2d2416]">
                        {formatShortDate(stats.dateRange.oldest)}
                      </div>
                      <div className="text-[10px] text-[#8b7355] mt-1">
                        ~ {formatShortDate(stats.dateRange.newest)}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-[#8b7355]">-</div>
                  )}
                </div>
              </div>

              {/* 필터/정렬/뷰 모드 툴바 */}
              <div className="flex items-center justify-between gap-4 py-3 px-4 bg-[#fffef0] border-2 border-[#2d2416]/20 rounded">
                <div className="flex items-center gap-3">
                  {/* 도메인 필터 */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowFilterMenu(!showFilterMenu);
                        setShowSortMenu(false);
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 transition-colors ${
                        providerFilter !== "all"
                          ? "bg-[#2d2416] text-[#fffef0] border-[#2d2416]"
                          : "bg-white text-[#2d2416] border-[#2d2416]/30 hover:border-[#2d2416]"
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      {providerLabels[providerFilter]}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showFilterMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-[#fffef0] border-2 border-[#2d2416] shadow-[3px_3px_0px_0px_rgba(45,36,22,1)] z-10 min-w-[120px]">
                        {(["all", "naver", "coupang"] as ProviderFilter[]).map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setProviderFilter(option);
                              setShowFilterMenu(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs font-bold uppercase tracking-wider transition-colors ${
                              providerFilter === option
                                ? "bg-[#2d2416] text-[#fffef0]"
                                : "text-[#2d2416] hover:bg-[#2d2416]/10"
                            }`}
                          >
                            {providerLabels[option]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 정렬 */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowSortMenu(!showSortMenu);
                        setShowFilterMenu(false);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white text-[#2d2416] border-2 border-[#2d2416]/30 hover:border-[#2d2416] transition-colors"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      {sortLabels[sortOption]}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showSortMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-[#fffef0] border-2 border-[#2d2416] shadow-[3px_3px_0px_0px_rgba(45,36,22,1)] z-10 min-w-[140px]">
                        {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setSortOption(option);
                              setShowSortMenu(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs font-bold uppercase tracking-wider transition-colors ${
                              sortOption === option
                                ? "bg-[#2d2416] text-[#fffef0]"
                                : "text-[#2d2416] hover:bg-[#2d2416]/10"
                            }`}
                          >
                            {sortLabels[option]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 뷰 모드 토글 */}
                <div className="flex items-center border-2 border-[#2d2416]/30">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 transition-colors ${
                      viewMode === "list"
                        ? "bg-[#2d2416] text-[#fffef0]"
                        : "bg-white text-[#2d2416] hover:bg-[#2d2416]/10"
                    }`}
                    title="리스트 뷰"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 transition-colors border-l-2 border-[#2d2416]/30 ${
                      viewMode === "grid"
                        ? "bg-[#2d2416] text-[#fffef0]"
                        : "bg-white text-[#2d2416] hover:bg-[#2d2416]/10"
                    }`}
                    title="그리드 뷰"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 결과 목록 */}
              {viewMode === "list" ? (
                <div className="space-y-3">
                  {filteredAndSortedResults.map((item) => (
                    <div
                      key={`${item.provider}-${item.id}`}
                      className="bg-[#fffef0] border-2 border-[#2d2416]/20 hover:border-[#2d2416] p-4 transition-all hover:shadow-[4px_4px_0px_0px_rgba(45,36,22,0.2)] group"
                    >
                      <div className="flex items-start gap-4">
                        {/* 이미지 */}
                        <div className="w-16 h-16 flex-shrink-0 bg-[#f6f1e9] border border-[#2d2416]/10 overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full flex items-center justify-center ${item.imageUrl ? "hidden" : ""}`}>
                            <ShoppingBag className="w-6 h-6 text-[#8b7355]/30" />
                          </div>
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getProviderBadge(item.provider)}
                                <span className="text-[10px] text-[#8b7355] uppercase tracking-wider">{item.merchantName}</span>
                              </div>
                              <h3 className="text-sm font-bold text-[#2d2416] truncate group-hover:text-[#c49a1a] transition-colors">
                                {item.productName}
                              </h3>
                              <div className="flex items-center gap-4 mt-2 text-xs text-[#8b7355]">
                                <span>수량: <span className="font-bold text-[#2d2416]">{item.quantity}</span></span>
                                <span>단가: <span className="font-bold text-[#2d2416]">{formatPrice(item.unitPrice)}</span></span>
                              </div>
                            </div>

                            {/* 가격 및 날짜 */}
                            <div className="text-right flex-shrink-0">
                              <div className="text-lg font-bold text-[#2d2416]">
                                {formatPrice(item.lineAmount)}
                              </div>
                              <div className="text-[10px] text-[#8b7355] uppercase tracking-wider mt-1">
                                {formatDate(item.paidAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* 그리드 뷰 (상품 이미지 카드) */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredAndSortedResults.map((item, idx) => (
                    <div
                      key={`${item.provider}-${item.id}`}
                      className="bg-[#fffef0] border-2 border-[#2d2416]/20 rounded-lg overflow-hidden hover:shadow-[4px_4px_0px_0px_rgba(45,36,22,0.3)] hover:border-[#c49a1a] transition-all group"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      {/* 상품 이미지 */}
                      <div className="aspect-square bg-[#f6f1e9] relative overflow-hidden">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.nextElementSibling?.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#f0ebe3] to-[#e0d4c3] ${item.imageUrl ? "hidden" : ""}`}>
                          <Package className="w-12 h-12 text-[#8b7355]/30" />
                        </div>
                        {/* 수량 배지 */}
                        {item.quantity > 1 && (
                          <div className="absolute top-2 right-2 bg-[#2d2416] text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                            x{item.quantity}
                          </div>
                        )}
                        {/* 도메인 배지 */}
                        <div className="absolute top-2 left-2">
                          {getProviderBadge(item.provider)}
                        </div>
                      </div>

                      {/* 상품 정보 */}
                      <div className="p-3">
                        <div className="text-sm font-bold text-[#2d2416] line-clamp-2 leading-tight min-h-[2.5rem] group-hover:text-[#c49a1a] transition-colors">
                          {item.productName}
                        </div>
                        <div className="mt-2 flex items-end justify-between">
                          <div>
                            <div className="text-lg font-bold text-[#2d2416] font-mono">
                              {formatPrice(item.lineAmount)}
                            </div>
                            {item.quantity > 1 && item.unitPrice && (
                              <div className="text-[10px] text-[#8b7355] font-mono">
                                @{formatPrice(item.unitPrice)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-[#2d2416]/10">
                          <div className="text-[10px] text-[#8b7355] truncate">
                            {item.merchantName}
                          </div>
                          <div className="text-[10px] text-[#8b7355] font-mono">
                            {formatShortDate(item.paidAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 필터링 결과 없음 */}
              {filteredAndSortedResults.length === 0 && results.length > 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-[#e8dcc8] border-2 border-[#2d2416] flex items-center justify-center">
                    <Filter className="w-8 h-8 text-[#5c4d3c]" />
                  </div>
                  <p className="text-[#5c4d3c] text-lg mb-2">필터 조건에 맞는 결과가 없습니다</p>
                  <button
                    onClick={() => setProviderFilter("all")}
                    className="text-[#c49a1a] text-sm font-bold hover:underline"
                  >
                    필터 초기화
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 드롭다운 외부 클릭 감지 */}
      {(showFilterMenu || showSortMenu) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowFilterMenu(false);
            setShowSortMenu(false);
          }}
        />
      )}
    </div>
  );
};

