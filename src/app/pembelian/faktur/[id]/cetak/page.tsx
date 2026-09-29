"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { api } from "@/lib/api";
import { CompanyProfile, Pembelian, Supplier } from "@/lib/types";
import { formatDateFull, formatRupiah, hitungTotalSetelahDiskon } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export default function CetakPembelianPage() {
  const { id } = useParams<{ id: string }>();

  const [pembelian, setPembelian] = useState<Pembelian | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .getPembelian(id)
      .then((p) => {
        setPembelian(p);
        api.getSupplier(p.supplierId).then(setSupplier);
      })
      .catch(() => setNotFound(true));
    api.getCompanyProfile().then(setProfile);
  }, [id]);

  if (notFound) {
    return <div className="p-8 text-sm text-zinc-400">Data invoice tidak ditemukan.</div>;
  }
  if (!pembelian || !supplier || !profile) {
    return <div className="p-8 text-sm text-zinc-400">Memuat dokumen…</div>;
  }

  const subtotal = pembelian.subtotal ?? pembelian.total;
  const dpp = pembelian.dpp ?? subtotal;
  const diskonNominal = subtotal - dpp;
  const pajakNominal = pembelian.pajak ?? 0;
  const bebasPpn = pembelian.bebasPpn ?? false;
  const ongkir = pembelian.biayaPengiriman ?? 0;
  const lainnya = pembelian.biayaLainnya ?? 0;

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      <div className="mx-auto flex max-w-3xl items-center justify-between py-4 print:hidden">
        <Breadcrumb
          items={[{ label: "Faktur Pembelian", href: "/pembelian/faktur" }, { label: "Cetak Dokumen" }]}
          className=""
        />
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
        >
          <Printer className="h-4 w-4" />
          Cetak
        </button>
      </div>

      <div className="relative mx-auto w-[210mm] bg-white p-[12mm] text-[13px] shadow-lg print:w-auto print:shadow-none">
        <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 overflow-hidden">
          <div className="h-40 w-40 -translate-y-8 translate-x-8 rotate-45 bg-green-600" />
        </div>

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-gmi-green.png" alt="Logo" className="h-11 w-11 object-contain" />
            <div>
              <p className="text-lg font-bold leading-none text-zinc-900">{profile.namaPerusahaan}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{profile.alamat}</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {profile.telepon}
                {profile.telepon && profile.email ? " · " : ""}
                {profile.email}
              </p>
            </div>
          </div>
        </div>

        {/* Supplier box gets more width than the short date/number box beside it -- an
            even 50/50 split was cramping the address into several wrapped lines. */}
        <div className="mt-4 grid grid-cols-[3fr_2fr] gap-3">
          <div className="rounded-lg border border-zinc-300 p-2.5 text-xs">
            <Row label="Supplier" value={supplier.nama} bold />
            <Row label="Alamat" value={supplier.alamat} />
            <Row label="Telepon" value={supplier.telepon || "-"} />
          </div>
          <div className="rounded-lg border border-zinc-300 p-2.5 text-xs">
            <p className="text-sm font-bold text-zinc-900">INVOICE PEMBELIAN: {pembelian.kode}</p>
            <Row label="Tanggal" value={formatDateFull(pembelian.tanggal)} />
            {pembelian.jatuhTempo && <Row label="Jatuh Tempo" value={formatDateFull(pembelian.jatuhTempo)} />}
            {pembelian.syaratPembayaran && <Row label="Syarat" value={pembelian.syaratPembayaran} />}
          </div>
        </div>

        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-green-600 text-left text-white">
              <th className="px-2 py-1.5 font-semibold">Items</th>
              <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
              <th className="px-2 py-1.5 font-semibold">Satuan</th>
              <th className="px-2 py-1.5 text-right font-semibold">Harga</th>
              <th className="px-2 py-1.5 text-right font-semibold">Diskon</th>
              <th className="px-2 py-1.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {pembelian.items.map((item, i) => {
              const gross = item.qty * item.hargaSatuan;
              const rowTotal = hitungTotalSetelahDiskon(gross, item.diskonTipe, item.diskonPersen, item.diskonRp ?? 0);
              const rowDiskon = gross - rowTotal;
              return (
                <tr key={`${item.itemId}-${i}`} className="border-b border-zinc-200">
                  <td className="px-2 py-1.5">{item.nama}</td>
                  <td className="px-2 py-1.5 text-right">{item.qty}</td>
                  <td className="px-2 py-1.5">{item.satuan ?? "-"}</td>
                  <td className="px-2 py-1.5 text-right">{formatRupiah(item.hargaSatuan)}</td>
                  <td className="px-2 py-1.5 text-right">{rowDiskon > 0 ? formatRupiah(rowDiskon) : "-"}</td>
                  <td className="px-2 py-1.5 text-right">{formatRupiah(rowTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-2 flex justify-end">
          <table className="w-60 text-xs">
            <tbody>
              <tr className="border-b border-zinc-200">
                <td className="py-1 font-medium">Subtotal</td>
                <td className="py-1 text-right">{formatRupiah(subtotal)}</td>
              </tr>
              {diskonNominal > 0 && (
                <tr className="border-b border-zinc-200">
                  <td className="py-1 font-medium">Diskon</td>
                  <td className="py-1 text-right">-{formatRupiah(diskonNominal)}</td>
                </tr>
              )}
              <tr className="border-b border-zinc-200">
                <td className="py-1 font-medium">{bebasPpn ? "Pajak (Bebas PPN)" : `Pajak (${pembelian.pajakPersen ?? 0}%)`}</td>
                <td className="py-1 text-right">{formatRupiah(pajakNominal)}</td>
              </tr>
              {ongkir > 0 && (
                <tr className="border-b border-zinc-200">
                  <td className="py-1 font-medium">Biaya Pengiriman</td>
                  <td className="py-1 text-right">{formatRupiah(ongkir)}</td>
                </tr>
              )}
              {lainnya > 0 && (
                <tr className="border-b border-zinc-200">
                  <td className="py-1 font-medium">Biaya Lainnya</td>
                  <td className="py-1 text-right">{formatRupiah(lainnya)}</td>
                </tr>
              )}
              <tr>
                <td className="py-1 text-sm font-bold">Total</td>
                <td className="py-1 text-right text-sm font-bold">{formatRupiah(pembelian.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-14 flex justify-between text-center text-xs">
          <div className="w-56">
            <p className="mb-20">Supplier</p>
            <p className="truncate border-t border-zinc-400 pt-1">{supplier.nama}</p>
          </div>
          <div className="w-56">
            <p className="mb-20">&nbsp;</p>
            <p className="truncate border-t border-zinc-400 pt-1">{profile.namaPerusahaan}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-2 text-[10px] text-zinc-500">
          <span>{profile.telepon}</span>
          <span>{profile.email}</span>
          <span>{profile.alamat}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-zinc-500">{label}</span>
      <span className={`flex-1 ${bold ? "font-semibold text-zinc-900" : "text-zinc-700"}`}>: {value}</span>
    </div>
  );
}
