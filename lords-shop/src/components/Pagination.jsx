import React, { memo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Оптимізований компонент для пагінації
 */
const Pagination = memo(({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  isLoading = false,
}) => {
  const handlePrevious = useCallback(() => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  }, [currentPage, totalPages, onPageChange]);

  const pages = [];
  const maxVisible = 5;
  const halfVisible = Math.floor(maxVisible / 2);

  let startPage = Math.max(1, currentPage - halfVisible);
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1 || isLoading}
        className="p-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5 text-slate-400" />
      </button>

      {startPage > 1 && (
        <>
          <PageButton
            page={1}
            isActive={currentPage === 1}
            onClick={() => onPageChange(1)}
            isLoading={isLoading}
          />
          {startPage > 2 && <span className="text-slate-400">...</span>}
        </>
      )}

      {pages.map((page) => (
        <PageButton
          key={page}
          page={page}
          isActive={currentPage === page}
          onClick={() => onPageChange(page)}
          isLoading={isLoading}
        />
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="text-slate-400">...</span>}
          <PageButton
            page={totalPages}
            isActive={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            isLoading={isLoading}
          />
        </>
      )}

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages || isLoading}
        className="p-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </button>
    </div>
  );
});

const PageButton = memo(({ page, isActive, onClick, isLoading }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className={`w-8 h-8 rounded-lg font-semibold transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
    } disabled:opacity-50`}
  >
    {page}
  </button>
));

PageButton.displayName = 'PageButton';

Pagination.displayName = 'Pagination';

export default Pagination;
