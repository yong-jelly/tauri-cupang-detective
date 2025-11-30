import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Grid3X3,
  BookOpen,
  PenLine,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { User, UserListResponse } from "@shared/api/types";
import { Loader2 } from "lucide-react";

interface SidebarProps {
  activePage?: string;
  selectedAccountId?: string | null;
  accounts?: User[];
  accountsLoading?: boolean;
  onNavigate?: (page: string) => void;
  onSelectAccount?: (accountId: string | null) => void;
  onLogout?: () => void;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

// 툴팁 컴포넌트
const Tooltip = ({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) => {
  if (!show) return <>{children}</>;
  
  return (
    <div className="relative group">
      {children}
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-[#2d2416] text-[#fffef0] text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-lg">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#2d2416]" />
      </div>
    </div>
  );
};

export const Sidebar = ({
  activePage: externalActivePage,
  selectedAccountId,
  accounts: externalAccounts,
  accountsLoading: externalLoading,
  onNavigate,
  onSelectAccount,
  onLogout,
  defaultCollapsed = false,
  onCollapsedChange,
}: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [internalAccounts, setInternalAccounts] = useState<User[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ledger: true,
    expenditure: true,
    data: true,
    tools: true,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부에서 accounts가 전달되면 사용, 아니면 내부에서 로드
  const accounts = externalAccounts ?? internalAccounts;
  const loading = externalAccounts !== undefined ? (externalLoading ?? false) : internalLoading;

  // 현재 경로에서 activePage 추론
  const getActivePageFromPath = (): string => {
    const path = location.pathname;
    
    if (path === "/" || path === "/home") return "home";
    if (path === "/accounts") return "accounts";
    if (path === "/accounts/add") return "account-add";
    if (path === "/system") return "system";
    if (path === "/table-manager") return "table-manager";
    if (path === "/playground") return "playground";
    if (path === "/settings") return "settings";
    
    // 가계부 페이지
    if (path.startsWith("/ledger")) {
      if (path === "/ledger" || path === "/ledger/") return "ledger";
      if (path === "/ledger/onboarding") return "ledger-onboarding";
      const ledgerAccountMatch = path.match(/^\/ledger\/account\/([^/]+)$/);
      if (ledgerAccountMatch) {
        return `ledger-account-${ledgerAccountMatch[1]}`;
      }
      const ledgerNewMatch = path.match(/^\/ledger\/account\/([^/]+)\/new$/);
      if (ledgerNewMatch) {
        return `ledger-new-${ledgerNewMatch[1]}`;
      }
      const ledgerEditMatch = path.match(/^\/ledger\/account\/([^/]+)\/edit\/(.+)$/);
      if (ledgerEditMatch) {
        return `ledger-edit-${ledgerEditMatch[1]}`;
      }
      const ledgerHistoryMatch = path.match(/^\/ledger\/account\/([^/]+)\/history\/(.+)$/);
      if (ledgerHistoryMatch) {
        return `ledger-history-${ledgerHistoryMatch[1]}`;
      }
    }
    
    // 계정별 페이지
    const accountMatch = path.match(/^\/account\/([^/]+)\/(.+)$/);
    if (accountMatch) {
      const [, accountId, subPath] = accountMatch;
      if (subPath === "overview") return `expenditure-overview-${accountId}`;
      if (subPath === "expenditure") return `expenditure-${accountId}`;
      if (subPath === "transactions") return `transactions-${accountId}`;
      if (subPath === "heatmap") return `heatmap-${accountId}`;
      if (subPath === "data-collection") return `data-collection-${accountId}`;
      if (subPath === "data-collection/experimental") return "data-collection-test";
      if (subPath === "coupang-transactions") return `coupang-transactions-${accountId}`;
    }
    
    return "home";
  };

  const activePage = externalActivePage ?? getActivePageFromPath();

  const handleToggleCollapse = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
    // 접힐 때 드롭다운 닫기
    if (newCollapsed) {
      setShowAccountDropdown(false);
    }
  };

  useEffect(() => {
    // 외부에서 accounts가 전달되면 내부 로드 스킵
    if (externalAccounts !== undefined) {
      return;
    }
    
    const loadAccounts = async () => {
      setInternalLoading(true);
      try {
        const result = await invoke<UserListResponse>("list_users");
        setInternalAccounts(result.users);
      } catch (err) {
        console.error("계정 목록 로드 실패:", err);
        setInternalAccounts([]);
      } finally {
        setInternalLoading(false);
      }
    };
    loadAccounts();
  }, [externalAccounts]);

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
    // 계정 선택 시 해당 계정의 종합 대시보드로 이동
    if (accountId) {
      navigate(`/account/${accountId}/overview`);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // 네비게이션 핸들러 (기존 page 문자열을 URL로 변환)
  const handleNavigation = (page: string) => {
    // 외부 핸들러가 있으면 먼저 호출
    onNavigate?.(page);
    
    // 라우터 네비게이션
    if (page === "home") {
      navigate("/");
      return;
    }
    if (page === "accounts") {
      navigate("/accounts");
      return;
    }
    if (page === "account-add") {
      navigate("/accounts/add");
      return;
    }
    if (page === "system") {
      navigate("/system");
      return;
    }
    if (page === "table-manager") {
      navigate("/table-manager");
      return;
    }
    if (page === "playground") {
      navigate("/playground");
      return;
    }
    if (page === "settings") {
      navigate("/settings");
      return;
    }
    if (page === "data-collection-test") {
      if (selectedAccountId) {
        navigate(`/account/${selectedAccountId}/data-collection/experimental`);
      }
      return;
    }
    
    // 계정별 페이지 패턴
    const overviewMatch = page.match(/^expenditure-overview-(.+)$/);
    if (overviewMatch) {
      navigate(`/account/${overviewMatch[1]}/overview`);
      return;
    }
    
    const expenditureMatch = page.match(/^expenditure-(.+)$/);
    if (expenditureMatch) {
      navigate(`/account/${expenditureMatch[1]}/expenditure`);
      return;
    }
    
    const transactionsMatch = page.match(/^transactions-(.+)$/);
    if (transactionsMatch) {
      navigate(`/account/${transactionsMatch[1]}/transactions`);
      return;
    }
    
    const heatmapMatch = page.match(/^heatmap-(.+)$/);
    if (heatmapMatch) {
      navigate(`/account/${heatmapMatch[1]}/heatmap`);
      return;
    }
    
    
    if (page === "ledger") {
      navigate("/ledger");
      return;
    }
    
    const ledgerAccountMatch = page.match(/^ledger-account-(.+)$/);
    if (ledgerAccountMatch) {
      navigate(`/ledger/account/${ledgerAccountMatch[1]}`);
      return;
    }
    
    if (page === "ledger-new") {
      // 현재 선택된 가계부 계정이 있으면 그 계정으로, 없으면 첫 번째 계정으로
      navigate("/ledger/onboarding");
      return;
    }
    
    const dataCollectionMatch = page.match(/^data-collection-(.+)$/);
    if (dataCollectionMatch) {
      navigate(`/account/${dataCollectionMatch[1]}/data-collection`);
      return;
    }
    
    const coupangMatch = page.match(/^coupang-transactions-(.+)$/);
    if (coupangMatch) {
      navigate(`/account/${coupangMatch[1]}/coupang-transactions`);
      return;
    }
  };

  // 메뉴 아이템 스타일 (접힘 상태 고려)
  const menuItemClass = (isActive: boolean) => collapsed
    ? `
      w-10 h-10 flex items-center justify-center mx-auto rounded-md transition-all duration-150
      ${isActive 
        ? "bg-[#2d2416] text-[#fffef0] shadow-sm" 
        : "text-[#5c4d3c] hover:bg-[#2d2416]/5 hover:text-[#2d2416]"
      }
    `
    : `
      w-full flex items-center gap-2.5 px-3 py-2 mx-2 rounded-md transition-all duration-150 text-[13px]
      ${isActive 
        ? "bg-[#2d2416] text-[#fffef0] font-medium shadow-sm" 
        : "text-[#5c4d3c] hover:bg-[#2d2416]/5 hover:text-[#2d2416]"
      }
    `;

  // 섹션 헤더 스타일 (접힘 상태 고려)
  const sectionHeaderClass = collapsed
    ? `
      w-10 h-10 flex items-center justify-center mx-auto rounded-md transition-colors cursor-pointer select-none
      text-[#8b7355] hover:text-[#2d2416] hover:bg-[#2d2416]/5
    `
    : `
      w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider
      text-[#8b7355] hover:text-[#2d2416] transition-colors cursor-pointer select-none
    `;

  return (
    <div className={`${collapsed ? 'w-16' : 'w-72'} bg-[#fffef0] flex flex-col h-full border-r-[3px] border-[#2d2416]/20 font-mono transition-all duration-300 ease-in-out`}>
      {/* macOS 트래픽 라이트 영역 + 드래그 가능 타이틀바 */}
      <div 
        className="titlebar-drag-region h-12 flex items-center px-4 bg-[#f6f1e9] border-b border-[#2d2416]/10"
        data-tauri-drag-region
      >
        {/* 트래픽 라이트 공간 (macOS) - 약 70px */}
        <div className={`${collapsed ? 'w-0' : 'w-[70px]'} flex-shrink-0 transition-all duration-300`} />
        {/* 앱 타이틀 */}
        {!collapsed && (
          <span className="text-xs font-bold text-[#8b7355]/60 uppercase tracking-[0.2em] select-none">
            가계부
          </span>
        )}
      </div>

      {/* 워크스페이스 헤더 */}
      <div className="relative" ref={dropdownRef}>
        {collapsed ? (
          // 접힌 상태: 아이콘만 표시
          <Tooltip label={selectedAccount?.alias ?? "계정 선택"} show={collapsed}>
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="titlebar-no-drag w-full h-16 border-b-[3px] border-[#2d2416]/20 flex items-center justify-center hover:bg-[#f6f1e9] transition-colors bg-[#fffef0]"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#2d2416] to-[#4a3d2a] rounded-lg flex items-center justify-center shadow-sm">
                <Wallet className="w-5 h-5 text-[#c49a1a]" />
              </div>
            </button>
          </Tooltip>
        ) : (
          // 펼친 상태: 기존 UI
          <button
            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className="titlebar-no-drag w-full h-16 border-b-[3px] border-[#2d2416]/20 flex items-center px-4 hover:bg-[#f6f1e9] transition-colors bg-[#fffef0]"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-[#2d2416] to-[#4a3d2a] rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <Wallet className="w-5 h-5 text-[#c49a1a]" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                {selectedAccount ? (
                  <>
                    <div className="font-semibold text-[#2d2416] text-sm truncate">{selectedAccount.alias}</div>
                    <div className="text-[10px] text-[#8b7355] truncate uppercase tracking-wider mt-0.5">{selectedAccount.provider}</div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-[#2d2416] text-sm">계정 선택</div>
                    <div className="text-[10px] text-[#8b7355] uppercase tracking-wider mt-0.5">클릭하여 변경</div>
                  </>
                )}
              </div>
            </div>
            <div className={`p-1.5 rounded-md transition-colors ${showAccountDropdown ? "bg-[#2d2416] text-[#fffef0]" : "bg-[#2d2416]/5 hover:bg-[#2d2416]/10"}`}>
              {showAccountDropdown ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#2d2416]" />
              )}
            </div>
          </button>
        )}

        {/* 계정 드롭다운 */}
        {showAccountDropdown && (
          <div className={`absolute top-full ${collapsed ? 'left-full ml-2' : 'left-0 right-0 mx-2'} bg-[#fffef0] border border-[#2d2416]/20 rounded-lg shadow-lg mt-1 z-50 max-h-72 overflow-y-auto ${collapsed ? 'w-48' : ''}`}>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-[#c49a1a]" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="px-4 py-4 text-sm text-[#8b7355] text-center">등록된 계정 없음</div>
            ) : (
              <div className="p-1">
                {accounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSelect(account.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-md transition-all ${
                        isSelected
                          ? "bg-[#2d2416] text-[#fffef0]"
                          : "text-[#2d2416] hover:bg-[#2d2416]/5"
                      }`}
                    >
                      <div className="font-medium text-sm">{account.alias}</div>
                      <div className={`text-[10px] uppercase tracking-wider mt-0.5 ${isSelected ? "text-[#c49a1a]" : "text-[#8b7355]"}`}>{account.provider}</div>
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
        {/* ========== 계정 종속 영역 ========== */}
        {/* 지출 분석 섹션 - 계정 선택 필요, 네이버/쿠팡만 지원 */}
        {(() => {
          const isSupported = selectedAccount && (selectedAccount.provider === "naver" || selectedAccount.provider === "coupang");
          const isDisabled = !selectedAccount;
          
          return (
            <div className={`mt-2 transition-opacity duration-200 ${isDisabled ? 'opacity-50' : ''}`}>
              {collapsed ? (
                // 접힌 상태: 아이콘만
                <Tooltip label={`지출 분석${isSupported ? ` (${selectedAccount.alias})` : isDisabled ? ' - 계정 선택 필요' : ' - 미지원'}`} show={collapsed}>
                  <div 
                    className={`${sectionHeaderClass} ${isDisabled ? 'cursor-not-allowed' : ''}`}
                    onClick={() => !isDisabled && isSupported && toggleSection("expenditure")}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </div>
                </Tooltip>
              ) : (
                // 펼친 상태: 기존 UI
                <div 
                  className={`${sectionHeaderClass} ${isDisabled ? 'cursor-not-allowed' : ''}`} 
                  onClick={() => !isDisabled && isSupported && toggleSection("expenditure")}
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    지출 분석
                    {isSupported ? (
                      <span className="text-[9px] bg-[#c49a1a]/20 text-[#c49a1a] px-1.5 py-0.5 rounded font-medium">
                        {selectedAccount.alias}
                      </span>
                    ) : (
                      <span className="text-[9px] bg-[#8b7355]/20 text-[#8b7355] px-1.5 py-0.5 rounded">
                        {selectedAccount ? '미지원' : '계정 선택'}
                      </span>
                    )}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedSections.expenditure && isSupported ? "rotate-90" : ""}`} />
                </div>
              )}
              
              {isSupported && expandedSections.expenditure && (
                <div className={`py-1 ${collapsed ? 'space-y-1' : ''}`}>
                  <Tooltip label="종합 대시보드" show={collapsed}>
                    <button
                      onClick={() => handleNavigation(`expenditure-overview-${selectedAccount.id}`)}
                      className={menuItemClass(activePage === `expenditure-overview-${selectedAccount.id}`)}
                    >
                      <TrendingUp className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">종합 대시보드</span>
                          <Zap className="w-3 h-3 text-[#c49a1a]" />
                        </>
                      )}
                    </button>
                  </Tooltip>
                  <Tooltip label="월별 현황" show={collapsed}>
                    <button
                      onClick={() => handleNavigation(`expenditure-${selectedAccount.id}`)}
                      className={menuItemClass(activePage === `expenditure-${selectedAccount.id}`)}
                    >
                      <LayoutDashboard className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                      {!collapsed && <span className="flex-1 text-left">월별 현황</span>}
                    </button>
                  </Tooltip>
                  <Tooltip label="거래 목록" show={collapsed}>
                    <button
                      onClick={() => handleNavigation(`transactions-${selectedAccount.id}`)}
                      className={menuItemClass(activePage === `transactions-${selectedAccount.id}`)}
                    >
                      <Receipt className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                      {!collapsed && <span className="flex-1 text-left">거래 목록</span>}
                    </button>
                  </Tooltip>
                  <Tooltip label="거래 히트맵" show={collapsed}>
                    <button
                      onClick={() => handleNavigation(`heatmap-${selectedAccount.id}`)}
                      className={menuItemClass(activePage === `heatmap-${selectedAccount.id}`)}
                    >
                      <Grid3X3 className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                      {!collapsed && <span className="flex-1 text-left">거래 히트맵</span>}
                    </button>
                  </Tooltip>
                </div>
              )}
              
              {!collapsed && !isSupported && !isDisabled && (
                <p className="text-[10px] text-[#8b7355] px-4 py-2 italic">
                  네이버/쿠팡 계정만 지원됩니다
                </p>
              )}
              {!collapsed && isDisabled && (
                <p className="text-[10px] text-[#8b7355] px-4 py-2 italic">
                  계정을 선택하면 이용 가능합니다
                </p>
              )}
            </div>
          );
        })()}

