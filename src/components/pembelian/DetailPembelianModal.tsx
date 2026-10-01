"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  FileText,
  History,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Printer,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { Lookup, PembayaranHutang, Pembelian, Supplier } from "@/lib/types";
import { formatDateFull, formatRupiah, hitungTotalSetelahDiskon, labelDiskon } from "@/lib/format";
import { Select } from "@/components/ui/Select";
import { RupiahInput } from "@/components/ui/RupiahInput";

const METODE_PEMBAYARAN_OPTIONS = [
  { value: "Cash", label: "Cash" },
  { value: "Transfer", label: "Transfer" },
  { value: "Kartu Debit/Kredit", label: "Kartu Debit/Kredit" },
];

interface DetailPembelianModalProps {
  pembelianId: string;
  ids: string[];
  supplierList: Supplier[];
  onClose: () => void;
  onNavigate: (id: string) => void;
  onDeleted: (id: string) => void;
}

const STATUS_CONFIG: Record<Pembelian["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-amber-50 text-amber-600" },
  selesai: { label: "Selesai", className: "bg-emerald-50 text-emerald-600" },
  dibatalkan: { label: "Dibatalkan", className: "bg-red-50 text-red-500" },
};

const STATUS_PEMBAYARAN_CONFIG: Record<Pembelian["statusPembayaran"], { label: string; className: string }> = {
  belum_dibayar: { label: "Belum Dibayar", className: "text-red-500" },
  dibayar_setengah: { label: "Dibayar Sebagian", className: "text-amber-600" },
  lunas: { label: "Lunas", className: "text-emerald-600" },
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(":", ".");
}

