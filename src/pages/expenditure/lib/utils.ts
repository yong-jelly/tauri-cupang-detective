import type { NaverPaymentListItem } from "@shared/api/types";

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

export const processExpenditureData = (
  payments: NaverPaymentListItem[],
  selectedDate?: Date // 선택된 날짜 (없으면 전체 기간)
) => {
  // 날짜순 정렬 (오름차순)
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime()
  );

  const monthlyData: Record<string, MonthlyStats> = {};
  const dailyData: Record<string, DailyStats> = {};
  const merchantData: Record<string, MerchantStats> = {};
  let totalAmount = 0;
  let filteredCount = 0;
  const filteredPayments: NaverPaymentListItem[] = [];

  sortedPayments.forEach((payment) => {
    const date = new Date(payment.paidAt);
    
    // 기간 필터링
    if (selectedDate) {
      const isSameYear = date.getFullYear() === selectedDate.getFullYear();
      const isSameMonth = date.getMonth() === selectedDate.getMonth();
      
      // 월 단위 보기 모드: 같은 년/월 데이터만 포함
      if (!isSameYear || !isSameMonth) {
        return;
      }
    }

    filteredPayments.push(payment);
    filteredCount++;

    const yearMonth = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
    const dayKey = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
    const amount = payment.totalAmount;

    // 월별 집계 (전체 보기일 때 유용, 월별 보기에서도 사용)
    if (!monthlyData[yearMonth]) {
      monthlyData[yearMonth] = { month: yearMonth, amount: 0, count: 0 };
    }
    monthlyData[yearMonth].amount += amount;
    monthlyData[yearMonth].count += 1;

    // 일별 집계 (월별 보기일 때 사용)
    if (selectedDate) {
      if (!dailyData[dayKey]) {
        dailyData[dayKey] = { date: dayKey, day: date.getDate(), amount: 0 };
      }
      dailyData[dayKey].amount += amount;
    }

    // 가맹점별 집계
    const merchantName = payment.merchantName || "기타";
    if (!merchantData[merchantName]) {
      merchantData[merchantName] = { name: merchantName, amount: 0, count: 0, percentage: 0 };
    }
    merchantData[merchantName].amount += amount;
    merchantData[merchantName].count += 1;

    totalAmount += amount;
  });

  // 가맹점 비율 계산 및 정렬 (상위 5개 + 기타)
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

  // 일별 데이터 정렬 (월별 보기용)
  const sortedDailyStats = Object.values(dailyData).sort((a, b) => a.day - b.day);

  return {
    monthlyStats: Object.values(monthlyData),
    dailyStats: sortedDailyStats,
    merchantStats: topMerchants,
    totalAmount,
    totalCount: filteredCount,
    sortedPayments: filteredPayments.reverse(), // 최신순 반환
  };
};

