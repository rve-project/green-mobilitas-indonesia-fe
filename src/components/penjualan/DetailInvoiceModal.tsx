"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Bike,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  History,
  Mail,
  MapPin,
  Package,
  Phone,
  Printer,
  Send,
  Truck,
  User,
  Wrench,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { Invoice, Jasa, Kendaraan, Lookup, Pelanggan, Pembayaran } from "@/lib/types";
import { formatDateFull, formatRupiah, hitungTotalSetelahDiskon, labelDiskon } from "@/lib/format";

interface DetailInvoiceModalProps {
  invoiceId: string;
  ids: string[];
  pelangganList: Pelanggan[];
  kendaraanList: Kendaraan[];
  onClose: () => void;
  onNavigate: (id: string) => void;
}

const STATUS_CONFIG: Record<Invoice["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-amber-50 text-amber-600" },
  selesai: { label: "Selesai", className: "bg-emerald-50 text-emerald-600" },
  dibatalkan: { label: "Dibatalkan", className: "bg-red-50 text-red-500" },
};

const STATUS_PEMBAYARAN_CONFIG: Record<Invoice["statusPembayaran"], { label: string; className: string }> = {
  belum_dibayar: { label: "Belum Dibayar", className: "text-red-500" },
  dibayar_setengah: { label: "Dibayar Sebagian", className: "text-amber-600" },
  lunas: { label: "Lunas", className: "text-emerald-600" },
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(":", ".");
}