export function DetailPembelianModal({ pembelianId, ids, supplierList, onClose, onNavigate, onDeleted }: DetailPembelianModalProps) {
  const router = useRouter();
  const [fetched, setFetched] = useState<{ id: string; pembelian: Pembelian | null; notFound: boolean }>({
    id: "",
    pembelian: null,
    notFound: false,
  });
  const [pembayaranHutang, setPembayaranHutang] = useState<PembayaranHutang[]>([]);
  const [syaratLookup, setSyaratLookup] = useState<Lookup[]>([]);
  const [dokumenOpen, setDokumenOpen] = useState(false);

  // Catat Pembayaran -- only shown while the purchase isn't fully paid yet (see the
  // "statusPembayaran !== lunas" guard around its render below).
  const [bayarMetode, setBayarMetode] = useState("Cash");
  const [bayarJumlah, setBayarJumlah] = useState("");
  const [bayarLunas, setBayarLunas] = useState(false);
  const [bayarSubmitting, setBayarSubmitting] = useState(false);
  const [bayarError, setBayarError] = useState<string | null>(null);

  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function reloadPembayaranHutang() {
    api.pembayaranHutang().then(setPembayaranHutang);
  }

  function loadPembelian() {
    api
      .getPembelian(pembelianId)
      .then((p) => setFetched({ id: pembelianId, pembelian: p, notFound: false }))
      .catch(() => setFetched({ id: pembelianId, pembelian: null, notFound: true }));
  }

  useEffect(() => {
    reloadPembayaranHutang();
    api.lookup("syarat-pembayaran").then(setSyaratLookup);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getPembelian(pembelianId)
      .then((p) => {
        if (!cancelled) setFetched({ id: pembelianId, pembelian: p, notFound: false });
      })
      .catch(() => {
        if (!cancelled) setFetched({ id: pembelianId, pembelian: null, notFound: true });
      });
    // Reset the payment form for whichever purchase is now showing.
    setBayarMetode("Cash");
    setBayarJumlah("");
    setBayarLunas(false);
    setBayarError(null);
    return () => {
      cancelled = true;
    };
  }, [pembelianId]);

  const pembelian = fetched.id === pembelianId ? fetched.pembelian : null;
  const notFound = fetched.id === pembelianId && fetched.notFound;

  const index = ids.indexOf(pembelianId);
  const supplier = supplierList.find((s) => s.id === pembelian?.supplierId);
  const syaratDeskripsi = syaratLookup.find((l) => l.nama === pembelian?.syaratPembayaran)?.deskripsi;
  const diskonNominal = (pembelian?.subtotal ?? 0) - (pembelian?.dpp ?? pembelian?.subtotal ?? 0);

  const riwayat = useMemo(() => {
    if (!pembelian) return [];
    const rows: { key: string; label: string; metode: string; tanggal: string; catatan?: string; jumlah: number }[] = [];
    const bayarAwal = pembelian.dibayar - pembayaranHutang.filter((p) => p.pembelianId === pembelian.id).reduce((s, p) => s + p.jumlah, 0);
    if (bayarAwal > 0) {
      rows.push({
        key: "awal",
        label: "Pembayaran Awal",
        metode: pembelian.metodePembayaran || "Cash",
        tanggal: pembelian.createdAt,
        catatan: pembelian.catatanPembayaran,
        jumlah: bayarAwal,
      });
    }
    pembayaranHutang
      .filter((p) => p.pembelianId === pembelian.id)
      .forEach((p) => {
        rows.push({
          key: p.id,
          label: "Pembayaran Hutang",
          metode: p.metode || "-",
          tanggal: p.tanggal,
          jumlah: p.jumlah,
        });
      });
    return rows.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  }, [pembelian, pembayaranHutang]);

  function handlePrint() {
    setDokumenOpen(false);
    router.push(`/pembelian/faktur/${pembelianId}/cetak`);
  }

  async function submitDeletePembelian() {
    if (!pembelian) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await api.deletePembelian(pembelian.id);
      onDeleted(pembelian.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus pembelian");
      setDeleteSubmitting(false);
    }
  }

  const sisaTagihan = pembelian ? Math.max(0, pembelian.total - (pembelian.returTotal ?? 0) - pembelian.dibayar) : 0;

  function toggleBayarLunas(checked: boolean) {
    setBayarLunas(checked);
    if (checked) setBayarJumlah(String(sisaTagihan));
  }

  async function submitBayar() {
    if (!pembelian) return;
    const jumlah = Number(bayarJumlah);
    if (!jumlah || jumlah <= 0) {
      setBayarError("Jumlah dibayar harus lebih dari 0");
      return;
    }
    setBayarSubmitting(true);
    setBayarError(null);
    try {
      await api.createPembayaranHutang({ pembelianId: pembelian.id, jumlah, metode: bayarMetode });
      setBayarJumlah("");
      setBayarLunas(false);
      loadPembelian();
      reloadPembayaranHutang();
    } catch (err) {
      setBayarError(err instanceof Error ? err.message : "Gagal mencatat pembayaran");
    } finally {
      setBayarSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={index <= 0}
              onClick={() => index > 0 && onNavigate(ids[index - 1])}
              aria-label="Sebelumnya"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={index === -1 || index >= ids.length - 1}
              onClick={() => index < ids.length - 1 && onNavigate(ids[index + 1])}
              aria-label="Berikutnya"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-zinc-900">#{pembelian?.kode ?? "..."}</p>
            </div>
            {pembelian && (
              <span
                className={clsx(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  STATUS_CONFIG[pembelian.status].className
                )}
              >
                {STATUS_CONFIG[pembelian.status].label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pembelian && pembelian.status !== "dibatalkan" && (
              <Link
                href={`/pembelian/faktur/${pembelianId}/edit`}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Invoice
              </Link>
            )}
            {pembelian && (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteConfirming(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {deleteConfirming && (
          <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-5 py-3">
            <div className="text-sm text-red-700">
              <p className="font-semibold">Hapus pembelian #{pembelian?.kode}?</p>
              <p className="text-xs text-red-500">
                Tindakan ini tidak bisa dibatalkan. Pembayaran yang sudah tercatat tidak ikut terhapus. Pembelian yang punya retur tidak bisa dihapus.
              </p>
              {deleteError && <p className="mt-1 text-xs font-medium text-red-600">{deleteError}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirming(false)}
                disabled={deleteSubmitting}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submitDeletePembelian}
                disabled={deleteSubmitting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteSubmitting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {notFound ? (
            <p className="py-10 text-center text-sm text-zinc-400">Data pembelian tidak ditemukan</p>
          ) : !pembelian ? (
            <p className="py-10 text-center text-sm text-zinc-400">Memuat…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    <User className="h-3.5 w-3.5" /> Informasi Supplier
                  </p>
                  <p className="text-base font-bold text-zinc-900">{supplier?.nama ?? "-"}</p>
                  <p className="mb-3 text-xs text-zinc-400">{supplier?.kode ?? "-"}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <p className="flex items-center gap-2 text-sm text-zinc-600">
                      <Phone className="h-3.5 w-3.5 text-zinc-400" /> {supplier?.telepon || "-"}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-zinc-600">
                      <Mail className="h-3.5 w-3.5 text-zinc-400" /> {supplier?.email || "-"}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-zinc-600">
                      <MapPin className="h-3.5 w-3.5 text-zinc-400" /> {supplier?.alamat || "-"}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-zinc-600">
                      <Send className="h-3.5 w-3.5 text-zinc-400" /> {supplier?.alamatPengiriman || "-"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    <FileText className="h-3.5 w-3.5" /> Informasi Transaksi
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Tanggal Pembelian</span>
                      <span className="font-medium text-zinc-900">{formatDateFull(pembelian.tanggal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Tanggal Jatuh Tempo</span>
                      <span className="font-medium text-zinc-900">
                        {pembelian.jatuhTempo ? formatDateFull(pembelian.jatuhTempo) : "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Syarat Pembayaran</span>
                      <span className="font-medium text-zinc-900">{pembelian.syaratPembayaran || "-"}</span>
                    </div>
                    {syaratDeskripsi && <p className="text-xs text-zinc-400">{syaratDeskripsi}</p>}
                    <div className="flex items-center justify-between border-t border-zinc-100 pt-2">
                      <span className="text-zinc-500">Status Pembayaran</span>
                      <span className={clsx("font-semibold", STATUS_PEMBAYARAN_CONFIG[pembelian.statusPembayaran].className)}>
                        {STATUS_PEMBAYARAN_CONFIG[pembelian.statusPembayaran].label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Total Dibayar</span>
                      <span className="font-medium text-zinc-900">{formatRupiah(pembelian.dibayar)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    <Package className="h-3.5 w-3.5" /> Daftar Barang
                  </p>
                  <div className="space-y-3">
                    {pembelian.items.map((item, i) => {
                      const rowTotal = hitungTotalSetelahDiskon(item.qty * item.hargaSatuan, item.diskonTipe, item.diskonPersen, item.diskonRp ?? 0);
                      return (
                        <div key={`${item.itemId}-${i}`} className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-600">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-zinc-900">{item.nama}</p>
                              <p className="text-xs text-zinc-400">{item.kode ?? "-"}</p>
                              <p className="text-xs text-zinc-400">
                                {item.qty} {item.satuan ?? ""} · @ {formatRupiah(item.hargaSatuan)}
                                {item.lokasi ? ` · ${item.lokasi}` : ""}
                                {labelDiskon(item) ? ` · ${labelDiskon(item)}` : ""}
                              </p>
                            </div>
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-zinc-900">{formatRupiah(rowTotal)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    <History className="h-3.5 w-3.5" /> Riwayat Pembayaran
                  </p>
                  {riwayat.length === 0 ? (
                    <p className="text-sm text-zinc-400">Belum ada pembayaran</p>
                  ) : (
                    <div className="space-y-3">
                      {riwayat.map((r) => (
                        <div key={r.key} className="flex items-start justify-between gap-3">
                          <div>
                            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                              {r.label}
                              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
                                {r.metode}
                              </span>
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                              <Clock className="h-3 w-3" /> {formatDateFull(r.tanggal)} · {formatTime(r.tanggal)}
                            </p>
                            {r.catatan && <p className="text-xs italic text-zinc-400">{r.catatan}</p>}
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-emerald-600">{formatRupiah(r.jumlah)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2 rounded-xl bg-green-600 p-4 text-white shadow-sm">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-green-100">
                    Ringkasan Keuangan
                  </p>
                  <div className="flex items-center justify-between text-sm text-green-50">
                    <span>Subtotal</span>
                    <span>{formatRupiah(pembelian.subtotal ?? pembelian.total)}</span>
                  </div>
                  {diskonNominal > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-50">
                      <span>Diskon ({(pembelian.potonganPersen ?? 0).toFixed(2)}%)</span>
                      <span>-{formatRupiah(diskonNominal)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-b border-white/20 pb-2 text-sm text-green-50">
                    <span>DPP</span>
                    <span>{formatRupiah(pembelian.dpp ?? pembelian.total)}</span>
                  </div>
                  {(pembelian.pajak ?? 0) > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-50">
                      <span>Pajak ({pembelian.pajakPersen ?? 0}%)</span>
                      <span>+{formatRupiah(pembelian.pajak ?? 0)}</span>
                    </div>
                  )}
                  {(pembelian.biayaPengiriman ?? 0) > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-50">
                      <span>Pengiriman</span>
                      <span>{formatRupiah(pembelian.biayaPengiriman ?? 0)}</span>
                    </div>
                  )}
                  {(pembelian.biayaLainnya ?? 0) > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-50">
                      <span>Lainnya</span>
                      <span>{formatRupiah(pembelian.biayaLainnya ?? 0)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-white/20 pt-2 text-base font-bold">
                    <span>Grand Total</span>
                    <span>{formatRupiah(pembelian.total)}</span>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-zinc-200 p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    <Download className="h-3.5 w-3.5" /> Dokumen
                  </p>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
                  >
                    <Printer className="h-4 w-4" />
                    Lihat &amp; Cetak
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDokumenOpen((v) => !v)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-200 px-4 py-2.5 text-sm font-semibold text-green-600 hover:bg-green-50"
                    >
                      <Download className="h-4 w-4" />
                      Pilihan Dokumen
                      <ChevronDown className={clsx("h-4 w-4 transition-transform", dokumenOpen && "rotate-180")} />
                    </button>
                    {dokumenOpen && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={handlePrint}
                          className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                        >
                          Cetak Invoice
                        </button>
                        <button
                          type="button"
                          onClick={handlePrint}
                          className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                        >
                          Cetak Struk
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {pembelian.statusPembayaran !== "lunas" && (
                  <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      <CreditCard className="h-3.5 w-3.5" /> Catat Pembayaran
                    </p>

                    {bayarError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{bayarError}</p>}

                    <label className="block text-sm">
                      <span className="mb-1.5 block text-xs font-medium text-zinc-700">Metode Pembayaran</span>
                      <Select value={bayarMetode} onChange={setBayarMetode} options={METODE_PEMBAYARAN_OPTIONS} />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1.5 block text-xs font-medium text-zinc-700">Jumlah Dibayar</span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                          Rp
                        </span>
                        <RupiahInput
                          value={bayarJumlah}
                          onChange={(v) => {
                            setBayarJumlah(v);
                            setBayarLunas(false);
                          }}
                          disabled={bayarLunas}
                          placeholder="0"
                          className="w-full rounded-lg border border-zinc-200 py-2 pl-8 pr-3 text-sm disabled:bg-zinc-50"
                        />
                      </div>
                    </label>

                    <label className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-600">
                      <input
                        type="checkbox"
                        checked={bayarLunas}
                        onChange={(e) => toggleBayarLunas(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                      />
                      Bayar Lunas
                    </label>

                    <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                      Sisa: <span className="font-semibold text-zinc-700">{formatRupiah(sisaTagihan)}</span>
                    </p>

                    <button
                      type="button"
                      disabled={bayarSubmitting || !bayarJumlah}
                      onClick={submitBayar}
                      className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {bayarSubmitting ? "Menyimpan..." : "Catat Pembayaran"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
