import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { User, UserListResponse } from "@shared/api/types";
import { Plus, Loader2, Trash2, ExternalLink } from "lucide-react";

interface AccountManagementPageProps {
  onAddAccount: () => void;
}

export const AccountManagementPage = ({ onAddAccount }: AccountManagementPageProps) => {
  const [accounts, setAccounts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<UserListResponse>("list_users");
      setAccounts(result.users);
    } catch (err) {
      console.error("계정 목록 로드 실패:", err);
      setError("계정 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("정말로 이 계정을 삭제하시겠습니까?")) return;

    try {
      await invoke("delete_user", { id });
      await loadAccounts();
    } catch (err) {
      console.error("계정 삭제 실패:", err);
      alert("계정 삭제에 실패했습니다.");
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "naver":
        return "🟢";
      case "coupang":
        return "🟠";
      default:
        return "⚪";
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case "naver":
        return "네이버";
      case "coupang":
        return "쿠팡";
      default:
        return provider;
    }
  };

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
              <div
                key={account.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" role="img" aria-label={account.provider}>
                        {getProviderIcon(account.provider)}
                      </span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{account.alias}</h3>
                        <p className="text-xs text-gray-500">{getProviderName(account.provider)}</p>
                      </div>
                    </div>
                    <button
                        onClick={() => handleDelete(account.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="계정 삭제"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-500">등록일</span>
                      <span className="font-mono">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">인증 정보</span>
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            저장됨
                        </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-between items-center">
                    <div className="text-xs text-gray-500 truncate flex-1 mr-4 font-mono" title={account.id}>
                        ID: {account.id}
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

