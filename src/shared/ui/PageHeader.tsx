import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * 레트로/브루탈리스트 스타일의 페이지 헤더 컴포넌트
 * 각 페이지 상단에서 제목과 액션 버튼을 표시합니다.
 */
export const PageHeader = ({
  title,
  subtitle,
  description,
  actions,
  className = "",
}: PageHeaderProps) => {
  return (
    <header
      className={`
        py-6 px-6 border-b-4 border-gray-800 bg-[#f6f1e9]
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          {subtitle && (
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">
              {subtitle}
            </p>
          )}
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight uppercase font-serif">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-gray-600">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};

PageHeader.displayName = "PageHeader";

