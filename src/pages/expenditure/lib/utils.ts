import type { UnifiedPayment } from "@shared/lib/unifiedPayment";

export interface MonthlyStats {
  month: string;
  amount: number;
  count: number;
}

export interface DailyStats {
  date: string;
  day: number;
  amount: number;
}

export interface MerchantStats {
  name: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface QuarterStats {
  quarter: string;
  year: number;
  quarterNum: number;
  amount: number;
  count: number;
}

export interface YearStats {
  year: number;
  amount: number;
  count: number;
}

// 이동 평균이 포함된 월별 데이터
export interface MonthlyStatsWithMA {
  month: string;
  amount: number;
  count: number;
  ma3: number | null; // 3개월 이동 평균
  ma6: number | null; // 6개월 이동 평균
  ma12: number | null; // 12개월 이동 평균
  trend: "up" | "down" | "stable"; // 추세
  volatility: number; // 변동성 (표준편차 기반)
}

// 월별 보기용 (UnifiedPayment 타입 사용)
export const processExpenditureData = (
  payments: UnifiedPayment[],
  selectedDate?: Date
) => {
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime()
  );

  const monthlyData: Record<string, MonthlyStats> = {};
  const dailyData: Record<string, DailyStats> = {};
  const merchantData: Record<string, MerchantStats> = {};
  let totalAmount = 0;
  let filteredCount = 0;
  const filteredPayments: UnifiedPayment[] = [];

  sortedPayments.forEach((payment) => {
    const date = new Date(payment.paid_at);
    
    if (selectedDate) {
      const isSameYear = date.getFullYear() === selectedDate.getFullYear();
      const isSameMonth = date.getMonth() === selectedDate.getMonth();
      
      if (!isSameYear || !isSameMonth) {
        return;
      }
    }

    filteredPayments.push(payment);
    filteredCount++;

    const yearMonth = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
    const dayKey = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
    const amount = payment.total_amount;

    if (!monthlyData[yearMonth]) {
      monthlyData[yearMonth] = { month: yearMonth, amount: 0, count: 0 };
    }
    monthlyData[yearMonth].amount += amount;
    monthlyData[yearMonth].count += 1;

    if (selectedDate) {
      if (!dailyData[dayKey]) {
        dailyData[dayKey] = { date: dayKey, day: date.getDate(), amount: 0 };
      }
      dailyData[dayKey].amount += amount;
    }

    const merchantName = payment.merchant_name || "기타";
    if (!merchantData[merchantName]) {
      merchantData[merchantName] = { name: merchantName, amount: 0, count: 0, percentage: 0 };
    }
    merchantData[merchantName].amount += amount;
    merchantData[merchantName].count += 1;

    totalAmount += amount;
  });

  const sortedMerchants = Object.values(merchantData).sort((a, b) => b.amount - a.amount);
  const topMerchants = sortedMerchants.slice(0, 5);
  const otherMerchants = sortedMerchants.slice(5);
  
  if (otherMerchants.length > 0) {
    const otherAmount = otherMerchants.reduce((sum, m) => sum + m.amount, 0);
    const otherCount = otherMerchants.reduce((sum, m) => sum + m.count, 0);
    topMerchants.push({
      name: "기타",
      amount: otherAmount,
      count: otherCount,
      percentage: 0,
    });
  }

  topMerchants.forEach((m) => {
    m.percentage = totalAmount > 0 ? (m.amount / totalAmount) * 100 : 0;
  });

  const sortedDailyStats = Object.values(dailyData).sort((a, b) => a.day - b.day);

  return {
    monthlyStats: Object.values(monthlyData),
    dailyStats: sortedDailyStats,
    merchantStats: topMerchants,
    totalAmount,
    totalCount: filteredCount,
    sortedPayments: filteredPayments.reverse(),
  };
};

// 이동 평균 계산 헬퍼
const calculateMovingAverage = (data: number[], window: number): (number | null)[] => {
  return data.map((_, idx) => {
    if (idx < window - 1) return null;
    const slice = data.slice(idx - window + 1, idx + 1);
    return slice.reduce((a, b) => a + b, 0) / window;
  });
};

// 표준편차 계산 헬퍼
const calculateStdDev = (data: number[]): number => {
  if (data.length < 2) return 0;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / data.length);
};

