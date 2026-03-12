import React from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';
import { Select } from './Select';

// 📝 Pagination Component - Flusk Design System
// Navigation for paginated content

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'simple' | 'compact';
  disabled?: boolean;
  className?: string;
}

const paginationSizes = {
  sm: {
    button: 'px-2 py-1 text-xs min-w-[28px] h-7',
    icon: 'sm' as const,
    gap: 'gap-0.5',
  },
  md: {
    button: 'px-3 py-2 text-sm min-w-[36px] h-9',
    icon: 'md' as const,
    gap: 'gap-1',
  },
  lg: {
    button: 'px-4 py-2.5 text-base min-w-[44px] h-11',
    icon: 'lg' as const,
    gap: 'gap-1.5',
  },
};

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  showPageNumbers = true,
  maxPageNumbers = 7,
  size = 'md',
  variant = 'default',
  disabled = false,
  className,
}) => {
  const sizeConfig = paginationSizes[size];

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  // Generate visible page numbers
  const getVisiblePages = (): (number | string)[] => {
    if (totalPages <= maxPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfWindow = Math.floor(maxPageNumbers / 2);
    let startPage = Math.max(1, currentPage - halfWindow);
    let endPage = Math.min(totalPages, currentPage + halfWindow);

    // Adjust if we're near the start or end
    if (currentPage <= halfWindow) {
      endPage = Math.min(totalPages, maxPageNumbers);
    }
    if (currentPage >= totalPages - halfWindow) {
      startPage = Math.max(1, totalPages - maxPageNumbers + 1);
    }

    const pages: (number | string)[] = [];
    
    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    // Add visible pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageChange = (page: number) => {
    if (!disabled && page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const buttonClasses = cn(
    'inline-flex items-center justify-center rounded-md border font-medium',
    'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    sizeConfig.button,
    disabled && 'opacity-50 cursor-not-allowed'
  );

  const renderPageButton = (page: number | string, key: string | number) => {
    if (page === '...') {
      return (
        <span
          key={key}
          className={cn(
            'inline-flex items-center justify-center text-gray-500',
            sizeConfig.button
          )}
        >
          ...
        </span>
      );
    }

    const pageNumber = Number(page);
    const isActive = pageNumber === currentPage;

    return (
      <button
        key={key}
        type="button"
        onClick={() => handlePageChange(pageNumber)}
        disabled={disabled}
        className={cn(
          buttonClasses,
          isActive
            ? 'bg-primary-50 border-primary-500 text-primary-600 z-10'
            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
        )}
        aria-label={`Go to page ${pageNumber}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {pageNumber}
      </button>
    );
  };

  const renderNavButton = (
    direction: 'first' | 'prev' | 'next' | 'last',
    targetPage: number,
    disabled: boolean,
    label: string,
    icon: React.ReactNode
  ) => (
    <button
      type="button"
      onClick={() => handlePageChange(targetPage)}
      disabled={disabled}
      className={cn(
        buttonClasses,
        'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700',
        disabled && 'hover:bg-white hover:text-gray-500'
      )}
      aria-label={label}
    >
      {icon}
    </button>
  );

  if (variant === 'simple') {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        <div className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </div>
        <div className={cn('flex items-center', sizeConfig.gap)}>
          {renderNavButton(
            'prev',
            currentPage - 1,
            disabled || isFirstPage,
            'Previous page',
            <>
              <Icon name="chevronLeft" size={sizeConfig.icon} />
              <span className="ml-1">Previous</span>
            </>
          )}
          {renderNavButton(
            'next',
            currentPage + 1,
            disabled || isLastPage,
            'Next page',
            <>
              <span className="mr-1">Next</span>
              <Icon name="chevronRight" size={sizeConfig.icon} />
            </>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center', sizeConfig.gap, className)}>
        {renderNavButton(
          'prev',
          currentPage - 1,
          disabled || isFirstPage,
          'Previous page',
          <Icon name="chevronLeft" size={sizeConfig.icon} />
        )}
        <span className={cn('text-sm text-gray-700', sizeConfig.button)}>
          {currentPage} / {totalPages}
        </span>
        {renderNavButton(
          'next',
          currentPage + 1,
          disabled || isLastPage,
          'Next page',
          <Icon name="chevronRight" size={sizeConfig.icon} />
        )}
      </div>
    );
  }

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex items-center', sizeConfig.gap, className)}
    >
      {/* First page */}
      {showFirstLast && totalPages > maxPageNumbers && (
        <>
          {renderNavButton(
            'first',
            1,
            disabled || isFirstPage,
            'Go to first page',
            <Icon name="chevronLeft" size={sizeConfig.icon} className="rotate-180" />
          )}
        </>
      )}

      {/* Previous page */}
      {showPrevNext && (
        renderNavButton(
          'prev',
          currentPage - 1,
          disabled || isFirstPage,
          'Go to previous page',
          <Icon name="chevronLeft" size={sizeConfig.icon} />
        )
      )}

      {/* Page numbers */}
      {showPageNumbers && (
        <div className={cn('flex items-center', sizeConfig.gap)}>
          {getVisiblePages().map((page, index) => 
            renderPageButton(page, `page-${page}-${index}`)
          )}
        </div>
      )}

      {/* Next page */}
      {showPrevNext && (
        renderNavButton(
          'next',
          currentPage + 1,
          disabled || isLastPage,
          'Go to next page',
          <Icon name="chevronRight" size={sizeConfig.icon} />
        )
      )}

      {/* Last page */}
      {showFirstLast && totalPages > maxPageNumbers && (
        <>
          {renderNavButton(
            'last',
            totalPages,
            disabled || isLastPage,
            'Go to last page',
            <Icon name="chevronRight" size={sizeConfig.icon} className="rotate-180" />
          )}
        </>
      )}
    </nav>
  );
};

// 📊 Table Pagination - Full pagination with page size selector
export interface TablePaginationProps extends Omit<PaginationProps, 'totalPages'> {
  total: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  showTotal?: boolean;
  showPageSize?: boolean;
  totalLabel?: (total: number, start: number, end: number) => string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  total,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  showTotal = true,
  showPageSize = true,
  totalLabel,
  className,
  ...paginationProps
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  const defaultTotalLabel = (total: number, start: number, end: number) =>
    `Showing ${start} to ${end} of ${total} results`;

  const pageSizeSelectOptions = pageSizeOptions.map(size => ({
    value: size.toString(),
    label: `${size} per page`,
  }));

  return (
    <div className={cn(
      'flex items-center justify-between flex-col sm:flex-row gap-4',
      className
    )}>
      {/* Left side - Total and page size */}
      <div className="flex items-center gap-4 text-sm text-gray-700">
        {showTotal && (
          <span>
            {totalLabel ? totalLabel(total, startItem, endItem) : defaultTotalLabel(total, startItem, endItem)}
          </span>
        )}
        
        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>Show</span>
            <Select
              value={pageSize.toString()}
              options={pageSizeSelectOptions}
              onChange={(value) => onPageSizeChange(Number(value))}
              size="sm"
              className="min-w-[120px]"
            />
          </div>
        )}
      </div>

      {/* Right side - Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        {...paginationProps}
      />
    </div>
  );
};

// 🎯 Mini Pagination - Compact pagination for small spaces
export interface MiniPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export const MiniPagination: React.FC<MiniPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className,
}) => (
  <Pagination
    currentPage={currentPage}
    totalPages={totalPages}
    onPageChange={onPageChange}
    variant="compact"
    size="sm"
    showFirstLast={false}
    showPageNumbers={false}
    disabled={disabled}
    className={className}
  />
);

// ∞ Infinite Scroll Trigger - Load more button for infinite scroll
export interface LoadMoreProps {
  onLoadMore: () => void;
  loading?: boolean;
  hasMore?: boolean;
  loadingText?: string;
  loadMoreText?: string;
  noMoreText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadMore: React.FC<LoadMoreProps> = ({
  onLoadMore,
  loading = false,
  hasMore = true,
  loadingText = 'Loading...',
  loadMoreText = 'Load more',
  noMoreText = 'No more items',
  size = 'md',
  className,
}) => {
  if (!hasMore) {
    return (
      <div className={cn('text-center py-4 text-sm text-gray-500', className)}>
        {noMoreText}
      </div>
    );
  }

  return (
    <div className={cn('text-center py-4', className)}>
      <button
        type="button"
        onClick={onLoadMore}
        disabled={loading}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 border border-gray-300',
          'text-gray-700 bg-white rounded-md hover:bg-gray-50',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-200',
          size === 'sm' && 'px-3 py-1.5 text-sm',
          size === 'lg' && 'px-6 py-3 text-lg'
        )}
      >
        {loading && (
          <Icon name="spinner" size="sm" className="animate-spin" />
        )}
        {loading ? loadingText : loadMoreText}
      </button>
    </div>
  );
};