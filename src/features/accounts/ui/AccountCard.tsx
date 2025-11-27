import { Trash2, Play, CheckCircle, Eye } from "lucide-react";
import type { User } from "@shared/api/types";
import { getProviderIcon, getProviderName, formatRegisteredAt } from "@shared/lib/accountUtils";

interface AccountCardProps {
  account: User;
  onDelete: (id: string) => void;
  onTest?: (account: User) => void;
  onDetail?: (account: User) => void;
}

export const AccountCard = ({ account, onDelete, onTest, onDetail }: AccountCardProps) => {
  return (
    <div className="bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] overflow-hidden hover:shadow-[6px_6px_0px_0px_rgba(31,41,55,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer group"
            onClick={() => onDetail?.(account)}
          >
            <div className="w-10 h-10 bg-[#f6f1e9] border-2 border-gray-800 flex items-center justify-center group-hover:bg-[#e9c46a]/30 transition-colors">
              <span className="text-xl" role="img" aria-label={account.provider}>
                {getProviderIcon(account.provider)}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 font-serif text-lg group-hover:text-[#2a9d8f] transition-colors">{account.alias}</h3>
              <p className="text-xs text-gray-600 uppercase tracking-wider font-mono">
                {getProviderName(account.provider)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onDetail && (
              <button
                onClick={() => onDetail(account)}
                className="w-8 h-8 flex items-center justify-center border-2 border-gray-800 bg-white hover:bg-[#e9c46a]/30 text-gray-600 hover:text-[#2a9d8f] transition-colors"
                title="상세 보기"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDelete(account.id)}
              className="w-8 h-8 flex items-center justify-center border-2 border-gray-800 bg-white hover:bg-red-50 hover:border-red-700 text-gray-600 hover:text-red-700 transition-colors"
              title="계정 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-gray-300 pt-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-mono uppercase tracking-wider text-xs">등록일</span>
            <span className="font-mono font-bold text-gray-900">{formatRegisteredAt(account.createdAt)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 font-mono uppercase tracking-wider text-xs">인증 정보</span>
            <span className="inline-flex items-center gap-1 bg-[#264653] text-white text-xs px-2 py-1 font-bold uppercase tracking-wider">
              <CheckCircle className="w-3 h-3" />
              저장됨
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#f6f1e9] px-5 py-3 border-t-2 border-gray-800 flex justify-between items-center">
        <div className="text-xs text-gray-500 truncate flex-1 mr-4 font-mono" title={account.id}>
          ID: {account.id.substring(0, 8)}...
        </div>
        {(account.provider === "naver" || account.provider === "coupang") && onTest && (
          <button
            onClick={() => onTest(account)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 text-[#fffef0] font-bold uppercase tracking-wider hover:bg-gray-700 transition-colors shadow-[2px_2px_0px_0px_rgba(31,41,55,0.4)]"
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

