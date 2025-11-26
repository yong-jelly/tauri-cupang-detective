import { useCallback, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { User, CredentialMap } from "@shared/api/types";

/**
 * 계정 인증 정보를 DB에서 로드하여 사용하는 훅
 * 
 * **중요: 인증 정보 사용 방식의 통일**
 * 
 * 이 훅은 데이터 수집 컴포넌트에서 계정의 인증 정보(헤더, 쿠키 등)를 가져올 때 사용합니다.
 * 
 * **문제 상황:**
 * - 기존에는 `useCurlHeaders(account.curl)`을 사용하여 계정의 cURL 문자열을 파싱했습니다.
 * - 하지만 "인증 테스트" 기능에서는 DB에 저장된 credential을 직접 사용했습니다.
 * - 인증 정보를 갱신하면 DB의 credential은 업데이트되지만, `account.curl` 문자열은 즉시 반영되지 않을 수 있습니다.
 * - 이로 인해 "인증 테스트"에서는 성공하지만 "데이터 수집"에서는 실패하는 불일치가 발생했습니다.
 * 
 * **해결 방법:**
 * - 모든 데이터 수집 컴포넌트에서 이 훅을 사용하여 DB에 저장된 최신 credential을 직접 가져옵니다.
 * - `get_user_credentials` Tauri API를 통해 `tbl_credential` 테이블에서 인증 정보를 조회합니다.
 * - 인증 정보 갱신 후에도 항상 최신 정보를 사용할 수 있습니다.
 * 
 * **주의사항:**
 * 1. **항상 DB credential 사용**: `account.curl`을 파싱하는 대신 DB에서 credential을 가져와야 합니다.
 * 2. **인증 정보 갱신 후**: `update_account_credentials` API 호출 시 DB의 credential이 업데이트되므로,
 *    이 훅을 사용하는 모든 컴포넌트는 자동으로 최신 정보를 사용합니다.
 * 3. **에러 처리**: credential 로드 실패 시 빈 객체를 반환하므로, 호출하는 컴포넌트에서 적절히 처리해야 합니다.
 * 
 * **사용 예시:**
 * ```tsx
 * const { getHeaders, loading, error } = useAccountCredentials(account);
 * const headers = getHeaders(); // DB에서 가져온 최신 credential
 * ```
 * 
 * **앞으로 유사한 문제 발생 시 대처 방법:**
 * 1. 인증 관련 오류가 발생하면 먼저 "인증 테스트" 기능으로 확인합니다.
 * 2. "인증 테스트"는 성공하지만 데이터 수집이 실패한다면, 인증 정보 소스의 불일치를 의심합니다.
 * 3. `account.curl` 파싱 대신 `useAccountCredentials` 훅을 사용하는지 확인합니다.
 * 4. 모든 API 호출에서 동일한 credential 소스를 사용하는지 확인합니다.
 */
export const useAccountCredentials = (account: User | null) => {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DB에서 계정의 인증 정보를 로드합니다.
  // account가 변경되면 자동으로 다시 로드됩니다.
  const loadCredentials = useCallback(async () => {
    if (!account) {
      setCredentials({});
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Tauri API를 통해 DB의 tbl_credential 테이블에서 인증 정보 조회
      const creds = await invoke<CredentialMap>("get_user_credentials", {
        userId: account.id,
      });
      setCredentials(creds);
    } catch (err) {
      console.error("인증 정보 로드 실패:", err);
      setError(err instanceof Error ? err.message : String(err));
      setCredentials({});
    } finally {
      setLoading(false);
    }
  }, [account]);

  // account가 변경되면 자동으로 credential을 다시 로드합니다.
  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  // API 호출에 사용할 헤더를 반환합니다.
  // DB에서 가져온 최신 credential을 그대로 반환합니다.
  const getHeaders = useCallback(() => {
    return credentials;
  }, [credentials]);

  return {
    credentials,      // DB에서 가져온 인증 정보 (key-value 형태)
    getHeaders,       // API 호출에 사용할 헤더를 반환하는 함수
    loading,          // credential 로드 중 여부
    error,            // credential 로드 실패 시 에러 메시지
    reload: loadCredentials,  // 수동으로 credential을 다시 로드하는 함수
  };
};

