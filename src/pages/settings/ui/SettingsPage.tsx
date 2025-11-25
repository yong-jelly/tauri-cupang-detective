import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ProxyResponse } from "@shared/api/types";
import { parseCurlCommand } from "@shared/lib/parseCurl";

type AccountProvider = "naver" | "coupang";

type AccountRecord = {
  id: string;
  provider: AccountProvider;
  alias: string;
  curl: string;
  createdAt: string;
  lastTestStatus?: number | null;
  lastTestedAt?: string;
  lastTestResponse?: string;
  lastTestFinalUrl?: string | null;
};

type FormState = {
  provider: AccountProvider;
  alias: string;
  curl: string;
};

type FormTestState = {
  loading: boolean;
  status: number | null;
  finalUrl: string | null;
  response: string;
  error: string | null;
};

const STORAGE_KEY = "tauti.accounts";

const PROVIDER_OPTIONS: Array<{ value: AccountProvider; label: string; supported: boolean }> = [
  { value: "naver", label: "네이버", supported: true },
  { value: "coupang", label: "쿠팡", supported: false },
];

const INITIAL_FORM: FormState = {
  provider: "naver",
  alias: "",
  curl: "",
};

const INITIAL_TEST_STATE: FormTestState = {
  loading: false,
  status: null,
  finalUrl: null,
  response: "",
  error: null,
};

const isBrowser = typeof window !== "undefined";

const loadAccounts = (): AccountRecord[] => {
  if (!isBrowser) {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as AccountRecord[];
    return parsed ?? [];
  } catch {
    return [];
  }
};

const saveAccounts = (accounts: AccountRecord[]) => {
  if (!isBrowser) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
};

