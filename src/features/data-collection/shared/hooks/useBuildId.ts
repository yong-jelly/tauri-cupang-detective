import { useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ProxyResponse } from "@shared/api/types";

type BuildIdConfig = {
  htmlUrl: string; // Build ID를 추출할 HTML 페이지 URL
  pattern: RegExp; // Build ID를 추출할 정규식 패턴
};

const BUILD_ID_CONFIGS: Record<string, BuildIdConfig> = {
  naver: {
    htmlUrl: "https://pay.naver.com/pc/history?page=1",
    pattern: /financial\.pstatic\.net\/naverpay-web\/[^\/]+\/_next\/static\/([^\/]+)\/_buildManifest\.js/,
  },
  coupang: {
    htmlUrl: "https://mc.coupang.com/ssr/desktop/order/{orderId}", // orderId는 동적으로 치환 필요
    pattern: /_next\/static\/([^\/]+)\/_buildManifest\.js/,
  },
};

export const useBuildId = (getHeaders: () => Record<string, string>) => {
  const buildIdCacheRef = useRef<Map<string, string>>(new Map());

  const resolveBuildId = useCallback(
    async (provider: string, orderId?: string): Promise<string> => {
      const cacheKey = `${provider}-${orderId || "default"}`;
      
      // 캐시 확인
      if (buildIdCacheRef.current.has(cacheKey)) {
        return buildIdCacheRef.current.get(cacheKey)!;
      }

      const config = BUILD_ID_CONFIGS[provider];
      if (!config) {
        throw new Error(`${provider}의 Build ID 설정이 없습니다.`);
      }

      // 쿠팡의 경우 orderId가 필요함
      let htmlUrl = config.htmlUrl;
      if (provider === "coupang" && orderId) {
        htmlUrl = htmlUrl.replace("{orderId}", orderId);
      } else if (provider === "coupang" && !orderId) {
        throw new Error("쿠팡 Build ID 추출에는 orderId가 필요합니다.");
      }

      // 인증 정보를 가져옵니다.
      // 주의: getHeaders()는 useAccountCredentials 훅을 통해 DB에서 가져온 최신 credential을 반환해야 합니다.
      // account.curl을 파싱하는 방식은 사용하지 않아야 합니다. (인증 정보 갱신 후 불일치 발생 가능)
      const headers = getHeaders();
      console.log(`[Build ID] ${provider} HTML 페이지 조회 시작:`, htmlUrl);
      
      // HTML 페이지를 조회하여 Build ID를 추출합니다.
      // 네이버의 경우: https://pay.naver.com/pc/history?page=1
      // 쿠팡의 경우: https://mc.coupang.com/ssr/desktop/order/{orderId}
      const htmlResult = await invoke<ProxyResponse>("proxy_request", {
        url: htmlUrl,
        method: "GET",
        headers,
        body: null,
      });

      console.log(`[Build ID] ${provider} HTML 페이지 응답 상태:`, htmlResult.status);
      console.log(`[Build ID] ${provider} 응답 본문 길이:`, htmlResult.body?.length || 0);

      if (htmlResult.status < 200 || htmlResult.status >= 300) {
        console.error(`[Build ID] ${provider} HTML 페이지 조회 실패:`, {
          status: htmlResult.status,
          body: htmlResult.body?.substring(0, 500),
        });
        throw new Error(`${provider} HTML 페이지 조회 실패: HTTP ${htmlResult.status}`);
      }

      const html = htmlResult.body;
      
      // 로그인 페이지로 리다이렉트되었는지 확인합니다.
      // 인증 정보가 만료되었거나 잘못된 경우 로그인 페이지로 리다이렉트됩니다.
      // 이 경우 "인증 테스트" 기능에서 인증 정보를 갱신해야 합니다.
      if (html.includes('네이버 : 로그인') || html.includes('<title>네이버 : 로그인</title>')) {
        console.error(`[Build ID] ${provider} 로그인 페이지로 리다이렉트됨 - 인증 정보가 만료되었거나 잘못되었습니다.`);
        throw new Error(`${provider} 인증이 만료되었습니다. 계정 관리에서 인증 정보를 갱신해주세요.`);
      }
      
      // HTML 일부 로그 (처음 1000자)
      console.log(`[Build ID] ${provider} HTML 시작 부분:`, html.substring(0, 1000));
      
      // 네이버의 경우 여러 패턴 시도
      console.log(`[Build ID] ${provider} 패턴 시도 1:`, config.pattern);
      let match = html.match(config.pattern);
      
      if (match) {
        console.log(`[Build ID] ${provider} 패턴 1 매칭 성공:`, match[1]);
      } else {
        console.log(`[Build ID] ${provider} 패턴 1 매칭 실패`);
      }
      
      // 네이버: financial.pstatic.net 패턴이 없으면 일반 _next/static 패턴도 시도
      if (provider === "naver" && !match) {
        const fallbackPattern = /_next\/static\/([^\/]+)\/_buildManifest\.js/;
        console.log(`[Build ID] ${provider} 패턴 시도 2 (fallback):`, fallbackPattern);
        match = html.match(fallbackPattern);
        
        if (match) {
          console.log(`[Build ID] ${provider} 패턴 2 매칭 성공:`, match[1]);
        } else {
          console.log(`[Build ID] ${provider} 패턴 2 매칭 실패`);
        }
      }
      
      if (!match?.[1]) {
        // 디버깅: HTML에서 _buildManifest.js가 포함된 script 태그 찾기
        const scriptMatches = html.match(/<script[^>]*src="[^"]*_buildManifest\.js[^"]*"[^>]*>/gi);
        console.error(`[Build ID] ${provider} Build ID 추출 실패 - 발견된 script 태그:`, scriptMatches);
        
        // 모든 script 태그 찾기 (디버깅용)
        const allScripts = html.match(/<script[^>]*src="[^"]*"[^>]*>/gi);
        const relevantScripts = allScripts?.filter(s => 
          s.includes('_next') || s.includes('static') || s.includes('build')
        );
        console.log(`[Build ID] ${provider} 관련 script 태그들:`, relevantScripts?.slice(0, 10));
        
        // HTML에서 _next 관련 부분 찾기
        const nextMatches = html.match(/[^"'\s]*_next[^"'\s]*/gi);
        console.log(`[Build ID] ${provider} _next 관련 문자열들:`, nextMatches?.slice(0, 20));
        
        throw new Error(`${provider} Build ID를 찾을 수 없습니다.`);
      }

      const buildId = match[1];
      buildIdCacheRef.current.set(cacheKey, buildId);
      
      return buildId;
    },
    [getHeaders],
  );

  return resolveBuildId;
};

