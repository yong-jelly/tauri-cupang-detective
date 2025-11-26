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

  // 뉴트로 메뉴 아이템 스타일 (도트/타자기 느낌)
  const menuItemClass = (isActive: boolean) => `
    w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 border-l-4
    ${isActive 
      ? "bg-[#fffef0] text-[#2d2416] font-bold border-[#c49a1a] shadow-[inset_0_0_0_1px_#d4c4a8]" 
      : "text-[#5c4d3c] hover:bg-[#f0e6d6] hover:text-[#2d2416] border-transparent hover:border-[#d4c4a8]"
    }
  `;

  // 섹션 헤더 스타일
  const sectionHeaderClass = `
    w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em]
    text-[#8b7355] hover:text-[#5c4d3c] transition-colors cursor-pointer select-none border-b border-dashed border-[#d4c4a8]
  `;

  return (
    <div className="w-64 bg-[#fdfbf7] flex flex-col h-full border-r-2 border-[#2d2416] font-mono text-sm">
      {/* 워크스페이스 헤더 */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowAccountDropdown(!showAccountDropdown)}
          className="w-full h-16 border-b-2 border-[#2d2416] flex items-center px-4 hover:bg-[#f6f1e9] transition-colors bg-[#fffef0]"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-[#2d2416] border-2 border-[#c49a1a] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-[#c49a1a]" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              {selectedAccount ? (
                <>
                  <div className="font-bold text-[#2d2416] text-base truncate tracking-wide">{selectedAccount.alias}</div>
                  <div className="text-xs text-[#8b7355] truncate uppercase tracking-[0.15em]">{selectedAccount.provider}</div>
                </>
              ) : (
                <>
                  <div className="font-bold text-[#2d2416] text-base tracking-wide">가계부</div>
                  <div className="text-xs text-[#8b7355] uppercase tracking-[0.15em]">계정 선택</div>
                </>
              )}
            </div>
          </div>
          <div className={`p-1.5 transition-colors border border-[#d4c4a8] ${showAccountDropdown ? "bg-[#e8dcc8]" : "bg-[#fffef0]"}`}>
            {showAccountDropdown ? (
              <ChevronUp className="w-4 h-4 text-[#2d2416]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#5c4d3c]" />
            )}
          </div>
        </button>

        {/* 계정 드롭다운 */}
        {showAccountDropdown && (
          <div className="absolute top-full left-0 right-0 bg-[#fffef0] border-2 border-[#2d2416] shadow-[4px_4px_0px_0px_rgba(45,36,22,1)] z-50 max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-[#c49a1a]" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="px-4 py-4 text-sm text-[#8b7355] text-center">등록된 계정이 없습니다</div>
            ) : (
              <div className="py-1">
                {accounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSelect(account.id)}
                      className={`w-full text-left px-4 py-3 transition-all border-b border-dashed border-[#e8dcc8] last:border-b-0 ${
                        isSelected
                          ? "bg-[#fffef0] text-[#2d2416] font-bold border-l-4 border-[#c49a1a]"
                          : "text-[#5c4d3c] hover:bg-[#f6f1e9] border-l-4 border-transparent"
                      }`}
                    >
                      <div className="font-bold text-base tracking-wide">{account.alias}</div>
                      <div className="text-xs text-[#8b7355] uppercase tracking-[0.15em] mt-1">{account.provider}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 스크롤 가능 콘텐츠 */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        {/* 지출 분석 섹션 (네이버 계정 선택시만) */}
        {selectedAccount && selectedAccount.provider === "naver" && (
          <div className="mb-5">
            <div className={sectionHeaderClass} onClick={() => toggleSection("expenditure")}>
              <span className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" />
                지출 분석
              </span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedSections.expenditure ? "rotate-90" : ""}`} />
            </div>
            
            {expandedSections.expenditure && (
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => onNavigate?.(`expenditure-overview-${selectedAccount.id}`)}
                  className={menuItemClass(activePage === `expenditure-overview-${selectedAccount.id}`)}
                >
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left tracking-wide">종합 대시보드</span>
                  <Zap className="w-3.5 h-3.5 text-[#c49a1a]" />
                </button>
                <button
                  onClick={() => onNavigate?.(`expenditure-${selectedAccount.id}`)}
                  className={menuItemClass(activePage === `expenditure-${selectedAccount.id}`)}
                >
                  <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left tracking-wide">월별 현황</span>
                </button>
                <button
                  onClick={() => onNavigate?.(`transactions-${selectedAccount.id}`)}
                  className={menuItemClass(activePage === `transactions-${selectedAccount.id}`)}
                >
                  <Receipt className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left tracking-wide">거래 목록</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 데이터 수집 섹션 */}
        {selectedAccount && (
          <div className="mb-5">
            <div className={sectionHeaderClass} onClick={() => toggleSection("data")}>
              <span className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5" />
                데이터 수집
              </span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedSections.data ? "rotate-90" : ""}`} />
            </div>
            
            {expandedSections.data && (
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => onNavigate?.("data-collection-test")}
                  className={menuItemClass(activePage === "data-collection-test")}
                >
                  <Database className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left tracking-wide">실험용 수집기</span>
                </button>
                {selectedAccount.provider === "naver" && (
                  <button
                    onClick={() => onNavigate?.(`data-collection-${selectedAccount.id}`)}
                    className={menuItemClass(activePage === `data-collection-${selectedAccount.id}`)}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left tracking-wide">네이버 거래내역</span>
                  </button>
                )}
                {selectedAccount.provider === "coupang" && (
                  <button
                    onClick={() => onNavigate?.(`coupang-transactions-${selectedAccount.id}`)}
                    className={menuItemClass(activePage === `coupang-transactions-${selectedAccount.id}`)}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left tracking-wide">쿠팡 거래내역</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 도구 섹션 */}
        <div className="mb-5">
          <div className={sectionHeaderClass} onClick={() => toggleSection("tools")}>
            <span className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5" />
              도구
            </span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedSections.tools ? "rotate-90" : ""}`} />
          </div>
          
          {expandedSections.tools && (
            <div className="mt-2 space-y-1">
              <button
                onClick={() => onNavigate?.("table-manager")}
                className={menuItemClass(activePage === "table-manager")}
              >
                <Calculator className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left tracking-wide">테이블 관리</span>
              </button>
              <button
                onClick={() => onNavigate?.("accounts")}
                className={menuItemClass(activePage === "accounts")}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left tracking-wide">계정 관리</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 하단 메뉴 */}
      <div className="border-t-2 border-[#2d2416] p-3 bg-[#f6f1e9]">
        <button
          onClick={() => onNavigate?.("system")}
          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all border-l-4 ${
            activePage === "system"
              ? "bg-[#fffef0] text-[#2d2416] font-bold border-[#c49a1a] shadow-[inset_0_0_0_1px_#d4c4a8]"
              : "text-[#5c4d3c] hover:bg-[#f0e6d6] hover:text-[#2d2416] border-transparent"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="tracking-wide">시스템 설정</span>
        </button>
      </div>
    </div>
  );
};
