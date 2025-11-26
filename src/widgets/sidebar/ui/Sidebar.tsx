import { useEffect, useState, useRef } from "react";
import {
  ServerCog,
  Zap,
  ChevronDown,
  ChevronUp,
  Database,
  Users,
  FileText,
  Receipt,
  LayoutDashboard,
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

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Workspace Header - Clickable Account Selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowAccountDropdown(!showAccountDropdown)}
          className="w-full h-16 border-b border-gray-200 flex items-center px-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              {selectedAccount ? (
                <>
                  <div className="font-semibold text-gray-900 text-sm truncate">{selectedAccount.alias}</div>
                  <div className="text-xs text-gray-500 truncate">{selectedAccount.provider}</div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-gray-900 text-sm">Tauti</div>
                  <div className="text-xs text-gray-500">계정 선택</div>
                </>
              )}
            </div>
          </div>
          {showAccountDropdown ? (
            <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
        </button>

        {/* Account Dropdown */}
        {showAccountDropdown && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-400">계정이 없습니다</div>
            ) : (
              <div className="py-1">
                {accounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSelect(account.id)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium">{account.alias}</div>
                      <div className="text-xs opacity-70">{account.provider}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* Data Section (only for selected account) */}
        {selectedAccount && (
          <>
        <div className="px-3">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                데이터
              </div>
              <button
                onClick={() => onNavigate?.("data-collection-test")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  activePage === "data-collection-test"
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Database className={`w-5 h-5 ${activePage === "data-collection-test" ? "text-gray-900" : "text-gray-500"}`} />
                <span className="text-sm">실험용 수집기</span>
              </button>
              {selectedAccount.provider === "naver" && (
                <>
                  <button
                    onClick={() => onNavigate?.(`expenditure-${selectedAccount.id}`)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                      activePage === `expenditure-${selectedAccount.id}`
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <LayoutDashboard className={`w-5 h-5 ${activePage === `expenditure-${selectedAccount.id}` ? "text-gray-900" : "text-gray-500"}`} />
                    <span className="text-sm">지출 현황</span>
                  </button>
                  <button
                    onClick={() => onNavigate?.(`transactions-${selectedAccount.id}`)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                      activePage === `transactions-${selectedAccount.id}`
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Receipt className={`w-5 h-5 ${activePage === `transactions-${selectedAccount.id}` ? "text-gray-900" : "text-gray-500"}`} />
                    <span className="text-sm">거래 목록 조회</span>
                  </button>
                  <button
                    onClick={() => onNavigate?.(`data-collection-${selectedAccount.id}`)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                      activePage === `data-collection-${selectedAccount.id}`
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <FileText className={`w-5 h-5 ${activePage === `data-collection-${selectedAccount.id}` ? "text-gray-900" : "text-gray-500"}`} />
                    <span className="text-sm">네이버 거래 내역</span>
                  </button>
                </>
              )}
              {selectedAccount.provider === "coupang" && (
                <button
                  onClick={() => onNavigate?.(`coupang-transactions-${selectedAccount.id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                    activePage === `coupang-transactions-${selectedAccount.id}`
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <FileText className={`w-5 h-5 ${activePage === `coupang-transactions-${selectedAccount.id}` ? "text-gray-900" : "text-gray-500"}`} />
                  <span className="text-sm">쿠팡 거래 내역</span>
                </button>
              )}
            </div>

        {/* Divider */}
        <div className="my-4 px-3">
          <div className="border-t border-gray-200"></div>
        </div>
          </>
        )}

        {/* Tools Section */}
          <div className="px-3">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              도구
            </div>
            <button
              onClick={() => onNavigate?.("table-manager")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                activePage === "table-manager"
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Database className={`w-5 h-5 ${activePage === "table-manager" ? "text-gray-900" : "text-gray-500"}`} />
              <span className="text-sm">테이블 관리</span>
            </button>
            <button
            onClick={() => onNavigate?.("accounts")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
              activePage === "accounts"
                ? "bg-gray-100 text-gray-900 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Users className={`w-5 h-5 ${activePage === "accounts" ? "text-gray-900" : "text-gray-500"}`} />
            <span className="text-sm">계정 관리</span>
          </button>
        </div>
      </div>

      {/* Bottom Menu */}
      <div className="border-t border-gray-200 p-3">
            <button
          onClick={() => onNavigate?.("system")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            activePage === "system"
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
          <ServerCog className={`w-5 h-5 ${activePage === "system" ? "text-gray-900" : "text-gray-500"}`} />
          <span className="text-sm">시스템 설정</span>
            </button>
      </div>
    </div>
  );
};

