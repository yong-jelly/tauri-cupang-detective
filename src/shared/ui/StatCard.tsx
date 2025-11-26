import { type ReactNode } from "react";

type StatCardVariant = "default" | "success" | "danger" | "info";

interface StatCardProps {
  label: string;
  value: string | number;
  variant?: StatCardVariant;
  icon?: ReactNode;
  suffix?: string;
  description?: string;
  className?: string;
}

const variantStyles: Record<StatCardVariant, string> = {
  default: "text-gray-900",
  success: "text-[#2a9d8f]",
  danger: "text-[#e76f51]",
  info: "text-[#264653]",
};

/**
 * 레트로/브루탈리스트 스타일의 통계 카드 컴포넌트
 * 대시보드에서 주요 지표를 표시하는 데 사용됩니다.
 */
export const StatCard = ({
  label,
  value,
  variant = "default",
  icon,
  suffix,
  description,
  className = "",
}: StatCardProps) => {
  return (
    <div
      className={`
        bg-[#fffef0] p-4 border-2 border-gray-800
        shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-600 uppercase tracking-wider font-bold">
          {label}
        </div>
        {icon && (
          <div className="text-gray-500">
            {icon}
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold font-mono mt-1 ${variantStyles[variant]}`}>
        {value}
        {suffix && <span className="text-sm ml-1">{suffix}</span>}
      </div>
      {description && (
        <div className="text-xs text-gray-500 mt-1 border-t border-dashed border-gray-400 pt-2">
          {description}
        </div>
      )}
    </div>
  );
};

StatCard.displayName = "StatCard";

