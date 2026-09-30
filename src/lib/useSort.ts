"use client";

import { useState } from "react";
import type { SortDir } from "@/components/ui/SortableTh";

export interface SortCriterion<K extends string> {
  key: K;
  dir: SortDir;
}

/** Multi-column sort state. Click a column to add it as a sort tier -- the first column
 * clicked is the primary sort, each further *different* column clicked becomes a
 * tie-breaker after it (so "sort by Status, then by Tanggal" works by just clicking both
 * headers in that order). Click an already-active column again to flip its direction in
 * place without changing its tier position. Pair with SortableTh and compareMulti(). */
export function useSort<K extends string>(defaultKey: K, defaultDir: SortDir = "asc") {
  const initial: SortCriterion<K>[] = [{ key: defaultKey, dir: defaultDir }];
  const [criteria, setCriteria] = useState<SortCriterion<K>[]>(initial);

  function toggleSort(key: K) {
    setCriteria((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      if (idx === -1) return [...prev, { key, dir: "asc" }];
      const next = [...prev];
      next[idx] = { ...next[idx], dir: next[idx].dir === "asc" ? "desc" : "asc" };
      return next;
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
