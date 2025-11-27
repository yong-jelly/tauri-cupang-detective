import { useState, useEffect } from "react";
import { X, Loader2, Edit3, Save, Calendar, Clock, Hash, Building2 } from "lucide-react";
import type { User } from "@shared/api/types";
import { getProviderIcon, getProviderName, formatRegisteredAt } from "@shared/lib/accountUtils";

interface AccountDetailModalProps {
  account: User;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, alias: string) => Promise<User | null>;
}

export const AccountDetailModal = ({
  account,
  isOpen,
  onClose,
  onUpdate,
}: AccountDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [alias, setAlias] = useState(account.alias);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAlias(account.alias);
    setIsEditing(false);
    setError(null);
  }, [account]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!alias.trim()) {
      setError("계정 이름을 입력해주세요.");
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      await onUpdate(account.id, alias.trim());
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setAlias(account.alias);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#fffef0] border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] max-w-lg w-full font-mono">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white border-2 border-gray-800 flex items-center justify-center">
              <span className="text-xl" role="img" aria-label={account.provider}>
                {getProviderIcon(account.provider)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-serif uppercase tracking-wide">계정 상세</h2>
              <p className="text-xs text-gray-600 uppercase tracking-wider">
                {getProviderName(account.provider)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-gray-800 bg-white hover:bg-red-50 text-gray-600 hover:text-red-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* 계정 이름 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <Edit3 className="w-3.5 h-3.5" />
                계정 이름
              </label>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-[#2a9d8f] hover:text-[#264653] font-bold uppercase tracking-wider transition-colors"
                >
                  수정
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => {
                    setAlias(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 text-sm font-mono border-2 border-gray-800 bg-white focus:ring-0 focus:border-[#2a9d8f] outline-none"
                  placeholder="계정 이름 입력"
                  autoFocus
                />
                {error && (
                  <p className="text-xs text-red-600 font-bold">{error}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 bg-white border-2 border-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#fffef0] bg-[#2a9d8f] border-2 border-[#264653] hover:bg-[#264653] disabled:bg-gray-400 disabled:border-gray-400 transition-colors shadow-[2px_2px_0px_0px_rgba(31,41,55,0.4)]"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3" />
                        저장
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-3 py-2 bg-white border-2 border-gray-300 text-gray-900 font-bold">
                {account.alias}
              </div>
            )}
          </div>

          {/* 구분선 */}
          <div className="border-t-2 border-dashed border-gray-300" />

          {/* 상세 정보 */}
          <div className="space-y-4">
            {/* Provider */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-gray-600 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" />
                서비스
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#264653] text-white text-xs font-bold uppercase tracking-wider">
                {getProviderIcon(account.provider)}
                {getProviderName(account.provider)}
              </span>
            </div>

            {/* ID */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-gray-600 uppercase tracking-wider">
                <Hash className="w-3.5 h-3.5" />
                계정 ID
              </span>
              <code className="text-xs text-gray-800 bg-gray-100 px-2 py-1 border border-gray-300 font-mono">
                {account.id.substring(0, 8)}...{account.id.substring(account.id.length - 4)}
              </code>
            </div>

            {/* 등록일 */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-gray-600 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                등록일
              </span>
              <span className="text-xs text-gray-800 font-bold">
                {formatRegisteredAt(account.createdAt)}
              </span>
            </div>

            {/* 수정일 */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-gray-600 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                최종 수정일
              </span>
              <span className="text-xs text-gray-800 font-bold">
                {formatRegisteredAt(account.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t-2 border-gray-800 bg-[#f6f1e9] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 bg-white border-2 border-gray-800 hover:bg-gray-100 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

