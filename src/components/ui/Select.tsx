"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import clsx from "clsx";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  disabled,
  className,
  id,
  ...rest
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
    // preventScroll: a plain .focus() makes the browser scroll the search input into
    // view on whatever ancestor it thinks is scrollable -- including the whole page,
    // not just this dropdown's own scroll container -- which yanks the page sideways
    // whenever a dropdown opens near the edge of a wide table.
    else searchRef.current?.focus({ preventScroll: true });
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filteredOptions = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label={rest["aria-label"]}
        className={clsx(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm text-zinc-900 transition-colors focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500",
          disabled ? "cursor-not-allowed opacity-60" : "hover:border-green-200",
          !selected && "text-zinc-400"
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={clsx("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="relative border-b border-zinc-100 p-1.5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari..."
              className="w-full rounded-md border border-zinc-200 py-1.5 pl-8 pr-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-400">
                {options.length === 0 ? "Tidak ada pilihan" : "Tidak ditemukan"}
              </p>
            ) : (
              filteredOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={clsx(
                    "block w-full px-3 py-1.5 text-left text-sm transition-colors",
                    o.value === value ? "bg-green-50 font-medium text-green-700" : "text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