export function DetailInvoiceModal({
  invoiceId,
  ids,
  pelangganList,
  kendaraanList,
  onClose,
  onNavigate,
}: DetailInvoiceModalProps) {
  const [fetched, setFetched] = useState<{ id: string; invoice: Invoice | null; notFound: boolean }>({
    id: "",
    invoice: null,
    notFound: false,
  });
  const [pembayaran, setPembayaran] = useState<Pembayaran[]>([]);
  const [jasaList, setJasaList] = useState<Jasa[]>([]);
  const [syaratLookup, setSyaratLookup] = useState<Lookup[]>([]);
  const [dokumenOpen, setDokumenOpen] = useState(false);
  const [doOpen, setDoOpen] = useState(false);

  useEffect(() => {
    api.pembayaran().then(setPembayaran);
    api.jasa({ limit: 1000 }).then((res) => setJasaList(res.data));
    api.lookup("syarat-pembayaran").then(setSyaratLookup);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getInvoice(invoiceId)
      .then((inv) => {
        if (!cancelled) setFetched({ id: invoiceId, invoice: inv, notFound: false });
      })
      .catch(() => {
        if (!cancelled) setFetched({ id: invoiceId, invoice: null, notFound: true });
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const invoice = fetched.id === invoiceId ? fetched.invoice : null;
  const notFound = fetched.id === invoiceId && fetched.notFound;

  const index = ids.indexOf(invoiceId);
  const pelanggan = pelangganList.find((p) => p.id === invoice?.pelangganId);
  const kendaraanTerpilih = kendaraanList.filter((k) => invoice?.kendaraanIds?.includes(k.id));
  const syaratDeskripsi = syaratLookup.find((l) => l.nama === invoice?.syaratPembayaran)?.deskripsi;

  const riwayat = useMemo(() => {
    if (!invoice) return [];
    const rows: { key: string; label: string; metode: string; tanggal: string; jumlah: number }[] = [];
    const bayarAwal = invoice.dibayar - pembayaran.filter((p) => p.invoiceId === invoice.id).reduce((s, p) => s + p.jumlah, 0);
    if (bayarAwal > 0) {
      rows.push({ key: "awal", label: "Pembayaran Awal", metode: "-", tanggal: invoice.createdAt, jumlah: bayarAwal });
    }
    pembayaran
      .filter((p) => p.invoiceId === invoice.id)
      .forEach((p) => {
        rows.push({ key: p.id, label: "Pembayaran", metode: p.metode || "-", tanggal: p.tanggal, jumlah: p.jumlah });
      });
    return rows.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  }, [invoice, pembayaran]);

  function openCetak(jenis: "invoice" | "proforma" | "kwitansi", format: "a4" | "dot") {
    setDokumenOpen(false);
    setDoOpen(false);
    window.open(`/penjualan/faktur/${invoiceId}/cetak?jenis=${jenis}&format=${format}`, "_blank");
  }

  const subtotal = invoice?.subtotal ?? invoice?.total ?? 0;
  const dpp = invoice?.dpp ?? subtotal;
  const diskonNominal = subtotal - dpp;
  const pajakNominal = invoice?.pajak ?? 0;

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
            <p className="text-sm font-bold text-zinc-900">#{invoice?.kode ?? "..."}</p>
            {invoice && (
              <span
                className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_CONFIG[invoice.status].className)}
              >
                {STATUS_CONFIG[invoice.status].label}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {notFound ? (
            <p className="py-10 text-center text-sm text-zinc-400">Data invoice tidak ditemukan</p>
          ) : !invoice ? (
            <p className="py-10 text-center text-sm text-zinc-400">Memuat…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    <User className="h-3.5 w-3.5" /> Informasi Pelanggan
                  </p>
                  <p className="text-base font-bold text-zinc-900">{pelanggan?.nama ?? "-"}</p>
                  <p className="text-xs text-zinc-400">{pelanggan?.kode ?? "-"}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <p className="flex items-center gap-2 text-sm text-zinc-600">
                      <Phone className="h-3.5 w-3.5 text-zinc-400" /> {pelanggan?.telepon || "-"}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-zinc-600">
                      <Mail className="h-3.5 w-3.5 text-zinc-400" /> {pelanggan?.email || "-"}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-zinc-600">
                      <MapPin className="h-3.5 w-3.5 text-zinc-400" /> {pelanggan?.alamat || "-"}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-zinc-600">
                      <Send className="h-3.5 w-3.5 text-zinc-400" /> {pelanggan?.alamatPengiriman || "-"}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-zinc-400">
                    CREDIT: <span className="font-semibold text-blue-600">{formatRupiah(pelanggan?.saldoKredit ?? 0)}</span>
                  </p>
                </div>

                {kendaraanTerpilih.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 p-4">
                    <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      <Bike className="h-3.5 w-3.5" /> Informasi Kendaraan
                    </p>
                    <div className="space-y-2">
                      {kendaraanTerpilih.map((k) => (
                        <div key={k.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
                              <Bike className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-zinc-900">
                                {k.merk} {k.model}
                              </p>
                              <p className="text-xs text-zinc-400">
                                {k.tipe} · {k.tahun}
                                {k.warna ? ` · ${k.warna}` : ""}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                            {k.platNomor}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    <FileText className="h-3.5 w-3.5" /> Informasi Transaksi
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Tanggal Invoice</span>
                      <span className="font-medium text-zinc-900">{formatDateFull(invoice.tanggal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Tanggal Jatuh Tempo</span>
                      <span className="font-medium text-zinc-900">
                        {invoice.jatuhTempo ? formatDateFull(invoice.jatuhTempo) : "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Syarat Pembayaran</span>
                      <span className="font-medium text-zinc-900">{invoice.syaratPembayaran || "-"}</span>
                    </div>
                    {syaratDeskripsi && <p className="text-xs text-zinc-400">{syaratDeskripsi}</p>}
                    {invoice.keluhan && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Keluhan</span>
                        <span className="font-medium text-zinc-900">{invoice.keluhan}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-zinc-100 pt-2">
                      <span className="text-zinc-500">Status Pembayaran</span>
                      <span className={clsx("font-semibold", STATUS_PEMBAYARAN_CONFIG[invoice.statusPembayaran].className)}>
                        {STATUS_PEMBAYARAN_CONFIG[invoice.statusPembayaran].label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Total Dibayar</span>
                      <span className="font-medium text-zinc-900">{formatRupiah(invoice.dibayar)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    <Package className="h-3.5 w-3.5" /> Daftar Barang &amp; Jasa
                  </p>
                  <div className="space-y-3">
                    {invoice.items.map((item, i) => {
                      const rowTotal = hitungTotalSetelahDiskon(item.qty * item.hargaSatuan, item.diskonTipe, item.diskonPersen, item.diskonRp ?? 0);
                      const jasaKomisi =
                        item.tipe === "jasa" ? jasaList.find((j) => j.id === item.itemId)?.komisi : undefined;
                      const komisiNominal = jasaKomisi ? (rowTotal * jasaKomisi) / 100 : 0;
                      return (
                        <div key={`${item.itemId}-${i}`} className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span
                              className={clsx(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                item.tipe === "barang" ? "bg-blue-50 text-blue-500" : "bg-violet-50 text-violet-500"
                              )}
                            >
                              {item.tipe === "barang" ? <Package className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-zinc-900">{item.nama}</p>
                              {item.kode && <p className="text-xs text-zinc-400">{item.kode}</p>}
                              <p className="text-xs text-zinc-400">
                                {item.qty} {item.tipe === "jasa" ? "Layanan" : (item.satuan ?? "")} · @{" "}
                                {formatRupiah(item.hargaSatuan)}
                                {labelDiskon(item) ? ` · ${labelDiskon(item)}` : ""}
                              </p>
                              {komisiNominal > 0 && (
                                <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                                  Komisi · {formatRupiah(komisiNominal)}
                                </span>
                              )}
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
                    <span>{formatRupiah(subtotal)}</span>
                  </div>
                  {diskonNominal > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-50">
                      <span>Diskon ({(invoice.potonganPersen ?? 0).toFixed(2)}%)</span>
                      <span>-{formatRupiah(diskonNominal)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-b border-white/20 pb-2 text-sm text-green-50">
                    <span>DPP</span>
                    <span>{formatRupiah(dpp)}</span>
                  </div>
                  {pajakNominal > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-50">
                      <span>Pajak ({invoice.pajakPersen ?? 0}%)</span>
                      <span>+{formatRupiah(pajakNominal)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-white/20 pt-2 text-base font-bold">
                    <span>Grand Total</span>
                    <span>{formatRupiah(invoice.total)}</span>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-zinc-200 p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    <Download className="h-3.5 w-3.5" /> Dokumen
                  </p>
                  <button
                    type="button"
                    onClick={() => openCetak("invoice", "a4")}
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
                        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Invoice
                        </p>
                        <DokumenOption label="A4" onClick={() => openCetak("invoice", "a4")} />
                        <DokumenOption label="Dot Matrix" onClick={() => openCetak("invoice", "dot")} />
                        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Proforma Invoice
                        </p>
                        <DokumenOption label="A4" onClick={() => openCetak("proforma", "a4")} />
                        <DokumenOption label="Dot Matrix" onClick={() => openCetak("proforma", "dot")} />
                        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Kwitansi
                        </p>
                        <DokumenOption label="A4" onClick={() => openCetak("kwitansi", "a4")} />
                        <DokumenOption label="Dot Matrix" onClick={() => openCetak("kwitansi", "dot")} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-zinc-200 p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    <Truck className="h-3.5 w-3.5" /> Delivery Order
                  </p>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
                  >
                    <Printer className="h-4 w-4" />
                    Lihat &amp; Cetak
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDoOpen((v) => !v)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-200 px-4 py-2.5 text-sm font-semibold text-green-600 hover:bg-green-50"
                    >
                      <Download className="h-4 w-4" />
                      Pilihan Dokumen
                      <ChevronDown className={clsx("h-4 w-4 transition-transform", doOpen && "rotate-180")} />
                    </button>
                    {doOpen && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                        <DokumenOption
                          label="Cetak Surat Jalan"
                          onClick={() => {
                            setDoOpen(false);
                            window.print();
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DokumenOption({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
    >
      {label}
    </button>
  );
}
