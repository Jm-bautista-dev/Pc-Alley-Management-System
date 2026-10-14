import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * Modern, centered, responsive sliding-window Pagination component.
 *
 * Props:
 * - currentPage: number (1-based)
 * - totalPages: number
 * - onPageChange: (page: number) => void
 * - totalItems?: number
 * - itemsPerPage?: number
 * - onItemsPerPageChange?: (limit: number) => void
 * - itemsPerPageOptions?: number[]
 * - itemLabel?: string (e.g. "items", "entries", "records", "products")
 * - showFirstLast?: boolean
 * - showSummary?: boolean
 * - className?: string
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100],
  itemLabel = "items",
  showFirstLast = true,
  showSummary = true,
  className = ""
}) {
  if (!totalPages || totalPages <= 0) return null;

  // Calculate sliding window of page numbers with ellipsis
  const getPaginationItems = (current, total) => {
    if (!total || total <= 0) return [];
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const items = [];
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) items.push(i);
      items.push("...");
      items.push(total);
    } else if (current >= total - 3) {
      items.push(1);
      items.push("...");
      for (let i = total - 4; i <= total; i++) items.push(i);
    } else {
      items.push(1);
      items.push("...");
      items.push(current - 1);
      items.push(current);
      items.push(current + 1);
      items.push("...");
      items.push(total);
    }
    return items;
  };

  const paginationItems = getPaginationItems(currentPage, totalPages);

  // Compute record range if totalItems is provided
  let startItem = 1;
  let endItem = totalItems;
  if (itemsPerPage && totalItems !== undefined) {
    startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    endItem = Math.min(currentPage * itemsPerPage, totalItems);
  }

  return (
    <div className={`w-full flex flex-col items-center justify-center gap-3 py-4 ${className}`}>
      {/* Centered Navigation Controls */}
      <div className="flex items-center justify-center flex-wrap gap-1.5 bg-brand-surface/70 px-3 py-2 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm">
        {/* First Button */}
        {showFirstLast && totalPages > 4 && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              currentPage === 1
                ? "text-muted/30 cursor-not-allowed border border-transparent"
                : "text-muted hover:text-main hover:bg-brand-bgbase border border-border/50 active:scale-95"
            }`}
            title="First Page"
          >
            <ChevronsLeft size={14} />
            <span className="hidden sm:inline">First</span>
          </button>
        )}

        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
            currentPage === 1
              ? "text-muted/30 cursor-not-allowed border border-transparent"
              : "text-muted hover:text-main hover:bg-brand-bgbase border border-border/50 active:scale-95"
          }`}
          title="Previous Page"
        >
          <ChevronLeft size={14} />
          <span>Prev</span>
        </button>

        {/* Page Buttons with Sliding Window & Ellipsis */}
        <div className="flex items-center gap-1">
          {paginationItems.map((item, idx) => {
            if (item === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-xs text-muted/40 font-black select-none tracking-widest"
                >
                  …
                </span>
              );
            }
            const isCurrent = item === currentPage;
            return (
              <button
                type="button"
                key={`page-${item}`}
                onClick={() => onPageChange(item)}
                className={`min-w-[34px] h-[34px] px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
                  isCurrent
                    ? "bg-brand-neonblue text-white shadow-lg shadow-brand-neonblue/25 scale-105"
                    : "text-muted hover:text-main hover:bg-brand-bgbase border border-border/40 hover:border-brand-neonblue/30 active:scale-95"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
            currentPage === totalPages
              ? "text-muted/30 cursor-not-allowed border border-transparent"
              : "text-muted hover:text-main hover:bg-brand-bgbase border border-border/50 active:scale-95"
          }`}
          title="Next Page"
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>

        {/* Last Button */}
        {showFirstLast && totalPages > 4 && (
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              currentPage === totalPages
                ? "text-muted/30 cursor-not-allowed border border-transparent"
                : "text-muted hover:text-main hover:bg-brand-bgbase border border-border/50 active:scale-95"
            }`}
            title="Last Page"
          >
            <span className="hidden sm:inline">Last</span>
            <ChevronsRight size={14} />
          </button>
        )}
      </div>

      {/* Summary and optional Rows Per Page */}
      {showSummary && (
        <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[1.5px] text-muted/60 text-center flex-wrap justify-center">
          {totalItems !== undefined ? (
            <span>
              Showing <span className="text-main font-mono">{startItem}–{endItem}</span> of <span className="text-main font-mono">{totalItems}</span> {itemLabel}
            </span>
          ) : (
            <span>
              Page <span className="text-main font-mono">{currentPage}</span> of <span className="text-main font-mono">{totalPages}</span>
            </span>
          )}

          {onItemsPerPageChange && (
            <>
              <span className="opacity-30">•</span>
              <div className="flex items-center gap-1.5 lowercase tracking-normal">
                <span className="text-[10px] uppercase font-bold text-muted/50 tracking-wider">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                  className="bg-brand-surface border border-border/50 rounded-lg px-2 py-0.5 text-xs font-bold text-main focus:outline-none focus:border-brand-neonblue cursor-pointer"
                >
                  {itemsPerPageOptions.map((opt) => (
                    <option key={opt} value={opt} className="bg-brand-surface text-main">
                      {opt}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] uppercase font-bold text-muted/50 tracking-wider">{itemLabel}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
