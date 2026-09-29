"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { PenerimaanBarang, StatusPenerimaanBarang } from "@/lib/types";
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

const STATUS_OPTIONS: { value: "" | StatusPenerimaanBarang; label: string }[] = [
  { value: "", label: "Semua Status" },
  { value: "draft", label: "Draft" },
  { value: "terposting", label: "Terposting" },
];

function StatusBadge({ status }: { status: StatusPenerimaanBarang }) {
  const config = {
    draft: { label: "Draft", className: "bg-zinc-100 text-zinc-600" },
    terposting: { label: "Terposting", className: "bg-emerald-50 text-emerald-600" },
  }[status];
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}

export default function PenerimaanBarangPage() {
  const router = useRouter();
  const [data, setData] = useState<PenerimaanBarang[] | null>(null);
  const [search, setSearch] = useState("");
  const [periodDays, setPeriodDays] = useState(30);
  const [status, setStatus] = useState<"" | StatusPenerimaanBarang>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    api.penerimaanBarang().then(setData);
  }, []);

  const filtered = useMemo(() => {
    if (!data) return null;
    const q = search.trim().toLowerCase();
    return data
      .filter((d) => withinLastDays(d.tanggal, periodDays))
      .filter((d) => !status || d.status === status)
      .filter((d) => !q || d.kode.toLowerCase().includes(q))
      .sort((a, b) => a.kode.localeCompare(b.kode));
  }, [data, search, periodDays, status]);

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader
        title="Penerimaan Barang"
        subtitle="Kelola penerimaan barang"
        action={
          <button
            type="button"
            onClick={() => router.push("/manajemen-stok/penerimaan-barang/baru")}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Buat Baru
          </button>
        }
      />

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-zinc-900">Filter &amp; Pencarian</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">Cari Good Receipt</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nomor good receipt..."
                className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">Periode</span>
            <Select
              value={String(periodDays)}
              onChange={(v) => {
                setPeriodDays(Number(v));
                setPage(1);
              }}
              options={PERIOD_OPTIONS.map((opt) => ({ value: String(opt.value), label: opt.label }))}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">Status</span>
            <Select
              value={status}
              onChange={(v) => {
                setStatus(v as "" | StatusPenerimaanBarang);
                setPage(1);
              }}
              options={STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {!filtered ? (
          <p className="text-sm text-zinc-400">Memuat…</p>
        ) : filtered.length === 0 ? (
          <EmptyState label="Belum ada data penerimaan barang" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Nomor Receipt</th>
                  <th className="py-2 pr-4 font-medium">Tanggal</th>
                  <th className="py-2 pr-4 text-right font-medium">Jumlah Item</th>
                  <th className="py-2 pr-4 font-medium">Alasan</th>
                  <th className="py-2 pr-4 font-medium">Dibuat Oleh</th>
                  <th className="py-2 pr-0 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filtered, page, pageSize).map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => router.push(`/manajemen-stok/penerimaan-barang/${d.id}`)}
                    className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
                  >
                    <td className="py-3 pr-4 font-semibold text-green-600">{d.kode}</td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateLong(d.tanggal)}</td>
                    <td className="py-3 pr-4 text-right text-zinc-700">{d.items.length} barang</td>
                    <td className="py-3 pr-4 text-zinc-700">{d.alasan}</td>
                    <td className="py-3 pr-4 text-zinc-700">{d.dibuatOleh ?? "-"}</td>
                    <td className="py-3 pr-0">
                      <StatusBadge status={d.status} />
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
