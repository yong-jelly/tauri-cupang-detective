import { Trash2, Play } from "lucide-react";
import type { User } from "@shared/api/types";
import { getProviderIcon, getProviderName, formatRegisteredAt } from "@shared/lib/accountUtils";

interface AccountCardProps {
  account: User;
  onDelete: (id: string) => void;
  onTest?: (account: User) => void;
}

export const AccountCard = ({ account, onDelete, onTest }: AccountCardProps) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
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
            onClick={() => onDelete(account.id)}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="계정 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span className="text-gray-500">등록일</span>
            <span className="font-mono">{formatRegisteredAt(account.createdAt)}</span>
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
        {(account.provider === "naver" || account.provider === "coupang") && onTest && (
          <button
            onClick={() => onTest(account)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors font-medium"
            title="인증 테스트"
          >
            <Play className="w-3 h-3" />
            테스트
          </button>
        )}
      </div>
    </div>
  );
};

