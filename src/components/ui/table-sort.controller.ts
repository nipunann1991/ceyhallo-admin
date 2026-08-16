import { signal } from '@angular/core';

export type TableSortDirection = 'asc' | 'desc';

export abstract class TableSortController {
  readonly sortColumn = signal('');
  readonly sortDirection = signal<TableSortDirection>('asc');

  sortByColumn(column: string): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update(direction => direction === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  isSortedBy(column: string): boolean {
    return this.sortColumn() === column;
  }

  sortAriaValue(column: string): 'ascending' | 'descending' | 'none' {
    if (!this.isSortedBy(column)) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  protected sortTableRows<T>(rows: T[], valueFor: (row: T, column: string) => unknown): T[] {
    const column = this.sortColumn();
    if (!column) return rows;
    const multiplier = this.sortDirection() === 'asc' ? 1 : -1;

    return [...rows].sort((left, right) => {
      const a = this.normalizeSortValue(valueFor(left, column));
      const b = this.normalizeSortValue(valueFor(right, column));
      if (typeof a === 'number' && typeof b === 'number') return (a - b) * multiplier;
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
    });
  }

  private normalizeSortValue(value: unknown): string | number {
    if (value == null) return '';
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    const text = String(value);
    const timestamp = Date.parse(text);
    return /^\d{4}-\d{2}-\d{2}|T\d{2}:\d{2}/.test(text) && !Number.isNaN(timestamp) ? timestamp : text;
  }
}
