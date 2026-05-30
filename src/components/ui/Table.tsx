import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './Icons';

interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  sortable?: boolean;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  pagination?: boolean;
  pageSize?: number;
  searchable?: boolean;
  sortable?: boolean;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  pagination = true,
  pageSize = 20,
  searchable = true,
  sortable = true,
}: TableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Поиск
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(query))
    );
  }, [data, searchQuery]);

  // Сортировка
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Пагинация
  const totalPages = pagination ? Math.ceil(sortedData.length / pageSize) : 1;
  const paginatedData = pagination
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Поиск */}
      {searchable && (
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="Поиск по любому полю..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-surface-200 border border-surface-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
        </div>
      )}

      {/* Таблица */}
      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full">
          <thead className="bg-surface-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider',
                    col.width && 'whitespace-nowrap',
                    sortable &&
                      col.sortable !== false &&
                      'cursor-pointer hover:bg-surface-border transition-colors'
                  )}
                  style={{ width: col.width }}
                  onClick={() => {
                    if (sortable && col.sortable !== false) handleSort(String(col.key));
                  }}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortable && col.sortable !== false && (
                      <span className="text-text-muted">
                        {sortKey === col.key ? (
                          sortDirection === 'asc' ? (
                            <Icon name="chevron-down" size={14} className="rotate-180" />
                          ) : (
                            <Icon name="chevron-down" size={14} />
                          )
                        ) : (
                          <span className="opacity-30">
                            <Icon name="chevron-down" size={14} className="rotate-180" />
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-surface-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">
                  Нет данных
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-200/50 transition-colors">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3 text-sm text-text-primary">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Показано {Math.min((currentPage - 1) * pageSize + 1, sortedData.length)} -{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} из {sortedData.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-surface-200 hover:bg-surface-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="chevron-down" size={16} className="rotate-90" />
            </button>
            <span className="text-sm text-text-primary">
              Стр. {currentPage} из {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-surface-200 hover:bg-surface-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="chevron-down" size={16} className="-rotate-90" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
