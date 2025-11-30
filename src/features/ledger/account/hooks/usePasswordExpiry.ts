import { useEffect } from "react";
import { checkPasswordExpiry } from "../../shared";

export function usePasswordExpiry() {
  useEffect(() => {
    // 앱 시작 시 패스워드 만료 확인
    checkPasswordExpiry().catch(console.error);
    
    // 1시간마다 패스워드 만료 확인
    const interval = setInterval(() => {
      checkPasswordExpiry().catch(console.error);
    }, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
}

