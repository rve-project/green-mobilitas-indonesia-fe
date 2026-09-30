"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { confirmDelete } from "@/lib/confirm";
import { Lokasi, TIPE_LOKASI_OPTIONS } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/Panel";
import { SortableTh, SortResetButton } from "@/components/ui/SortableTh";
import { useSort, compareMulti } from "@/lib/useSort";
import { TambahLokasiModal } from "@/components/lokasi/TambahLokasiModal";

function tipeLabel(tipe: Lokasi["tipe"]) {
  return TIPE_LOKASI_OPTIONS.find((o) => o.value === tipe)?.label ?? tipe;
}

const STATUS_LOKASI_ORDER: Record<Lokasi["status"], number> = {
  nonaktif: 0,
  aktif: 1,
};

type SortKey = "nama" | "tipe" | "alamat" | "kota" | "telepon" | "status";

export default function LokasiPage() {
  const [lokasiList, setLokasiList] = useState<Lokasi[] | null>(null);
  const [modalState, setModalState] = useState<{ open: boolean; edit?: Lokasi }>({ open: false });
  const [error, setError] = useState<string | null>(null);
  const { criteria, toggleSort, resetSort, isDefault } = useSort<SortKey>("nama", "asc");

  function refresh() {
    api.lokasi().then(setLokasiList).catch(() => setLokasiList([]));
  }

  useEffect(() => {
    refresh();
  }, []);

  function sortValue(l: Lokasi, key: SortKey): string | number {
    switch (key) {
      case "nama":
        return l.nama.toLowerCase();
      case "tipe":
        return tipeLabel(l.tipe).toLowerCase();
      case "alamat":
        return l.alamat.toLowerCase();
      case "kota":
        return l.kota.toLowerCase();
      case "telepon":
        return l.telepon.toLowerCase();
      case "status":
        return STATUS_LOKASI_ORDER[l.status];
    }
  }

  const sortedLokasi = useMemo(() => {
    if (!lokasiList) return null;
    return [...lokasiList].sort((a, b) => compareMulti(a, b, criteria, sortValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lokasiList, criteria]);

  async function handleDelete(item: Lokasi) {
    if (!(await confirmDelete(`Hapus lokasi "${item.nama}"?`))) return;
    setError(null);
    try {
      await api.deleteLokasi(item.id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus lokasi");
    }
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader
        title="Lokasi"
        subtitle="Kelola daftar lokasi penyimpanan/pengiriman barang. Lokasi di sini muncul di semua dropdown lokasi."
        action={
          <button
            type="button"
            onClick={() => setModalState({ open: true })}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Lokasi
          </button>
        }
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {!lokasiList ? (
          <p className="text-sm text-zinc-400">Memuat…</p>
        ) : lokasiList.length === 0 ? (
          <EmptyState label="Belum ada data lokasi" />
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <SortResetButton visible={!isDefault} onReset={resetSort} />
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  <SortableTh label="Nama" sortKey="nama" criteria={criteria} onSort={toggleSort} />
                  <SortableTh label="Tipe" sortKey="tipe" criteria={criteria} onSort={toggleSort} />
                  <SortableTh label="Alamat" sortKey="alamat" criteria={criteria} onSort={toggleSort} />
                  <SortableTh label="Kota" sortKey="kota" criteria={criteria} onSort={toggleSort} />
                  <SortableTh label="Telepon" sortKey="telepon" criteria={criteria} onSort={toggleSort} />
                  <SortableTh label="Status" sortKey="status" criteria={criteria} onSort={toggleSort} />
                  <th className="py-2 pr-0 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(sortedLokasi ?? []).map((l) => (
                  <tr key={l.id} className="border-b border-zinc-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-zinc-900">{l.nama}</td>
                    <td className="py-3 pr-4 text-zinc-500">{tipeLabel(l.tipe)}</td>
                    <td className="py-3 pr-4 text-zinc-500">{l.alamat}</td>
                    <td className="py-3 pr-4 text-zinc-500">{l.kota}</td>
                    <td className="py-3 pr-4 text-zinc-500">{l.telepon}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={clsx(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          l.status === "aktif" ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
                        )}
                      >
                        {l.status === "aktif" ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="py-3 pr-0">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${l.nama}`}
                          onClick={() => setModalState({ open: true, edit: l })}
                          className="rounded p-1.5 text-blue-500 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus ${l.nama}`}
                          onClick={() => handleDelete(l)}
                          className="rounded p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {modalState.open && (
        <TambahLokasiModal
          lokasi={modalState.edit}
          onClose={() => setModalState({ open: false })}
          onSaved={() => refresh()}
        />
      )}
    </div>
  );
}
