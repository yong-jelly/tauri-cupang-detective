import { useCallback, useEffect, useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { invoke } from "@tauri-apps/api/core";
import { Loader2 } from "lucide-react";

import { MainLayout } from "./layouts/MainLayout";
import { HomePage } from "@pages/home";
import { PlaygroundPage } from "@pages/playground";
import { SettingsPage } from "@pages/settings";
import { SystemSettingsPage } from "@pages/system";
import { AccountOnboardingPage } from "@pages/onboarding";
import {
  NaverExperimentalCollector,
  NaverTransactionCollector,
  CoupangExperimentalCollector,
  CoupangTransactionCollector,
} from "@features/data-collection";
import { AccountManagementPage } from "@pages/accounts";
import { TableManagerPage } from "@pages/table-manager";
import { TransactionListPage } from "@pages/transactions";
import { ExpenditureDashboardPage, ExpenditureOverviewPage } from "@pages/expenditure";
import { TransactionHeatmapPage } from "@pages/heatmap";
import { SearchResultsPage } from "@pages/search";

import type { DbStatus, HasUsersResponse, User, UserListResponse } from "@shared/api/types";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2d2416",
    },
    secondary: {
      main: "#c49a1a",
    },
    background: {
      default: "#fffef0",
      paper: "#f8f6f1",
    },
    text: {
      primary: "#2d2416",
      secondary: "#5c4d3c",
    },
  },
  typography: {
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
});

// 계정 ID로 계정 찾기 헬퍼 컴포넌트
interface AccountPageProps {
  accounts: User[];
  children: (account: User) => React.ReactNode;
}

const AccountPage = ({ accounts, children }: AccountPageProps) => {
  const { accountId } = useParams<{ accountId: string }>();
  const account = accounts.find((acc) => acc.id === accountId);
  
  if (!account) {
    return (
      <div className="p-6 text-sm text-gray-500">
        계정을 찾을 수 없습니다.
      </div>
    );
  }
  
  return <>{children(account)}</>;
};

// 검색 결과 페이지 래퍼
const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  
  const handleClose = () => {
    navigate(-1);
  };
  
  return <SearchResultsPage query={query} onClose={handleClose} />;
};

// 실험용 수집기 페이지
const ExperimentalCollectorPage = ({ accounts }: { accounts: User[] }) => {
  const { accountId } = useParams<{ accountId: string }>();
  const account = accounts.find((acc) => acc.id === accountId);
  
  if (!account) {
    return <div className="p-6 text-sm text-gray-500">계정을 찾을 수 없습니다.</div>;
  }
  
  if (account.provider === "naver") {
    return <NaverExperimentalCollector account={account} />;
  }
  if (account.provider === "coupang") {
    return <CoupangExperimentalCollector account={account} />;
  }
  
  return (
    <div className="p-6 text-sm text-gray-500">
      현재 계정 도메인은 실험용 수집기를 지원하지 않습니다.
    </div>
  );
};

// 네이버 거래내역 수집 페이지
const NaverCollectorPage = ({ accounts }: { accounts: User[] }) => {
  const { accountId } = useParams<{ accountId: string }>();
  const account = accounts.find((acc) => acc.id === accountId);
  
  if (!account) {
    return <div className="p-6 text-sm text-gray-500">계정을 찾을 수 없습니다.</div>;
  }
  
  if (account.provider === "naver") {
    return <NaverTransactionCollector account={account} />;
  }
  
  return (
    <div className="p-6 text-sm text-gray-500">
      선택한 계정에서는 거래 내역 수집 기능을 사용할 수 없습니다.
    </div>
  );
};

// 쿠팡 거래내역 수집 페이지
const CoupangCollectorPage = ({ accounts }: { accounts: User[] }) => {
  const { accountId } = useParams<{ accountId: string }>();
  const account = accounts.find((acc) => acc.id === accountId);
  
  if (!account) {
    return <div className="p-6 text-sm text-gray-500">계정을 찾을 수 없습니다.</div>;
  }
  
  if (account.provider === "coupang") {
    return <CoupangTransactionCollector account={account} />;
  }
  
  return (
    <div className="p-6 text-sm text-gray-500">
      선택한 계정에서는 쿠팡 거래 내역을 수집할 수 없습니다.
    </div>
  );
};

