import { type ReactNode } from "react";

interface SectionCardProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * 레트로/브루탈리스트 스타일의 섹션 카드 컴포넌트
 * 아이콘, 제목, 설명과 함께 관련 콘텐츠를 그룹화합니다.
 */
export const SectionCard = ({
  icon,
  title,
  description,
  actions,
  children,
  className = "",
}: SectionCardProps) => {
  return (
    <div
      className={`
        bg-[#fffef0] border-2 border-gray-800
        shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]
        ${className}
      `}
    >
      {/* 헤더 영역 */}
      <div className="px-5 py-4 border-b-2 border-gray-800 bg-[#f6f1e9] flex items-center justify-between">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-10 h-10 bg-[#e8dcc8] border-2 border-gray-800 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-gray-600 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {/* 콘텐츠 영역 */}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
};

SectionCard.displayName = "SectionCard";

