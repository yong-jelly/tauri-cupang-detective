import { type ReactNode, forwardRef, type HTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes } from "react";

// Table 컴포넌트
interface RetroTableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode;
}

/**
 * 레트로/브루탈리스트 스타일의 테이블 컴포넌트
 */
export const RetroTable = forwardRef<HTMLTableElement, RetroTableProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div className="border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] overflow-hidden bg-white">
        <table
          ref={ref}
          className={`w-full text-sm ${className}`}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

RetroTable.displayName = "RetroTable";

// TableHeader 컴포넌트
interface RetroTableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

export const RetroTableHeader = forwardRef<HTMLTableSectionElement, RetroTableHeaderProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={`bg-[#f6f1e9] border-b-2 border-gray-800 ${className}`}
        {...props}
      >
        {children}
      </thead>
    );
  }
);

RetroTableHeader.displayName = "RetroTableHeader";

// TableBody 컴포넌트
interface RetroTableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

export const RetroTableBody = forwardRef<HTMLTableSectionElement, RetroTableBodyProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={className}
        {...props}
      >
        {children}
      </tbody>
    );
  }
);

RetroTableBody.displayName = "RetroTableBody";

// TableRow 컴포넌트
interface RetroTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
  striped?: boolean;
  index?: number;
}

export const RetroTableRow = forwardRef<HTMLTableRowElement, RetroTableRowProps>(
  ({ children, striped = true, index = 0, className = "", ...props }, ref) => {
    const stripedClass = striped && index % 2 === 1 ? "bg-[#f6f1e9]/50" : "";
    
    return (
      <tr
        ref={ref}
        className={`
          border-b border-gray-300 last:border-b-0
          hover:bg-yellow-50/70 transition-colors
          ${stripedClass}
          ${className}
        `}
        {...props}
      >
        {children}
      </tr>
    );
  }
);

RetroTableRow.displayName = "RetroTableRow";

// TableHead 컴포넌트 (th)
interface RetroTableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
}

export const RetroTableHead = forwardRef<HTMLTableCellElement, RetroTableHeadProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={`
          px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700
          border-r border-gray-300 last:border-r-0
          ${className}
        `}
        {...props}
      >
        {children}
      </th>
    );
  }
);

RetroTableHead.displayName = "RetroTableHead";

// TableCell 컴포넌트 (td)
interface RetroTableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
}

export const RetroTableCell = forwardRef<HTMLTableCellElement, RetroTableCellProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={`
          px-4 py-3 text-sm font-mono text-gray-900
          ${className}
        `}
        {...props}
      >
        {children}
      </td>
    );
  }
);

RetroTableCell.displayName = "RetroTableCell";

// 페이지네이션 컴포넌트
interface RetroTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const RetroTablePagination = ({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: RetroTablePaginationProps) => {
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className={`flex items-center justify-center gap-2 py-4 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrev}
        className={`
          px-3 py-1.5 text-xs font-bold uppercase border-2 border-gray-800
          ${canGoPrev 
            ? "bg-white hover:bg-[#f6f1e9] cursor-pointer" 
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }
        `}
      >
        이전
      </button>
      
      <div className="px-4 py-1.5 border-2 border-gray-800 bg-[#fffef0] text-xs font-mono">
        {currentPage} / {totalPages}
      </div>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        className={`
          px-3 py-1.5 text-xs font-bold uppercase border-2 border-gray-800
          ${canGoNext 
            ? "bg-white hover:bg-[#f6f1e9] cursor-pointer" 
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }
        `}
      >
        다음
      </button>
    </div>
  );
};

RetroTablePagination.displayName = "RetroTablePagination";

// 빈 상태 컴포넌트
interface RetroTableEmptyProps {
  icon?: ReactNode;
  message?: string;
}

export const RetroTableEmpty = ({
  icon,
  message = "데이터가 없습니다",
}: RetroTableEmptyProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      {icon && <div className="mb-3">{icon}</div>}
      <p className="text-sm italic">{message}</p>
    </div>
  );
};

RetroTableEmpty.displayName = "RetroTableEmpty";

