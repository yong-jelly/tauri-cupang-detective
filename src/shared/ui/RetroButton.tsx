import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-gray-800 text-[#fffef0] border-gray-800 hover:bg-gray-700 shadow-[3px_3px_0px_0px_rgba(196,154,26,1)]",
  secondary: "bg-white text-gray-800 border-gray-800 hover:bg-[#f6f1e9] shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]",
  danger: "bg-[#e76f51] text-white border-gray-800 hover:bg-[#e63946] shadow-[3px_3px_0px_0px_rgba(31,41,55,1)]",
  ghost: "bg-transparent text-gray-700 border-gray-800 hover:bg-[#f6f1e9]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-xs",
  lg: "px-6 py-3 text-sm",
};

/**
 * 레트로/브루탈리스트 스타일의 버튼 컴포넌트
 */
export const RetroButton = forwardRef<HTMLButtonElement, RetroButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      icon,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2
          font-bold uppercase tracking-wider
          border-2 transition-colors
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    );
  }
);

RetroButton.displayName = "RetroButton";

