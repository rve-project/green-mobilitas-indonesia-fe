"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { FileText, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { PengeluaranLain, StatusPengeluaran } from "@/lib/types";
import { formatDateLong, formatRupiah } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { SortableTh, SortResetButton } from "@/components/ui/SortableTh";
import { useSort, compareMulti } from "@/lib/useSort";
import { TambahPengeluaranLainModal } from "@/components/pembelian/TambahPengeluaranLainModal";

type SortKey = "kategori" | "deskripsi" | "tanggal" | "status" | "jumlah";

const STATUS_ORDER: Record<StatusPengeluaran, number> = {
  selesai: 0,
  dibatalkan: 1,
};

export default function PengeluaranLainPage() {
  const [data, setData] = useState<PengeluaranLain[] | null>(null);
  const [search, setSearch] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { criteria, toggleSort, resetSort, isDefault } = useSort<SortKey>("tanggal", "desc");

  useEffect(() => {
    api.pengeluaranLain().then(setData);
  }, []);

  const kategoriOptions = useMemo(
    () => Array.from(new Set((data ?? []).map((d) => d.kategori))),
    [data]
  );

  const filtered = useMemo(() => {
    if (!data) return null;
    const q = search.trim().toLowerCase();
    return data.filter((d) => {
      if (kategoriFilter && d.kategori !== kategoriFilter) return false;
      if (statusFilter && d.status !== statusFilter) return false;
      if (!q) return true;
      return d.kategori.toLowerCase().includes(q) || (d.deskripsi ?? "").toLowerCase().includes(q);
    });
  }, [data, search, kategoriFilter, statusFilter]);

  function sortValue(d: PengeluaranLain, key: SortKey): string | number {
    switch (key) {
      case "kategori":
        return d.kategori.toLowerCase();
      case "deskripsi":
        return (d.deskripsi ?? "").toLowerCase();
      case "tanggal":
        return new Date(d.tanggal).getTime();
      case "status":
        return STATUS_ORDER[d.status];
      case "jumlah":
        return d.jumlah;
    }
  }

  const sortedFiltered = useMemo(() => {
    if (!filtered) return null;
    return [...filtered].sort((a, b) => compareMulti(a, b, criteria, sortValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, criteria]);

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader
        title="Pengeluaran Lain"
        subtitle="Kelola pengeluaran lainnya seperti biaya angkut, sewa gudang, dll"
        action={
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Laporan
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Tambah Pengeluaran Lain
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari berdasarkan kategori atau deskripsi..."
              className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <Select
            value={kategoriFilter}
            onChange={(v) => {
              setKategoriFilter(v);
              setPage(1);
            }}
            className="w-48"
            options={[{ value: "", label: "Semua Kategori" }, ...kategoriOptions.map((k) => ({ value: k, label: k }))]}
          />
          <Select
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            className="w-44"
            options={[
              { value: "", label: "Semua Status" },
              { value: "selesai", label: "Selesai" },
              { value: "dibatalkan", label: "Dibatalkan" },
            ]}
          />
          <div className="flex items-center">
            <SortResetButton visible={!isDefault} onReset={resetSort} />
          </div>
        </div>

        {!sortedFiltered ? (
          <p className="text-sm text-zinc-400">Memuat…</p>
        ) : sortedFiltered.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
            <FileText className="h-10 w-10 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-500">Belum ada pengeluaran lain</p>
            <p className="text-xs text-zinc-400">Mulai dengan menambahkan pengeluaran lain baru</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  <SortableTh label="Kategori" sortKey="kategori" criteria={criteria} onSort={toggleSort} />
                  <SortableTh label="Deskripsi" sortKey="deskripsi" criteria={criteria} onSort={toggleSort} />
                  <SortableTh label="Tanggal" sortKey="tanggal" criteria={criteria} onSort={toggleSort} />
                  <SortableTh label="Status" sortKey="status" criteria={criteria} onSort={toggleSort} />
                  <SortableTh
                    label="Jumlah"
                    sortKey="jumlah"
                    criteria={criteria}
                    onSort={toggleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {paginate(sortedFiltered, page, pageSize).map((d) => (
                  <tr key={d.id} className="border-b border-zinc-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-zinc-900">{d.kategori}</td>
                    <td className="max-w-[280px] truncate py-3 pr-4 text-zinc-500">{d.deskripsi ?? "-"}</td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateLong(d.tanggal)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={clsx(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          d.status === "selesai" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                        )}
                      >
                        {d.status === "selesai" ? "Selesai" : "Dibatalkan"}
                      </span>
                    </td>
                    <td className="py-3 pr-0 text-right font-semibold text-zinc-900">{formatRupiah(d.jumlah)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={sortedFiltered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {modalOpen && (
        <TambahPengeluaranLainModal
          onClose={() => setModalOpen(false)}
          onCreated={(item) => setData((prev) => [item, ...(prev ?? [])])}
        />
      )}
    </div>
  );
}
