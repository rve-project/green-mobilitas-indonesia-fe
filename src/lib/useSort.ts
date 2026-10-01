"use client";

import { useState } from "react";
import type { SortDir } from "@/components/ui/SortableTh";

export interface SortCriterion<K extends string> {
  key: K;
  dir: SortDir;
}

/** Single-column sort state (kept as a one-item array so it still pairs with SortableTh and
 * compareMulti() unchanged). Click a column to sort by it, replacing whatever was active.
 * Click the already-active column again to flip its direction in place. */
export function useSort<K extends string>(defaultKey: K, defaultDir: SortDir = "asc") {
  const initial: SortCriterion<K>[] = [{ key: defaultKey, dir: defaultDir }];
  const [criteria, setCriteria] = useState<SortCriterion<K>[]>(initial);

  function toggleSort(key: K) {
    setCriteria((prev) => {
      const current = prev[0];
      if (current && current.key === key) {
        return [{ key, dir: current.dir === "asc" ? "desc" : "asc" }];
      }
      return [{ key, dir: "asc" }];
    });
  }

  function resetSort() {
    setCriteria(initial);
  }

  const isDefault =
    criteria.length === 1 && criteria[0].key === defaultKey && criteria[0].dir === defaultDir;

  return { criteria, toggleSort, resetSort, isDefault };
}

export function compareValues(a: string | number, b: string | number, dir: SortDir): number {
  const cmp = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
  return dir === "asc" ? cmp : -cmp;
}

/** Compares two rows across every active sort tier in order, falling through to the next
 * tier only when the current one is a tie. `getValue` is the page's existing per-key value
 * lookup (the same switch/helper already used to feed compareValues single-column). */
export function compareMulti<T, K extends string>(
  a: T,
  b: T,
  criteria: SortCriterion<K>[],
  getValue: (item: T, key: K) => string | number
): number {
  for (const { key, dir } of criteria) {
    const cmp = compareValues(getValue(a, key), getValue(b, key), dir);
    if (cmp !== 0) return cmp;
  }
  return 0;
}
