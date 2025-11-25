import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { parseCurlCommand } from "@shared/lib/parseCurl";
import type { AccountProvider, ProxyResponse } from "@shared/api/types";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

type Step = "provider" | "alias" | "curl" | "success";

const PROVIDERS: Array<{ value: AccountProvider; label: string; icon: string; description: string }> = [
  { value: "naver", label: "네이버", icon: "🟢", description: "네이버페이 거래 내역을 가져옵니다" },
  { value: "coupang", label: "쿠팡", icon: "🟠", description: "쿠팡 주문 내역을 가져옵니다" },
];

export const AccountOnboardingPage = ({ onComplete }: { onComplete: () => void }) => {
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
      const { url, method, headers } = parseCurlCommand(curl);
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

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 overflow-hidden bg-gradient-to-br from-[#fff8f0] via-white to-[#f0f7ff]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#fff8f0] via-white to-[#f0f7ff]" />
      <div className="relative max-w-2xl w-full space-y-6">
        {step === "provider" && (
          <>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              지출 탐정 · 첫 계정 등록
            </div>
            <h2 className="text-3xl font-bold text-gray-900">어느 플랫폼부터 시작할까요?</h2>
            <p className="text-base text-gray-600 leading-relaxed">
              연결할 플랫폼을 선택해주세요. 나중에 더 추가할 수 있습니다.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 mt-8">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleProviderSelect(p.value)}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all text-left bg-white"
                >
                  <div className="text-3xl mb-2">{p.icon}</div>
                  <div className="text-lg font-semibold text-gray-900 mb-1">{p.label}</div>
                  <div className="text-sm text-gray-500">{p.description}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "alias" && (
          <>
            <div className="text-xs font-semibold uppercase text-gray-400 tracking-widest">2단계</div>
            <h2 className="text-3xl font-bold text-gray-900">계정 별칭을 입력하세요</h2>
            <p className="text-base text-gray-600">이 계정을 구분하기 위한 이름을 정해주세요.</p>
            <div className="max-w-md mx-auto space-y-4">
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="예: 네이버 개인계정"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("provider")}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  이전
                </button>
                <button
                  onClick={handleAliasNext}
                  disabled={!alias.trim()}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-[#1164A3] hover:bg-[#0f558b] disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          </>
        )}

        {step === "curl" && (
          <>
            <div className="text-xs font-semibold uppercase text-gray-400 tracking-widest">3단계</div>
            <h2 className="text-3xl font-bold text-gray-900">cURL 명령어를 입력하세요</h2>
            <p className="text-base text-gray-600">
              브라우저 개발자 도구에서 복사한 cURL 명령어를 붙여넣고 테스트해보세요.
            </p>
            <div className="max-w-3xl mx-auto space-y-4">
              <textarea
                value={curl}
                onChange={(e) => setCurl(e.target.value)}
                placeholder="curl 'https://...' -H '...'"
                className="w-full min-h-[200px] px-4 py-3 border-2 border-gray-300 rounded-xl font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
                spellCheck={false}
              />
              {testResult && (
                <div
                  className={`px-4 py-3 rounded-xl text-sm font-semibold ${
                    testResult.success
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {testResult.success
                    ? `✅ 테스트 성공 (Status: ${testResult.status})`
                    : `❌ 테스트 실패 (Status: ${testResult.status || "Error"})`}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("alias")}
                  className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                >
                  이전
                </button>
                <button
                  onClick={handleTestCurl}
                  disabled={!curl.trim() || testing || saving}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-[#1164A3] hover:bg-[#0f558b] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      테스트 중...
                    </>
                  ) : saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">계정 등록 완료!</h2>
            <p className="text-base text-gray-600">이제 지출 탐정을 시작할 수 있습니다.</p>
          </>
        )}

        {version && (
          <div className="relative mt-10 text-xs text-gray-400 tracking-widest uppercase">
            지출 탐정 · v{version}
          </div>
        )}
      </div>
    </div>
  );
};