// 메인 라우터 내용
const RouterContent = () => {
  const [accounts, setAccounts] = useState<User[]>([]);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const refreshDbStatus = useCallback(async () => {
    setDbLoading(true);
    try {
      const status = await invoke<DbStatus>("get_db_status");
      setDbStatus(status);
    } finally {
      setDbLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    if (!dbStatus || !dbStatus.configured || !dbStatus.exists) {
      setAccounts([]);
      return;
    }
    try {
      const result = await invoke<UserListResponse>("list_users");
      setAccounts(result.users);
    } catch (err) {
      console.error("계정 목록 로드 실패:", err);
      setAccounts([]);
    }
  }, [dbStatus]);

  const checkHasUsers = useCallback(async () => {
    if (!dbStatus || !dbStatus.configured || !dbStatus.exists) {
      setHasUsers(null);
      return;
    }
    setUsersLoading(true);
    try {
      const result = await invoke<HasUsersResponse>("has_users");
      setHasUsers(result.hasUsers);
      if (result.hasUsers) {
        await loadAccounts();
      }
    } catch (err) {
      console.error("계정 확인 실패:", err);
      setHasUsers(false);
    } finally {
      setUsersLoading(false);
    }
  }, [dbStatus, loadAccounts]);

  useEffect(() => {
    refreshDbStatus();
  }, [refreshDbStatus]);

  useEffect(() => {
    if (dbStatus && dbStatus.configured && dbStatus.exists) {
      checkHasUsers();
    } else {
      setHasUsers(null);
    }
  }, [dbStatus, checkHasUsers]);

  // 계정이 로드되면 첫 번째 계정을 자동 선택
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const handleDbReady = useCallback(
    (status: DbStatus) => {
      setDbStatus(status);
      if (!status.exists) {
        refreshDbStatus();
      }
    },
    [refreshDbStatus],
  );

  const handleOnboardingComplete = useCallback(() => {
    checkHasUsers();
  }, [checkHasUsers]);

  const handleSelectAccount = useCallback((accountId: string | null) => {
    setSelectedAccountId(accountId);
  }, []);

  // DB 로딩 중
  if (dbLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#fffef0] text-[#5c4d3c]">
        <div className="inline-flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[#c49a1a]" />
          데이터베이스 상태를 확인하는 중...
        </div>
      </div>
    );
  }

  // DB 미설정
  if (!dbStatus || !dbStatus.configured || !dbStatus.exists) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fffef0]">
        <div className="titlebar-drag-region h-12 flex-shrink-0" data-tauri-drag-region />
        <SystemSettingsPage onReady={handleDbReady} />
      </div>
    );
  }

  // 사용자 로딩 중
  if (usersLoading || hasUsers === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#fffef0] text-[#5c4d3c]">
        <div className="inline-flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[#c49a1a]" />
          계정 정보를 확인하는 중...
        </div>
      </div>
    );
  }

  // 사용자가 없는 경우 온보딩으로 리다이렉트
  if (!hasUsers) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fffef0]">
        <div className="titlebar-drag-region h-12 flex-shrink-0" data-tauri-drag-region />
        <AccountOnboardingPage 
          showCloseButton={false}
          onComplete={handleOnboardingComplete} 
        />
      </div>
    );
  }

  return (
    <Routes>
      {/* 전체 화면 라우트 (MainLayout 외부) */}
      <Route 
        path="accounts/add" 
        element={
          <div className="min-h-screen flex flex-col bg-[#fffef0]">
            <div className="titlebar-drag-region h-12 flex-shrink-0" data-tauri-drag-region />
            <AccountOnboardingPage 
              showCloseButton={true}
              onClose={() => window.history.back()}
              onComplete={() => {
                loadAccounts();
                window.history.back();
              }} 
            />
          </div>
        } 
      />
      
      {/* 메인 레이아웃 */}
      <Route
        element={
          <MainLayout
            accounts={accounts}
            accountsLoading={usersLoading}
            selectedAccountId={selectedAccountId}
            onSelectAccount={handleSelectAccount}
          />
        }
      >
        {/* 홈 - 데이터가 있으면 첫 번째 계정의 종합 대시보드로 리다이렉트 */}
        <Route 
          index 
          element={
            selectedAccountId ? (
              <Navigate to={`/account/${selectedAccountId}/overview`} replace />
            ) : (
              <HomePage />
            )
          } 
        />
        <Route path="home" element={<HomePage />} />
        
        {/* 도구 */}
        <Route path="playground" element={<PlaygroundPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="system" element={<SystemSettingsPage />} />
        <Route path="table-manager" element={<TableManagerPage />} />
        
        {/* 계정 관리 */}
        <Route 
          path="accounts" 
          element={
            <AccountManagementPage 
              onAccountsChange={loadAccounts}
            />
          } 
        />
        
        {/* 검색 */}
        <Route path="search" element={<SearchPage />} />
        
        {/* 계정별 페이지 */}
        <Route path="account/:accountId">
          {/* 지출 분석 */}
          <Route 
            path="overview" 
            element={
              <AccountPage accounts={accounts}>
                {(account) => <ExpenditureOverviewPage account={account} />}
              </AccountPage>
            } 
          />
          <Route 
            path="expenditure" 
            element={
              <AccountPage accounts={accounts}>
                {(account) => <ExpenditureDashboardPage account={account} />}
              </AccountPage>
            } 
          />
          <Route 
            path="transactions" 
            element={
              <AccountPage accounts={accounts}>
                {(account) => <TransactionListPage account={account} />}
              </AccountPage>
            } 
          />
          <Route 
            path="heatmap" 
            element={
              <AccountPage accounts={accounts}>
                {(account) => <TransactionHeatmapPage account={account} />}
              </AccountPage>
            } 
          />
          
          {/* 데이터 수집 */}
          <Route 
            path="data-collection" 
            element={<NaverCollectorPage accounts={accounts} />} 
          />
          <Route 
            path="data-collection/experimental" 
            element={<ExperimentalCollectorPage accounts={accounts} />} 
          />
          <Route 
            path="coupang-transactions" 
            element={<CoupangCollectorPage accounts={accounts} />} 
          />
        </Route>
        
        {/* 404 - 홈으로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export const AppRouter = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <RouterContent />
      </HashRouter>
    </ThemeProvider>
  );
};

