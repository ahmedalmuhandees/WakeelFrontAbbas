import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  className = ''
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const safeCurrentPage = Math.max(1, Math.min(currentPage || 1, totalPages || 1));
  const computedHasPrev = safeCurrentPage > 1;
  const computedHasNext = safeCurrentPage < totalPages;

  const safeOnPageChange = (page: number) => {
    const next = Math.max(1, Math.min(page, totalPages || 1));
    onPageChange(next);
  };

  // أرقام الصفحات بشكل مبسّط: 1 + last + (current حولها) + ellipsis عند وجود فجوات
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 1) return [1];

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);

    // نافذة حول الصفحة الحالية (مرنة وسهلة)
    for (let d = -2; d <= 2; d++) {
      const p = safeCurrentPage + d;
      if (p >= 1 && p <= totalPages) pages.add(p);
    }

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result: (number | '...')[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const prev = sorted[i - 1];
      if (prev != null && p - prev > 1) result.push('...');
      result.push(p);
    }
    return result;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between px-3 sm:px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 space-y-3 sm:space-y-0 ${className}`}>
      {/* Items info */}
      <div className="flex items-center text-xs sm:text-sm text-gray-700 dark:text-gray-300">
        <span>
          عرض {startItem} إلى {endItem} من {totalItems} عنصر
        </span>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-1 rtl:space-x-reverse">
        {/* First page */}
        <button
          type="button"
          onClick={() => safeOnPageChange(1)}
          disabled={!(hasPreviousPage ?? computedHasPrev)}
          className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>

        {/* Previous page */}
        <button
          type="button"
          onClick={() => safeOnPageChange(safeCurrentPage - 1)}
          disabled={!(hasPreviousPage ?? computedHasPrev)}
          className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                ...
              </span>
            );
          }

          const p = page;
          return (
            <button
              key={p}
              type="button"
              onClick={() => safeOnPageChange(p)}
              aria-current={safeCurrentPage === p ? 'page' : undefined}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md ${
                safeCurrentPage === p
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          );
        })}

        {/* Next page */}
        <button
          type="button"
          onClick={() => safeOnPageChange(safeCurrentPage + 1)}
          disabled={!(hasNextPage ?? computedHasNext)}
          className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>

        {/* Last page */}
        <button
          type="button"
          onClick={() => safeOnPageChange(totalPages)}
          disabled={!(hasNextPage ?? computedHasNext)}
          className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
