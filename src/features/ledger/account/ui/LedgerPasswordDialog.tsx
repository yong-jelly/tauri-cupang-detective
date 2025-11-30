import { useState } from "react";
import { X, Lock, Eye, EyeOff } from "lucide-react";
import { RetroButton, RetroInput } from "@shared/ui";
import { useLedgerAuth } from "../hooks";

interface LedgerPasswordDialogProps {
  accountId: string;
  accountNickname: string;
  onSuccess: () => void;
  onCancel: () => void;
  onChangePassword?: boolean;
}

export const LedgerPasswordDialog = ({
  accountId,
  accountNickname,
  onSuccess,
  onCancel,
  onChangePassword = false,
}: LedgerPasswordDialogProps) => {
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { verifyPassword, updatePassword } = useLedgerAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (onChangePassword) {
      if (!newPassword || newPassword.length < 4) {
        setError("새 패스워드는 최소 4자 이상이어야 합니다.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("새 패스워드가 일치하지 않습니다.");
        return;
      }
      setLoading(true);
      try {
        await updatePassword(accountId, newPassword);
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "패스워드 변경에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    } else {
      if (!password) {
        setError("패스워드를 입력해주세요.");
        return;
      }
      setLoading(true);
      try {
        const isValid = await verifyPassword(accountId, password);
        if (isValid) {
          onSuccess();
        } else {
          setError("패스워드가 올바르지 않습니다.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "인증에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#fffef0] border-2 border-[#2d2416] shadow-[6px_6px_0px_0px_rgba(45,36,22,1)] max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#2d2416]" />
            <h2 className="text-lg font-bold text-[#2d2416]">
              {onChangePassword ? "패스워드 변경" : "패스워드 입력"}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-[#e8dcc8] transition-colors"
            title="닫기"
          >
            <X className="w-5 h-5 text-[#8b7355]" />
          </button>
        </div>

        <p className="text-sm text-[#5c4d3c] mb-4">
          {onChangePassword
            ? `${accountNickname} 계정의 패스워드를 변경합니다.`
            : `${accountNickname} 계정에 접근하려면 패스워드가 필요합니다.`}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!onChangePassword && (
            <div>
              <label className="block text-sm font-bold text-[#5c4d3c] mb-2">
                패스워드
              </label>
              <div className="relative">
                <RetroInput
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="패스워드를 입력하세요"
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b7355] hover:text-[#2d2416]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {onChangePassword && (
            <>
              <div>
                <label className="block text-sm font-bold text-[#5c4d3c] mb-2">
                  새 패스워드
                </label>
                <div className="relative">
                  <RetroInput
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 패스워드를 입력하세요"
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b7355] hover:text-[#2d2416]"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#5c4d3c] mb-2">
                  패스워드 확인
                </label>
                <RetroInput
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 패스워드를 다시 입력하세요"
                />
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <RetroButton
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              취소
            </RetroButton>
            <RetroButton
              type="submit"
              variant="primary"
              loading={loading}
              className="flex-1"
            >
              {onChangePassword ? "변경하기" : "확인"}
            </RetroButton>
          </div>
        </form>

        {!onChangePassword && (
          <p className="mt-4 text-xs text-[#8b7355] text-center">
            💡 패스워드는 1개월마다 자동으로 초기화됩니다.
          </p>
        )}
      </div>
    </div>
  );
};

