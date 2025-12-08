import { useState } from "react";
import { ChevronDown, Plus, Settings, Lock } from "lucide-react";
import { useLedgerAccounts, useLedgerAuth } from "../hooks";
import { LedgerPasswordDialog } from "./LedgerPasswordDialog";
import type { LedgerAccount } from "../../shared";

interface LedgerAccountSelectorProps {
  selectedAccountId?: string;
  onSelectAccount: (accountId: string) => void;
  onCreateAccount: () => void;
  onSettings?: (accountId: string) => void;
}

export const LedgerAccountSelector = ({
  selectedAccountId,
  onSelectAccount,
  onCreateAccount,
  onSettings,
}: LedgerAccountSelectorProps) => {
  const { data: accounts, isLoading } = useLedgerAccounts();
  const { isAccountAuthenticated, setAuthenticated } = useLedgerAuth();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordAccount, setPasswordAccount] = useState<LedgerAccount | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountId);

  const handleAccountClick = (account: LedgerAccount) => {
    if (account.passwordHash && !isAccountAuthenticated(account.id)) {
      setPasswordAccount(account);
      setShowPasswordDialog(true);
    } else {
      setAuthenticated(account.id, true);
      onSelectAccount(account.id);
      setShowDropdown(false);
    }
  };

  const handlePasswordSuccess = () => {
    if (passwordAccount) {
      setAuthenticated(passwordAccount.id, true);
      onSelectAccount(passwordAccount.id);
      setShowPasswordDialog(false);
      setPasswordAccount(null);
      setShowDropdown(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-2 border-2 border-[#d4c4a8] bg-[#fffef0] text-[#8b7355]">
        로딩 중...
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <button
        onClick={onCreateAccount}
        className="flex items-center gap-2 px-4 py-2 border-2 border-[#2d2416] bg-[#c49a1a] text-white font-bold hover:bg-[#d4aa2a] transition-colors"
      >
        <Plus className="w-4 h-4" />
        가계부 계정 만들기
      </button>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-4 py-2 border-2 border-[#2d2416] bg-[#fffef0] text-[#2d2416] font-bold hover:bg-[#f6f1e9] transition-colors"
        >
          <span>{selectedAccount?.nickname || "계정 선택"}</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-[#fffef0] border-2 border-[#2d2416] shadow-[4px_4px_0px_0px_rgba(45,36,22,1)] z-50">
            <div className="p-2 space-y-1">
              {accounts.map((account) => {
                const hasPassword = !!account.passwordHash;
                const isAuthenticated = isAccountAuthenticated(account.id);
                const isSelected = account.id === selectedAccountId;

                return (
                  <div
                    key={account.id}
                    className={`flex items-center justify-between p-2 hover:bg-[#f6f1e9] transition-colors ${
                      isSelected ? "bg-[#c49a1a]/20" : ""
                    }`}
                  >
                    <button
                      onClick={() => handleAccountClick(account)}
                      className="flex-1 text-left flex items-center gap-2"
                    >
                      {hasPassword && !isAuthenticated && (
                        <Lock className="w-3 h-3 text-[#8b7355]" />
                      )}
                      <span className="font-bold text-[#2d2416]">{account.nickname}</span>
                    </button>
                    {onSettings && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSettings(account.id);
                        }}
                        className="p-1 hover:bg-[#d4c4a8] transition-colors"
                        title="설정"
                      >
                        <Settings className="w-3 h-3 text-[#8b7355]" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-[#d4c4a8] p-2">
              <button
                onClick={() => {
                  onCreateAccount();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-[#c49a1a] text-[#8b6914] font-bold hover:bg-[#c49a1a]/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                새 계정 만들기
              </button>
            </div>
          </div>
        )}
      </div>

      {showPasswordDialog && passwordAccount && (
        <LedgerPasswordDialog
          accountId={passwordAccount.id}
          accountNickname={passwordAccount.nickname}
          onSuccess={handlePasswordSuccess}
          onCancel={() => {
            setShowPasswordDialog(false);
            setPasswordAccount(null);
          }}
        />
      )}
    </>
  );
};







