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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">인증 테스트</h2>
            <p className="text-sm text-gray-500 mt-1">
              {account.alias} ({account.provider})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUpdateForm(!showUpdateForm)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              인증 정보 갱신
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Update Credentials Form */}
        {showUpdateForm && (
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새로운 cURL 명령
                </label>
                <textarea
                  value={curlInput}
                  onChange={(e) => {
                    setCurlInput(e.target.value);
                    setUpdateError(null);
                  }}
                  placeholder="curl 'https://...' -H 'Cookie: ...' ..."
                  className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={4}
                />
                {updateError && (
                  <p className="mt-1 text-xs text-red-600">{updateError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowUpdateForm(false);
                    setCurlInput(account.curl);
                    setUpdateError(null);
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleUpdateCredentials}
                  disabled={updatingCredentials || !curlInput.trim()}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
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
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-600">API 호출 중...</span>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">오류 발생</h3>
                <p className="text-sm text-red-700 font-mono">{error}</p>
              </div>
            </div>
          ) : response ? (
            <>
              {/* Response Status */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-200">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">HTTP 상태</span>
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        response.status >= 200 && response.status < 300
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {response.status}
                    </span>
                  </div>
                  {response.final_url && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">최종 URL:</span>
                      <code className="block text-xs text-gray-700 mt-1 break-all">
                        {response.final_url}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-4 border-b border-gray-200">
                <div className="flex gap-4">
                  <button
                    onClick={() => onTabChange("request")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "request"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    요청 헤더
                  </button>
                  <button
                    onClick={() => onTabChange("response")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "response"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
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
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">요청 헤더</h3>
                    {Object.keys(requestHeaders).length > 0 ? (
                      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                          {Object.entries(requestHeaders)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join("\n")}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">요청 헤더가 없습니다.</div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">응답 헤더</h3>
                    {response.response_headers && response.response_headers.length > 0 ? (
                      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                          {response.response_headers.join("\n")}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">응답 헤더가 없습니다.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Response Body */}
              <div className="px-6 pb-6 border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">응답 본문</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-words">
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
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            닫기
          </button>
          <button
            onClick={onRetry}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "테스트 중..." : "다시 테스트"}
          </button>
        </div>
      </div>
    </div>
  );
};

