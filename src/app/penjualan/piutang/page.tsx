"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ChevronDown, Clock, CreditCard, Mail, MapPin, Phone, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Invoice, Pelanggan, Pembayaran } from "@/lib/types";
import { daysBetween, formatDateLong, formatRupiah } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/Panel";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { SortableTh, SortResetButton } from "@/components/ui/SortableTh";
import { compareMulti, useSort } from "@/lib/useSort";

type MainTab = "daftar" | "riwayat";
type SubTab = "semua" | "jatuh_tempo" | "akan_jatuh_tempo";

type TransaksiSortKey =
  | "kode"
  | "tipe"
  | "tanggal"
  | "jatuhTempo"
  | "total"
  | "sisa"
  | "status"
  | "statusTransaksi";

type RiwayatSortKey = "kode" | "nama" | "tanggal" | "jumlah";

const STATUS_PEMBAYARAN_CONFIG: Record<Invoice["statusPembayaran"], { label: string; className: string }> = {
  lunas: { label: "Lunas", className: "bg-emerald-50 text-emerald-600" },
  belum_dibayar: { label: "Belum Dibayar", className: "bg-red-50 text-red-500" },
  dibayar_setengah: { label: "Dibayar Setengah", className: "bg-amber-50 text-amber-600" },
};

const STATUS_PEMBAYARAN_ORDER: Record<Invoice["statusPembayaran"], number> = {
  belum_dibayar: 0,
  dibayar_setengah: 1,
  lunas: 2,
};

const STATUS_INVOICE_CONFIG: Record<Invoice["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-zinc-100 text-zinc-600" },
  selesai: { label: "Selesai", className: "bg-emerald-50 text-emerald-600" },
  dibatalkan: { label: "Dibatalkan", className: "bg-red-50 text-red-500" },
};

const STATUS_INVOICE_ORDER: Record<Invoice["status"], number> = {
  draft: 0,
  selesai: 1,
  dibatalkan: 2,
};

function invoiceNet(inv: Invoice): number {
  return inv.total - (inv.returTotal ?? 0);
}

function invoiceBucket(inv: Invoice): "lewat" | "segera" | "aman" {
  if (!inv.jatuhTempo) return "aman";
  const d = daysBetween(inv.jatuhTempo);
  if (d < 0) return "lewat";
  if (d <= 7) return "segera";
  return "aman";
}

function transaksiSortValue(inv: Invoice, tipe: string, key: TransaksiSortKey): string | number {
  switch (key) {
    case "kode":
      return inv.kode;
    case "tipe":
      return tipe.toLowerCase();
    case "tanggal":
      return new Date(inv.tanggal).getTime();
    case "jatuhTempo":
      return inv.jatuhTempo ? new Date(inv.jatuhTempo).getTime() : 0;
    case "total":
      return invoiceNet(inv);
    case "sisa":
      return invoiceNet(inv) - inv.dibayar;
    case "status":
      return STATUS_PEMBAYARAN_ORDER[inv.statusPembayaran];
    case "statusTransaksi":
      return STATUS_INVOICE_ORDER[inv.status];
  }
}

