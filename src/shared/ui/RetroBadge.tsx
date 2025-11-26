import { type ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";
type BadgeSize = "sm" | "md";

interface RetroBadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-800 text-white border-gray-800",
  success: "bg-[#2a9d8f] text-white border-[#264653]",
  warning: "bg-[#e9c46a] text-gray-800 border-gray-800",
  danger: "bg-[#e76f51] text-white border-gray-800",
  info: "bg-[#264653] text-white border-gray-800",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-xs",
};

/**
 * 레트로/브루탈리스트 스타일의 배지 컴포넌트
 */
export const RetroBadge = ({
  variant = "default",
  size = "md",
  icon,
  children,
  className = "",
}: RetroBadgeProps) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        font-bold uppercase tracking-wider
        border-2
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {icon}
      {children}
    </span>
  );
};

RetroBadge.displayName = "RetroBadge";

