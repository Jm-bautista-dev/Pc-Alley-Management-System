import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Reusable Pagination component used across several tables.
 * Supports rows‑per‑page selector and prev/next navigation.
 *
 * Props:
 * - currentPage: number (1‑based)
 * - totalPages: number
 * - onPageChange: (page: number) => void
 * - limit: number (rows per page)
 * - onLimitChange: (limit: number) => void
 * - limits: number[] (available options for rows per page)
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  limit,
  onLimitChange,
  limits = [10, 25, 50, 100]
}) {
  // Generate an array of page numbers for simple pagination (no ellipsis for now)
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <div className="flex items-center gap-4">
      {/* Rows‑per‑page selector */}
      <div className="flex items-center gap-1 text-sm text-muted">
        <span>Show</span>
        <select
          value={limit}
          onChange={e => onLimitChange(Number(e.target.value))}
          className="border border-border rounded px-2 py-1 text-sm bg-transparent"
        >
          {limits.map(l => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <span>entries</span>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="p-2 rounded border border-border text-muted hover:text-main disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-2 py-1 rounded border border-border text-xs font-medium ${
              p === currentPage
                ? "bg-brand-neonblue/20 text-brand-neonblue border-brand-neonblue/40"
                : "bg-brand-surface text-muted hover:text-main"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="p-2 rounded border border-border text-muted hover:text-main disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
