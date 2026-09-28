"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Invoice, Kendaraan, Pelanggan, StatusInvoice } from "@/lib/types";
import { formatDateLong, formatRupiah, withinLastDays } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/Panel";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { DetailInvoiceModal } from "@/components/penjualan/DetailInvoiceModal";

const TABS: { key: StatusInvoice; label: string }[] = [
  { key: "selesai", label: "Faktur" },
  { key: "draft", label: "Draft" },
  { key: "dibatalkan", label: "Dibatalkan" },
];

const PERIOD_OPTIONS = [
  { value: 7, label: "7 Hari Terakhir" },
  { value: 30, label: "30 Hari Terakhir" },
  { value: 90, label: "90 Hari Terakhir" },
  { value: 36500, label: "Semua Waktu" },
];

function StatusBadge({ status }: { status: StatusInvoice }) {
  const config = {
    selesai: { label: "Selesai", className: "bg-emerald-50 text-emerald-600" },
    draft: { label: "Draft", className: "bg-zinc-100 text-zinc-600" },
    dibatalkan: { label: "Dibatalkan", className: "bg-red-50 text-red-500" },
  }[status];
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}

function PembayaranBadge({ status }: { status: Invoice["statusPembayaran"] }) {
  const config = {
    lunas: { label: "Lunas", className: "bg-emerald-50 text-emerald-600" },
    belum_dibayar: { label: "Belum Dibayar", className: "bg-red-50 text-red-500" },
    dibayar_setengah: { label: "Dibayar Setengah", className: "bg-amber-50 text-amber-600" },
  }[status];
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}

export default function FakturPenjualanPage() {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice[] | null>(null);
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [kendaraan, setKendaraan] = useState<Kendaraan[]>([]);
  const [tab, setTab] = useState<StatusInvoice>("selesai");
  const [search, setSearch] = useState("");
  const [periodDays, setPeriodDays] = useState(30);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    api.invoice().then(setInvoice);
    api.pelanggan().then(setPelanggan);
    api.kendaraan().then(setKendaraan);
  }, []);

  const pelangganMap = useMemo(() => new Map(pelanggan.map((p) => [p.id, p.nama])), [pelanggan]);
  const namaPelanggan = (id: string) => pelangganMap.get(id) ?? "-";

  const filtered = useMemo(() => {
    if (!invoice) return null;
    const q = search.trim().toLowerCase();
    return invoice
      .filter((inv) => inv.status === tab)
      .filter((inv) => withinLastDays(inv.tanggal, periodDays))
      .filter((inv) => {
        if (!q) return true;
        const kendaraanInv = kendaraan.filter((k) => inv.kendaraanIds?.includes(k.id));
        return (
          inv.kode.toLowerCase().includes(q) ||
          (pelangganMap.get(inv.pelangganId) ?? "").toLowerCase().includes(q) ||
          kendaraanInv.some((k) => k.platNomor.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [invoice, tab, search, periodDays, kendaraan, pelangganMap]);

  const summary = useMemo(() => {
    const scoped = invoice?.filter((inv) => inv.status === tab && withinLastDays(inv.tanggal, periodDays)) ?? [];
    const sum = (predicate: (inv: Invoice) => boolean) =>
      scoped.filter(predicate).reduce((s, inv) => s + inv.total, 0);
    return {
      semua: sum(() => true),
      lunas: sum((inv) => inv.statusPembayaran === "lunas"),
      belumDibayar: sum((inv) => inv.statusPembayaran === "belum_dibayar"),
      setengah: sum((inv) => inv.statusPembayaran === "dibayar_setengah"),
    };
  }, [invoice, tab, periodDays]);

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader
        title="Penjualan"
        subtitle="Kelola data penjualan Anda"
        action={
          <button
            type="button"
            onClick={() => router.push("/penjualan/faktur/baru")}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Invoice Baru
          </button>
        }
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex border-b border-zinc-100">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                }}
                className={clsx(
                  "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
                  tab === t.key ? "border-green-600 text-green-600" : "border-transparent text-zinc-400 hover:text-zinc-600"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nomor invoice, pelanggan, plat..."
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
        </div>

        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl bg-green-800 p-4 text-white">
            <p className="text-sm text-green-100">Semua</p>
            <p className="mt-1 text-xl font-bold">{formatRupiah(summary.semua)}</p>
          </div>
          <div className="rounded-xl border border-green-100 p-4">
            <p className="text-sm text-green-600">Lunas</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{formatRupiah(summary.lunas)}</p>
          </div>
          <div className="rounded-xl border border-green-100 p-4">
            <p className="text-sm text-green-600">Belum Dibayarkan</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{formatRupiah(summary.belumDibayar)}</p>
          </div>
          <div className="rounded-xl border border-green-100 p-4">
            <p className="text-sm text-green-600">Dibayarkan Setengah</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{formatRupiah(summary.setengah)}</p>
          </div>
        </div>

        {!filtered ? (
          <p className="text-sm text-zinc-400">Memuat…</p>
        ) : filtered.length === 0 ? (
          <EmptyState label="Belum ada data invoice" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Kode</th>
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 pr-4 font-medium">Tgl Penjualan</th>
                  <th className="py-2 pr-4 text-right font-medium">Total</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-0 font-medium">Pembayaran</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filtered, page, pageSize).map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id)}
                    className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
                  >
                    <td className="py-3 pr-4 font-semibold text-green-600">{inv.kode}</td>
                    <td className="py-3 pr-4 text-zinc-700">{namaPelanggan(inv.pelangganId)}</td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateLong(inv.tanggal)}</td>
                    <td className="py-3 pr-4 text-right">
                      <p className="font-semibold text-zinc-900">{formatRupiah(inv.total)}</p>
                      {!!inv.returTotal && (
                        <p className="text-xs font-medium text-red-500">- {formatRupiah(inv.returTotal)} retur</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 pr-0">
                      <PembayaranBadge status={inv.statusPembayaran} />
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

      {selectedId && filtered && (
        <DetailInvoiceModal
          invoiceId={selectedId}
          ids={filtered.map((inv) => inv.id)}
          pelangganList={pelanggan}
          kendaraanList={kendaraan}
          onClose={() => setSelectedId(null)}
          onNavigate={setSelectedId}
          onDeleted={(id) => {
            setInvoice((prev) => prev?.filter((inv) => inv.id !== id) ?? null);
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}
