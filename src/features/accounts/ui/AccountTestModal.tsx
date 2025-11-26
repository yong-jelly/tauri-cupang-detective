import { useState } from "react";
import { X, Loader2, RefreshCw } from "lucide-react";
import type { User, ProxyResponse } from "@shared/api/types";

interface AccountTestModalProps {
  account: User;
  isOpen: boolean;
  loading: boolean;
  response: ProxyResponse | null;
  error: string | null;
  requestHeaders: Record<string, string>;
  activeTab: "request" | "response";
  updatingCredentials: boolean;
  onClose: () => void;
  onRetry: () => void;
  onUpdateCredentials: (curl: string) => Promise<void>;
  onTabChange: (tab: "request" | "response") => void;
}

export const AccountTestModal = ({
  account,
  isOpen,
  loading,
  response,
  error,
  requestHeaders,
  activeTab,
  updatingCredentials,
  onClose,
  onRetry,
  onUpdateCredentials,
  onTabChange,
}: AccountTestModalProps) => {
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [curlInput, setCurlInput] = useState(account.curl);
  const [updateError, setUpdateError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateCredentials = async () => {
    setUpdateError(null);
    try {
      await onUpdateCredentials(curlInput);
      setShowUpdateForm(false);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#fffef0] border-2 border-gray-800 shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] max-w-4xl w-full max-h-[90vh] flex flex-col font-mono">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-serif uppercase tracking-wide">인증 테스트</h2>
            <p className="text-sm text-gray-600 mt-1 tracking-wider">
              {account.alias} ({account.provider})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUpdateForm(!showUpdateForm)}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-800 bg-[#e9c46a] border-2 border-gray-800 hover:bg-[#f4a261] transition-colors shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]"
            >
              <RefreshCw className="w-4 h-4" />
              인증 정보 갱신
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center border-2 border-gray-800 bg-white hover:bg-red-50 text-gray-600 hover:text-red-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Update Credentials Form */}
        {showUpdateForm && (
          <div className="px-6 py-4 border-b-2 border-gray-800 bg-[#e9c46a]/20">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">
                  새로운 cURL 명령
                </label>
                <textarea
                  value={curlInput}
                  onChange={(e) => {
                    setCurlInput(e.target.value);
                    setUpdateError(null);
                  }}
                  placeholder="curl 'https://...' -H 'Cookie: ...' ..."
                  className="w-full px-3 py-2 text-sm font-mono border-2 border-gray-800 bg-white focus:ring-0 focus:border-gray-900 resize-none"
                  rows={4}
                />
                {updateError && (
                  <p className="mt-2 text-xs text-red-700 font-bold">{updateError}</p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowUpdateForm(false);
                    setCurlInput(account.curl);
                    setUpdateError(null);
                  }}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 bg-white border-2 border-gray-800 hover:bg-gray-100 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleUpdateCredentials}
                  disabled={updatingCredentials || !curlInput.trim()}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#fffef0] bg-gray-800 border-2 border-gray-800 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.4)]"
                >
                  {updatingCredentials ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      갱신 중...
                    </>
                  ) : (
                    "갱신 및 테스트"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
              <span className="text-gray-600 font-bold uppercase tracking-wider text-sm">API 호출 중...</span>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-[#e76f51]/10 border-2 border-[#e76f51] p-4">
                <h3 className="text-sm font-bold text-[#e76f51] mb-2 uppercase tracking-wider">오류 발생</h3>
                <p className="text-sm text-gray-800 font-mono">{error}</p>
              </div>
            </div>
          ) : response ? (
            <>
              {/* Response Status */}
              <div className="px-6 pt-6 pb-4 border-b-2 border-dashed border-gray-300">
                <div className="bg-[#f6f1e9] border-2 border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">HTTP 상태</span>
                    <span
                      className={`px-3 py-1 text-sm font-bold border-2 ${
                        response.status >= 200 && response.status < 300
                          ? "bg-[#2a9d8f] text-white border-[#264653]"
                          : "bg-[#e76f51] text-white border-[#e76f51]"
                      }`}
                    >
                      {response.status}
                    </span>
                  </div>
                  {response.final_url && (
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-400">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">최종 URL:</span>
                      <code className="block text-xs text-gray-800 mt-1 break-all bg-white/50 p-2 border border-gray-300">
                        {response.final_url}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-4 border-b-2 border-gray-800 bg-[#f6f1e9]">
                <div className="flex">
                  <button
                    onClick={() => onTabChange("request")}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-b-0 transition-colors ${
                      activeTab === "request"
                        ? "bg-[#fffef0] text-gray-900 border-gray-800 -mb-0.5"
                        : "bg-transparent text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                  >
                    요청 헤더
                  </button>
                  <button
                    onClick={() => onTabChange("response")}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-2 border-b-0 transition-colors ${
                      activeTab === "response"
                        ? "bg-[#fffef0] text-gray-900 border-gray-800 -mb-0.5"
                        : "bg-transparent text-gray-500 border-transparent hover:text-gray-700"
                    }`}
                  >
                    응답 헤더
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === "request" ? (
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">요청 헤더</h3>
                    {Object.keys(requestHeaders).length > 0 ? (
                      <div className="bg-white border-2 border-gray-800 p-4 max-h-96 overflow-y-auto shadow-[3px_3px_0px_0px_rgba(31,41,55,0.3)]">
                        <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                          {Object.entries(requestHeaders)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join("\n")}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">요청 헤더가 없습니다.</div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">응답 헤더</h3>
                    {response.response_headers && response.response_headers.length > 0 ? (
                      <div className="bg-white border-2 border-gray-800 p-4 max-h-96 overflow-y-auto shadow-[3px_3px_0px_0px_rgba(31,41,55,0.3)]">
                        <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                          {response.response_headers.join("\n")}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">응답 헤더가 없습니다.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Response Body */}
              <div className="px-6 pb-6 border-t-2 border-gray-800 pt-4 bg-[#f6f1e9]">
                <h3 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">응답 본문</h3>
                <div className="bg-white border-2 border-gray-800 p-4 max-h-64 overflow-y-auto shadow-[3px_3px_0px_0px_rgba(31,41,55,0.3)]">
                  <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-words">
                    {(() => {
                      try {
                        const parsed = JSON.parse(response.body);
                        return JSON.stringify(parsed, null, 2);
                      } catch {
                        return response.body;
                      }
                    })()}
                  </pre>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t-2 border-gray-800 bg-[#f6f1e9] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 bg-white border-2 border-gray-800 hover:bg-gray-100 transition-colors"
          >
            닫기
          </button>
          <button
            onClick={onRetry}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#fffef0] bg-gray-800 border-2 border-gray-800 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_0px_0px_rgba(31,41,55,0.4)]"
          >
            {loading ? "테스트 중..." : "다시 테스트"}
          </button>
        </div>
      </div>
    </div>
  );
};

