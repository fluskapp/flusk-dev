import React, { useState } from 'react';
import { cn } from '../utils/cn';
import { Icon } from './Icon';
import { Badge } from './Badge';

// 📝 Table Component - Flusk Design System
// Data tables with sorting, filtering, and pagination

export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  rowKey?: string | ((record: T, index: number) => string);
  selectedRows?: string[];
  onRowSelect?: (selectedRowKeys: string[]) => void;
  onRowClick?: (record: T, index: number) => void;
  size?: 'sm' | 'md' | 'lg';
  bordered?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  sticky?: boolean;
  className?: string;
  emptyText?: string;
}

type SortDirection = 'asc' | 'desc' | null;

const tableSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const cellPaddings = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
};

export const Table = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  rowKey = 'id',
  selectedRows = [],
  onRowSelect,
  onRowClick,
  size = 'md',
  bordered = false,
  striped = false,
  hoverable = true,
  sticky = false,
  className,
  emptyText = 'No data available',
}: TableProps<T>) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record, index);
    }
    return record[rowKey] || index.toString();
  };

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable) return;

    if (sortColumn === column.key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
      if (sortDirection === 'desc') {
        setSortColumn(null);
      }
    } else {
      setSortColumn(column.key);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (!onRowSelect) return;

    const allRowKeys = data.map((record, index) => getRowKey(record, index));
    const isAllSelected = allRowKeys.every(key => selectedRows.includes(key));
    
    onRowSelect(isAllSelected ? [] : allRowKeys);
  };

  const handleRowSelect = (rowKey: string) => {
    if (!onRowSelect) return;

    const newSelectedRows = selectedRows.includes(rowKey)
      ? selectedRows.filter(key => key !== rowKey)
      : [...selectedRows, rowKey];
    
    onRowSelect(newSelectedRows);
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const column = columns.find(col => col.key === sortColumn);
      if (!column) return 0;

      const aValue = column.dataIndex ? a[column.dataIndex] : a[column.key];
      const bValue = column.dataIndex ? b[column.dataIndex] : b[column.key];

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [data, sortColumn, sortDirection, columns]);

  const renderCell = (column: TableColumn<T>, record: T, index: number) => {
    const value = column.dataIndex ? record[column.dataIndex] : record[column.key];
    
    if (column.render) {
      return column.render(value, record, index);
    }
    
    return value;
  };

  const isAllSelected = data.length > 0 && data.every((record, index) => 
    selectedRows.includes(getRowKey(record, index))
  );
  const isIndeterminate = selectedRows.length > 0 && !isAllSelected;

  return (
    <div className={cn('overflow-hidden', className)}>
      <div className={cn(
        'overflow-x-auto',
        sticky && 'max-h-[600px] overflow-y-auto'
      )}>
        <table className={cn(
          'min-w-full divide-y divide-gray-200',
          tableSizes[size],
          bordered && 'border border-gray-200'
        )}>
          {/* Header */}
          <thead className={cn(
            'bg-gray-50',
            sticky && 'sticky top-0 z-10'
          )}>
            <tr>
              {/* Selection Header */}
              {onRowSelect && (
                <th className={cn(
                  'w-12 text-left font-medium text-gray-500 uppercase tracking-wider',
                  cellPaddings[size],
                  bordered && 'border-r border-gray-200'
                )}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </th>
              )}
              
              {/* Column Headers */}
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    'text-left font-medium text-gray-500 uppercase tracking-wider',
                    cellPaddings[size],
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable && 'cursor-pointer select-none hover:bg-gray-100 transition-colors',
                    bordered && 'border-r border-gray-200'
                  )}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <Icon
                          name="chevronUp"
                          size="xs"
                          className={cn(
                            'transition-colors',
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-primary-600'
                              : 'text-gray-400'
                          )}
                        />
                        <Icon
                          name="chevronDown"
                          size="xs"
                          className={cn(
                            'transition-colors -mt-1',
                            sortColumn === column.key && sortDirection === 'desc'
                              ? 'text-primary-600'
                              : 'text-gray-400'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td 
                  colSpan={columns.length + (onRowSelect ? 1 : 0)}
                  className={cn('text-center text-gray-500', cellPaddings[size])}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Icon name="spinner" size="sm" className="animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (onRowSelect ? 1 : 0)}
                  className={cn('text-center text-gray-500', cellPaddings[size])}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              sortedData.map((record, index) => {
                const key = getRowKey(record, index);
                const isSelected = selectedRows.includes(key);
                
                return (
                  <tr
                    key={key}
                    className={cn(
                      striped && index % 2 === 1 && 'bg-gray-50',
                      hoverable && 'hover:bg-gray-50 transition-colors',
                      isSelected && 'bg-primary-50',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(record, index)}
                  >
                    {/* Selection Cell */}
                    {onRowSelect && (
                      <td className={cn(
                        cellPaddings[size],
                        bordered && 'border-r border-gray-200'
                      )}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRowSelect(key)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    
                    {/* Data Cells */}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'text-gray-900',
                          cellPaddings[size],
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          bordered && 'border-r border-gray-200'
                        )}
                      >
                        {renderCell(column, record, index)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              disabled={pagination.current === 1}
              onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={pagination.current * pagination.pageSize >= pagination.total}
              onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {Math.min((pagination.current - 1) * pagination.pageSize + 1, pagination.total)}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.current * pagination.pageSize, pagination.total)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.total}</span>{' '}
                results
              </p>
            </div>
            
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  disabled={pagination.current === 1}
                  onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="chevronLeft" size="sm" />
                </button>
                
                {/* Page Numbers */}
                {Array.from({ length: Math.ceil(pagination.total / pagination.pageSize) }, (_, i) => i + 1)
                  .filter(page => {
                    const totalPages = Math.ceil(pagination.total / pagination.pageSize);
                    if (totalPages <= 7) return true;
                    if (page <= 3 || page > totalPages - 3) return true;
                    return Math.abs(page - pagination.current) <= 1;
                  })
                  .map((page, index, visiblePages) => {
                    const prevPage = visiblePages[index - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;
                    
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                        <button
                          onClick={() => pagination.onChange(page, pagination.pageSize)}
                          className={cn(
                            'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                            page === pagination.current
                              ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          )}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
                
                <button
                  disabled={pagination.current * pagination.pageSize >= pagination.total}
                  onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="chevronRight" size="sm" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 🏷️ Status Cell - Common cell renderer for status columns
export const StatusCell: React.FC<{ 
  value: string; 
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' 
}> = ({ value, variant = 'neutral' }) => (
  <Badge variant={variant} size="sm">
    {value}
  </Badge>
);

// 💰 Currency Cell - Common cell renderer for currency values
export const CurrencyCell: React.FC<{ 
  value: number; 
  currency?: string;
  precision?: number 
}> = ({ value, currency = 'USD', precision = 2 }) => (
  <span className="font-mono">
    {new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(value)}
  </span>
);

// 📊 Progress Cell - Common cell renderer for progress values
export const ProgressCell: React.FC<{ 
  value: number; 
  max?: number;
  showPercentage?: boolean;
  color?: string;
}> = ({ value, max = 100, showPercentage = true, color = 'bg-primary-500' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div 
          className={cn('h-2 rounded-full transition-all duration-300', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-xs text-gray-500 min-w-[3ch]">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};