import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { parseCurlCommand } from "@shared/lib/parseCurl";
import type { AccountProvider, ProxyResponse } from "@shared/api/types";
import { CheckCircle2, Loader2, Sparkles, X, ChevronLeft } from "lucide-react";

type Step = "provider" | "alias" | "curl" | "success";

const PROVIDERS: Array<{ value: AccountProvider; label: string; icon: string; description: string }> = [
  { value: "naver", label: "네이버", icon: "🟢", description: "네이버페이 거래 내역을 가져옵니다" },
  { value: "coupang", label: "쿠팡", icon: "🟠", description: "쿠팡 주문 내역을 가져옵니다" },
];

interface AccountOnboardingPageProps {
  onComplete: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
}

export const AccountOnboardingPage = ({ onComplete, showCloseButton = false, onClose }: AccountOnboardingPageProps) => {
  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<AccountProvider | null>(null);
  const [alias, setAlias] = useState("");
  const [curl, setCurl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: number; success: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  useState(() => {
    getVersion().then(setVersion).catch(() => setVersion(null));
  });

  const handleProviderSelect = (selected: AccountProvider) => {
    setProvider(selected);
    setStep("alias");
  };

  const handleAliasNext = () => {
    if (alias.trim()) {
      setStep("curl");
    }
  };

  const handleTestCurl = useCallback(async () => {
    if (!curl.trim()) {
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { url, method, headers } = parseCurlCommand(curl);
      if (!url) {
        throw new Error("cURL에서 URL을 찾을 수 없습니다.");
      }
      const result = await invoke<ProxyResponse>("proxy_request", {
        url,
        method,
        headers,
        body: null,
      });
      const success = result.status >= 200 && result.status < 300;
      setTestResult({ status: result.status, success });
      if (success) {
        // 테스트 성공 시 자동으로 저장
        await handleSave();
      }
    } catch (err) {
      setTestResult({ status: 0, success: false });
    } finally {
      setTesting(false);
    }
  }, [curl]);

  const handleSave = useCallback(async () => {
    if (!provider || !alias.trim() || !curl.trim()) {
      return;
    }
    setSaving(true);
    try {
      const { url, headers } = parseCurlCommand(curl);
      if (!url) {
        throw new Error("cURL 파싱 실패");
      }
      await invoke("save_account", {
        provider,
        alias: alias.trim(),
        curl: curl.trim(),
        headers,
      });
      setStep("success");
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [provider, alias, curl, onComplete]);

  // 단계 번호
  const stepNumber = step === "provider" ? 1 : step === "alias" ? 2 : step === "curl" ? 3 : 4;

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 overflow-hidden bg-[#fdfbf7] font-mono">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(#e8dcc8_1px,transparent_1px),linear-gradient(90deg,#e8dcc8_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />
      
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 border-2 border-[#2d2416] bg-[#fffef0] text-[#2d2416] hover:bg-[#e8dcc8] transition-colors z-10"
          title="닫기"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      
      <div className="relative max-w-2xl w-full space-y-8">
        {step === "provider" && (
          <>
            <div className="inline-flex items-center gap-2 text-sm font-bold uppercase text-[#2d2416] bg-[#e8dcc8] border-2 border-[#2d2416] px-4 py-2 shadow-[3px_3px_0px_0px_rgba(196,154,26,1)]">
              <Sparkles className="w-4 h-4 text-[#c49a1a]" />
              지출 탐정 · 계정 등록
            </div>
            <h2 className="text-4xl font-black text-[#2d2416] tracking-tight uppercase">어느 플랫폼부터 시작할까요?</h2>
            <p className="text-lg text-[#5c4d3c] tracking-wide">
              연결할 플랫폼을 선택해주세요. 나중에 더 추가할 수 있습니다.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 mt-8">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleProviderSelect(p.value)}
                  className="p-6 border-2 border-[#2d2416] bg-[#fffef0] hover:bg-[#e8dcc8] hover:shadow-[6px_6px_0px_0px_rgba(45,36,22,1)] transition-all text-left shadow-[4px_4px_0px_0px_rgba(45,36,22,1)]"
                >
                  <div className="text-4xl mb-3">{p.icon}</div>
                  <div className="text-xl font-black text-[#2d2416] mb-2 uppercase tracking-wide">{p.label}</div>
                  <div className="text-sm text-[#5c4d3c] tracking-wide">{p.description}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "alias" && (
          <>
            <div className="text-sm font-black uppercase text-[#8b7355] tracking-[0.3em] border-b-2 border-dashed border-[#d4c4a8] pb-2">
              {stepNumber}단계 / 3단계
            </div>
            <h2 className="text-4xl font-black text-[#2d2416] tracking-tight uppercase">계정 별칭 입력</h2>
            <p className="text-lg text-[#5c4d3c] tracking-wide">이 계정을 구분하기 위한 이름을 정해주세요.</p>
            <div className="max-w-md mx-auto space-y-6">
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="예: 네이버 개인계정"
                className="w-full px-5 py-4 border-2 border-[#2d2416] bg-[#fffef0] text-lg font-bold text-[#2d2416] placeholder-[#8b7355] focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(196,154,26,1)]"
                autoFocus
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setStep("provider")}
                  className="flex items-center gap-2 px-5 py-3 border-2 border-[#2d2416] bg-[#fffef0] text-[#2d2416] font-bold uppercase tracking-wider hover:bg-[#e8dcc8] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </button>
                <button
                  onClick={handleAliasNext}
                  disabled={!alias.trim()}
                  className="flex-1 px-5 py-3 bg-[#2d2416] text-[#fffef0] font-bold uppercase tracking-wider hover:bg-[#1a1610] disabled:bg-[#d4c4a8] disabled:text-[#8b7355] disabled:cursor-not-allowed transition-colors shadow-[4px_4px_0px_0px_rgba(196,154,26,1)] disabled:shadow-none"
                >
                  다음
                </button>
              </div>
            </div>
          </>
        )}

        {step === "curl" && (
          <>
            <div className="text-sm font-black uppercase text-[#8b7355] tracking-[0.3em] border-b-2 border-dashed border-[#d4c4a8] pb-2">
              {stepNumber}단계 / 3단계
            </div>
            <h2 className="text-4xl font-black text-[#2d2416] tracking-tight uppercase">cURL 명령어 입력</h2>
            <p className="text-lg text-[#5c4d3c] tracking-wide">
              브라우저 개발자 도구에서 복사한 cURL 명령어를 붙여넣고 테스트해보세요.
            </p>
            <div className="max-w-3xl mx-auto space-y-6">
              <textarea
                value={curl}
                onChange={(e) => setCurl(e.target.value)}
                placeholder="curl 'https://...' -H '...'"
                className="w-full min-h-[200px] px-5 py-4 border-2 border-[#2d2416] bg-[#fffef0] font-mono text-sm text-[#2d2416] placeholder-[#8b7355] focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(196,154,26,1)] resize-none"
                spellCheck={false}
              />
              {testResult && (
                <div
                  className={`px-5 py-4 border-2 font-bold text-sm ${
                    testResult.success
                      ? "border-green-700 bg-green-50 text-green-800"
                      : "border-red-700 bg-red-50 text-red-800"
                  }`}
                >
                  {testResult.success
                    ? `✅ 테스트 성공 (STATUS: ${testResult.status})`
                    : `❌ 테스트 실패 (STATUS: ${testResult.status || "ERROR"})`}
                </div>
              )}
              <div className="flex gap-4">
                <button
                  onClick={() => setStep("alias")}
                  className="flex items-center gap-2 px-5 py-3 border-2 border-[#2d2416] bg-[#fffef0] text-[#2d2416] font-bold uppercase tracking-wider hover:bg-[#e8dcc8] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </button>
                <button
                  onClick={handleTestCurl}
                  disabled={!curl.trim() || testing || saving}
                  className="flex-1 px-5 py-3 bg-[#2d2416] text-[#fffef0] font-bold uppercase tracking-wider hover:bg-[#1a1610] disabled:bg-[#d4c4a8] disabled:text-[#8b7355] disabled:cursor-not-allowed transition-colors shadow-[4px_4px_0px_0px_rgba(196,154,26,1)] disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      테스트 중...
                    </>
                  ) : saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    "테스트 및 저장"
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <div className="inline-flex items-center justify-center w-24 h-24 border-4 border-[#2d2416] bg-[#e8dcc8] text-[#2d2416] mb-6 shadow-[6px_6px_0px_0px_rgba(196,154,26,1)]">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-black text-[#2d2416] tracking-tight uppercase">계정 등록 완료!</h2>
            <p className="text-lg text-[#5c4d3c] tracking-wide">이제 지출 탐정을 시작할 수 있습니다.</p>
          </>
        )}

        {version && (
          <div className="relative mt-12 text-sm text-[#8b7355] tracking-[0.2em] uppercase border-t-2 border-dashed border-[#d4c4a8] pt-4">
            지출 탐정 · v{version}
          </div>
        )}
      </div>
    </div>
  );
};
