"use client";

import clsx from "clsx";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { SortCriterion } from "@/lib/useSort";

export type SortDir = "asc" | "desc";

interface SortableThProps<K extends string> {
  label: string;
  sortKey: K;
  criteria: SortCriterion<K>[];
  onSort: (key: K) => void;
  align?: "right";
  className?: string;
}

/** Clickable column header for multi-column client-side sorting -- click to add/toggle this
 * column as a sort tier. When more than one tier is active, a small superscript number shows
 * this column's priority (1 = primary, 2 = tie-breaker, ...). Pair with useSort() and
 * compareMulti(). */
export function SortableTh<K extends string>({
  label,
  sortKey,
  criteria,
  onSort,
  align,
  className,
}: SortableThProps<K>) {
  const idx = criteria.findIndex((c) => c.key === sortKey);
  const active = idx !== -1;
  const dir = active ? criteria[idx].dir : "asc";
  const showRank = active && criteria.length > 1;

  return (
    <th className={clsx("py-2 font-medium", align === "right" ? "pr-4 text-right" : "pr-4", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={clsx(
          "inline-flex w-full items-center gap-1 hover:text-zinc-700",
          align === "right" && "justify-end",
          active && "text-zinc-700"
        )}
      >
        {label}
        {showRank && <sup className="text-[9px] font-bold text-green-600">{idx + 1}</sup>}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-300" />
        )}
      </button>
    </th>
  );
}

/** Small text link that clears a multi-column sort back to the page's default single-column
 * sort. Render it near the table's search/filter row, only while `visible` (i.e. while
 * `!isDefault` from useSort()) so it doesn't clutter the page when sorting is untouched. */
export function SortResetButton({ visible, onReset }: { visible: boolean; onReset: () => void }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onReset}
      className="text-xs font-medium text-zinc-400 hover:text-zinc-600 hover:underline"
    >
      Reset urutan
    </button>
  );
}
