"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ChevronDown, Clock, CreditCard, Mail, MapPin, Phone, Search } from "lucide-react";
import { api } from "@/lib/api";
import { PembayaranHutang, Pembelian, Supplier } from "@/lib/types";
import { daysBetween, formatDateLong, formatRupiah } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/Panel";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { RupiahInput } from "@/components/ui/RupiahInput";

type MainTab = "daftar" | "riwayat";
type SubTab = "semua" | "jatuh_tempo" | "akan_jatuh_tempo";

const STATUS_PEMBAYARAN_CONFIG: Record<Pembelian["statusPembayaran"], { label: string; className: string }> = {
  lunas: { label: "Lunas", className: "bg-emerald-50 text-emerald-600" },
  belum_dibayar: { label: "Belum Dibayar", className: "bg-red-50 text-red-500" },
  dibayar_setengah: { label: "Dibayar Setengah", className: "bg-amber-50 text-amber-600" },
};

const STATUS_PEMBELIAN_CONFIG: Record<Pembelian["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-zinc-100 text-zinc-600" },
  selesai: { label: "Selesai", className: "bg-emerald-50 text-emerald-600" },
  dibatalkan: { label: "Dibatalkan", className: "bg-red-50 text-red-500" },
};

function pembelianNet(p: Pembelian): number {
  return p.total - (p.returTotal ?? 0);
}

function pembelianBucket(p: Pembelian): "lewat" | "segera" | "aman" {
  if (!p.jatuhTempo) return "aman";
  const d = daysBetween(p.jatuhTempo);
  if (d < 0) return "lewat";
  if (d <= 7) return "segera";
  return "aman";
}

