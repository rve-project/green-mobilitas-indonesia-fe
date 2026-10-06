"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import clsx from "clsx";
import { Printer } from "lucide-react";
import { api } from "@/lib/api";
import { CompanyProfile, Invoice, Kendaraan, Pelanggan } from "@/lib/types";
import { formatDateFull, formatRupiah } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { statusPekerjaanConfig } from "@/lib/statusPekerjaan";

const STATUS_PEMBAYARAN_CONFIG: Record<Invoice["statusPembayaran"], { label: string; className: string }> = {
  belum_dibayar: { label: "Belum Dibayar", className: "bg-red-50 text-red-500" },
  dibayar_setengah: { label: "Dibayar Sebagian", className: "bg-amber-50 text-amber-600" },
  lunas: { label: "Lunas", className: "bg-emerald-50 text-emerald-600" },
};

export default function CetakRingkasanPembelianPage() {
  const { id } = useParams<{ id: string }>();

  const [pelanggan, setPelanggan] = useState<Pelanggan | null>(null);
  const [invoice, setInvoice] = useState<Invoice[]>([]);
  const [kendaraanList, setKendaraanList] = useState<Kendaraan[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .getPelanggan(id)
      .then(setPelanggan)
      .catch(() => setNotFound(true));
    api.invoice().then(setInvoice);
    api.kendaraan().then(setKendaraanList);
    api.getCompanyProfile().then(setProfile);
  }, [id]);

  const invoiceMilik = useMemo(
    () => invoice.filter((inv) => inv.pelangganId === id).sort((a, b) => a.kode.localeCompare(b.kode)),
    [invoice, id]
  );

  const kendaraanLabel = (inv: Invoice) =>
    kendaraanList
      .filter((k) => inv.kendaraanIds?.includes(k.id))
      .map((k) => `${k.merk} ${k.model}`)
      .join(", ");
  const platLabel = (inv: Invoice) =>
    kendaraanList
      .filter((k) => inv.kendaraanIds?.includes(k.id))
      .map((k) => k.platNomor)
      .join(", ");

  const ringkasan = useMemo(() => {
    const totalJumlah = invoiceMilik.reduce((sum, inv) => sum + inv.total, 0);
    const totalDibayar = invoiceMilik.reduce((sum, inv) => sum + inv.dibayar, 0);
    const sisaPiutang = invoiceMilik.reduce((sum, inv) => {
      const net = inv.total - (inv.returTotal ?? 0);
      return sum + Math.max(0, net - inv.dibayar);
    }, 0);
    return { totalTransaksi: invoiceMilik.length, totalJumlah, totalDibayar, sisaPiutang };
  }, [invoiceMilik]);

  if (notFound) {
    return <div className="p-8 text-sm text-zinc-400">Data pelanggan tidak ditemukan.</div>;
  }
  if (!pelanggan || !profile) {
    return <div className="p-8 text-sm text-zinc-400">Memuat dokumen…</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      <div className="mx-auto flex max-w-3xl items-center justify-between py-4 print:hidden">
        <Breadcrumb
          items={[
            { label: "Pelanggan", href: "/pelanggan" },
            { label: pelanggan.nama, href: `/pelanggan/${pelanggan.id}` },
            { label: "Cetak Ringkasan Pembelian" },
          ]}
        />
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
        >
          <Printer className="h-4 w-4" />
          Cetak / Simpan PDF
        </button>
      </div>

      <div className="mx-auto w-[210mm] bg-white p-[12mm] text-[13px] shadow-lg print:w-auto print:shadow-none">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-gmi-green.png" alt="Logo" className="h-16 w-16 object-contain" />
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

        <p className="mt-6 text-lg font-bold text-zinc-900">RINGKASAN PEMBELIAN PELANGGAN</p>

        <div className="mt-3 rounded-lg border border-zinc-300 p-2.5 text-xs">
          <Row label="Nama Pelanggan" value={pelanggan.nama} bold />
          <Row label="Kode Pelanggan" value={pelanggan.kode} />
          {pelanggan.alamat && <Row label="Alamat" value={pelanggan.alamat} />}
          {pelanggan.telepon && <Row label="No. Handphone" value={pelanggan.telepon} />}
          <Row label="Tanggal Cetak" value={formatDateFull(new Date().toISOString())} />
        </div>

        <table className="mt-4 w-full border-collapse border border-zinc-300 text-xs">
          <tbody>
            <tr>
              <Stat label="Total Transaksi" value={String(ringkasan.totalTransaksi)} />
              <Stat label="Total Jumlah" value={formatRupiah(ringkasan.totalJumlah)} />
              <Stat label="Total Dibayar" value={formatRupiah(ringkasan.totalDibayar)} />
              <Stat label="Sisa Piutang" value={formatRupiah(ringkasan.sisaPiutang)} last />
            </tr>
          </tbody>
        </table>

        <p className="mt-6 mb-2 text-sm font-semibold text-zinc-900">Daftar Transaksi</p>
        {invoiceMilik.length === 0 ? (
          <p className="text-xs text-zinc-400">Belum ada transaksi.</p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-green-600 text-left text-white">
                <th className="px-2 py-1.5 font-semibold">Kode</th>
                <th className="px-2 py-1.5 font-semibold">Kendaraan</th>
                <th className="px-2 py-1.5 font-semibold">Plat Nomor</th>
                <th className="px-2 py-1.5 font-semibold">Tgl Penjualan</th>
                <th className="px-2 py-1.5 text-right font-semibold">Total</th>
                <th className="px-2 py-1.5 font-semibold">Status Pengerjaan</th>
                <th className="px-2 py-1.5 font-semibold">Pembayaran</th>
              </tr>
            </thead>
            <tbody>
              {invoiceMilik.map((inv) => (
                <tr key={inv.id} className="border-b border-zinc-200">
                  <td className="px-2 py-1.5">{inv.kode}</td>
                  <td className="px-2 py-1.5">{kendaraanLabel(inv) || "-"}</td>
                  <td className="px-2 py-1.5">{platLabel(inv) || "-"}</td>
                  <td className="px-2 py-1.5">{formatDateFull(inv.tanggal)}</td>
                  <td className="px-2 py-1.5 text-right">{formatRupiah(inv.total)}</td>
                  <td className="px-2 py-1.5">
                    <Pill {...statusPekerjaanConfig(inv.statusPekerjaan)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Pill {...STATUS_PEMBAYARAN_CONFIG[inv.statusPembayaran]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-zinc-500">{label}</span>
      <span className={clsx("flex-1", bold && "font-semibold text-zinc-900")}>: {value}</span>
    </div>
  );
}

function Stat({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <td className={clsx("border-zinc-300 px-2 py-1.5 text-center", !last && "border-r", "border")}>
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className="text-sm font-bold text-zinc-900">{value}</p>
    </td>
  );
}

function Pill({ label, className }: { label: string; className: string }) {
  return <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold", className)}>{label}</span>;
}
