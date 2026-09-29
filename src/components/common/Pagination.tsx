import { cn } from "../../utils/cn";

const MAX_PAGE_BUTTONS = 3;

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageSize, total, itemLabel, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const firstVisiblePage = Math.max(0, Math.min(page - 1, pageCount - MAX_PAGE_BUTTONS));
  const visiblePages = Array.from({ length: Math.min(MAX_PAGE_BUTTONS, pageCount) }, (_, index) => firstVisiblePage + index);
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div className="flex flex-col gap-4 border-t border-slate-100 px-3 py-4 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Mostrando {from} a {to} de {total} {itemLabel}
      </span>
      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          <button
            aria-label="Página anterior"
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            ‹
          </button>
          {visiblePages.map((pageIndex) => (
            <button
              aria-current={pageIndex === page ? "page" : undefined}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-lg font-bold",
                pageIndex === page ? "bg-teal-500 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-teal-50"
              )}
              key={pageIndex}
              onClick={() => onPageChange(pageIndex)}
              type="button"
            >
              {pageIndex + 1}
            </button>
          ))}
          <button
            aria-label="Página siguiente"
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page >= pageCount - 1}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
