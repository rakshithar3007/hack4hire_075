import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: keyof T | ((row: T) => string | number);
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  selectedRowId?: string | number | null;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (newPage: number) => void;
  };
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching the current filter.',
  onRowClick,
  selectedRowId,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  pagination,
  className = '',
}: DataTableProps<T>) {
  const getRowKey = (row: T, idx: number): string | number => {
    if (typeof keyField === 'function') return keyField(row);
    return row[keyField as keyof T] ?? idx;
  };

  return (
    <div className={className} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr>
              {columns.map(col => {
                const alignStyle: React.CSSProperties = col.align === 'right' ? { textAlign: 'right' } : col.align === 'center' ? { textAlign: 'center' } : { textAlign: 'left' };
                return (
                  <th
                    key={col.key}
                    style={{
                      padding: '0.625rem 0.875rem',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--surface-subtle)',
                      borderBottom: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                      cursor: col.sortable ? 'pointer' : 'default',
                      width: col.width,
                      ...alignStyle,
                    }}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      {col.header}
                      {col.sortable && sortColumn === col.key && (
                        sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`sk-${rIdx}`}>
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: '0.75rem 0.875rem' }}>
                      <Skeleton style={{ height: '14px', width: '100%', borderRadius: '4px' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const key = getRowKey(row, idx);
                const isSelected = selectedRowId !== undefined && selectedRowId !== null && selectedRowId === key;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--surface)',
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background-color 100ms ease',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-subtle)'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface)'; }}
                  >
                    {columns.map(col => {
                      const alignStyle: React.CSSProperties = col.align === 'right' ? { textAlign: 'right' } : col.align === 'center' ? { textAlign: 'center' } : { textAlign: 'left' };
                      return (
                        <td key={`${key}-${col.key}`} style={{ padding: '0.75rem 0.875rem', color: 'var(--text-primary)', verticalAlign: 'middle', ...alignStyle }}>
                          {col.render ? col.render(row, idx) : (row[col.key] ?? '—')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div style={{ padding: '0.5rem 0.875rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <span>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{data.length}</strong> of{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{pagination.totalCount}</strong>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <button type="button" disabled={pagination.currentPage <= 1 || loading}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              style={{ padding: '0.3125rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              aria-label="Previous">
              <ChevronLeft size={14} />
            </button>
            <span style={{ padding: '0 0.5rem', fontSize: '0.75rem', fontWeight: 600 }} className="tabular-nums">
              {pagination.currentPage} / {Math.max(1, pagination.totalPages)}
            </span>
            <button type="button" disabled={pagination.currentPage >= pagination.totalPages || loading}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              style={{ padding: '0.3125rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              aria-label="Next">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
