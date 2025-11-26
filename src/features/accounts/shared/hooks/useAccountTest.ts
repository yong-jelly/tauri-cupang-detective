import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { User, ProxyResponse, CredentialMap } from "@shared/api/types";
import { parseCurlCommand } from "@shared/lib/parseCurl";

const NAVER_TEST_URL = "https://pay.naver.com/web-api/timeline/random-stamp/status";
const COUPANG_TEST_URL = "https://mc.coupang.com/ssr/api/payment-receipt/cash/request-status";

const getTestUrl = (provider: string): string => {
  switch (provider) {
    case "naver":
      return NAVER_TEST_URL;
    case "coupang":
      return COUPANG_TEST_URL;
    default:
      throw new Error(`지원되지 않는 프로바이더입니다: ${provider}`);
  }
};

export const useAccountTest = () => {
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState<ProxyResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testRequestHeaders, setTestRequestHeaders] = useState<Record<string, string>>({});
  const [updatingCredentials, setUpdatingCredentials] = useState(false);

  const runTest = useCallback(async (account: User) => {
    setTestLoading(true);
    setTestError(null);
    setTestResponse(null);
    setTestRequestHeaders({});

    try {
      // DB에서 저장된 인증 정보 가져오기
      const credentials = await invoke<CredentialMap>("get_user_credentials", {
        userId: account.id,
      });

      setTestRequestHeaders(credentials);

      // 프로바이더별 API 테스트
      const testUrl = getTestUrl(account.provider);
      const result = await invoke<ProxyResponse>("proxy_request", {
        url: testUrl,
        method: "GET",
        headers: credentials,
        body: null,
      });

      setTestResponse(result);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
    } finally {
      setTestLoading(false);
    }
  }, []);

  const updateCredentials = useCallback(async (account: User, curl: string): Promise<boolean> => {
    if (!curl.trim()) {
      setTestError("cURL 명령을 입력해주세요.");
      return false;
    }

    setUpdatingCredentials(true);
    setTestError(null);

    try {
      // cURL 파싱
      const parsed = parseCurlCommand(curl);
      if (!parsed.url) {
        throw new Error("cURL에서 URL을 찾을 수 없습니다.");
      }

      // 인증 정보 업데이트
      await invoke("update_account_credentials", {
        userId: account.id,
        curl: curl.trim(),
        headers: parsed.headers,
      });

      // 업데이트 후 자동으로 테스트 재시도
      await runTest(account);
      return true;
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setUpdatingCredentials(false);
    }
  }, [runTest]);

  const reset = useCallback(() => {
    setTestResponse(null);
    setTestError(null);
    setTestRequestHeaders({});
  }, []);

  return {
    testLoading,
    testResponse,
    testError,
    testRequestHeaders,
    updatingCredentials,
    runTest,
    updateCredentials,
    reset,
  };
};