export default function PiutangPage() {
  const [invoice, setInvoice] = useState<Invoice[] | null>(null);
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [pembayaran, setPembayaran] = useState<Pembayaran[]>([]);
  const [mainTab, setMainTab] = useState<MainTab>("daftar");
  const [subTab, setSubTab] = useState<SubTab>("semua");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payingRow, setPayingRow] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState<string | null>(null);
  const [payingAll, setPayingAll] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const {
    criteria: transaksiCriteria,
    toggleSort: transaksiToggleSort,
    resetSort: transaksiResetSort,
    isDefault: transaksiIsDefault,
  } = useSort<TransaksiSortKey>("kode", "asc");

  function reloadTransaksi() {
    api.invoice().then(setInvoice);
    api.pembayaran().then(setPembayaran);
  }

  useEffect(() => {
    reloadTransaksi();
    api.pelanggan().then(setPelanggan);
  }, []);

  const piutangInvoices = useMemo(
    () => (invoice ?? []).filter((inv) => inv.status !== "dibatalkan" && inv.statusPembayaran !== "lunas"),
    [invoice]
  );

  const perPelanggan = useMemo(() => {
    return pelanggan
      .map((p) => {
        const semuaInvoice = (invoice ?? []).filter((inv) => inv.pelangganId === p.id && inv.status !== "dibatalkan");
        const invoicesPiutang = semuaInvoice
          .filter((inv) => inv.statusPembayaran !== "lunas")
          .sort((a, b) => a.kode.localeCompare(b.kode));
        const totalTagihan = invoicesPiutang.reduce((s, inv) => s + invoiceNet(inv), 0);
        const totalDibayar = invoicesPiutang.reduce((s, inv) => s + inv.dibayar, 0);
        return {
          pelanggan: p,
          invoicesPiutang,
          totalTransaksi: semuaInvoice.length,
          totalPiutang: totalTagihan - totalDibayar,
          terbayarPersen: totalTagihan > 0 ? (totalDibayar / totalTagihan) * 100 : 0,
        };
      })
      .filter((row) => row.invoicesPiutang.length > 0)
      .sort((a, b) => a.pelanggan.kode.localeCompare(b.pelanggan.kode));
  }, [pelanggan, invoice]);

  const summary = useMemo(() => {
    const akanJatuhTempo = piutangInvoices.filter((inv) => invoiceBucket(inv) === "segera");
    const jatuhTempo = piutangInvoices.filter((inv) => invoiceBucket(inv) === "lewat");
    return {
      totalPiutang: perPelanggan.reduce((s, row) => s + row.totalPiutang, 0),
      jumlahPelanggan: perPelanggan.length,
      akanJatuhTempo: {
        total: akanJatuhTempo.reduce((s, inv) => s + (invoiceNet(inv) - inv.dibayar), 0),
        count: akanJatuhTempo.length,
      },
      jatuhTempo: {
        total: jatuhTempo.reduce((s, inv) => s + (invoiceNet(inv) - inv.dibayar), 0),
        count: jatuhTempo.length,
      },
    };
  }, [perPelanggan, piutangInvoices]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return perPelanggan.filter((row) => {
      if (q && !row.pelanggan.nama.toLowerCase().includes(q) && !row.pelanggan.kode.toLowerCase().includes(q)) return false;
      if (subTab === "semua") return true;
      if (subTab === "jatuh_tempo") return row.invoicesPiutang.some((inv) => invoiceBucket(inv) === "lewat");
      return row.invoicesPiutang.some((inv) => invoiceBucket(inv) === "segera");
    });
  }, [perPelanggan, search, subTab]);

  async function submitPayment(invoiceId: string) {
    const jumlah = Number(payAmount[invoiceId]);
    if (!jumlah || jumlah <= 0) return;
    setPaying(invoiceId);
    try {
      await api.createPembayaran({ invoiceId, jumlah });
      setPayAmount((prev) => ({ ...prev, [invoiceId]: "" }));
      setPayingRow(null);
      reloadTransaksi();
    } finally {
      setPaying(null);
    }
  }

  async function bayarSekaligus(pelangganId: string, invoices: Invoice[]) {
    setPayingAll(pelangganId);
    try {
      for (const inv of invoices) {
        const sisa = invoiceNet(inv) - inv.dibayar;
        if (sisa > 0) await api.createPembayaran({ invoiceId: inv.id, jumlah: sisa });
      }
      reloadTransaksi();
    } finally {
      setPayingAll(null);
    }
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader title="Piutang" subtitle="Kelola piutang dan riwayat pembayaran pelanggan" />

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex border-b border-zinc-100">
          <button
            type="button"
            onClick={() => setMainTab("daftar")}
            className={clsx(
              "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
              mainTab === "daftar" ? "border-green-600 text-green-600" : "border-transparent text-zinc-400 hover:text-zinc-600"
            )}
          >
            Daftar Piutang
          </button>
          <button
            type="button"
            onClick={() => setMainTab("riwayat")}
            className={clsx(
              "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
              mainTab === "riwayat" ? "border-green-600 text-green-600" : "border-transparent text-zinc-400 hover:text-zinc-600"
            )}
          >
            Riwayat Pembayaran
          </button>
        </div>

        {mainTab === "daftar" ? (
          <>
            <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-blue-200 p-4">
                <p className="text-sm text-blue-600">Total Piutang</p>
                <p className="mt-1 text-xl font-bold text-zinc-900">{formatRupiah(summary.totalPiutang)}</p>
              </div>
              <div className="rounded-xl border border-violet-200 p-4">
                <p className="text-sm text-violet-600">Jumlah Pelanggan</p>
                <p className="mt-1 text-xl font-bold text-zinc-900">{summary.jumlahPelanggan}</p>
              </div>
              <div className="rounded-xl border border-amber-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-amber-600">Akan Jatuh Tempo (H-7)</p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    {summary.akanJatuhTempo.count} Tx
                  </span>
                </div>
                <p className="mt-1 text-xl font-bold text-zinc-900">{formatRupiah(summary.akanJatuhTempo.total)}</p>
              </div>
              <div className="rounded-xl border border-red-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-red-600">Jatuh Tempo</p>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {summary.jatuhTempo.count} Tx
                  </span>
                </div>
                <p className="mt-1 text-xl font-bold text-zinc-900">{formatRupiah(summary.jatuhTempo.total)}</p>
              </div>
            </div>

            <div className="mb-4 flex gap-1 border-b border-zinc-100">
              {(
                [
                  { key: "semua", label: "Semua", icon: null },
                  { key: "jatuh_tempo", label: "Jatuh Tempo", icon: AlertTriangle },
                  { key: "akan_jatuh_tempo", label: "Akan Jatuh Tempo", icon: Clock },
                ] as { key: SubTab; label: string; icon: typeof AlertTriangle | null }[]
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setSubTab(t.key);
                    setPage(1);
                  }}
                  className={clsx(
                    "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
                    subTab === t.key ? "border-green-600 text-green-600" : "border-transparent text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  {t.icon && <t.icon className="h-3.5 w-3.5" />}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative mb-4 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama atau kode..."
                className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            {!invoice ? (
              <p className="text-sm text-zinc-400">Memuat…</p>
            ) : filteredRows.length === 0 ? (
              <EmptyState label="Tidak ada piutang di kategori ini" />
            ) : (
              <ul className="space-y-2">
                {paginate(filteredRows, page, pageSize).map((row) => {
                  const isOpen = expanded === row.pelanggan.id;
                  return (
                    <li key={row.pelanggan.id} className="rounded-lg border border-zinc-100">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : row.pelanggan.id)}
                        className="flex w-full items-start gap-3 p-3 text-left"
                      >
                        <ChevronDown
                          className={clsx("mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform", isOpen && "rotate-180")}
                        />
                        <div className="flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-900">
                            {row.pelanggan.nama}
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                              {row.pelanggan.kode}
                            </span>
                            {row.pelanggan.tipe && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                                {row.pelanggan.tipe}
                              </span>
                            )}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                            {row.pelanggan.telepon && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {row.pelanggan.telepon}
                              </span>
                            )}
                            {row.pelanggan.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {row.pelanggan.email}
                              </span>
                            )}
                            {row.pelanggan.alamat && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {row.pelanggan.alamat}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-zinc-400">Total Piutang</p>
                          <p className="text-sm font-bold text-red-600">{formatRupiah(row.totalPiutang)}</p>
                          <p className="mt-0.5 text-xs text-zinc-400">
                            Transaksi {row.invoicesPiutang.length}/{row.totalTransaksi} · Terbayar{" "}
                            {row.terbayarPersen.toFixed(1)}%
                          </p>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-zinc-100 p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-zinc-700">
                              Transaksi Penjualan ({row.invoicesPiutang.length})
                            </p>
                            <div className="flex items-center gap-3">
                              <SortResetButton visible={!transaksiIsDefault} onReset={transaksiResetSort} />
                              <button
                                type="button"
                                disabled={payingAll === row.pelanggan.id}
                                onClick={() => bayarSekaligus(row.pelanggan.id, row.invoicesPiutang)}
                                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                {payingAll === row.pelanggan.id ? "Memproses..." : "Bayar Sekaligus"}
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-lg border border-zinc-100">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="bg-green-600 text-xs uppercase tracking-wide text-white">
                                  <SortableTh
                                    label="Kode"
                                    sortKey="kode"
                                    criteria={transaksiCriteria}
                                    onSort={transaksiToggleSort}
                                    className="px-3"
                                  />
                                  <SortableTh
                                    label="Tipe"
                                    sortKey="tipe"
                                    criteria={transaksiCriteria}
                                    onSort={transaksiToggleSort}
                                    className="px-3"
                                  />
                                  <SortableTh
                                    label="Tanggal"
                                    sortKey="tanggal"
                                    criteria={transaksiCriteria}
                                    onSort={transaksiToggleSort}
                                    className="px-3"
                                  />
                                  <SortableTh
                                    label="Jatuh Tempo"
                                    sortKey="jatuhTempo"
                                    criteria={transaksiCriteria}
                                    onSort={transaksiToggleSort}
                                    className="px-3"
                                  />
                                  <SortableTh
                                    label="Total"
                                    sortKey="total"
                                    criteria={transaksiCriteria}
                                    onSort={transaksiToggleSort}
                                    align="right"
                                    className="px-3"
                                  />
                                  <SortableTh
                                    label="Terbayar / Sisa"
                                    sortKey="sisa"
                                    criteria={transaksiCriteria}
                                    onSort={transaksiToggleSort}
                                    align="right"
                                    className="px-3"
                                  />
                                  <SortableTh
                                    label="Status"
                                    sortKey="status"
                                    criteria={transaksiCriteria}
                                    onSort={transaksiToggleSort}
                                    className="px-3"
                                  />
                                  <SortableTh
                                    label="Status Transaksi"
                                    sortKey="statusTransaksi"
                                    criteria={transaksiCriteria}
                                    onSort={transaksiToggleSort}
                                    className="px-3"
                                  />
                                  <th className="px-3 py-2" />
                                </tr>
                              </thead>
                              <tbody>
                                {[...row.invoicesPiutang]
                                  .sort((a, b) =>
                                    compareMulti(a, b, transaksiCriteria, (item, key) =>
                                      transaksiSortValue(item, row.pelanggan.tipe ?? "", key)
                                    )
                                  )
                                  .map((inv) => {
                                  const sisa = invoiceNet(inv) - inv.dibayar;
                                  const bucket = invoiceBucket(inv);
                                  const d = inv.jatuhTempo ? daysBetween(inv.jatuhTempo) : null;
                                  const isPayingRow = payingRow === inv.id;
                                  return (
                                    <Fragment key={inv.id}>
                                      <tr className="border-b border-zinc-50 last:border-0">
                                        <td className="px-3 py-2.5 font-semibold text-green-600">{inv.kode}</td>
                                        <td className="px-3 py-2.5">
                                          {row.pelanggan.tipe && (
                                            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                                              {row.pelanggan.tipe}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2.5 text-zinc-700">{formatDateLong(inv.tanggal)}</td>
                                        <td className="px-3 py-2.5 text-zinc-700">
                                          {inv.jatuhTempo ? (
                                            <>
                                              <p>{formatDateLong(inv.jatuhTempo)}</p>
                                              <p
                                                className={clsx(
                                                  "text-xs",
                                                  bucket === "lewat"
                                                    ? "font-semibold text-red-600"
                                                    : bucket === "segera"
                                                      ? "font-semibold text-amber-600"
                                                      : "text-zinc-400"
                                                )}
                                              >
                                                {d !== null && (d < 0 ? `${Math.abs(d)} hari lewat` : `${d} hari lagi`)}
                                              </p>
                                            </>
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-medium text-zinc-900">
                                          {formatRupiah(invoiceNet(inv))}
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                          <p className="text-zinc-700">{formatRupiah(inv.dibayar)}</p>
                                          <p className="font-semibold text-red-600">{formatRupiah(sisa)}</p>
                                        </td>
                                        <td className="px-3 py-2.5">
                                          <span
                                            className={clsx(
                                              "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                                              STATUS_PEMBAYARAN_CONFIG[inv.statusPembayaran].className
                                            )}
                                          >
                                            {STATUS_PEMBAYARAN_CONFIG[inv.statusPembayaran].label}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                          <span
                                            className={clsx(
                                              "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                                              STATUS_INVOICE_CONFIG[inv.status].className
                                            )}
                                          >
                                            {STATUS_INVOICE_CONFIG[inv.status].label}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                          <button
                                            type="button"
                                            aria-label="Catat pembayaran"
                                            onClick={() => setPayingRow(isPayingRow ? null : inv.id)}
                                            className={clsx(
                                              "flex h-7 w-7 items-center justify-center rounded-lg",
                                              isPayingRow
                                                ? "bg-green-600 text-white"
                                                : "bg-green-50 text-green-600 hover:bg-green-100"
                                            )}
                                          >
                                            <CreditCard className="h-3.5 w-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                      {isPayingRow && (
                                        <tr className="border-b border-zinc-50 bg-zinc-50 last:border-0">
                                          <td colSpan={9} className="px-3 py-2.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="text-xs text-zinc-500">Jumlah bayar (sisa {formatRupiah(sisa)}):</span>
                                              <RupiahInput
                                                value={payAmount[inv.id] ?? ""}
                                                onChange={(v) =>
                                                  setPayAmount((prev) => ({ ...prev, [inv.id]: v }))
                                                }
                                                placeholder="Jumlah bayar"
                                                className="w-36 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                                              />
                                              <button
                                                type="button"
                                                disabled={paying === inv.id}
                                                onClick={() => submitPayment(inv.id)}
                                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                                              >
                                                {paying === inv.id ? "..." : "Catat Pembayaran"}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setPayingRow(null)}
                                                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                                              >
                                                Batal
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {filteredRows.length > 0 && (
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={filteredRows.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            )}
          </>
        ) : (
          <RiwayatPembayaran pembayaran={pembayaran} invoice={invoice ?? []} pelanggan={pelanggan} />
        )}
      </div>
    </div>
  );
}

function RiwayatPembayaran({
  pembayaran,
  invoice,
  pelanggan,
}: {
  pembayaran: Pembayaran[];
  invoice: Invoice[];
  pelanggan: Pelanggan[];
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { criteria, toggleSort, resetSort, isDefault } = useSort<RiwayatSortKey>("tanggal", "desc");

  const rows = useMemo(
    () =>
      pembayaran.map((p) => {
        const inv = invoice.find((i) => i.id === p.invoiceId);
        const namaPelanggan = inv ? pelanggan.find((pl) => pl.id === inv.pelangganId)?.nama : undefined;
        return { p, inv, namaPelanggan };
      }),
    [pembayaran, invoice, pelanggan]
  );

  const sorted = useMemo(() => {
    function sortValue(item: (typeof rows)[number], key: RiwayatSortKey): string | number {
      switch (key) {
        case "kode":
          return (item.inv?.kode ?? "").toLowerCase();
        case "nama":
          return (item.namaPelanggan ?? "").toLowerCase();
        case "tanggal":
          return new Date(item.p.tanggal).getTime();
        case "jumlah":
          return item.p.jumlah;
      }
    }
    return [...rows].sort((a, b) => compareMulti(a, b, criteria, sortValue));
  }, [rows, criteria]);

  if (pembayaran.length === 0) return <EmptyState label="Belum ada riwayat pembayaran" />;

  return (
    <div className="overflow-x-auto">
      <div className="mb-2 flex items-center justify-end">
        <SortResetButton visible={!isDefault} onReset={resetSort} />
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
            <SortableTh label="Invoice" sortKey="kode" criteria={criteria} onSort={toggleSort} />
            <SortableTh label="Pelanggan" sortKey="nama" criteria={criteria} onSort={toggleSort} />
            <SortableTh label="Tanggal" sortKey="tanggal" criteria={criteria} onSort={toggleSort} />
            <SortableTh label="Jumlah" sortKey="jumlah" criteria={criteria} onSort={toggleSort} align="right" />
          </tr>
        </thead>
        <tbody>
          {paginate(sorted, page, pageSize).map(({ p, inv, namaPelanggan }) => (
            <tr key={p.id} className="border-b border-zinc-50 last:border-0">
                <td className="py-3 pr-4 font-semibold text-green-600">{inv?.kode ?? "-"}</td>
                <td className="py-3 pr-4 text-zinc-700">{namaPelanggan ?? "-"}</td>
                <td className="py-3 pr-4 text-zinc-500">{formatDateLong(p.tanggal)}</td>
                <td className="py-3 pr-0 text-right font-semibold text-zinc-900">{formatRupiah(p.jumlah)}</td>
              </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={sorted.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
