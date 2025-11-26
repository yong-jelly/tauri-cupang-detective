import { type ReactNode, type HTMLAttributes, forwardRef } from "react";

type CardVariant = "default" | "elevated" | "outlined";

interface RetroCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  children: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-[#fffef0] border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]",
  elevated: "bg-[#fffef0] border-2 border-gray-800 shadow-[6px_6px_0px_0px_rgba(31,41,55,1)]",
  outlined: "bg-white border-2 border-gray-800",
};

const paddingStyles: Record<"none" | "sm" | "md" | "lg", string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

/**
 * 레트로/브루탈리스트 스타일의 카드 컴포넌트
 */
export const RetroCard = forwardRef<HTMLDivElement, RetroCardProps>(
  ({ variant = "default", padding = "md", children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

RetroCard.displayName = "RetroCard";

// 카드 헤더 서브컴포넌트
interface RetroCardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const RetroCardHeader = forwardRef<HTMLDivElement, RetroCardHeaderProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-5 py-3 border-b-2 border-gray-800 bg-[#f6f1e9] ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

RetroCardHeader.displayName = "RetroCardHeader";

// 카드 타이틀 서브컴포넌트
interface RetroCardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export const RetroCardTitle = forwardRef<HTMLHeadingElement, RetroCardTitleProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={`text-xs font-bold text-gray-900 uppercase tracking-wider ${className}`}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

RetroCardTitle.displayName = "RetroCardTitle";

// 카드 콘텐츠 서브컴포넌트
interface RetroCardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const RetroCardContent = forwardRef<HTMLDivElement, RetroCardContentProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`p-5 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

RetroCardContent.displayName = "RetroCardContent";

// 카드 푸터 서브컴포넌트
interface RetroCardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const RetroCardFooter = forwardRef<HTMLDivElement, RetroCardFooterProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-5 py-3 border-t-2 border-gray-800 bg-[#f6f1e9] ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

RetroCardFooter.displayName = "RetroCardFooter";

