"use client";

import { useState } from "react";
import type { SortDir } from "@/components/ui/SortableTh";

export interface SortCriterion<K extends string> {
  key: K;
  dir: SortDir;
}

/** Multi-column sort state. Click a column to make it the PRIMARY sort -- whatever was
 * already active (if anything) is kept, demoted into tie-breaker tiers behind it, so every
 * click has an immediately visible effect (unlike "first click stays primary forever", where
 * a unique primary column like Kode would make every later click a no-op). Click the column
 * that's already primary again to flip its direction in place. Click a column that's already
 * an active (but non-primary) tie-breaker to promote it to primary, keeping its direction.
 * Pair with SortableTh and compareMulti(). */
export function useSort<K extends string>(defaultKey: K, defaultDir: SortDir = "asc") {
  const initial: SortCriterion<K>[] = [{ key: defaultKey, dir: defaultDir }];
  const [criteria, setCriteria] = useState<SortCriterion<K>[]>(initial);

  function toggleSort(key: K) {
    setCriteria((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      if (idx === -1) return [{ key, dir: "asc" }, ...prev];
      const current = prev[idx];
      const rest = prev.filter((c) => c.key !== key);
      const nextDir: SortDir = idx === 0 ? (current.dir === "asc" ? "desc" : "asc") : current.dir;
      return [{ key, dir: nextDir }, ...rest];
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
