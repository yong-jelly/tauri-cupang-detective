import { useCallback, useEffect, useState } from "react";
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
import { Sidebar } from "@widgets/sidebar";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { invoke } from "@tauri-apps/api/core";
import type { DbStatus, HasUsersResponse, User, UserListResponse } from "@shared/api/types";
import { Loader2 } from "lucide-react";

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

function App() {
  const [activePage, setActivePage] = useState("home");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

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
      const firstAccount = accounts[0];
      setSelectedAccountId(firstAccount.id);
      setActivePage("data-collection-test");
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

  const handleNavigate = useCallback((page: string) => {
    setActivePage(page);
    // 데이터 수집 페이지가 아닌 경우에도 계정 선택 유지 (도구 메뉴는 계정 선택 유지)
    // 단, 시스템 설정이나 계정 관리 같은 경우는 계정 선택 해제하지 않음
  }, []);

  const handleSelectAccount = useCallback((accountId: string | null) => {
    setSelectedAccountId(accountId);
    if (accountId) {
      // 계정 선택 시 실험용 수집기 페이지로 이동
      setActivePage("data-collection-test");
    }
  }, []);

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

  if (dbLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="h-screen flex items-center justify-center bg-[#fffef0] text-[#5c4d3c]">
          <div className="inline-flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-[#c49a1a]" />
            데이터베이스 상태를 확인하는 중...
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!dbStatus || !dbStatus.configured || !dbStatus.exists) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="min-h-screen flex flex-col bg-[#fffef0]">
          {/* 타이틀바 드래그 영역 */}
          <div className="titlebar-drag-region h-12 flex-shrink-0" data-tauri-drag-region />
          <SystemSettingsPage onReady={handleDbReady} />
        </div>
      </ThemeProvider>
    );
  }

  // DB가 준비되었지만 계정 확인 중이거나 계정이 없는 경우
  if (usersLoading || hasUsers === null) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="h-screen flex items-center justify-center bg-[#fffef0] text-[#5c4d3c]">
          <div className="inline-flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-[#c49a1a]" />
            계정 정보를 확인하는 중...
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // 계정 추가 모드로 진입하거나 계정이 없는 경우 온보딩 페이지 표시
  if (!hasUsers || activePage === "account-add") {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="min-h-screen flex flex-col bg-[#fffef0]">
          {/* 타이틀바 드래그 영역 */}
          <div className="titlebar-drag-region h-12 flex-shrink-0" data-tauri-drag-region />
          <AccountOnboardingPage 
            showCloseButton={hasUsers === true}
            onClose={() => {
              handleNavigate("accounts");
            }}
            onComplete={() => {
              if (!hasUsers) {
                handleOnboardingComplete();
              } else {
                // 이미 사용자가 있는 경우 계정 관리 페이지로 복귀
                handleNavigate("accounts");
                // 목록 갱신을 위해 loadAccounts 호출이 필요할 수 있음
                loadAccounts(); 
              }
            }} 
          />
        </div>
      </ThemeProvider>
    );
  }

  // 계정이 있으면 메인 앱 표시
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="app-shell bg-[#fffef0]">
        <Sidebar
          activePage={activePage}
          selectedAccountId={selectedAccountId}
          onNavigate={handleNavigate}
          onSelectAccount={handleSelectAccount}
        />
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8f6f1]">
          {/* 메인 영역 타이틀바 드래그 영역 */}
          <div className="titlebar-drag-region h-12 flex-shrink-0 bg-[#f8f6f1] border-b border-[#2d2416]/5" data-tauri-drag-region />
          {activePage === "home" && <HomePage />}
          {activePage === "playground" && <PlaygroundPage />}
          {activePage === "settings" && <SettingsPage />}
          {activePage === "accounts" && (
            <AccountManagementPage onAddAccount={() => handleNavigate("account-add")} />
          )}
          {activePage === "system" && <SystemSettingsPage />}
          {activePage === "table-manager" && <TableManagerPage />}
          {activePage.startsWith("transactions-") && selectedAccount && (
            <TransactionListPage account={selectedAccount} />
          )}
          {activePage.startsWith("expenditure-overview-") && selectedAccount && (
            <ExpenditureOverviewPage account={selectedAccount} />
          )}
          {activePage.startsWith("expenditure-") && !activePage.startsWith("expenditure-overview-") && selectedAccount && (
            <ExpenditureDashboardPage account={selectedAccount} />
          )}
          {activePage === "data-collection-test" && selectedAccount && (
            selectedAccount.provider === "naver" ? (
              <NaverExperimentalCollector account={selectedAccount} />
            ) : selectedAccount.provider === "coupang" ? (
              <CoupangExperimentalCollector account={selectedAccount} />
            ) : (
              <div className="p-6 text-sm text-gray-500">현재 계정 도메인은 실험용 수집기를 지원하지 않습니다.</div>
            )
          )}
          {activePage.startsWith("data-collection-") && activePage !== "data-collection-test" && selectedAccount && (
            selectedAccount.provider === "naver" ? (
              <NaverTransactionCollector account={selectedAccount} />
            ) : (
              <div className="p-6 text-sm text-gray-500">선택한 계정에서는 거래 내역 수집 기능을 사용할 수 없습니다.</div>
            )
          )}
          {activePage.startsWith("coupang-transactions-") && selectedAccount && (
            selectedAccount.provider === "coupang" ? (
              <CoupangTransactionCollector account={selectedAccount} />
            ) : (
              <div className="p-6 text-sm text-gray-500">선택한 계정에서는 쿠팡 거래 내역을 수집할 수 없습니다.</div>
            )
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
