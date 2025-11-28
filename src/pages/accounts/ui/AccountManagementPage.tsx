import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, Users } from "lucide-react";
import type { User } from "@shared/api/types";
import { useAccounts } from "@features/accounts/shared/hooks/useAccounts";
import { useAccountTest } from "@features/accounts/shared/hooks/useAccountTest";
import { AccountCard } from "@features/accounts/ui/AccountCard";
import { AccountTestModal } from "@features/accounts/ui/AccountTestModal";
import { AccountDetailModal } from "@features/accounts/ui/AccountDetailModal";

interface AccountManagementPageProps {
  onAddAccount?: () => void;
  onAccountsChange?: () => void;
}

export const AccountManagementPage = ({ onAddAccount, onAccountsChange }: AccountManagementPageProps) => {
  const navigate = useNavigate();
  
  const handleAddAccount = () => {
    if (onAddAccount) {
      onAddAccount();
    } else {
      navigate("/accounts/add");
    }
  };
  const { accounts, loading, error, loadAccounts, deleteAccount, updateAccount } = useAccounts();
  const {
    testLoading,
    testResponse,
    testError,
    testRequestHeaders,
    updatingCredentials,
    runTest,
    updateCredentials,
    reset,
  } = useAccountTest();

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testAccount, setTestAccount] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"request" | "response">("request");
  
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailAccount, setDetailAccount] = useState<User | null>(null);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleDelete = async (id: string) => {
    if (window.confirm("정말로 이 계정을 삭제하시겠습니까?")) {
      const success = await deleteAccount(id);
      if (success) {
        onAccountsChange?.();
      }
    }
  };

  const handleTest = (account: User) => {
    setTestAccount(account);
    setTestModalOpen(true);
    reset();
    setActiveTab("request");
  };

  const handleTestClose = () => {
    setTestModalOpen(false);
    setTestAccount(null);
    reset();
  };

  const handleTestRetry = () => {
    if (testAccount) {
      runTest(testAccount);
    }
  };

  const handleDetail = (account: User) => {
    setDetailAccount(account);
    setDetailModalOpen(true);
  };

  const handleDetailClose = () => {
    setDetailModalOpen(false);
    setDetailAccount(null);
  };

  const handleUpdateAccount = async (id: string, alias: string) => {
    const updatedUser = await updateAccount(id, alias);
    if (updatedUser) {
      setDetailAccount(updatedUser);
      onAccountsChange?.();
    }
    return updatedUser;
  };

  useEffect(() => {
    if (testModalOpen && testAccount && !testResponse && !testError) {
      runTest(testAccount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testModalOpen, testAccount]);

  return (
    <div className="relative flex-1 h-full overflow-y-auto bg-[#fdfbf7] font-mono p-8">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto space-y-8">
        {/* 헤더 섹션 */}
        <div className="border-b-4 border-[#2d2416] pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-[#2d2416] tracking-tight mb-2 uppercase">계정 관리</h1>
            <p className="text-[#8b7355] text-lg tracking-wide">
              등록된 계정 <span className="font-bold text-[#2d2416]">{accounts.length}</span>개
            </p>
          </div>
          <button
            onClick={handleAddAccount}
            className="inline-flex items-center gap-3 px-5 py-3 bg-[#2d2416] text-[#fffef0] font-bold text-sm uppercase tracking-wider hover:bg-[#1a1610] transition-colors shadow-[4px_4px_0px_0px_rgba(196,154,26,1)]"
          >
            <Plus className="w-5 h-5" />
            계정 추가
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#c49a1a]" />
          </div>
        ) : error ? (
          <div className="text-center p-8 border-4 border-double border-[#2d2416] bg-[#fffef0]">
            <p className="text-red-700 font-bold text-lg mb-4">{error}</p>
            <div className="w-full h-px bg-[#2d2416] my-4"></div>
            <button
              onClick={loadAccounts}
              className="px-5 py-2 border-2 border-[#2d2416] bg-[#fffef0] hover:bg-[#e8dcc8] font-bold text-sm uppercase tracking-wider transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center p-12 bg-[#fffef0] border-2 border-[#2d2416] shadow-[6px_6px_0px_0px_rgba(45,36,22,1)]">
            <div className="w-16 h-16 mx-auto mb-6 bg-[#e8dcc8] border-2 border-[#2d2416] flex items-center justify-center">
              <Users className="w-8 h-8 text-[#5c4d3c]" />
            </div>
            <p className="text-[#5c4d3c] text-lg mb-6 tracking-wide">등록된 계정이 없습니다</p>
            <button
              onClick={handleAddAccount}
              className="px-6 py-3 bg-[#2d2416] text-[#fffef0] font-bold uppercase tracking-wider hover:bg-[#1a1610] transition-colors shadow-[3px_3px_0px_0px_rgba(196,154,26,1)]"
            >
              첫 번째 계정 추가하기
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onDelete={handleDelete}
                onTest={handleTest}
                onDetail={handleDetail}
              />
            ))}
          </div>
        )}
      </div>

      {/* Test Modal */}
      {testAccount && (
        <AccountTestModal
          account={testAccount}
          isOpen={testModalOpen}
          loading={testLoading}
          response={testResponse}
          error={testError}
          requestHeaders={testRequestHeaders}
          activeTab={activeTab}
          updatingCredentials={updatingCredentials}
          onClose={handleTestClose}
          onRetry={handleTestRetry}
          onUpdateCredentials={async (curl: string) => {
            await updateCredentials(testAccount, curl);
          }}
          onTabChange={setActiveTab}
        />
      )}

      {/* Detail Modal */}
      {detailAccount && (
        <AccountDetailModal
          account={detailAccount}
          isOpen={detailModalOpen}
          onClose={handleDetailClose}
          onUpdate={handleUpdateAccount}
        />
      )}
    </div>
  );
};