const formatDate = (iso?: string) => {
  if (!iso) {
    return "-";
  }
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const prettyBody = (body: string) => {
  try {
    const json = JSON.parse(body);
    return JSON.stringify(json, null, 2);
  } catch {
    return body;
  }
};

export const SettingsPage = () => {
  const [accounts, setAccounts] = useState<AccountRecord[]>(() => loadAccounts());
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [testState, setTestState] = useState<FormTestState>(INITIAL_TEST_STATE);
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null);

  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  const providerMeta = useMemo(
    () => PROVIDER_OPTIONS.find((option) => option.value === form.provider) ?? PROVIDER_OPTIONS[0],
    [form.provider],
  );

  const runCurlRequest = async (curl: string) => {
    const { url, method, headers, body } = parseCurlCommand(curl);
    if (!url) {
      throw new Error("curl 명령에서 URL을 찾을 수 없습니다.");
    }

    const result = await invoke<ProxyResponse>("proxy_request", {
      url,
      method,
      headers,
      body: body ?? null,
    });

    return {
      status: result.status ?? null,
      finalUrl: result.final_url ?? null,
      response: prettyBody(result.body),
    };
  };

  const handleTestFormCurl = async () => {
    if (!form.curl.trim()) {
      setFormError("curl 명령을 입력해주세요.");
      return;
    }
    if (!providerMeta.supported) {
      setFormError(`${providerMeta.label} 계정은 아직 지원되지 않습니다.`);
      return;
    }

    setFormError(null);
    setTestState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { status, finalUrl, response } = await runCurlRequest(form.curl);
      setTestState({
        loading: false,
        status,
        finalUrl,
        response,
        error: null,
      });
    } catch (error) {
      setTestState({
        loading: false,
        status: null,
        finalUrl: null,
        response: "",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleAddAccount = () => {
    if (!form.alias.trim()) {
      setFormError("계정 별칭을 입력해주세요.");
      return;
    }
    if (!form.curl.trim()) {
      setFormError("curl 명령을 입력해주세요.");
      return;
    }
    if (!providerMeta.supported) {
      setFormError(`${providerMeta.label} 계정은 아직 등록할 수 없습니다.`);
      return;
    }

    const newAccount: AccountRecord = {
      id: crypto.randomUUID(),
      provider: form.provider,
      alias: form.alias.trim(),
      curl: form.curl.trim(),
      createdAt: new Date().toISOString(),
    };

    setAccounts((prev) => [...prev, newAccount]);
    setForm(INITIAL_FORM);
    setTestState(INITIAL_TEST_STATE);
    setFormError(null);
  };

  const handleDeleteAccount = (accountId: string) => {
    if (!window.confirm("해당 계정을 정말 삭제할까요?")) {
      return;
    }
    setAccounts((prev) => prev.filter((account) => account.id !== accountId));
  };

  const handleTestAccount = async (accountId: string) => {
    const target = accounts.find((account) => account.id === accountId);
    if (!target) {
      return;
    }
    if (!PROVIDER_OPTIONS.find((option) => option.value === target.provider)?.supported) {
      return;
    }

    setTestingAccountId(accountId);
    try {
      const { status, finalUrl, response } = await runCurlRequest(target.curl);
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === accountId
            ? {
                ...account,
                lastTestStatus: status,
                lastTestedAt: new Date().toISOString(),
                lastTestResponse: response,
                lastTestFinalUrl: finalUrl,
              }
            : account,
        ),
      );
    } catch (error) {
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === accountId
            ? {
                ...account,
                lastTestStatus: null,
                lastTestedAt: new Date().toISOString(),
                lastTestResponse: error instanceof Error ? error.message : String(error),
                lastTestFinalUrl: null,
              }
            : account,
        ),
      );
    } finally {
      setTestingAccountId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="h-16 border-b border-gray-200 bg-white flex items-center px-6 flex-shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">설정 · 계정 관리</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <section className="bg-white border rounded-lg p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">사용법</h2>
          <p className="text-sm text-gray-600 mt-2">
            각 계정에 사용할 공식 cURL 명령을 붙여 넣으면 HTTP 테스트를 통해 응답 상태(200) 및 결과 본문을 확인할 수
            있습니다. 현재는 네이버 계정만 동작하며, 쿠팡은 준비 중입니다.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="bg-white border rounded-lg p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">등록된 계정</h2>
              <span className="text-sm text-gray-500">{accounts.length}개</span>
            </div>

            {accounts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400 border border-dashed rounded-md mt-6 py-12">
                아직 등록된 계정이 없습니다.
              </div>
            ) : (
              <ul className="mt-4 space-y-4 overflow-y-auto">
                {accounts.map((account) => {
                  const option = PROVIDER_OPTIONS.find((item) => item.value === account.provider);
                  const supported = option?.supported ?? false;
                  return (
                    <li key={account.id} className="border rounded-md p-4 bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-semibold text-gray-900">{account.alias}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                account.provider === "naver"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {option?.label ?? account.provider}
                              {!supported && " · 준비중"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">등록일 {formatDate(account.createdAt)}</div>
                          <div className="text-xs text-gray-500">
                            마지막 테스트 {account.lastTestedAt ? formatDate(account.lastTestedAt) : "미실행"}
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleTestAccount(account.id)}
                            disabled={testingAccountId === account.id || !supported}
                            className={`px-3 py-1 rounded border text-sm font-medium ${
                              supported
                                ? "border-[#1164A3] text-[#1164A3] hover:bg-[#1164A3]/10"
                                : "border-gray-300 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            {testingAccountId === account.id ? "테스트 중..." : "테스트"}
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="px-3 py-1 rounded border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            삭제
                          </button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-600 mb-1">최근 응답</div>
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              account.lastTestStatus && account.lastTestStatus >= 200 && account.lastTestStatus < 300
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            상태 {account.lastTestStatus ?? "-"}
                          </span>
                          {account.lastTestFinalUrl && (
                            <span className="text-gray-500 truncate">최종 URL: {account.lastTestFinalUrl}</span>
                          )}
                        </div>
                        <div className="border rounded bg-white mt-2 max-h-48 overflow-auto">
                          <pre className="text-xs text-gray-800 p-3 whitespace-pre-wrap break-all">
                            {account.lastTestResponse ?? "테스트를 실행하면 응답이 표시됩니다."}
                          </pre>
                        </div>
                      </div>

                      <details className="mt-3 text-xs text-gray-600">
                        <summary className="cursor-pointer select-none font-semibold">cURL 보기</summary>
                        <pre className="mt-2 whitespace-pre-wrap break-all bg-white border rounded p-2">
                          {account.curl}
                        </pre>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-white border rounded-lg p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">계정 추가</h2>
            <p className="text-sm text-gray-600 mt-1">별칭과 공식 cURL을 입력한 뒤 테스트 후 등록하세요.</p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">플랫폼</label>
                <select
                  value={form.provider}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, provider: e.target.value as AccountProvider }));
                    setTestState(INITIAL_TEST_STATE);
                    setFormError(null);
                  }}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1164A3]"
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                      {!option.supported ? " (준비중)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">계정 별칭</label>
                <input
                  type="text"
                  value={form.alias}
                  onChange={(e) => setForm((prev) => ({ ...prev, alias: e.target.value }))}
                  placeholder="예: 네이버 개인결제 계정"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1164A3]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">cURL</label>
                <textarea
                  value={form.curl}
                  onChange={(e) => setForm((prev) => ({ ...prev, curl: e.target.value }))}
                  placeholder="curl 'https://...' -H 'Authorization: ...'"
                  className="w-full min-h-[200px] border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1164A3]"
                  spellCheck={false}
                />
              </div>

              {formError && <div className="text-sm text-red-600">{formError}</div>}

              {!providerMeta.supported && (
                <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-100 px-3 py-2 rounded">
                  {providerMeta.label} 계정 연결은 준비 중입니다. 네이버 계정으로 먼저 등록해주세요.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestFormCurl}
                  disabled={testState.loading || !providerMeta.supported}
                  className={`px-4 py-2 rounded border text-sm font-semibold ${
                    providerMeta.supported
                      ? "border-[#1164A3] text-[#1164A3] hover:bg-[#1164A3]/10"
                      : "border-gray-300 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {testState.loading ? "테스트 중..." : "테스트"}
                </button>
                <button
                  type="button"
                  onClick={handleAddAccount}
                  disabled={!providerMeta.supported}
                  className={`px-4 py-2 rounded text-sm font-semibold text-white transition ${
                    providerMeta.supported
                      ? "bg-[#007a5a] hover:bg-[#148567]"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  계정 추가
                </button>
              </div>

              <div className="border rounded bg-gray-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">테스트 결과</span>
                  {testState.status !== null && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        testState.status >= 200 && testState.status < 300
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      Status {testState.status}
                    </span>
                  )}
                </div>
                {testState.finalUrl && <div className="text-xs text-gray-500">최종 URL: {testState.finalUrl}</div>}
                {testState.error ? (
                  <div className="text-sm text-red-600">에러: {testState.error}</div>
                ) : (
                  <div className="max-h-64 overflow-auto border rounded bg-white">
                    {testState.response ? (
                      <pre className="text-xs text-gray-800 p-3 whitespace-pre-wrap break-all">{testState.response}</pre>
                    ) : (
                      <div className="text-xs text-gray-400 p-3">테스트 후 응답이 표시됩니다.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

