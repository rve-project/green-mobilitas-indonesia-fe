"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { CompanyProfile, Invoice, Jasa, Pelanggan } from "@/lib/types";
import { formatDate, formatRupiah, hitungTotalSetelahDiskon } from "@/lib/format";
import { periodRangeFromSearchParams } from "@/lib/laporanCompute";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { downloadElementAsPdf, openElementAsPdf } from "@/lib/pdfExport";

export default function CetakLaporanPenjualanPage() {
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice[] | null>(null);
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [jasaList, setJasaList] = useState<Jasa[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [opening, setOpening] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([api.invoice(), api.pelanggan(), api.jasa({ limit: 1000 }), api.getCompanyProfile()]).then(
      ([invoiceRes, pelangganRes, jasaRes, profileRes]) => {
        setInvoice(invoiceRes);
        setPelanggan(pelangganRes);
        setJasaList(jasaRes.data);
        setProfile(profileRes);
      }
    );
  }, []);

  if (!invoice || !profile) {
    return <div className="p-8 text-sm text-zinc-400">Memuat laporan…</div>;
  }

  async function handleDownloadPdf() {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(printRef.current, `laporan-penjualan-${Date.now()}.pdf`, "landscape");
    } finally {
      setDownloading(false);
    }
  }

  async function handleOpenPdf() {
    if (!printRef.current) return;
    setOpening(true);
    try {
      await openElementAsPdf(printRef.current, "landscape");
    } finally {
      setOpening(false);
    }
  }

  const { start, end, label: periodeLabel } = periodRangeFromSearchParams(searchParams);
  const rows = invoice
    .filter((inv) => {
      const t = new Date(inv.tanggal).getTime();
      return t >= start.getTime() && t < end.getTime();
    })
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  const pelangganMap = new Map(pelanggan.map((p) => [p.id, p]));
  const jasaMap = new Map(jasaList.map((j) => [j.id, j]));
  const tanggalCetak = new Date();

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      <style>{`@page { size: A4 landscape; margin: 12mm; }`}</style>

      <div className="mx-auto flex max-w-[277mm] items-center justify-between py-4 print:hidden">
        <Breadcrumb items={[{ label: "Laporan", href: "/laporan" }, { label: "Cetak Laporan Penjualan" }]} className="" />
        <div className="flex items-center gap-2">
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

      <div
        ref={printRef}
        className="relative mx-auto w-[297mm] bg-white p-[12mm] text-[12px] shadow-lg print:w-auto print:shadow-none"
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
            <p className="text-xl font-bold text-zinc-900">Laporan Penjualan</p>
            <p className="mt-1 text-[11px] text-zinc-500">Periode: {periodeLabel}</p>
            <p className="text-[11px] text-zinc-500">Tanggal Cetak: {formatDate(tanggalCetak.toISOString())}</p>
          </div>
        </div>

        <div className="mt-2 h-[3px] w-full bg-green-600" />

        <table className="mt-4 w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className="px-2 py-1.5 font-semibold">No</th>
              <th className="px-2 py-1.5 font-semibold">Kode Penjualan</th>
              <th className="px-2 py-1.5 font-semibold">Tanggal</th>
              <th className="px-2 py-1.5 font-semibold">Pelanggan</th>
              <th className="px-2 py-1.5 font-semibold">Tipe</th>
              <th className="px-2 py-1.5 text-right font-semibold">Subtotal</th>
              <th className="px-2 py-1.5 text-right font-semibold">Diskon</th>
              <th className="px-2 py-1.5 text-right font-semibold">Pajak</th>
              <th className="px-2 py-1.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-zinc-400">
                  Tidak ada transaksi penjualan pada periode ini
                </td>
              </tr>
            ) : (
              rows.map((inv, i) => {
                const p = pelangganMap.get(inv.pelangganId);
                const subtotal = inv.subtotal ?? inv.total;
                const dpp = inv.dpp ?? subtotal;
                const diskon = subtotal - dpp;
                const pajak = inv.pajak ?? 0;
                return (
                  <Fragment key={inv.id}>
                    <tr className="border-b border-zinc-100 align-top">
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5 font-medium text-zinc-900">{inv.kode}</td>
                      <td className="px-2 py-1.5">{formatDate(inv.tanggal)}</td>
                      <td className="px-2 py-1.5">{p?.nama ?? "-"}</td>
                      <td className="px-2 py-1.5">{p?.tipe || "-"}</td>
                      <td className="px-2 py-1.5 text-right">{formatRupiah(subtotal)}</td>
                      <td className="px-2 py-1.5 text-right">{diskon > 0 ? formatRupiah(diskon) : "-"}</td>
                      <td className="px-2 py-1.5 text-right">{formatRupiah(pajak)}</td>
                      <td className="px-2 py-1.5 text-right font-semibold text-zinc-900">{formatRupiah(inv.total)}</td>
                    </tr>
                    <tr className="border-b border-zinc-100">
                      <td />
                      <td colSpan={8} className="px-2 pb-2">
                        <table className="w-full border-collapse bg-zinc-50 text-[10.5px]">
                          <thead>
                            <tr className="text-zinc-500">
                              <th className="px-2 py-1 text-left font-medium">Detail Item</th>
                              <th className="px-2 py-1 text-left font-medium">Tipe</th>
                              <th className="px-2 py-1 text-right font-medium">Qty</th>
                              <th className="px-2 py-1 text-right font-medium">Harga</th>
                              <th className="px-2 py-1 text-right font-medium">Diskon</th>
                              <th className="px-2 py-1 text-right font-medium">Komisi</th>
                              <th className="px-2 py-1 text-right font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inv.items.map((item, j) => {
                              const rowTotal = hitungTotalSetelahDiskon(
                                item.qty * item.hargaSatuan,
                                item.diskonTipe,
                                item.diskonPersen,
                                item.diskonRp ?? 0
                              );
                              const jasaKomisiPersen = item.tipe === "jasa" ? jasaMap.get(item.itemId)?.komisi : undefined;
                              const komisi = jasaKomisiPersen ? (rowTotal * jasaKomisiPersen) / 100 : 0;
                              return (
                                <tr key={j} className="border-t border-zinc-200">
                                  <td className="px-2 py-1 text-zinc-700">{item.nama}</td>
                                  <td className="px-2 py-1 capitalize text-zinc-500">{item.tipe}</td>
                                  <td className="px-2 py-1 text-right">{item.qty}</td>
                                  <td className="px-2 py-1 text-right">{formatRupiah(item.hargaSatuan)}</td>
                                  <td className="px-2 py-1 text-right">
                                    {item.diskonTipe === "rupiah" ? formatRupiah(item.diskonRp ?? 0) : `${item.diskonPersen}%`}
                                  </td>
                                  <td className="px-2 py-1 text-right">{komisi > 0 ? formatRupiah(komisi) : "-"}</td>
                                  <td className="px-2 py-1 text-right font-medium text-zinc-900">{formatRupiah(rowTotal)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>

        <p className="mt-6 text-center text-[10px] text-zinc-400">
          Dicetak otomatis oleh Sistem {profile.namaPerusahaan} | {formatDate(tanggalCetak.toISOString())},{" "}
          {new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(tanggalCetak).replace(":", ".")}
        </p>
      </div>
    </div>
  );
}
