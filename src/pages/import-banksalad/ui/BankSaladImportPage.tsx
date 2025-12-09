import { useState, useCallback, useRef, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  User,
  TrendingUp,
  TrendingDown,
  Wallet,
  Shield,
  LineChart,
  Landmark,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Receipt,
} from "lucide-react";

// 뱅크샐러드 엑셀 파싱 결과 타입
interface CustomerInfo {
  name: string;
  gender: string;
  age: number;
  creditScore: number;
  email: string;
}

interface CashFlowItem {
  category: string;
  total: number;
  monthly: number;
  monthlyData: Record<string, number>;
}

interface CashFlowData {
  income: CashFlowItem[];
  expense: CashFlowItem[];
  months: string[];
}

interface LedgerEntry {
  date: string;
  time: string;
  rawDate: string;
  rawTime: string;
  type: string;
  major: string;
  minor: string;
  description: string;
  amount: number;
  currency: string;
  payment: string;
  memo: string;
}

interface AssetItem {
  type: string;
  productName: string;
  amount: number;
}

interface LiabilityItem {
  type: string;
  productName: string;
  amount: number;
}

interface FinancialStatus {
  assets: AssetItem[];
  liabilities: LiabilityItem[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

interface TableSection {
  headers: string[];
  rows: string[][];
}

interface BankSaladData {
  customerInfo: CustomerInfo;
  cashFlow: CashFlowData;
  financialStatus: FinancialStatus;
  insurance: TableSection;
  investment: TableSection;
  loan: TableSection;
  ledgerEntries: LedgerEntry[];
}

// 숫자 파싱 헬퍼 (쉼표 제거)
const parseNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

// 금액 포맷팅
const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat("ko-KR").format(amount);
};

const toSafeString = (value: unknown): string => String(value ?? "");

// 엑셀 직렬값(예: 46000, 0.57)까지 포함한 날짜 정규화
const normalizeDate = (value: unknown): string => {
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
    }
    return "";
  }

  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 10000) {
    const parsed = XLSX.SSF.parse_date_code(numeric);
    if (parsed) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
    }
  }

  const cleaned = toSafeString(value).replace(/\s+/g, "");
  if (!cleaned.includes(".")) return cleaned || "";
  const parts = cleaned.split(".").filter(Boolean);
  const [y, m = "1", d = "1"] = parts;
  const pad = (n: string) => n.padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}`;
};

// 엑셀 직렬값(소수)까지 포함한 시간 정규화
const normalizeTime = (value: unknown): string => {
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
      const seconds = Math.round(parsed.S || 0);
      return `${pad(parsed.H)}:${pad(parsed.M)}:${pad(seconds)}`;
    }
  }

  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0 && numeric < 1) {
    const parsed = XLSX.SSF.parse_date_code(numeric);
    if (parsed) {
      const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
      const seconds = Math.round(parsed.S || 0);
      return `${pad(parsed.H)}:${pad(parsed.M)}:${pad(seconds)}`;
    }
  }

  const trimmed = toSafeString(value).trim();
  if (!trimmed) return "";
  const [timePart, ampmRaw] = trimmed.split(/\s+/);
  const ampm = (ampmRaw || "").toUpperCase();
  const [hRaw = "0", mRaw = "0", sRaw = "0"] = timePart.split(":");
  let hour = parseInt(hRaw, 10);
  const minute = parseInt(mRaw, 10) || 0;
  const second = parseInt(sRaw, 10) || 0;
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hour)}:${pad(minute)}:${pad(second)}`;
};

