import { useCallback, useEffect, useState } from "react";
import { HomePage } from "@pages/home";
import { PlaygroundPage } from "@pages/playground";
import { SettingsPage } from "@pages/settings";
import { SystemSettingsPage } from "@pages/system";
import { AccountOnboardingPage } from "@pages/onboarding";
import { DataCollectionPage, NaverCollectionPage } from "@pages/data-collection";
import { TableManagerPage } from "@pages/table-manager";
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
      main: "#2563eb",
    },
    background: {
      default: "#f9fafb",
      paper: "#ffffff",
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
    // 데이터 수집 페이지가 아닌 경우 계정 선택 해제
    if (!page.startsWith("data-collection-")) {
      setSelectedAccountId(null);
    }
  }, []);

  const handleSelectAccount = useCallback((accountId: string | null) => {
    setSelectedAccountId(accountId);
    if (accountId) {
      // 계정 선택 시 해당 계정의 데이터 수집 페이지로 이동
      setActivePage(`data-collection-${accountId}`);
    }
  }, []);

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

  if (dbLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-600">
          <div className="inline-flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
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
        <div className="min-h-screen flex flex-col">
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
        <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-600">
          <div className="inline-flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            계정 정보를 확인하는 중...
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // 계정이 없으면 온보딩 페이지 표시
  if (!hasUsers) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="min-h-screen flex flex-col">
          <AccountOnboardingPage onComplete={handleOnboardingComplete} />
        </div>
      </ThemeProvider>
    );
  }

  // 계정이 있으면 메인 앱 표시
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar
          activePage={activePage}
          selectedAccountId={selectedAccountId}
          onNavigate={handleNavigate}
          onSelectAccount={handleSelectAccount}
        />
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {activePage === "home" && <HomePage />}
          {activePage === "playground" && <PlaygroundPage />}
          {activePage === "settings" && <SettingsPage />}
          {activePage === "system" && <SystemSettingsPage onReady={handleDbReady} />}
          {activePage === "table-manager" && <TableManagerPage />}
          {activePage === "data-collection-test" && selectedAccount && (
            <DataCollectionPage account={selectedAccount} />
          )}
          {activePage.startsWith("data-collection-") && activePage !== "data-collection-test" && selectedAccount && (
            selectedAccount.provider === 'naver' ? (
               <NaverCollectionPage account={selectedAccount} />
            ) : (
               <DataCollectionPage account={selectedAccount} />
            )
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
