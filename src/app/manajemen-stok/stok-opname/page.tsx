"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { StokOpname } from "@/lib/types";
import { formatDateLong, withinLastDays } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/Panel";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";

const PERIOD_OPTIONS = [
  { value: 7, label: "7 Hari Terakhir" },
  { value: 30, label: "30 Hari Terakhir" },
  { value: 90, label: "90 Hari Terakhir" },
  { value: 36500, label: "Semua Waktu" },
];

export default function StokOpnamePage() {
  const router = useRouter();
  const [stokOpname, setStokOpname] = useState<StokOpname[] | null>(null);
  const [search, setSearch] = useState("");
  const [periodDays, setPeriodDays] = useState(30);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);

  // Exports with the same period + search filter the list is showing.
  async function handleExport() {
    setExporting(true);
    try {
      await api.exportStokOpname({ days: periodDays, search });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Gagal export stok opname");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    api.stokOpname().then(setStokOpname);
  }, []);

  const filtered = useMemo(() => {
    if (!stokOpname) return null;
    const q = search.trim().toLowerCase();
    return stokOpname
      .filter((s) => withinLastDays(s.tanggal, periodDays))
      .filter((s) => {
        if (!q) return true;
        return s.kode.toLowerCase().includes(q) || s.lokasi.toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [stokOpname, search, periodDays]);

  const summary = useMemo(() => {
    const scoped = stokOpname?.filter((s) => withinLastDays(s.tanggal, periodDays)) ?? [];
    return {
      totalSesi: scoped.length,
      totalItemDiperiksa: scoped.reduce((sum, s) => sum + s.items.length, 0),
      totalItemSelisih: scoped.reduce((sum, s) => sum + s.totalSelisihItem, 0),
    };
  }, [stokOpname, periodDays]);

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader
        title="Stok Opname"
        subtitle="Cocokkan stok fisik dengan stok sistem dan catat penyesuaiannya"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || !filtered || filtered.length === 0}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Mengekspor..." : "Export"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/manajemen-stok/stok-opname/baru")}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Stok Opname Baru
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-green-800 p-4 text-white">
            <p className="text-sm text-green-100">Total Sesi Opname</p>
            <p className="mt-1 text-xl font-bold">{summary.totalSesi}</p>
          </div>
          <div className="rounded-xl border border-green-100 p-4">
            <p className="text-sm text-green-600">Item Diperiksa</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{summary.totalItemDiperiksa}</p>
          </div>
          <div className="rounded-xl border border-amber-100 p-4">
            <p className="text-sm text-amber-600">Item Ada Selisih</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{summary.totalItemSelisih}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari kode atau lokasi..."
              className="w-72 rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <Select
            value={String(periodDays)}
            onChange={(v) => {
              setPeriodDays(Number(v));
              setPage(1);
            }}
            className="w-44"
            options={PERIOD_OPTIONS.map((opt) => ({ value: String(opt.value), label: opt.label }))}
          />
        </div>

        {!filtered ? (
          <p className="text-sm text-zinc-400">Memuat…</p>
        ) : filtered.length === 0 ? (
          <EmptyState label="Belum ada data stok opname" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Kode</th>
                  <th className="py-2 pr-4 font-medium">Tanggal</th>
                  <th className="py-2 pr-4 font-medium">Lokasi</th>
                  <th className="py-2 pr-4 text-right font-medium">Jumlah Item</th>
                  <th className="py-2 pr-0 text-right font-medium">Item Selisih</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filtered, page, pageSize).map((s) => (
                  <tr key={s.id} className="border-b border-zinc-50 last:border-0">
                    <td className="py-3 pr-4 font-semibold text-green-600">{s.kode}</td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateLong(s.tanggal)}</td>
                    <td className="py-3 pr-4 text-zinc-700">{s.lokasi}</td>
                    <td className="py-3 pr-4 text-right text-zinc-700">{s.items.length}</td>
                    <td className="py-3 pr-0 text-right">
                      {s.totalSelisihItem > 0 ? (
                        <span className="font-semibold text-amber-600">{s.totalSelisihItem}</span>
                      ) : (
                        <span className="text-zinc-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