export default function HutangPage() {
  const [pembelian, setPembelian] = useState<Pembelian[] | null>(null);
  const [supplier, setSupplier] = useState<Supplier[]>([]);
  const [pembayaran, setPembayaran] = useState<PembayaranHutang[]>([]);
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

  function reloadTransaksi() {
    api.pembelian().then(setPembelian);
    api.pembayaranHutang().then(setPembayaran);
  }

  useEffect(() => {
    reloadTransaksi();
    api.supplier().then(setSupplier);
  }, []);

  const hutangPembelian = useMemo(
    () => (pembelian ?? []).filter((p) => p.status !== "dibatalkan" && p.statusPembayaran !== "lunas"),
    [pembelian]
  );

  const perSupplier = useMemo(() => {
    return supplier
      .map((s) => {
        const semuaPembelian = (pembelian ?? []).filter((p) => p.supplierId === s.id && p.status !== "dibatalkan");
        const pembelianHutang = semuaPembelian
          .filter((p) => p.statusPembayaran !== "lunas")
          .sort((a, b) => a.kode.localeCompare(b.kode));
        const totalTagihan = pembelianHutang.reduce((sum, p) => sum + pembelianNet(p), 0);
        const totalDibayar = pembelianHutang.reduce((sum, p) => sum + p.dibayar, 0);
        return {
          supplier: s,
          pembelianHutang,
          totalTransaksi: semuaPembelian.length,
          totalHutang: totalTagihan - totalDibayar,
          terbayarPersen: totalTagihan > 0 ? (totalDibayar / totalTagihan) * 100 : 0,
        };
      })
      .filter((row) => row.pembelianHutang.length > 0)
      .sort((a, b) => a.supplier.kode.localeCompare(b.supplier.kode));
  }, [supplier, pembelian]);

  const summary = useMemo(() => {
    const akanJatuhTempo = hutangPembelian.filter((p) => pembelianBucket(p) === "segera");
    const jatuhTempo = hutangPembelian.filter((p) => pembelianBucket(p) === "lewat");
    return {
      totalHutang: perSupplier.reduce((sum, row) => sum + row.totalHutang, 0),
      jumlahSupplier: perSupplier.length,
      akanJatuhTempo: {
        total: akanJatuhTempo.reduce((sum, p) => sum + (pembelianNet(p) - p.dibayar), 0),
        count: akanJatuhTempo.length,
      },
      jatuhTempo: {
        total: jatuhTempo.reduce((sum, p) => sum + (pembelianNet(p) - p.dibayar), 0),
        count: jatuhTempo.length,
      },
    };
  }, [perSupplier, hutangPembelian]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return perSupplier.filter((row) => {
      if (q && !row.supplier.nama.toLowerCase().includes(q) && !row.supplier.kode.toLowerCase().includes(q)) return false;
      if (subTab === "semua") return true;
      if (subTab === "jatuh_tempo") return row.pembelianHutang.some((p) => pembelianBucket(p) === "lewat");
      return row.pembelianHutang.some((p) => pembelianBucket(p) === "segera");
    });
  }, [perSupplier, search, subTab]);

  async function submitPayment(pembelianId: string) {
    const jumlah = Number(payAmount[pembelianId]);
    if (!jumlah || jumlah <= 0) return;
    setPaying(pembelianId);
    try {
      await api.createPembayaranHutang({ pembelianId, jumlah });
      setPayAmount((prev) => ({ ...prev, [pembelianId]: "" }));
      setPayingRow(null);
      reloadTransaksi();
    } finally {
      setPaying(null);
    }
  }

  async function bayarSekaligus(supplierId: string, pembelianList: Pembelian[]) {
    setPayingAll(supplierId);
    try {
      for (const p of pembelianList) {
        const sisa = pembelianNet(p) - p.dibayar;
        if (sisa > 0) await api.createPembayaranHutang({ pembelianId: p.id, jumlah: sisa });
      }
      reloadTransaksi();
    } finally {
      setPayingAll(null);
    }
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader title="Hutang" subtitle="Kelola hutang dan riwayat pembayaran ke supplier" />

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
            Daftar Hutang
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
                <p className="text-sm text-blue-600">Total Hutang</p>
                <p className="mt-1 text-xl font-bold text-zinc-900">{formatRupiah(summary.totalHutang)}</p>
              </div>
              <div className="rounded-xl border border-violet-200 p-4">
                <p className="text-sm text-violet-600">Jumlah Supplier</p>
                <p className="mt-1 text-xl font-bold text-zinc-900">{summary.jumlahSupplier}</p>
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

            {!pembelian ? (
              <p className="text-sm text-zinc-400">Memuat…</p>
            ) : filteredRows.length === 0 ? (
              <EmptyState label="Tidak ada hutang di kategori ini" />
            ) : (
              <ul className="space-y-2">
                {paginate(filteredRows, page, pageSize).map((row) => {
                  const isOpen = expanded === row.supplier.id;
                  return (
                    <li key={row.supplier.id} className="rounded-lg border border-zinc-100">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : row.supplier.id)}
                        className="flex w-full items-start gap-3 p-3 text-left"
                      >
                        <ChevronDown
                          className={clsx("mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform", isOpen && "rotate-180")}
                        />
                        <div className="flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-900">
                            {row.supplier.nama}
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                              {row.supplier.kode}
                            </span>
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                              {row.supplier.tipe}
                            </span>
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                            {row.supplier.telepon && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {row.supplier.telepon}
                              </span>
                            )}
                            {row.supplier.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {row.supplier.email}
                              </span>
                            )}
                            {row.supplier.alamat && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {row.supplier.alamat}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-zinc-400">Total Hutang</p>
                          <p className="text-sm font-bold text-red-600">{formatRupiah(row.totalHutang)}</p>
                          <p className="mt-0.5 text-xs text-zinc-400">
                            Transaksi {row.pembelianHutang.length}/{row.totalTransaksi} · Terbayar{" "}
                            {row.terbayarPersen.toFixed(1)}%
                          </p>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-zinc-100 p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-zinc-700">
                              Transaksi Pembelian ({row.pembelianHutang.length})
                            </p>
                            <button
                              type="button"
                              disabled={payingAll === row.supplier.id}
                              onClick={() => bayarSekaligus(row.supplier.id, row.pembelianHutang)}
                              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              {payingAll === row.supplier.id ? "Memproses..." : "Bayar Sekaligus"}
                            </button>
                          </div>

                          <div className="overflow-x-auto rounded-lg border border-zinc-100">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr className="bg-green-600 text-xs uppercase tracking-wide text-white">
                                  <th className="px-3 py-2 font-semibold">Kode</th>
                                  <th className="px-3 py-2 font-semibold">Tipe</th>
                                  <th className="px-3 py-2 font-semibold">Tanggal</th>
                                  <th className="px-3 py-2 font-semibold">Jatuh Tempo</th>
                                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                                  <th className="px-3 py-2 text-right font-semibold">Terbayar / Sisa</th>
                                  <th className="px-3 py-2 font-semibold">Status</th>
                                  <th className="px-3 py-2 font-semibold">Status Transaksi</th>
                                  <th className="px-3 py-2" />
                                </tr>
                              </thead>
                              <tbody>
                                {row.pembelianHutang.map((p) => {
                                  const sisa = pembelianNet(p) - p.dibayar;
                                  const bucket = pembelianBucket(p);
                                  const d = p.jatuhTempo ? daysBetween(p.jatuhTempo) : null;
                                  const isPayingRow = payingRow === p.id;
                                  return (
                                    <Fragment key={p.id}>
                                      <tr className="border-b border-zinc-50 last:border-0">
                                        <td className="px-3 py-2.5 font-semibold text-green-600">{p.kode}</td>
                                        <td className="px-3 py-2.5">
                                          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                                            {row.supplier.tipe}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-zinc-700">{formatDateLong(p.tanggal)}</td>
                                        <td className="px-3 py-2.5 text-zinc-700">
                                          {p.jatuhTempo ? (
                                            <>
                                              <p>{formatDateLong(p.jatuhTempo)}</p>
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
                                          {formatRupiah(pembelianNet(p))}
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                          <p className="text-zinc-700">{formatRupiah(p.dibayar)}</p>
                                          <p className="font-semibold text-red-600">{formatRupiah(sisa)}</p>
                                        </td>
                                        <td className="px-3 py-2.5">
                                          <span
                                            className={clsx(
                                              "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                                              STATUS_PEMBAYARAN_CONFIG[p.statusPembayaran].className
                                            )}
                                          >
                                            {STATUS_PEMBAYARAN_CONFIG[p.statusPembayaran].label}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                          <span
                                            className={clsx(
                                              "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                                              STATUS_PEMBELIAN_CONFIG[p.status].className
                                            )}
                                          >
                                            {STATUS_PEMBELIAN_CONFIG[p.status].label}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                          <button
                                            type="button"
                                            aria-label="Catat pembayaran"
                                            onClick={() => setPayingRow(isPayingRow ? null : p.id)}
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
                                                value={payAmount[p.id] ?? ""}
                                                onChange={(v) =>
                                                  setPayAmount((prev) => ({ ...prev, [p.id]: v }))
                                                }
                                                placeholder="Jumlah bayar"
                                                className="w-36 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                                              />
                                              <button
                                                type="button"
                                                disabled={paying === p.id}
                                                onClick={() => submitPayment(p.id)}
                                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                                              >
                                                {paying === p.id ? "..." : "Catat Pembayaran"}
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
          <RiwayatPembayaran pembayaran={pembayaran} pembelian={pembelian ?? []} supplier={supplier} />
        )}
      </div>
    </div>
  );
}

function RiwayatPembayaran({
  pembayaran,
  pembelian,
  supplier,
}: {
  pembayaran: PembayaranHutang[];
  pembelian: Pembelian[];
  supplier: Supplier[];
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (pembayaran.length === 0) return <EmptyState label="Belum ada riwayat pembayaran" />;

  const sorted = [...pembayaran].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
            <th className="py-2 pr-4 font-medium">Pembelian</th>
            <th className="py-2 pr-4 font-medium">Supplier</th>
            <th className="py-2 pr-4 font-medium">Tanggal</th>
            <th className="py-2 pr-0 text-right font-medium">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {paginate(sorted, page, pageSize).map((p) => {
            const pb = pembelian.find((i) => i.id === p.pembelianId);
            const namaSupplier = pb ? supplier.find((s) => s.id === pb.supplierId)?.nama : undefined;
            return (
              <tr key={p.id} className="border-b border-zinc-50 last:border-0">
                <td className="py-3 pr-4 font-semibold text-green-600">{pb?.kode ?? "-"}</td>
                <td className="py-3 pr-4 text-zinc-700">{namaSupplier ?? "-"}</td>
                <td className="py-3 pr-4 text-zinc-500">{formatDateLong(p.tanggal)}</td>
                <td className="py-3 pr-0 text-right font-semibold text-zinc-900">{formatRupiah(p.jumlah)}</td>
              </tr>
            );
          })}
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