// 종합 대시보드용 (전체 기간 분석 + 금융 분석)
export const processOverviewData = (payments: UnifiedPayment[]) => {
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime()
  );

  const monthlyData: Record<string, MonthlyStats> = {};
  const quarterlyData: Record<string, QuarterStats> = {};
  const yearlyData: Record<number, YearStats> = {};
  const merchantData: Record<string, MerchantStats> = {};

  let totalAmount = 0;
  let totalCount = 0;

  // 현재 날짜 기준 계산
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  // 이번 달, 이번 분기, 올해 집계
  let thisMonthAmount = 0;
  let thisMonthCount = 0;
  let thisQuarterAmount = 0;
  let thisQuarterCount = 0;
  let thisYearAmount = 0;
  let thisYearCount = 0;

  // 지난 달, 지난 분기, 작년 집계
  let lastMonthAmount = 0;
  let lastMonthCount = 0;
  let lastQuarterAmount = 0;
  let lastQuarterCount = 0;
  let lastYearAmount = 0;
  let lastYearCount = 0;

  // 지난 달/분기 계산
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastQuarterNum = currentQuarter === 1 ? 4 : currentQuarter - 1;
  const lastQuarterYear = currentQuarter === 1 ? currentYear - 1 : currentYear;

  sortedPayments.forEach((payment) => {
    const date = new Date(payment.paid_at);
    const year = date.getFullYear();
    const month = date.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    const amount = payment.total_amount;

    totalAmount += amount;
    totalCount++;

    // 월별 집계
    const monthKey = `${year}.${String(month + 1).padStart(2, "0")}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { month: monthKey, amount: 0, count: 0 };
    }
    monthlyData[monthKey].amount += amount;
    monthlyData[monthKey].count += 1;

    // 분기별 집계
    const quarterKey = `${year}Q${quarter}`;
    if (!quarterlyData[quarterKey]) {
      quarterlyData[quarterKey] = { quarter: quarterKey, year, quarterNum: quarter, amount: 0, count: 0 };
    }
    quarterlyData[quarterKey].amount += amount;
    quarterlyData[quarterKey].count += 1;

    // 연도별 집계
    if (!yearlyData[year]) {
      yearlyData[year] = { year, amount: 0, count: 0 };
    }
    yearlyData[year].amount += amount;
    yearlyData[year].count += 1;

    // 이번 달
    if (year === currentYear && month === currentMonth) {
      thisMonthAmount += amount;
      thisMonthCount++;
    }

    // 지난 달
    if (year === lastMonthDate.getFullYear() && month === lastMonthDate.getMonth()) {
      lastMonthAmount += amount;
      lastMonthCount++;
    }

    // 이번 분기
    if (year === currentYear && quarter === currentQuarter) {
      thisQuarterAmount += amount;
      thisQuarterCount++;
    }

    // 지난 분기
    if (year === lastQuarterYear && quarter === lastQuarterNum) {
      lastQuarterAmount += amount;
      lastQuarterCount++;
    }

    // 올해
    if (year === currentYear) {
      thisYearAmount += amount;
      thisYearCount++;
    }

    // 작년
    if (year === currentYear - 1) {
      lastYearAmount += amount;
      lastYearCount++;
    }

    // 가맹점별 집계
    const merchantName = payment.merchant_name || "기타";
    if (!merchantData[merchantName]) {
      merchantData[merchantName] = { name: merchantName, amount: 0, count: 0, percentage: 0 };
    }
    merchantData[merchantName].amount += amount;
    merchantData[merchantName].count += 1;
  });

  // 가맹점 상위 10개 + 기타
  const sortedMerchants = Object.values(merchantData).sort((a, b) => b.amount - a.amount);
  const topMerchants = sortedMerchants.slice(0, 10);
  const otherMerchants = sortedMerchants.slice(10);
  
  if (otherMerchants.length > 0) {
    const otherAmount = otherMerchants.reduce((sum, m) => sum + m.amount, 0);
    const otherCount = otherMerchants.reduce((sum, m) => sum + m.count, 0);
    topMerchants.push({
      name: "기타",
      amount: otherAmount,
      count: otherCount,
      percentage: 0,
    });
  }

  topMerchants.forEach((m) => {
    m.percentage = totalAmount > 0 ? (m.amount / totalAmount) * 100 : 0;
  });

  // 월별 평균 계산
  const monthCount = Object.keys(monthlyData).length;
  const monthlyAverage = monthCount > 0 ? Math.round(totalAmount / monthCount) : 0;

  // 일 평균 (이번 달 기준)
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyAverageThisMonth = thisMonthCount > 0 
    ? Math.round(thisMonthAmount / Math.min(now.getDate(), daysInCurrentMonth)) 
    : 0;

  // 정렬된 데이터 (오름차순 - 차트용)
  const sortedMonthlyStatsAsc = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  
  // 이동 평균 및 금융 분석 데이터 계산
  const amounts = sortedMonthlyStatsAsc.map(m => m.amount);
  const ma3 = calculateMovingAverage(amounts, 3);
  const ma6 = calculateMovingAverage(amounts, 6);
  const ma12 = calculateMovingAverage(amounts, 12);

  // 월별 데이터에 이동 평균 추가
  const monthlyStatsWithMA: MonthlyStatsWithMA[] = sortedMonthlyStatsAsc.map((m, idx) => {
    // 최근 3개월 데이터로 변동성 계산
    const recentData = amounts.slice(Math.max(0, idx - 2), idx + 1);
    const volatility = calculateStdDev(recentData);
    
    // 추세 판단 (3개월 이동평균 기반)
    let trend: "up" | "down" | "stable" = "stable";
    if (idx >= 2 && ma3[idx] !== null && ma3[idx - 1] !== null) {
      const change = ((ma3[idx]! - ma3[idx - 1]!) / ma3[idx - 1]!) * 100;
      if (change > 5) trend = "up";
      else if (change < -5) trend = "down";
    }

    return {
      ...m,
      ma3: ma3[idx],
      ma6: ma6[idx],
      ma12: ma12[idx],
      trend,
      volatility,
    };
  });

  // 정렬된 데이터 (내림차순 - 테이블용)
  const sortedMonthlyStats = [...sortedMonthlyStatsAsc].reverse();
  const sortedQuarterlyStats = Object.values(quarterlyData).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.quarterNum - a.quarterNum;
  });
  const sortedYearlyStats = Object.values(yearlyData).sort((a, b) => b.year - a.year);

  // 증감률 계산
  const monthChangeRate = lastMonthAmount > 0 
    ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100 
    : 0;
  const quarterChangeRate = lastQuarterAmount > 0 
    ? ((thisQuarterAmount - lastQuarterAmount) / lastQuarterAmount) * 100 
    : 0;
  const yearChangeRate = lastYearAmount > 0 
    ? ((thisYearAmount - lastYearAmount) / lastYearAmount) * 100 
    : 0;

  // 전체 변동성 (월별 지출 표준편차)
  const overallVolatility = calculateStdDev(amounts);
  const volatilityPercent = monthlyAverage > 0 ? (overallVolatility / monthlyAverage) * 100 : 0;

  // 최근 3개월 이동 평균
  const recentMA3 = ma3.filter(v => v !== null).slice(-1)[0] || 0;

  // 최고/최저 지출 월
  const maxMonth = sortedMonthlyStatsAsc.reduce((max, m) => m.amount > max.amount ? m : max, sortedMonthlyStatsAsc[0] || { month: "-", amount: 0 });
  const minMonth = sortedMonthlyStatsAsc.reduce((min, m) => m.amount < min.amount ? m : min, sortedMonthlyStatsAsc[0] || { month: "-", amount: 0 });

  // 지출 추세 (최근 6개월 vs 이전 6개월)
  const recent6 = amounts.slice(-6);
  const prev6 = amounts.slice(-12, -6);
  const recent6Avg = recent6.length > 0 ? recent6.reduce((a, b) => a + b, 0) / recent6.length : 0;
  const prev6Avg = prev6.length > 0 ? prev6.reduce((a, b) => a + b, 0) / prev6.length : 0;
  const trendRate = prev6Avg > 0 ? ((recent6Avg - prev6Avg) / prev6Avg) * 100 : 0;

  return {
    // 전체 요약
    totalAmount,
    totalCount,
    monthlyAverage,
    dailyAverageThisMonth,

    // 이번 달
    thisMonth: {
      amount: thisMonthAmount,
      count: thisMonthCount,
      changeRate: monthChangeRate,
    },

    // 지난 달
    lastMonth: {
      amount: lastMonthAmount,
      count: lastMonthCount,
    },

    // 이번 분기
    thisQuarter: {
      amount: thisQuarterAmount,
      count: thisQuarterCount,
      changeRate: quarterChangeRate,
    },

    // 지난 분기
    lastQuarter: {
      amount: lastQuarterAmount,
      count: lastQuarterCount,
    },

    // 올해
    thisYear: {
      amount: thisYearAmount,
      count: thisYearCount,
      changeRate: yearChangeRate,
    },

    // 작년
    lastYear: {
      amount: lastYearAmount,
      count: lastYearCount,
    },

    // 상세 데이터
    monthlyStats: sortedMonthlyStats,
    monthlyStatsWithMA, // 이동 평균 포함 데이터 (오름차순)
    quarterlyStats: sortedQuarterlyStats,
    yearlyStats: sortedYearlyStats,
    merchantStats: topMerchants,

    // 금융 분석 지표
    analysis: {
      volatility: overallVolatility, // 절대 변동성
      volatilityPercent, // 상대 변동성 (%)
      recentMA3, // 최근 3개월 이동 평균
      trendRate, // 추세율 (최근 6개월 vs 이전 6개월)
      maxMonth: { month: maxMonth?.month || "-", amount: maxMonth?.amount || 0 },
      minMonth: { month: minMonth?.month || "-", amount: minMonth?.amount || 0 },
    },
  };
};

// 분기별 고가 주문 항목
export interface TopExpenseItem {
  quarter: string;
  year: number;
  quarterNum: number;
  productName: string;
  merchantName: string;
  amount: number;
  paidAt: string;
}

// 분기별 고가 주문 랭킹 추출
export const getQuarterlyTopExpenses = (
  payments: UnifiedPayment[],
  topN: number = 3
): TopExpenseItem[] => {
  // 분기별로 그룹화
  const quarterlyGroups: Record<string, UnifiedPayment[]> = {};
  
  payments.forEach((payment) => {
    const date = new Date(payment.paid_at);
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const key = `${year}Q${quarter}`;
    
    if (!quarterlyGroups[key]) {
      quarterlyGroups[key] = [];
    }
    quarterlyGroups[key].push(payment);
  });

  // 각 분기에서 상위 N개 추출
  const result: TopExpenseItem[] = [];
  
  Object.entries(quarterlyGroups)
    .sort((a, b) => b[0].localeCompare(a[0])) // 최신 분기 먼저
    .slice(0, 4) // 최근 4분기만
    .forEach(([key, items]) => {
      const year = parseInt(key.slice(0, 4));
      const quarterNum = parseInt(key.slice(-1));
      
      // 금액 기준 정렬 후 상위 N개
      const topItems = [...items]
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, topN);
      
      topItems.forEach((item) => {
        result.push({
          quarter: key,
          year,
          quarterNum,
          productName: item.product_name || item.merchant_name,
          merchantName: item.merchant_name,
          amount: item.total_amount,
          paidAt: item.paid_at,
        });
      });
    });

  return result;
};

// 지출 인사이트 생성
export interface SpendingInsight {
  type: "warning" | "info" | "success";
  title: string;
  description: string;
}

export const generateInsights = (stats: ReturnType<typeof processOverviewData>): SpendingInsight[] => {
  const insights: SpendingInsight[] = [];

  // 이번 달 vs 전월 비교
  if (stats.thisMonth.changeRate > 20) {
    insights.push({
      type: "warning",
      title: "지출 급증 주의",
      description: `이번 달 지출이 전월 대비 ${stats.thisMonth.changeRate.toFixed(0)}% 증가했습니다.`,
    });
  } else if (stats.thisMonth.changeRate < -20) {
    insights.push({
      type: "success",
      title: "지출 절감 성공",
      description: `이번 달 지출이 전월 대비 ${Math.abs(stats.thisMonth.changeRate).toFixed(0)}% 감소했습니다.`,
    });
  }

  // 변동성 체크
  if (stats.analysis.volatilityPercent > 30) {
    insights.push({
      type: "warning",
      title: "높은 지출 변동성",
      description: "월별 지출 편차가 큽니다. 예산 관리가 필요할 수 있습니다.",
    });
  } else if (stats.analysis.volatilityPercent < 15) {
    insights.push({
      type: "success",
      title: "안정적인 지출 패턴",
      description: "월별 지출이 일정하게 유지되고 있습니다.",
    });
  }

  // 6개월 추세
  if (stats.analysis.trendRate > 15) {
    insights.push({
      type: "warning",
      title: "장기 지출 상승 추세",
      description: `최근 6개월 평균이 이전 6개월 대비 ${stats.analysis.trendRate.toFixed(0)}% 높습니다.`,
    });
  } else if (stats.analysis.trendRate < -15) {
    insights.push({
      type: "success",
      title: "장기 지출 감소 추세",
      description: `최근 6개월 평균이 이전 6개월 대비 ${Math.abs(stats.analysis.trendRate).toFixed(0)}% 낮습니다.`,
    });
  }

  // 월 평균 대비 이번 달
  const avgDiff = ((stats.thisMonth.amount - stats.monthlyAverage) / stats.monthlyAverage) * 100;
  if (avgDiff > 30) {
    insights.push({
      type: "warning",
      title: "평균 초과 지출",
      description: `이번 달 지출이 월 평균보다 ${avgDiff.toFixed(0)}% 높습니다.`,
    });
  } else if (avgDiff < -30) {
    insights.push({
      type: "success",
      title: "평균 이하 지출",
      description: `이번 달 지출이 월 평균보다 ${Math.abs(avgDiff).toFixed(0)}% 낮습니다.`,
    });
  }

  // 기본 정보
  if (insights.length === 0) {
    insights.push({
      type: "info",
      title: "지출 현황 정상",
      description: "특별히 주의가 필요한 지출 패턴이 없습니다.",
    });
  }

  return insights;
};

// 금액 포맷 유틸리티
export const formatAmount = (amount: number): string => {
  return `₩${amount.toLocaleString("ko-KR")}`;
};

// 증감률 포맷 유틸리티
export const formatChangeRate = (rate: number): string => {
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%`;
};
