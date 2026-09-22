"use client";

import { ReactNode, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatRupiah, hitungTotalSetelahDiskon } from "@/lib/format";
import { Select } from "@/components/ui/Select";
import { DiskonItemInput } from "@/components/ui/DiskonItemInput";
import type { DiskonTipe } from "@/lib/types";

export interface PickableItem {
  tipe: "barang" | "jasa";
  itemId: string;
  satuan?: string;
  qty: number;
  diskonTipe?: DiskonTipe;
  diskonPersen: number;
  diskonRp?: number;
}

interface UnitOption {
  value: string;
  label: string;
}

interface ItemPickerSectionProps<T extends PickableItem> {
  icon: ReactNode;
  title: string;
  headerAction?: ReactNode;
  emptyLabel: string;
  items: T[];
  catalog: { id: string; label: string }[];
  pickValue: string;
  onPickChange: (value: string) => void;
  onAdd: () => void;
  nameOf: (item: T) => string;
  subtitleOf?: (item: T) => string;
  priceOf: (item: T) => number;
  unitOptionsOf?: (item: T) => UnitOption[] | undefined;
  onUpdate: (item: T, patch: Partial<T>) => void;
  onRemove: (item: T) => void;
}

export function ItemPickerSection<T extends PickableItem>({
  icon,
  title,
  headerAction,
  emptyLabel,
  items,
  catalog,
  pickValue,
  onPickChange,
  onAdd,
  nameOf,
  subtitleOf,
  priceOf,
  unitOptionsOf,
  onUpdate,
  onRemove,
}: ItemPickerSectionProps<T>) {
  const [pickerOpen, setPickerOpen] = useState(items.length === 0);
  const available = catalog.filter((c) => !items.some((i) => i.itemId === c.id));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          {icon}
          {title}
        </p>
        <div className="flex items-center gap-2">
          {headerAction}
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah {title}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <div className="mb-3 flex gap-2">
          <Select
            value={pickValue}
            onChange={onPickChange}
            className="flex-1"
            placeholder={
              available.length === 0 ? `Semua ${title.toLowerCase()} sudah ditambahkan` : `Pilih ${title.toLowerCase()}...`
            }
            options={available.map((c) => ({ value: c.id, label: c.label }))}
          />
          <button
            type="button"
            onClick={() => {
              onAdd();
              setPickerOpen(false);
            }}
            disabled={!pickValue}
            className="rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tambahkan
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm italic text-zinc-400">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const unitOptions = unitOptionsOf?.(item);
            const price = priceOf(item);
            const subtotal = hitungTotalSetelahDiskon(price * item.qty, item.diskonTipe, item.diskonPersen, item.diskonRp ?? 0);
            return (
              <li key={`${item.tipe}-${item.itemId}`} className="rounded-lg border border-zinc-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{nameOf(item)}</p>
                    <p className="text-xs text-zinc-400">
                      {subtitleOf ? subtitleOf(item) : `${formatRupiah(priceOf(item))} / unit`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
                    aria-label={`Hapus ${nameOf(item)}`}
                    className="shrink-0 text-zinc-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div
                  className={`mt-3 grid grid-cols-2 gap-3 ${
                    unitOptions && unitOptions.length > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"
                  }`}
                >
                  {unitOptions && unitOptions.length > 0 && (
                    <div>
                      <label className="mb-1 block text-xs text-zinc-500">Unit</label>
                      <Select
                        value={item.satuan ?? unitOptions[0]?.value ?? ""}
                        onChange={(v) => onUpdate(item, { satuan: v } as Partial<T>)}
                        options={unitOptions.map((u) => ({ value: u.value, label: u.label }))}
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => onUpdate(item, { qty: Number(e.target.value) || 1 } as Partial<T>)}
                      className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                      aria-label="Qty"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">Diskon</label>
                    <DiskonItemInput
                      tipe={item.diskonTipe ?? "persen"}
                      persen={item.diskonPersen}
                      rupiah={item.diskonRp ?? 0}
                      onChange={(patch) => onUpdate(item, patch as Partial<T>)}
                    />
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-xs text-zinc-500">Subtotal</p>
                    <p className="text-sm font-semibold text-zinc-900">{formatRupiah(subtotal)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
