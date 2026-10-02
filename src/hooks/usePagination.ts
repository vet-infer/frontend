import { useState } from "react";

/**
 * Paginación en cliente. Vuelve a la primera página cuando cambia `resetKey`
 * (por ejemplo, los filtros aplicados).
 */
export function usePagination<T>(items: T[], pageSize: number, resetKey = "") {
  const [page, setPage] = useState(0);
  const [lastResetKey, setLastResetKey] = useState(resetKey);

  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);

  return {
    page: currentPage,
    setPage,
    pageItems: items.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
  };
}
