"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { Barang, CompanyProfile, Invoice, Kendaraan, Pelanggan, Pembelian, Supplier } from "@/lib/types";
import { formatDate, formatDateLong, formatRupiah } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { downloadElementAsPdf, openElementAsPdf } from "@/lib/pdfExport";

function barisItem(items: { itemId: string; qty: number; hargaSatuan: number }[], barangId: string) {
  const lines = items.filter((i) => i.itemId === barangId);
  const qty = lines.reduce((sum, l) => sum + l.qty, 0);
  const hargaSatuan = lines[0]?.hargaSatuan ?? 0;
  return { qty, hargaSatuan };
}

export default function CetakRiwayatBarangPage() {
  const { id } = useParams<{ id: string }>();

  const [barang, setBarang] = useState<Barang | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [pembelianList, setPembelianList] = useState<Pembelian[]>([]);
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [kendaraanList, setKendaraanList] = useState<Kendaraan[]>([]);

  const [downloading, setDownloading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getBarang(id)
      .then(setBarang)
      .catch(() => setNotFound(true));
    api.getCompanyProfile().then(setProfile);
    api.invoice().then(setInvoiceList);
    api.pembelian().then(setPembelianList);
    api.pelanggan().then(setPelangganList);
    api.supplier().then(setSupplierList);
    api.kendaraan().then(setKendaraanList);
  }, [id]);

  if (notFound) {
    return <div className="p-8 text-sm text-zinc-400">Barang tidak ditemukan.</div>;
  }
  if (!barang || !profile) {
    return <div className="p-8 text-sm text-zinc-400">Memuat riwayat…</div>;
  }

  const riwayatPenjualan = invoiceList
    .filter((inv) => inv.items.some((i) => i.tipe === "barang" && i.itemId === barang.id))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const riwayatPembelian = pembelianList
    .filter((p) => p.items.some((i) => i.itemId === barang.id))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  function platNomor(inv: Invoice) {
    return (
      kendaraanList
        .filter((k) => inv.kendaraanIds?.includes(k.id))
        .map((k) => k.platNomor)
        .join(", ") || "-"
    );
  }

  const tanggalCetak = new Date();

  async function handleDownloadPdf() {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(printRef.current, `riwayat-${barang!.kode}-${Date.now()}.pdf`, "portrait");
    } finally {
      setDownloading(false);
    }
  }

  async function handleOpenPdf() {
    if (!printRef.current) return;
    setOpening(true);
    try {
      await openElementAsPdf(printRef.current, "portrait");
    } finally {
      setOpening(false);
    }
  }

  async function handleExportXlsx() {
    setExportingXlsx(true);
    setExportError(null);
    try {
      await api.exportBarangRiwayatXlsx({
        filename: `riwayat-${barang!.kode}-${Date.now()}.xlsx`,
        sheets: [
          {
            name: "Riwayat Penjualan",
            headers: ["Kode Invoice", "Pelanggan", "Plat Nomor", "Tanggal", "Qty", "Harga Satuan"],
            rows: riwayatPenjualan.map((inv) => {
              const { qty, hargaSatuan } = barisItem(inv.items, barang!.id);
              return [
                inv.kode,
                pelangganList.find((p) => p.id === inv.pelangganId)?.nama ?? "-",
                platNomor(inv),
                formatDateLong(inv.tanggal),
                qty,
                hargaSatuan,
              ];
            }),
          },
          {
            name: "Riwayat Pembelian",
            headers: ["Kode Pembelian", "Supplier", "Tanggal", "Qty", "Harga Satuan"],
            rows: riwayatPembelian.map((p) => {
              const { qty, hargaSatuan } = barisItem(p.items, barang!.id);
              return [p.kode, supplierList.find((s) => s.id === p.supplierId)?.nama ?? "-", formatDateLong(p.tanggal), qty, hargaSatuan];
            }),
          },
        ],
      });
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Gagal mengunduh Excel");
    } finally {
      setExportingXlsx(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-2 py-4 print:hidden">
        <Breadcrumb
          items={[
            { label: "Barang & Jasa", href: "/barang-jasa" },
            { label: `Riwayat Transaksi: ${barang.nama}` },
          ]}
          className=""
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={exportingXlsx}
            onClick={handleExportXlsx}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exportingXlsx ? "Mengunduh..." : "Export Excel"}
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Membuat PDF..." : "Download PDF"}
          </button>
          <button
            type="button"
            disabled={opening}
            onClick={handleOpenPdf}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
          >
            <Printer className="h-4 w-4" />
            {opening ? "Membuat PDF..." : "Buka & Cetak PDF"}
          </button>
        </div>
      </div>
      {exportError && (
        <p className="mx-auto max-w-[210mm] rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 print:hidden">{exportError}</p>
      )}

      <div
        ref={printRef}
        className="relative mx-auto w-[210mm] bg-white p-[12mm] text-[12px] shadow-lg print:w-auto print:shadow-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-gmi-green.png" alt="Logo" className="h-11 w-11 object-contain" />
            <div>
              <p className="text-base font-bold leading-none text-zinc-900">{profile.namaPerusahaan}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{profile.alamat}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-zinc-900">Riwayat Transaksi Barang</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {barang.nama} ({barang.kode})
            </p>
            <p className="text-[11px] text-zinc-500">Tanggal Cetak: {formatDate(tanggalCetak.toISOString())}</p>
          </div>
        </div>

        <div className="mt-2 h-[3px] w-full bg-green-600" />

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-zinc-200 p-2.5">
            <p className="text-[10px] text-zinc-500">Total Transaksi Penjualan</p>
            <p className="mt-0.5 text-[13px] font-bold text-zinc-900">{riwayatPenjualan.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-2.5">
            <p className="text-[10px] text-zinc-500">Total Transaksi Pembelian</p>
            <p className="mt-0.5 text-[13px] font-bold text-zinc-900">{riwayatPembelian.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-2.5">
            <p className="text-[10px] text-zinc-500">Stok Saat Ini</p>
            <p className="mt-0.5 text-[13px] font-bold text-zinc-900">{barang.stok}</p>
          </div>
        </div>

        <p className="mt-5 text-[13px] font-bold text-zinc-900">Riwayat Penjualan ({riwayatPenjualan.length})</p>
        {riwayatPenjualan.length === 0 ? (
          <p className="mt-1 text-[11px] text-zinc-400">Belum pernah terjual.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="px-2 py-1.5 font-semibold">Kode Invoice</th>
                <th className="px-2 py-1.5 font-semibold">Pelanggan</th>
                <th className="px-2 py-1.5 font-semibold">Plat Nomor</th>
                <th className="px-2 py-1.5 font-semibold">Tanggal</th>
                <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                <th className="px-2 py-1.5 text-right font-semibold">Harga Satuan</th>
              </tr>
            </thead>
            <tbody>
              {riwayatPenjualan.map((inv) => {
                const { qty, hargaSatuan } = barisItem(inv.items, barang.id);
                return (
                  <tr key={inv.id} className="border-b border-zinc-100">
                    <td className="px-2 py-1.5 font-medium text-zinc-900">{inv.kode}</td>
                    <td className="px-2 py-1.5 text-zinc-700">{pelangganList.find((p) => p.id === inv.pelangganId)?.nama ?? "-"}</td>
                    <td className="px-2 py-1.5 text-zinc-700">{platNomor(inv)}</td>
                    <td className="px-2 py-1.5 text-zinc-500">{formatDateLong(inv.tanggal)}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-700">{qty}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-700">{formatRupiah(hargaSatuan)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <p className="mt-5 text-[13px] font-bold text-zinc-900">Riwayat Pembelian ({riwayatPembelian.length})</p>
        {riwayatPembelian.length === 0 ? (
          <p className="mt-1 text-[11px] text-zinc-400">Belum pernah dibeli.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="px-2 py-1.5 font-semibold">Kode Pembelian</th>
                <th className="px-2 py-1.5 font-semibold">Supplier</th>
                <th className="px-2 py-1.5 font-semibold">Tanggal</th>
                <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                <th className="px-2 py-1.5 text-right font-semibold">Harga Satuan</th>
              </tr>
            </thead>
            <tbody>
              {riwayatPembelian.map((p) => {
                const { qty, hargaSatuan } = barisItem(p.items, barang.id);
                return (
                  <tr key={p.id} className="border-b border-zinc-100">
                    <td className="px-2 py-1.5 font-medium text-zinc-900">{p.kode}</td>
                    <td className="px-2 py-1.5 text-zinc-700">{supplierList.find((s) => s.id === p.supplierId)?.nama ?? "-"}</td>
                    <td className="px-2 py-1.5 text-zinc-500">{formatDateLong(p.tanggal)}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-700">{qty}</td>
                    <td className="px-2 py-1.5 text-right text-zinc-700">{formatRupiah(hargaSatuan)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mx-auto max-w-[210mm] pb-8 pt-2 print:hidden">
        <Link href="/barang-jasa" className="text-xs text-zinc-400 hover:text-zinc-600">
          ← Kembali ke Barang & Jasa
        </Link>
      </div>
    </div>
  );
}
