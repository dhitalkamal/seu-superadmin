import { useMemo, useState } from "react";

type PaginationResult<T> = {
  page: number;
  totalPages: number;
  paged: T[];
  total: number;
  setPage: (p: number) => void;
  next: () => void;
  prev: () => void;
  from: number;
  to: number;
};

/** Client-side pagination over an array. */
export function usePagination<T>(items: T[], pageSize = 20): PaginationResult<T> {
  const [page, setPage] = useState(1);

  return useMemo(() => {
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);
    const from = total > 0 ? start + 1 : 0;
    const to = Math.min(start + pageSize, total);

    return {
      page: safePage,
      totalPages,
      paged,
      total,
      setPage,
      next: () => setPage((p) => Math.min(p + 1, totalPages)),
      prev: () => setPage((p) => Math.max(p - 1, 1)),
      from,
      to,
    };
  }, [items, page, pageSize]);
}
