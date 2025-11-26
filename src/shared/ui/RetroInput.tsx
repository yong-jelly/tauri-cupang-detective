import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";

// Input 컴포넌트
interface RetroInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * 레트로/브루탈리스트 스타일의 입력 필드 컴포넌트
 */
export const RetroInput = forwardRef<HTMLInputElement, RetroInputProps>(
  ({ label, error, hint, className = "", ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3 py-2 text-sm font-mono
            bg-white border-2 border-gray-800
            focus:outline-none focus:ring-0 focus:border-gray-900
            placeholder:text-gray-400
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? "border-[#e76f51]" : ""}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs font-bold text-[#e76f51]">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);

RetroInput.displayName = "RetroInput";

// Textarea 컴포넌트
interface RetroTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * 레트로/브루탈리스트 스타일의 텍스트 영역 컴포넌트
 */
export const RetroTextarea = forwardRef<HTMLTextAreaElement, RetroTextareaProps>(
  ({ label, error, hint, className = "", rows = 4, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`
            w-full px-3 py-2 text-sm font-mono resize-none
            bg-white border-2 border-gray-800
            focus:outline-none focus:ring-0 focus:border-gray-900
            placeholder:text-gray-400
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? "border-[#e76f51]" : ""}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs font-bold text-[#e76f51]">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);

RetroTextarea.displayName = "RetroTextarea";

// Select 컴포넌트
interface RetroSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/**
 * 레트로/브루탈리스트 스타일의 선택 박스 컴포넌트
 */
export const RetroSelect = forwardRef<HTMLSelectElement, RetroSelectProps>(
  ({ label, error, hint, children, className = "", ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-3 py-2 text-sm font-mono
            bg-white border-2 border-gray-800
            focus:outline-none focus:ring-0 focus:border-gray-900
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? "border-[#e76f51]" : ""}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-xs font-bold text-[#e76f51]">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);

RetroSelect.displayName = "RetroSelect";

