import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@widgets/sidebar";
import { GlobalSearchBox } from "@widgets/search";
import type { User } from "@shared/api/types";

interface MainLayoutProps {
  accounts: User[];
  accountsLoading: boolean;
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string | null) => void;
  onLogout: () => void;
}

export const MainLayout = ({
  accounts,
  accountsLoading,
  selectedAccountId,
  onSelectAccount,
  onLogout,
}: MainLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 검색 모드 확인 (검색 쿼리가 URL에 있는 경우)
  const isSearchMode = location.pathname === "/search";
  
  // 현재 활성 페이지 결정 (Sidebar 호환용)
  const getActivePage = (): string => {
    const path = location.pathname;
    
    if (path === "/") return "home";
    if (path === "/home") return "home";
    if (path === "/accounts") return "accounts";
    if (path === "/accounts/add") return "account-add";
    if (path === "/system") return "system";
    if (path === "/table-manager") return "table-manager";
    if (path === "/playground") return "playground";
    if (path === "/settings") return "settings";
    
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

  // Sidebar 네비게이션 핸들러 (기존 page 문자열을 URL로 변환)
  const handleNavigate = (page: string) => {
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
      navigate(`/account/${selectedAccountId}/data-collection/experimental`);
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
    
    // 기본값
    navigate("/");
  };

  // 검색 핸들러
  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="app-shell bg-[#fffef0]">
      {/* 검색 모드가 아닐 때만 사이드바 표시 */}
      {!isSearchMode && (
        <Sidebar
          activePage={getActivePage()}
          selectedAccountId={selectedAccountId}
          accounts={accounts}
          accountsLoading={accountsLoading}
          onNavigate={handleNavigate}
          onSelectAccount={onSelectAccount}
          onLogout={onLogout}
        />
      )}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8f6f1]">
        {/* 메인 영역 타이틀바 드래그 영역 + 검색창 */}
        <div 
          className={`titlebar-drag-region h-12 flex-shrink-0 bg-[#f8f6f1] border-b border-[#2d2416]/5 flex items-center px-4 ${
            isSearchMode ? "justify-between" : "justify-center"
          }`}
          data-tauri-drag-region
        >
          {/* 검색 모드일 때 좌측 여백 확보 (macOS 창 버튼 영역) */}
          {isSearchMode && <div className="w-20 flex-shrink-0" />}
          <GlobalSearchBox onSearch={handleSearch} placeholder="검색..." />
          {/* 검색 모드일 때 우측 여백 (대칭을 위해) */}
          {isSearchMode && <div className="w-20 flex-shrink-0" />}
        </div>
        
        {/* 페이지 콘텐츠 */}
        <Outlet />
      </main>
    </div>
  );
};

