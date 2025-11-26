import { useEffect, useState, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Database,
  Users,
  FileText,
  Receipt,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Calculator,
  Wallet,
  FolderOpen,
  Wrench,
  BarChart3,
  Zap,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { User, UserListResponse } from "@shared/api/types";
import { Loader2 } from "lucide-react";

interface SidebarProps {
  activePage?: string;
  selectedAccountId?: string | null;
  onNavigate?: (page: string) => void;
  onSelectAccount?: (accountId: string | null) => void;
}

export const Sidebar = ({
  activePage = "home",
  selectedAccountId,
  onNavigate,
  onSelectAccount,
}: SidebarProps) => {
  const [accounts, setAccounts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    expenditure: true,
    data: true,
    tools: true,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      setLoading(true);
      try {
        const result = await invoke<UserListResponse>("list_users");
        setAccounts(result.users);
      } catch (err) {
        console.error("계정 목록 로드 실패:", err);
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    };
    loadAccounts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
    };

    if (showAccountDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showAccountDropdown]);

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

  const handleAccountSelect = (accountId: string | null) => {
    onSelectAccount?.(accountId);
    setShowAccountDropdown(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // 레트로 타자기 메뉴 아이템 스타일 (들여쓰기 + 작은 마커)
  const menuItemClass = (isActive: boolean) => `
    w-full flex items-center gap-3 pl-8 pr-4 py-2.5 transition-all duration-100 border-l-4
    ${isActive 
      ? "bg-[#2d2416] text-[#fffef0] font-bold border-[#c49a1a]" 
      : "text-[#5c4d3c] hover:bg-[#e8dcc8] hover:text-[#2d2416] border-transparent hover:border-[#8b7355]"
    }
  `;

  // 섹션 헤더 스타일 (더 강조)
  const sectionHeaderClass = `
    w-full flex items-center justify-between px-4 py-3.5 text-sm font-black uppercase tracking-[0.15em]
    bg-[#e8dcc8] text-[#2d2416] hover:bg-[#d4c4a8] transition-colors cursor-pointer select-none
    border-y-2 border-[#2d2416]
  `;

  return (
    <div className="w-72 bg-[#fffef0] flex flex-col h-full border-r-4 border-[#2d2416] font-mono shadow-[4px_0_0_0_rgba(45,36,22,0.1)]">
      {/* 워크스페이스 헤더 */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowAccountDropdown(!showAccountDropdown)}
          className="w-full h-20 border-b-4 border-[#2d2416] flex items-center px-5 hover:bg-[#f6f1e9] transition-colors bg-[#f6f1e9]"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 bg-[#2d2416] border-3 border-[#c49a1a] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(196,154,26,1)]">
              <Wallet className="w-6 h-6 text-[#c49a1a]" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              {selectedAccount ? (
                <>
                  <div className="font-bold text-[#2d2416] text-lg truncate tracking-wider uppercase">{selectedAccount.alias}</div>
                  <div className="text-xs text-[#8b7355] truncate uppercase tracking-[0.25em] mt-0.5">{selectedAccount.provider}</div>
                </>
              ) : (
                <>
                  <div className="font-bold text-[#2d2416] text-lg tracking-wider uppercase">가계부</div>
                  <div className="text-xs text-[#8b7355] uppercase tracking-[0.25em] mt-0.5">계정 선택</div>
                </>
              )}
            </div>
          </div>
          <div className={`p-2 transition-colors border-2 border-[#2d2416] ${showAccountDropdown ? "bg-[#2d2416] text-[#fffef0]" : "bg-[#fffef0]"}`}>
            {showAccountDropdown ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#2d2416]" />
            )}
          </div>
        </button>

        {/* 계정 드롭다운 */}
        {showAccountDropdown && (
          <div className="absolute top-full left-0 right-0 bg-[#fffef0] border-4 border-[#2d2416] shadow-[6px_6px_0px_0px_rgba(45,36,22,1)] z-50 max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#c49a1a]" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="px-5 py-5 text-base text-[#8b7355] text-center uppercase tracking-wider">등록된 계정 없음</div>
            ) : (
              <div>
                {accounts.map((account, idx) => {
                  const isSelected = selectedAccountId === account.id;
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSelect(account.id)}
                      className={`w-full text-left px-5 py-4 transition-all ${idx < accounts.length - 1 ? "border-b-2 border-dashed border-[#d4c4a8]" : ""} ${
                        isSelected
                          ? "bg-[#2d2416] text-[#fffef0]"
                          : "text-[#2d2416] hover:bg-[#e8dcc8]"
                      }`}
                    >
                      <div className="font-bold text-lg tracking-wider uppercase">{account.alias}</div>
                      <div className={`text-xs uppercase tracking-[0.25em] mt-1 ${isSelected ? "text-[#c49a1a]" : "text-[#8b7355]"}`}>{account.provider}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 스크롤 가능 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {/* 지출 분석 섹션 (네이버 계정 선택시만) */}
        {selectedAccount && selectedAccount.provider === "naver" && (
          <div>
            <div className={sectionHeaderClass} onClick={() => toggleSection("expenditure")}>
              <span className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4" />
                지출 분석
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expandedSections.expenditure ? "rotate-90" : ""}`} />
            </div>
            
            {expandedSections.expenditure && (
              <div className="bg-[#fffef0] border-b-2 border-[#d4c4a8]">
                <button
                  onClick={() => onNavigate?.(`expenditure-overview-${selectedAccount.id}`)}
                  className={menuItemClass(activePage === `expenditure-overview-${selectedAccount.id}`)}
                >
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left tracking-wide text-sm">종합 대시보드</span>
                  <Zap className="w-3.5 h-3.5 text-[#c49a1a]" />
                </button>
                <button
                  onClick={() => onNavigate?.(`expenditure-${selectedAccount.id}`)}
                  className={menuItemClass(activePage === `expenditure-${selectedAccount.id}`)}
                >
                  <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left tracking-wide text-sm">월별 현황</span>
                </button>
                <button
                  onClick={() => onNavigate?.(`transactions-${selectedAccount.id}`)}
                  className={menuItemClass(activePage === `transactions-${selectedAccount.id}`)}
                >
                  <Receipt className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left tracking-wide text-sm">거래 목록</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 데이터 수집 섹션 */}
        {selectedAccount && (
          <div>
            <div className={sectionHeaderClass} onClick={() => toggleSection("data")}>
              <span className="flex items-center gap-3">
                <FolderOpen className="w-4 h-4" />
                데이터 수집
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expandedSections.data ? "rotate-90" : ""}`} />
            </div>
            
            {expandedSections.data && (
              <div className="bg-[#fffef0] border-b-2 border-[#d4c4a8]">
                <button
                  onClick={() => onNavigate?.("data-collection-test")}
                  className={menuItemClass(activePage === "data-collection-test")}
                >
                  <Database className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left tracking-wide text-sm">실험용 수집기</span>
                </button>
                {selectedAccount.provider === "naver" && (
                  <button
                    onClick={() => onNavigate?.(`data-collection-${selectedAccount.id}`)}
                    className={menuItemClass(activePage === `data-collection-${selectedAccount.id}`)}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left tracking-wide text-sm">네이버 거래내역</span>
                  </button>
                )}
                {selectedAccount.provider === "coupang" && (
                  <button
                    onClick={() => onNavigate?.(`coupang-transactions-${selectedAccount.id}`)}
                    className={menuItemClass(activePage === `coupang-transactions-${selectedAccount.id}`)}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left tracking-wide text-sm">쿠팡 거래내역</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 도구 섹션 */}
        <div>
          <div className={sectionHeaderClass} onClick={() => toggleSection("tools")}>
            <span className="flex items-center gap-3">
              <Wrench className="w-4 h-4" />
              도구
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expandedSections.tools ? "rotate-90" : ""}`} />
          </div>
          
          {expandedSections.tools && (
            <div className="bg-[#fffef0] border-b-2 border-[#d4c4a8]">
              <button
                onClick={() => onNavigate?.("table-manager")}
                className={menuItemClass(activePage === "table-manager")}
              >
                <Calculator className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left tracking-wide text-sm">테이블 관리</span>
              </button>
              <button
                onClick={() => onNavigate?.("accounts")}
                className={menuItemClass(activePage === "accounts")}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left tracking-wide text-sm">계정 관리</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 하단 메뉴 */}
      <div className="border-t-4 border-[#2d2416] bg-[#e8dcc8]">
        <button
          onClick={() => onNavigate?.("system")}
          className={`w-full flex items-center gap-4 px-5 py-4 transition-all ${
            activePage === "system"
              ? "bg-[#2d2416] text-[#fffef0] font-bold"
              : "text-[#2d2416] hover:bg-[#d4c4a8]"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="tracking-wider uppercase text-sm font-bold">시스템 설정</span>
        </button>
      </div>
    </div>
  );
};
