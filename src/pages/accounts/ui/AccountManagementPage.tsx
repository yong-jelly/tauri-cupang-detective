import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import type { User } from "@shared/api/types";
import { useAccounts } from "@features/accounts/shared/hooks/useAccounts";
import { useAccountTest } from "@features/accounts/shared/hooks/useAccountTest";
import { AccountCard } from "@features/accounts/ui/AccountCard";
import { AccountTestModal } from "@features/accounts/ui/AccountTestModal";

interface AccountManagementPageProps {
  onAddAccount: () => void;
}

export const AccountManagementPage = ({ onAddAccount }: AccountManagementPageProps) => {
  const { accounts, loading, error, loadAccounts, deleteAccount } = useAccounts();
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

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleDelete = async (id: string) => {
    if (window.confirm("정말로 이 계정을 삭제하시겠습니까?")) {
    await deleteAccount(id);
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

  useEffect(() => {
    if (testModalOpen && testAccount && !testResponse && !testError) {
      runTest(testAccount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testModalOpen, testAccount]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">계정 관리</h1>
        <button
          onClick={onAddAccount}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          계정 추가
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadAccounts}
              className="text-blue-600 hover:underline"
            >
              다시 시도
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-gray-500 mb-4">등록된 계정이 없습니다.</p>
            <button
              onClick={onAddAccount}
              className="text-blue-600 font-medium hover:underline"
            >
              첫 번째 계정을 추가해보세요
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
    </div>
  );
};