        {/* 데이터 수집 섹션 - 계정 선택 필요 */}
        {(() => {
          const isDisabled = !selectedAccount;
          
          return (
            <div className={`mt-2 transition-opacity duration-200 ${isDisabled ? 'opacity-50' : ''}`}>
              {collapsed ? (
                // 접힌 상태: 아이콘만
                <Tooltip label={`데이터 수집${selectedAccount ? ` (${selectedAccount.alias})` : ' - 계정 선택 필요'}`} show={collapsed}>
                  <div 
                    className={`${sectionHeaderClass} ${isDisabled ? 'cursor-not-allowed' : ''}`}
                    onClick={() => !isDisabled && toggleSection("data")}
                  >
                    <FolderOpen className="w-4 h-4" />
                  </div>
                </Tooltip>
              ) : (
                // 펼친 상태: 기존 UI
                <div 
                  className={`${sectionHeaderClass} ${isDisabled ? 'cursor-not-allowed' : ''}`}
                  onClick={() => !isDisabled && toggleSection("data")}
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5" />
                    데이터 수집
                    {selectedAccount ? (
                      <span className="text-[9px] bg-[#c49a1a]/20 text-[#c49a1a] px-1.5 py-0.5 rounded font-medium">
                        {selectedAccount.alias}
                      </span>
                    ) : (
                      <span className="text-[9px] bg-[#8b7355]/20 text-[#8b7355] px-1.5 py-0.5 rounded">
                        계정 선택
                      </span>
                    )}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedSections.data && !isDisabled ? "rotate-90" : ""}`} />
                </div>
              )}
              
              {!isDisabled && expandedSections.data && (
                <div className={`py-1 ${collapsed ? 'space-y-1' : ''}`}>
                  <Tooltip label="실험용 수집기" show={collapsed}>
                    <button
                      onClick={() => handleNavigation("data-collection-test")}
                      className={menuItemClass(activePage === "data-collection-test")}
                    >
                      <Database className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                      {!collapsed && <span className="flex-1 text-left">실험용 수집기</span>}
                    </button>
                  </Tooltip>
                  {selectedAccount?.provider === "naver" && (
                    <Tooltip label="네이버 거래내역" show={collapsed}>
                      <button
                        onClick={() => handleNavigation(`data-collection-${selectedAccount.id}`)}
                        className={menuItemClass(activePage === `data-collection-${selectedAccount.id}`)}
                      >
                        <FileText className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                        {!collapsed && <span className="flex-1 text-left">네이버 거래내역</span>}
                      </button>
                    </Tooltip>
                  )}
                  {selectedAccount?.provider === "coupang" && (
                    <Tooltip label="쿠팡 거래내역" show={collapsed}>
                      <button
                        onClick={() => handleNavigation(`coupang-transactions-${selectedAccount.id}`)}
                        className={menuItemClass(activePage === `coupang-transactions-${selectedAccount.id}`)}
                      >
                        <FileText className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                        {!collapsed && <span className="flex-1 text-left">쿠팡 거래내역</span>}
                      </button>
                    </Tooltip>
                  )}
                </div>
              )}
              
              {!collapsed && isDisabled && (
                <p className="text-[10px] text-[#8b7355] px-4 py-2 italic">
                  계정을 선택하면 이용 가능합니다
                </p>
              )}
            </div>
          );
        })()}

        {/* ========== 구분선 ========== */}
        <div className={`${collapsed ? 'mx-2' : 'mx-4'} my-3 border-t border-dashed border-[#2d2416]/15`} />

        {/* ========== 독립 영역 ========== */}
        {/* 가계부 섹션 (독립 계정 시스템) */}
        <div className="mt-2">
          {collapsed ? (
            // 접힌 상태: 아이콘만
            <Tooltip label="가계부 (공통)" show={collapsed}>
              <div 
                className={sectionHeaderClass}
                onClick={() => toggleSection("ledger")}
              >
                <BookOpen className="w-4 h-4" />
              </div>
            </Tooltip>
          ) : (
            // 펼친 상태: 기존 UI
            <div className={sectionHeaderClass} onClick={() => toggleSection("ledger")}>
              <span className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                가계부
                <span className="text-[9px] bg-[#4a7c59]/15 text-[#4a7c59] px-1.5 py-0.5 rounded">
                  공통
                </span>
              </span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedSections.ledger ? "rotate-90" : ""}`} />
            </div>
          )}
          
          {expandedSections.ledger && (
            <div className={`py-1 ${collapsed ? 'space-y-1' : ''}`}>
              <Tooltip label="가계부" show={collapsed}>
                <button
                  onClick={() => handleNavigation("ledger")}
                  className={menuItemClass(activePage === "ledger" || activePage.startsWith("ledger-account-") || activePage.startsWith("ledger-new-") || activePage.startsWith("ledger-edit-") || activePage.startsWith("ledger-history-"))}
                >
                  <Receipt className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                  {!collapsed && <span className="flex-1 text-left">가계부</span>}
                </button>
              </Tooltip>
              <Tooltip label="계정 만들기" show={collapsed}>
                <button
                  onClick={() => handleNavigation("ledger-onboarding")}
                  className={menuItemClass(activePage === "ledger-onboarding")}
                >
                  <PenLine className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                  {!collapsed && <span className="flex-1 text-left">계정 만들기</span>}
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* 도구 섹션 */}
        <div className="mt-2">
          {collapsed ? (
            // 접힌 상태: 아이콘만
            <Tooltip label="도구 (공통)" show={collapsed}>
              <div 
                className={sectionHeaderClass}
                onClick={() => toggleSection("tools")}
              >
                <Wrench className="w-4 h-4" />
              </div>
            </Tooltip>
          ) : (
            // 펼친 상태: 기존 UI
            <div className={sectionHeaderClass} onClick={() => toggleSection("tools")}>
              <span className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5" />
                도구
                <span className="text-[9px] bg-[#4a7c59]/15 text-[#4a7c59] px-1.5 py-0.5 rounded">
                  공통
                </span>
              </span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedSections.tools ? "rotate-90" : ""}`} />
            </div>
          )}
          
          {expandedSections.tools && (
            <div className={`py-1 ${collapsed ? 'space-y-1' : ''}`}>
              <Tooltip label="테이블 관리" show={collapsed}>
                <button
                  onClick={() => handleNavigation("table-manager")}
                  className={menuItemClass(activePage === "table-manager")}
                >
                  <Calculator className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                  {!collapsed && <span className="flex-1 text-left">테이블 관리</span>}
                </button>
              </Tooltip>
              <Tooltip label="계정 관리" show={collapsed}>
                <button
                  onClick={() => handleNavigation("accounts")}
                  className={menuItemClass(activePage === "accounts")}
                >
                  <Users className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                  {!collapsed && <span className="flex-1 text-left">계정 관리</span>}
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {/* 하단 메뉴 */}
      <div className={`border-t border-[#2d2416]/10 bg-[#f6f1e9]/50 p-2 space-y-1`}>
        {/* 접기/펼치기 토글 버튼 */}
        <Tooltip label={collapsed ? "메뉴 펼치기" : "메뉴 접기"} show={collapsed}>
          <button
            onClick={handleToggleCollapse}
            className={`${collapsed ? 'w-10 h-10 mx-auto' : 'w-full'} flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-3 py-2'} rounded-md transition-all text-[13px] text-[#8b7355] hover:bg-[#2d2416]/5 hover:text-[#2d2416]`}
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" />
                <span>메뉴 접기</span>
              </>
            )}
          </button>
        </Tooltip>
        
        <Tooltip label="시스템 설정" show={collapsed}>
          <button
            onClick={() => handleNavigation("system")}
            className={`${collapsed ? 'w-10 h-10 mx-auto' : 'w-full'} flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-3 py-2'} rounded-md transition-all text-[13px] ${
              activePage === "system"
                ? "bg-[#2d2416] text-[#fffef0] font-medium shadow-sm"
                : "text-[#5c4d3c] hover:bg-[#2d2416]/5 hover:text-[#2d2416]"
            }`}
          >
            <Settings className="w-4 h-4" />
            {!collapsed && <span>시스템 설정</span>}
          </button>
        </Tooltip>
        {onLogout && (
          <Tooltip label="로그아웃" show={collapsed}>
            <button
              onClick={onLogout}
              className={`${collapsed ? 'w-10 h-10 mx-auto' : 'w-full'} flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-3 py-2'} rounded-md transition-all text-[13px] text-[#e76f51] hover:bg-[#e76f51]/10 hover:text-[#e76f51]`}
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && <span>로그아웃</span>}
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};
