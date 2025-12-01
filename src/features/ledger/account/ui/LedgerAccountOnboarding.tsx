import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Lock, User } from "lucide-react";
import { RetroButton, RetroInput } from "@shared/ui";
import { useCreateLedgerAccount } from "../hooks";

interface LedgerAccountOnboardingProps {
  onComplete?: (accountId: string) => void;
}

export const LedgerAccountOnboarding = ({
  onComplete,
}: LedgerAccountOnboardingProps) => {
  const navigate = useNavigate();
  const createAccount = useCreateLedgerAccount();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    if (usePassword) {
      if (!password || password.length < 4) {
        setError("패스워드는 최소 4자 이상이어야 합니다.");
        return;
      }
      if (password !== confirmPassword) {
        setError("패스워드가 일치하지 않습니다.");
        return;
      }
    }

    try {
      const account = await createAccount.mutateAsync({
        nickname: nickname.trim(),
        password: usePassword ? password : undefined,
      });
      if (onComplete) {
        onComplete(account.id);
      } else {
        navigate(`/ledger/account/${account.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "계정 생성에 실패했습니다.");
    }
  };

  return (
    <div className="flex-1 h-full overflow-hidden bg-[#fdfbf7] font-mono flex flex-col">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />

      <div className="relative flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="bg-[#fffef0] border-2 border-[#2d2416] shadow-[6px_6px_0px_0px_rgba(45,36,22,1)] p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#c49a1a] rounded-full mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black text-[#2d2416] tracking-tight uppercase mb-2">
                가계부 계정 만들기
              </h1>
              <p className="text-[#5c4d3c]">
                가계부를 시작하기 위해 계정을 만들어주세요
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-[#5c4d3c] mb-2 uppercase tracking-wider">
                  <User className="w-4 h-4" />
                  닉네임 *
                </label>
                <RetroInput
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="예: 내 가계부, 가족 가계부..."
                  className="w-full"
                  autoFocus
                />
              </div>

              <div className="border-t border-[#d4c4a8] pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="usePassword"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="w-4 h-4 border-2 border-[#2d2416]"
                  />
                  <label
                    htmlFor="usePassword"
                    className="flex items-center gap-2 text-sm font-bold text-[#5c4d3c] cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    패스워드 설정 (선택)
                  </label>
                </div>

                {usePassword && (
                  <div className="space-y-4 pl-7">
                    <div>
                      <label className="block text-sm font-bold text-[#5c4d3c] mb-2">
                        패스워드
                      </label>
                      <div className="relative">
                        <RetroInput
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="최소 4자 이상"
                          className="w-full pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b7355] hover:text-[#2d2416]"
                        >
                          {showPassword ? "숨기기" : "보기"}
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
                        placeholder="패스워드를 다시 입력하세요"
                        className="w-full"
                      />
                    </div>

                    <div className="p-3 bg-[#f6f1e9] border border-[#d4c4a8] text-xs text-[#8b7355]">
                      💡 패스워드는 1개월마다 자동으로 초기화됩니다. 패스워드를 잊어버려도
                      데이터는 안전하게 보관됩니다.
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <RetroButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(-1)}
                  disabled={createAccount.isPending}
                  className="flex-1"
                >
                  취소
                </RetroButton>
                <RetroButton
                  type="submit"
                  variant="primary"
                  loading={createAccount.isPending}
                  className="flex-1"
                >
                  계정 만들기
                </RetroButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};