export const BankSaladImportPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BankSaladData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    customer: true,
    cashFlow: true,
    financial: true,
    insurance: true,
    investment: true,
    loan: true,
    ledger: true,
  });
  const [showAllLedger, setShowAllLedger] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSelectFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setData(null);
    }
  }, []);

  const parseExcel = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Web File API로 파일 읽기
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      // === 시트 1: 요약 시트 ===
      const summarySheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });

      // 섹션 인덱스 탐색 (B열 우선, 없으면 A열) - 1~6 카테고리 모두 인식
      const sectionLabels = [
        "1.고객정보",
        "2.현금흐름현황",
        "3.재무현황",
        "4.보험현황",
        "5.투자현황",
        "6.대출현황",
      ];
      const sectionIndexMap: Record<string, number> = {};
      sectionLabels.forEach((label) => {
        const idx = rows.findIndex(
          (row) => String(row?.[1] ?? "").includes(label) || String(row?.[0] ?? "").includes(label),
        );
        if (idx >= 0) sectionIndexMap[label] = idx;
      });

      const extractSectionTable = (label: string, nextLabels: string[]): TableSection => {
        const start = sectionIndexMap[label];
        if (start === undefined) return { headers: [], rows: [] };

        const end =
          nextLabels
            .map((next) => sectionIndexMap[next])
            .filter((v) => v !== undefined)
            .sort((a, b) => a! - b!)[0] ?? rows.length;

        const sliced = rows.slice(start + 1, end).filter(
          (row) => Array.isArray(row) && (row as unknown[]).some((cell) => String(cell ?? "").trim() !== ""),
        ) as unknown[][];

        if (sliced.length === 0) return { headers: [], rows: [] };

        const maxLen = Math.max(...sliced.map((r) => r.length), 0);
        const toStringRow = (row: unknown[]) =>
          Array.from({ length: maxLen }, (_, idx) => String(row?.[idx] ?? "").trim());

        const headers = toStringRow(sliced[0]);
        const dataRows = sliced
          .slice(1)
          .map(toStringRow)
          .filter((row) => row.some((cell) => cell !== ""));

        return { headers, rows: dataRows };
      };

      // 1. 고객정보 (섹션 시작 다음 행에 정보가 위치한다고 가정)
      const customerStart = sectionIndexMap["1.고객정보"] ?? 0;
      const infoRow = rows[customerStart + 3] ?? [];
      const customerInfo: CustomerInfo = {
        name: String(infoRow?.[0] ?? ""),
        gender: String(infoRow?.[1] ?? ""),
        age: parseNumber(infoRow?.[2]),
        creditScore: parseNumber(infoRow?.[3]),
        email: String(infoRow?.[4] ?? "-"),
      };

      // 2. 현금흐름현황
      const cashFlowStart = sectionIndexMap["2.현금흐름현황"] ?? 0;
      const nextSectionIndex = sectionLabels
        .slice(2) // 이후 섹션 중 최초 등장하는 인덱스를 경계로 삼음
        .map((label) => sectionIndexMap[label])
        .filter((v) => v !== undefined)
        .sort((a, b) => a! - b!)[0];

      let cashFlowHeaderIndex = -1;
      for (let i = cashFlowStart; i < (nextSectionIndex ?? rows.length); i++) {
        if (rows[i]?.[0] === "항목" && rows[i]?.[1] === "총계") {
          cashFlowHeaderIndex = i;
          break;
        }
      }

      const cashFlow: CashFlowData = {
        income: [],
        expense: [],
        months: [],
      };

      if (cashFlowHeaderIndex !== -1) {
        const headerRow = rows[cashFlowHeaderIndex] as string[];
        cashFlow.months = headerRow.slice(3).filter((m) => m && typeof m === "string");

        for (let i = cashFlowHeaderIndex + 1; i < (nextSectionIndex ?? rows.length); i++) {
          const row = rows[i];
          if (!row || (!row[0] && !row[1])) continue;

          const category = String(row[0] ?? "").trim();
          if (!category || category.includes("총계") || category.includes("순수입")) continue;
          if (category.startsWith("2.") || category.startsWith("3.")) break;

          const item: CashFlowItem = {
            category,
            total: parseNumber(row[1]),
            monthly: parseNumber(row[2]),
            monthlyData: {},
          };

          for (let j = 3; j < headerRow.length; j++) {
            const month = headerRow[j];
            if (month) {
              item.monthlyData[month] = parseNumber(row[j]);
            }
          }

          // 동적 분류: 금액이 음수이거나 카테고리에 '수입'이 포함되지 않으면 지출로 간주
          const monthlySum = Object.values(item.monthlyData).reduce((acc, v) => acc + (v ?? 0), 0);
          const isIncomeKeyword = category.includes("수입") || category.includes("급여") || category.includes("용돈");
          const isIncome = isIncomeKeyword || monthlySum > 0 && item.total >= 0;
          if (isIncome) {
            cashFlow.income.push(item);
          } else {
            cashFlow.expense.push(item);
          }
        }
      }

      // 3. 재무현황
      const financialHeaderIndex = sectionIndexMap["3.재무현황"] ?? -1;
      const financialEndIndex = sectionLabels
        .slice(3) // 4~6 중 첫 등장까지
        .map((label) => sectionIndexMap[label])
        .filter((v) => v !== undefined)
        .sort((a, b) => a! - b!)[0];

      const financialStatus: FinancialStatus = {
        assets: [],
        liabilities: [],
        totalAssets: 0,
        totalLiabilities: 0,
        netWorth: 0,
      };

      if (financialHeaderIndex !== -1) {
        for (let i = financialHeaderIndex + 1; i < (financialEndIndex ?? rows.length); i++) {
          const row = rows[i];
          if (!row) continue;

          if (row[0] && row[1]) {
            const assetType = String(row[0]).trim();
            const productName = String(row[1]).trim();
            const amount = parseNumber(row[3]);
            
            if (assetType && productName && assetType !== "항목" && assetType !== "자산") {
              financialStatus.assets.push({
                type: assetType,
                productName,
                amount,
              });
              financialStatus.totalAssets += amount;
            }
          }

          if (row[4] && row[5]) {
            const liabilityType = String(row[4]).trim();
            const productName = String(row[5]).trim();
            const amount = parseNumber(row[7]);
            
            if (liabilityType && productName && liabilityType !== "항목" && liabilityType !== "부채") {
              financialStatus.liabilities.push({
                type: liabilityType,
                productName,
                amount,
              });
              financialStatus.totalLiabilities += amount;
            }
          }
        }
      }

      financialStatus.netWorth = financialStatus.totalAssets - financialStatus.totalLiabilities;

      // 4~6. 보험/투자/대출 현황 (테이블 통째로 표시)
      const insurance = extractSectionTable("4.보험현황", ["5.투자현황", "6.대출현황"]);
      const investment = extractSectionTable("5.투자현황", ["6.대출현황"]);
      const loan = extractSectionTable("6.대출현황", []);

      // === 시트 2: 가계부 내역 ===
      const ledgerSheetName =
        workbook.SheetNames.find((name) => name.includes("가계부")) ?? workbook.SheetNames[1] ?? null;
      const ledgerEntries: LedgerEntry[] = [];
      if (ledgerSheetName) {
        const ledgerSheet = workbook.Sheets[ledgerSheetName];
        const ledgerRows: unknown[][] = XLSX.utils.sheet_to_json(ledgerSheet, { header: 1 });

        // 헤더 행 찾기
        const ledgerHeaderIndex = ledgerRows.findIndex(
          (row) =>
            String(row?.[0] ?? "") === "날짜" &&
            String(row?.[1] ?? "") === "시간" &&
            String(row?.[2] ?? "") === "타입",
        );

        if (ledgerHeaderIndex !== -1) {
          for (let i = ledgerHeaderIndex + 1; i < ledgerRows.length; i++) {
            const row = ledgerRows[i];
            if (!row || !row[0]) continue;

            const rawDate = String(row[0] ?? "");
            const rawTime = String(row[1] ?? "");
            const normalizedDate = normalizeDate(rawDate);
            const normalizedTime = normalizeTime(rawTime);

            ledgerEntries.push({
              date: normalizedDate,
              time: normalizedTime,
              rawDate,
              rawTime,
              type: String(row[2] ?? ""),
              major: String(row[3] ?? ""),
              minor: String(row[4] ?? ""),
              description: String(row[5] ?? ""),
              amount: parseNumber(row[6]),
              currency: String(row[7] ?? ""),
              payment: String(row[8] ?? ""),
              memo: String(row[9] ?? ""),
            });
          }
        }
      }

      setData({
        customerInfo,
        cashFlow,
        financialStatus,
        insurance,
        investment,
        loan,
        ledgerEntries,
      });
      setShowAllLedger(false);
    } catch (err) {
      console.error("엑셀 파싱 오류:", err);
      setError(`파일을 파싱하는 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [file]);

  const renderSimpleTable = (section: TableSection) => {
    if (section.rows.length === 0) {
      return <p className="text-sm text-[#8b7355] italic">데이터가 없습니다.</p>;
    }

    const maxLen = Math.max(section.headers.length, ...section.rows.map((r) => r.length), 0);
    const headers =
      section.headers.some((h) => h.trim() !== "") && section.headers.length === maxLen
        ? section.headers
        : Array.from({ length: maxLen }, (_, idx) => section.headers[idx]?.trim() || `컬럼 ${idx + 1}`);

    const normalizedRows = section.rows.map((row) =>
      Array.from({ length: maxLen }, (_, idx) => row[idx] ?? ""),
    );

    const isReasonableYear = (year: number) => year >= 1900 && year <= 2100;

    const formatCell = (header: string, value: unknown): string => {
      const key = header.replace(/\s+/g, "");
      const numeric = typeof value === "number" ? value : Number(value);

      // 1) 명시적 날짜 헤더
      if (key.includes("계약일") || key.includes("만기일") || key === "만기") {
        const normalized = normalizeDate(value);
        return normalized || toSafeString(value);
      }
      // 2) 날짜처럼 보이는 값 (헤더 불명확 시 직렬값/날짜 문자열 처리)
      if (!key && !Number.isNaN(numeric)) {
        const normalized = normalizeDate(value);
        if (normalized && /^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
          const year = Number(normalized.slice(0, 4));
          if (isReasonableYear(year)) return normalized;
        }
      }
      if (!key && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        return value.trim();
      }

      // 3) 금액 포맷
      if (key.includes("총납입금") || key.includes("총납입")) {
        return formatAmount(parseNumber(value));
      }
      if (Number.isFinite(numeric) && Math.abs(numeric) >= 1000) {
        return formatAmount(numeric);
      }
      return toSafeString(value) || "-";
    };

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2d2416]/10">
              {headers.map((header, idx) => (
                <th key={idx} className="text-left py-2 px-3 text-[#8b7355] font-medium whitespace-nowrap">
                  {header || `컬럼 ${idx + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {normalizedRows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-[#2d2416]/5">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="py-2 px-3 text-[#2d2416] whitespace-nowrap">
                    {formatCell(headers[cIdx], cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-[#fffef0]">
      <div className="max-w-4xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#2d2416] flex items-center gap-3">
            <FileSpreadsheet className="w-7 h-7 text-[#c49a1a]" />
            뱅크샐러드 데이터 가져오기
          </h1>
          <p className="text-sm text-[#5c4d3c] mt-2">
            뱅크샐러드에서 내보낸 엑셀 파일(.xlsx)을 선택하여 데이터를 가져올 수 있습니다.
          </p>
        </div>

        {/* 파일 선택 영역 */}
        <div className="bg-[#f8f6f1] border border-[#2d2416]/10 rounded-xl p-6 mb-6">
          {/* 숨겨진 파일 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectFile}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2d2416] text-[#fffef0] rounded-lg hover:bg-[#4a3d2a] transition-colors font-medium text-sm"
            >
              <Upload className="w-4 h-4" />
              파일 선택
            </button>

            {file && (
              <div className="flex items-center gap-2 text-sm text-[#2d2416]">
                <FileSpreadsheet className="w-4 h-4 text-[#4a7c59]" />
                <span className="font-medium">{file.name}</span>
              </div>
            )}
          </div>

          {file && !data && (
            <div className="mt-4 pt-4 border-t border-[#2d2416]/10">
              <button
                onClick={parseExcel}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#4a7c59] text-white rounded-lg hover:bg-[#3d6b4a] transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    파싱 중...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    데이터 불러오기
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">오류 발생</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 파싱 결과 표시 */}
        {data && (
          <div className="space-y-6">
            {/* 고객 정보 섹션 */}
            <div className="bg-white border border-[#2d2416]/10 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection("customer")}
                className="w-full flex items-center justify-between px-5 py-4 bg-[#f8f6f1] hover:bg-[#f0ebe0] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[#c49a1a]" />
                  <span className="font-semibold text-[#2d2416]">고객 정보</span>
                </div>
                {expandedSections.customer ? (
                  <ChevronUp className="w-5 h-5 text-[#5c4d3c]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#5c4d3c]" />
                )}
              </button>

              {expandedSections.customer && (
                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-[#8b7355] uppercase tracking-wider">이름</p>
                    <p className="text-lg font-semibold text-[#2d2416] mt-1">{data.customerInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8b7355] uppercase tracking-wider">성별</p>
                    <p className="text-lg font-semibold text-[#2d2416] mt-1">{data.customerInfo.gender}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8b7355] uppercase tracking-wider">나이</p>
                    <p className="text-lg font-semibold text-[#2d2416] mt-1">{data.customerInfo.age}세</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8b7355] uppercase tracking-wider">신용점수 (KCB)</p>
                    <p className="text-lg font-semibold text-[#4a7c59] mt-1">{data.customerInfo.creditScore}점</p>
                  </div>
                </div>
              )}
            </div>

            {/* 현금흐름 섹션 */}
            <div className="bg-white border border-[#2d2416]/10 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection("cashFlow")}
                className="w-full flex items-center justify-between px-5 py-4 bg-[#f8f6f1] hover:bg-[#f0ebe0] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-[#4a7c59]" />
                  <span className="font-semibold text-[#2d2416]">현금흐름 현황</span>
                  <span className="text-xs bg-[#4a7c59]/10 text-[#4a7c59] px-2 py-0.5 rounded">
                    최근 1년
                  </span>
                </div>
                {expandedSections.cashFlow ? (
                  <ChevronUp className="w-5 h-5 text-[#5c4d3c]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#5c4d3c]" />
                )}
              </button>

              {expandedSections.cashFlow && (
                <div className="p-5">
                  {/* 수입 */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-[#4a7c59] flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4" />
                      수입 항목
                    </h4>
          <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#2d2416]/10">
                  <th className="text-left py-2 px-3 text-[#8b7355] font-medium w-40 whitespace-nowrap">항목</th>
                  {data.cashFlow.months.map((month) => (
                              <th key={month} className="text-right py-2 px-3 text-[#8b7355] font-medium whitespace-nowrap">
                                {month}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.cashFlow.income.map((item) => (
                            <tr key={item.category} className="border-b border-[#2d2416]/5">
                    <td className="py-2 px-3 text-[#2d2416] font-medium w-40 whitespace-nowrap">{item.category}</td>
                    {data.cashFlow.months.map((month) => (
                                <td key={month} className={`text-right py-2 px-3 tabular-nums ${item.monthlyData[month] >= 0 ? "text-[#4a7c59]" : "text-[#e76f51]"}`}>
                                  {item.monthlyData[month] !== 0 ? `₩${formatAmount(item.monthlyData[month])}` : "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 지출 */}
                  <div>
                    <h4 className="text-sm font-semibold text-[#e76f51] flex items-center gap-2 mb-3">
                      <TrendingDown className="w-4 h-4" />
                      지출 항목
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#2d2416]/10">
                  <th className="text-left py-2 px-3 text-[#8b7355] font-medium w-40 whitespace-nowrap">항목</th>
                  {data.cashFlow.months.map((month) => (
                              <th key={month} className="text-right py-2 px-3 text-[#8b7355] font-medium whitespace-nowrap">
                                {month}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.cashFlow.expense.map((item) => (
                            <tr key={item.category} className="border-b border-[#2d2416]/5">
                    <td className="py-2 px-3 text-[#2d2416] font-medium w-40 whitespace-nowrap">{item.category}</td>
                    {data.cashFlow.months.map((month) => (
                                <td key={month} className={`text-right py-2 px-3 tabular-nums ${item.monthlyData[month] <= 0 ? "text-[#e76f51]" : "text-[#4a7c59]"}`}>
                                  {item.monthlyData[month] !== 0 ? `₩${formatAmount(item.monthlyData[month])}` : "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 재무현황 섹션 */}
            <div className="bg-white border border-[#2d2416]/10 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection("financial")}
                className="w-full flex items-center justify-between px-5 py-4 bg-[#f8f6f1] hover:bg-[#f0ebe0] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-[#c49a1a]" />
                  <span className="font-semibold text-[#2d2416]">재무현황</span>
                </div>
                {expandedSections.financial ? (
                  <ChevronUp className="w-5 h-5 text-[#5c4d3c]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#5c4d3c]" />
                )}
              </button>

              {expandedSections.financial && (
                <div className="p-5">
                  {/* 요약 */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-[#4a7c59]/5 rounded-lg p-4">
                      <p className="text-xs text-[#4a7c59] uppercase tracking-wider">총 자산</p>
                      <p className="text-xl font-bold text-[#4a7c59] mt-1">
                        ₩{formatAmount(data.financialStatus.totalAssets)}
                      </p>
                    </div>
                    <div className="bg-[#e76f51]/5 rounded-lg p-4">
                      <p className="text-xs text-[#e76f51] uppercase tracking-wider">총 부채</p>
                      <p className="text-xl font-bold text-[#e76f51] mt-1">
                        ₩{formatAmount(data.financialStatus.totalLiabilities)}
                      </p>
                    </div>
                    <div className={`${data.financialStatus.netWorth >= 0 ? "bg-[#4a7c59]/5" : "bg-[#e76f51]/5"} rounded-lg p-4`}>
                      <p className="text-xs text-[#2d2416] uppercase tracking-wider">순자산</p>
                      <p className={`text-xl font-bold mt-1 ${data.financialStatus.netWorth >= 0 ? "text-[#4a7c59]" : "text-[#e76f51]"}`}>
                        ₩{formatAmount(data.financialStatus.netWorth)}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* 자산 목록 */}
                    <div>
                      <h4 className="text-sm font-semibold text-[#4a7c59] flex items-center gap-2 mb-3">
                        <Wallet className="w-4 h-4" />
                        자산
                      </h4>
                      <div className="space-y-2">
                        {data.financialStatus.assets.map((asset, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-2 px-3 bg-[#f8f6f1] rounded-lg"
                          >
                            <div>
                              <p className="text-xs text-[#8b7355]">{asset.type}</p>
                              <p className="text-sm font-medium text-[#2d2416] truncate max-w-[200px]">
                                {asset.productName}
                              </p>
                            </div>
                            <p className={`text-sm font-semibold tabular-nums ${asset.amount >= 0 ? "text-[#4a7c59]" : "text-[#e76f51]"}`}>
                              ₩{formatAmount(asset.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 부채 목록 */}
                    <div>
                      <h4 className="text-sm font-semibold text-[#e76f51] flex items-center gap-2 mb-3">
                        <CreditCard className="w-4 h-4" />
                        부채
                      </h4>
                      <div className="space-y-2">
                        {data.financialStatus.liabilities.length > 0 ? (
                          data.financialStatus.liabilities.map((liability, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between py-2 px-3 bg-[#f8f6f1] rounded-lg"
                            >
                              <div>
                                <p className="text-xs text-[#8b7355]">{liability.type}</p>
                                <p className="text-sm font-medium text-[#2d2416] truncate max-w-[200px]">
                                  {liability.productName}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-[#e76f51] tabular-nums">
                                ₩{formatAmount(liability.amount)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-[#8b7355] italic py-2">부채 없음</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 보험현황 섹션 */}
            <div className="bg-white border border-[#2d2416]/10 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection("insurance")}
                className="w-full flex items-center justify-between px-5 py-4 bg-[#f8f6f1] hover:bg-[#f0ebe0] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#c49a1a]" />
                  <span className="font-semibold text-[#2d2416]">보험현황</span>
                </div>
                {expandedSections.insurance ? (
                  <ChevronUp className="w-5 h-5 text-[#5c4d3c]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#5c4d3c]" />
                )}
              </button>

              {expandedSections.insurance && <div className="p-5">{renderSimpleTable(data.insurance)}</div>}
            </div>

            {/* 투자현황 섹션 */}
            <div className="bg-white border border-[#2d2416]/10 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection("investment")}
                className="w-full flex items-center justify-between px-5 py-4 bg-[#f8f6f1] hover:bg-[#f0ebe0] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LineChart className="w-5 h-5 text-[#4a7c59]" />
                  <span className="font-semibold text-[#2d2416]">투자현황</span>
                </div>
                {expandedSections.investment ? (
                  <ChevronUp className="w-5 h-5 text-[#5c4d3c]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#5c4d3c]" />
                )}
              </button>

              {expandedSections.investment && <div className="p-5">{renderSimpleTable(data.investment)}</div>}
            </div>

            {/* 대출현황 섹션 */}
            <div className="bg-white border border-[#2d2416]/10 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection("loan")}
                className="w-full flex items-center justify-between px-5 py-4 bg-[#f8f6f1] hover:bg-[#f0ebe0] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Landmark className="w-5 h-5 text-[#e76f51]" />
                  <span className="font-semibold text-[#2d2416]">대출현황</span>
                </div>
                {expandedSections.loan ? (
                  <ChevronUp className="w-5 h-5 text-[#5c4d3c]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#5c4d3c]" />
                )}
              </button>

              {expandedSections.loan && <div className="p-5">{renderSimpleTable(data.loan)}</div>}
            </div>

            {/* 가계부 내역 섹션 */}
            <div className="bg-white border border-[#2d2416]/10 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection("ledger")}
                className="w-full flex items-center justify-between px-5 py-4 bg-[#f8f6f1] hover:bg-[#f0ebe0] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-[#2d2416]" />
                  <span className="font-semibold text-[#2d2416]">가계부 내역</span>
                  <span className="text-xs bg-[#2d2416]/10 text-[#2d2416] px-2 py-0.5 rounded">
                    {showAllLedger
                      ? `${data.ledgerEntries.length.toLocaleString()}건`
                      : `${Math.min(50, data.ledgerEntries.length).toLocaleString()}건 / ${data.ledgerEntries.length.toLocaleString()}건`}
                  </span>
                </div>
                {expandedSections.ledger ? (
                  <ChevronUp className="w-5 h-5 text-[#5c4d3c]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#5c4d3c]" />
                )}
              </button>

              {expandedSections.ledger && (
                <div className="p-5">
                  {data.ledgerEntries.length === 0 ? (
                    <p className="text-sm text-[#8b7355] italic">가져온 내역이 없습니다.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#2d2416]/10">
                              <th className="text-left py-2 px-3 text-[#8b7355] font-medium whitespace-nowrap">날짜</th>
                              <th className="text-left py-2 px-3 text-[#8b7355] font-medium whitespace-nowrap">시간</th>
                              <th className="text-left py-2 px-3 text-[#8b7355] font-medium whitespace-nowrap">타입</th>
                              <th className="text-left py-2 px-3 text-[#8b7355] font-medium whitespace-nowrap">대분류</th>
                              <th className="text-left py-2 px-3 text-[#8b7355] font-medium whitespace-nowrap">소분류</th>
                              <th className="text-left py-2 px-3 text-[#8b7355] font-medium whitespace-nowrap">내용</th>
                              <th className="text-right py-2 px-3 text-[#8b7355] font-medium whitespace-nowrap">금액</th>
                              <th className="text-left py-2 px-3 text-[#8b7355] font-medium whitespace-nowrap">결제수단</th>
                              <th className="text-left py-2 px-3 text-[#8b7355] font-medium whitespace-nowrap">메모</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(showAllLedger ? data.ledgerEntries : data.ledgerEntries.slice(0, 50)).map(
                              (entry, idx) => (
                                <tr
                                  key={`${entry.date}-${entry.time}-${idx}`}
                                  className="border-b border-[#2d2416]/5"
                                >
                                  <td className="py-2 px-3 text-[#2d2416] whitespace-nowrap">
                                    {entry.date}
                                  </td>
                                  <td className="py-2 px-3 text-[#2d2416] whitespace-nowrap">
                                    {entry.time}
                                  </td>
                                  <td className="py-2 px-3 text-[#2d2416] whitespace-nowrap">{entry.type}</td>
                                  <td className="py-2 px-3 text-[#2d2416] whitespace-nowrap">{entry.major}</td>
                                  <td className="py-2 px-3 text-[#2d2416] whitespace-nowrap">{entry.minor}</td>
                                  <td className="py-2 px-3 text-[#2d2416] whitespace-pre-line">{entry.description}</td>
                                  <td className={`py-2 px-3 text-right tabular-nums ${entry.amount <= 0 ? "text-[#e76f51]" : "text-[#4a7c59]"}`}>
                                    ₩{formatAmount(entry.amount)}
                                  </td>
                                  <td className="py-2 px-3 text-[#2d2416] whitespace-nowrap">{entry.payment}</td>
                                  <td className="py-2 px-3 text-[#8b7355] whitespace-pre-line">{entry.memo}</td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>

                      {data.ledgerEntries.length > 50 && (
                        <div className="flex justify-center mt-4">
                          <button
                            onClick={() => setShowAllLedger((prev) => !prev)}
                            className="px-4 py-2 text-sm font-medium text-[#2d2416] bg-[#f8f6f1] border border-[#2d2416]/20 rounded-lg hover:bg-[#f0ebe0] transition-colors"
                          >
                            {showAllLedger ? "접기" : "더 보기"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 가져오기 안내 */}
            <div className="bg-[#c49a1a]/10 border border-[#c49a1a]/20 rounded-xl p-5">
              <p className="text-sm text-[#2d2416]">
                <strong className="text-[#c49a1a]">참고:</strong> 현재는 데이터 미리보기 기능만 제공됩니다.
                추후 가계부로 직접 가져오기 기능이 추가될 예정입니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

