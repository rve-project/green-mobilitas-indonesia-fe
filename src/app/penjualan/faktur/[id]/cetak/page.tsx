"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { CompanyProfile, Invoice, Kendaraan, Pelanggan } from "@/lib/types";
import { formatDateFull, formatRupiah, hitungTotalSetelahDiskon, labelDiskon } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";

type Jenis = "invoice" | "proforma" | "kwitansi";
type Format = "a4" | "dot";

const JENIS_LABEL: Record<Jenis, string> = {
  invoice: "INVOICE",
  proforma: "PROFORMA INVOICE",
  kwitansi: "KWITANSI",
};

function nomorDokumen(invoice: Invoice, jenis: Jenis) {
  if (jenis === "proforma") return `${invoice.kode}-PRO`;
  if (jenis === "kwitansi") return `${invoice.kode}-KWT`;
  return invoice.kode;
}

export default function CetakInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jenis = (searchParams.get("jenis") as Jenis) || "invoice";
  const format = (searchParams.get("format") as Format) || "a4";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [pelanggan, setPelanggan] = useState<Pelanggan | null>(null);
  const [kendaraanList, setKendaraanList] = useState<Kendaraan[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .getInvoice(id)
      .then((inv) => {
        setInvoice(inv);
        api.getPelanggan(inv.pelangganId).then(setPelanggan);
      })
      .catch(() => setNotFound(true));
    api.kendaraan().then(setKendaraanList);
    api.getCompanyProfile().then(setProfile);
  }, [id]);

  const ready = Boolean(invoice && pelanggan && profile);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, [ready]);

  if (notFound) {
    return <div className="p-8 text-sm text-zinc-400">Data invoice tidak ditemukan.</div>;
  }
  if (!invoice || !pelanggan || !profile) {
    return <div className="p-8 text-sm text-zinc-400">Memuat dokumen…</div>;
  }

  const kendaraan = kendaraanList.filter((k) => invoice.kendaraanIds?.includes(k.id));
  const subtotal = invoice.subtotal ?? invoice.total;
  const dpp = invoice.dpp ?? subtotal;
  const diskonNominal = subtotal - dpp;
  const pajakNominal = invoice.pajak ?? 0;
  const nomor = nomorDokumen(invoice, jenis);

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      <div className="mx-auto flex max-w-3xl items-center justify-between py-4 print:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
        >
          <Printer className="h-4 w-4" />
          Cetak
        </button>
      </div>

      {format === "dot" ? (
        <DotMatrixDocument
          jenis={jenis}
          nomor={nomor}
          invoice={invoice}
          pelanggan={pelanggan}
          kendaraan={kendaraan}
          profile={profile}
          subtotal={subtotal}
          dpp={dpp}
          diskonNominal={diskonNominal}
          pajakNominal={pajakNominal}
        />
      ) : (
        <A4Document
          jenis={jenis}
          nomor={nomor}
          invoice={invoice}
          pelanggan={pelanggan}
          kendaraan={kendaraan}
          profile={profile}
          subtotal={subtotal}
          dpp={dpp}
          diskonNominal={diskonNominal}
          pajakNominal={pajakNominal}
        />
      )}
    </div>
  );
}

interface DocProps {
  jenis: Jenis;
  nomor: string;
  invoice: Invoice;
  pelanggan: Pelanggan;
  kendaraan: Kendaraan[];
  profile: CompanyProfile;
  subtotal: number;
  dpp: number;
  diskonNominal: number;
  pajakNominal: number;
}

function A4Document({
  jenis,
  nomor,
  invoice,
  pelanggan,
  kendaraan,
  profile,
  subtotal,
  diskonNominal,
  pajakNominal,
}: DocProps) {
  const kendaraanUtama = kendaraan[0];

  return (
    <div className="relative mx-auto w-[210mm] bg-white p-[15mm] shadow-lg print:w-auto print:shadow-none">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 overflow-hidden">
        <div className="h-40 w-40 -translate-y-8 translate-x-8 rotate-45 bg-green-600" />
      </div>

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-gmi.png" alt="Logo" className="h-14 w-14 object-contain" />
          <div>
            <p className="text-2xl font-bold leading-none text-zinc-900">{profile.namaPerusahaan}</p>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-green-700">INDONESIA</p>
            <p className="mt-1 text-xs text-zinc-500">{profile.alamat}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-300 p-3 text-sm">
          {jenis === "kwitansi" ? (
            <>
              <Row label="Diterima Dari" value={pelanggan.nama} bold />
              <Row label="Alamat" value={pelanggan.alamat} />
            </>
          ) : (
            <>
              <Row label="Cust." value={pelanggan.nama} bold />
              <Row label="Alamat" value={pelanggan.alamat} />
              {kendaraanUtama && (
                <>
                  <Row label="NoPol." value={kendaraanUtama.platNomor} />
                  <Row label="Tipe" value={`${kendaraanUtama.merk} ${kendaraanUtama.model}`} />
                  <Row label="Warna" value={kendaraanUtama.warna ?? "-"} />
                </>
              )}
              {invoice.kilometer !== undefined && <Row label="Kilometer" value={`${invoice.kilometer} km`} />}
            </>
          )}
        </div>
        <div className="rounded-lg border border-zinc-300 p-3 text-sm">
          <p className="text-lg font-bold text-zinc-900">
            {JENIS_LABEL[jenis]}: {nomor}
          </p>
          <Row label="Tanggal" value={formatDateFull(invoice.tanggal)} />
          {jenis !== "kwitansi" && invoice.jatuhTempo && (
            <Row label="Jatuh Tempo" value={formatDateFull(invoice.jatuhTempo)} />
          )}
        </div>
      </div>

      {jenis === "kwitansi" ? (
        <div className="mt-6 space-y-3 rounded-lg border border-zinc-300 p-4 text-sm">
          <Row label="Sejumlah" value={formatRupiah(invoice.dibayar)} bold />
          <Row label="Terbilang" value={terbilang(invoice.dibayar)} />
          <Row label="Untuk Pembayaran" value={`Invoice ${invoice.kode}`} />
          <Row label="Diterima Oleh" value={profile.namaPerusahaan} />
        </div>
      ) : (
        <>
          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-green-600 text-left text-white">
                <th className="px-3 py-2 font-semibold">Items</th>
                <th className="px-3 py-2 text-right font-semibold">Qty</th>
                <th className="px-3 py-2 font-semibold">Satuan</th>
                <th className="px-3 py-2 text-right font-semibold">Harga</th>
                <th className="px-3 py-2 text-right font-semibold">Diskon</th>
                <th className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => {
                const rowTotal = hitungTotalSetelahDiskon(item.qty * item.hargaSatuan, item.diskonTipe, item.diskonPersen, item.diskonRp ?? 0);
                const rowDiskon = item.qty * item.hargaSatuan - rowTotal;
                return (
                  <tr key={`${item.itemId}-${i}`} className="border-b border-zinc-200">
                    <td className="px-3 py-2">{item.nama}</td>
                    <td className="px-3 py-2 text-right">{item.qty}</td>
                    <td className="px-3 py-2">{item.tipe === "jasa" ? "Jasa" : (item.satuan ?? "-")}</td>
                    <td className="px-3 py-2 text-right">{formatRupiah(item.hargaSatuan)}</td>
                    <td className="px-3 py-2 text-right">{rowDiskon > 0 ? formatRupiah(rowDiskon) : "-"}</td>
                    <td className="px-3 py-2 text-right">{formatRupiah(rowTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-3 flex justify-end">
            <table className="w-64 text-sm">
              <tbody>
                <tr className="border-b border-zinc-200">
                  <td className="py-1.5 font-medium">Subtotal</td>
                  <td className="py-1.5 text-right">{formatRupiah(subtotal)}</td>
                </tr>
                {diskonNominal > 0 && (
                  <tr className="border-b border-zinc-200">
                    <td className="py-1.5 font-medium">Diskon</td>
                    <td className="py-1.5 text-right">-{formatRupiah(diskonNominal)}</td>
                  </tr>
                )}
                {pajakNominal > 0 && (
                  <tr className="border-b border-zinc-200">
                    <td className="py-1.5 font-medium">Pajak</td>
                    <td className="py-1.5 text-right">{formatRupiah(pajakNominal)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1.5 text-base font-bold">Total</td>
                  <td className="py-1.5 text-right text-base font-bold">{formatRupiah(invoice.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-lg border border-zinc-300 p-4 text-xs leading-relaxed text-zinc-700">
            <p className="font-semibold">PETUNJUK PEMBAYARAN:</p>
            <p>Mohon melakukan transfer pembayaran sebelum tanggal jatuh tempo ke:</p>
            <p>Bank : {profile.bankNama || "-"}</p>
            <p>Nomor Rekening : {profile.bankNoRekening || "-"}</p>
            <p>Atas Nama : {profile.bankAtasNama || "-"}</p>
            <p className="mt-1 font-semibold">*Catatan:</p>
            <p>- Harap cantumkan nomor invoice ({invoice.kode}) pada berita transfer.</p>
            <p>
              - Kirimkan bukti transfer ke WhatsApp {profile.telepon || "-"} atau email {profile.email || "-"}.
            </p>
            <p className="mt-1">Terima kasih atas kerja samanya!</p>
          </div>
        </>
      )}

      <div className="mt-20 flex justify-between text-center text-sm">
        <div>
          <p className="mb-16">{jenis === "kwitansi" ? "Pengirim" : "Pelanggan"}</p>
          <p className="border-t border-zinc-400 pt-1">{pelanggan.nama}</p>
        </div>
        <div>
          <p className="mb-16">{jenis === "kwitansi" ? "Penerima" : ""}</p>
          <p className="border-t border-zinc-400 pt-1">{profile.namaPerusahaan}</p>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-zinc-200 pt-3 text-xs text-zinc-500">
        <span>{profile.telepon}</span>
        <span>{profile.email}</span>
        <span>{profile.alamat}</span>
      </div>
    </div>
  );
}

function DotMatrixDocument({
  jenis,
  nomor,
  invoice,
  pelanggan,
  kendaraan,
  profile,
  subtotal,
  diskonNominal,
  pajakNominal,
}: DocProps) {
  const kendaraanUtama = kendaraan[0];

  return (
    <div className="mx-auto w-[100mm] bg-white p-3 font-mono text-[10px] leading-tight text-black shadow-lg print:w-auto print:shadow-none">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-gmi.png" alt="Logo" className="mb-1 h-10 w-10 object-contain" />
        <p className="font-bold">{profile.namaPerusahaan}</p>
        <p className="tracking-widest">INDONESIA</p>
        <p>{profile.alamat}</p>
        <p>
          {profile.telepon} {profile.email ? `/ ${profile.email}` : ""}
        </p>
      </div>
      <div className="my-1 border-t border-dashed border-black" />
      <p className="text-center font-bold">{JENIS_LABEL[jenis]}</p>
      <p>No : {nomor}</p>
      <p>Tanggal : {formatDateFull(invoice.tanggal)}</p>
      {jenis !== "kwitansi" && invoice.jatuhTempo && <p>Jatuh Tempo : {formatDateFull(invoice.jatuhTempo)}</p>}
      <div className="my-1 border-t border-dashed border-black" />

      {jenis === "kwitansi" ? (
        <>
          <p>Terima dari : {pelanggan.nama}</p>
          <p>Sejumlah : {formatRupiah(invoice.dibayar)}</p>
          <p>Terbilang : {terbilang(invoice.dibayar)}</p>
          <p>Untuk : Invoice {invoice.kode}</p>
        </>
      ) : (
        <>
          <p>Cust. : {pelanggan.nama}</p>
          <p>Alamat : {pelanggan.alamat}</p>
          {kendaraanUtama && (
            <>
              <p>
                NoPol : {kendaraanUtama.platNomor} ({kendaraanUtama.merk} {kendaraanUtama.model})
              </p>
              <p>Warna : {kendaraanUtama.warna ?? "-"}</p>
            </>
          )}
          {invoice.kilometer !== undefined && <p>KM : {invoice.kilometer}</p>}
          <div className="my-1 border-t border-dashed border-black" />
          {invoice.items.map((item, i) => {
            const rowTotal = hitungTotalSetelahDiskon(item.qty * item.hargaSatuan, item.diskonTipe, item.diskonPersen, item.diskonRp ?? 0);
            return (
              <div key={`${item.itemId}-${i}`} className="mb-0.5">
                <p>{item.nama}</p>
                <div className="flex justify-between">
                  <span>
                    {item.qty} {item.tipe === "jasa" ? "Jasa" : (item.satuan ?? "")} x {formatRupiah(item.hargaSatuan)}
                    {labelDiskon(item) ? ` (${labelDiskon(item)})` : ""}
                  </span>
                  <span>{formatRupiah(rowTotal)}</span>
                </div>
              </div>
            );
          })}
          <div className="my-1 border-t border-dashed border-black" />
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          {diskonNominal > 0 && (
            <div className="flex justify-between">
              <span>Diskon</span>
              <span>-{formatRupiah(diskonNominal)}</span>
            </div>
          )}
          {pajakNominal > 0 && (
            <div className="flex justify-between">
              <span>Pajak</span>
              <span>{formatRupiah(pajakNominal)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{formatRupiah(invoice.total)}</span>
          </div>
          <div className="my-1 border-t border-dashed border-black" />
          <p className="font-bold">TRANSFER KE:</p>
          <p>Bank : {profile.bankNama || "-"}</p>
          <p>No. Rek : {profile.bankNoRekening || "-"}</p>
          <p>a.n : {profile.bankAtasNama || "-"}</p>
          <p>Cantumkan no. invoice ({invoice.kode}) pada berita transfer.</p>
        </>
      )}

      <div className="my-1 border-t border-dashed border-black" />
      <div className="mt-6 flex justify-between text-center">
        <div>
          <p>{jenis === "kwitansi" ? "Pengirim" : "Pelanggan"}</p>
          <p className="mt-6 border-t border-black pt-0.5">( {pelanggan.nama} )</p>
        </div>
        <div>
          <p>{jenis === "kwitansi" ? "Penerima" : "Hormat kami"}</p>
          <p className="mt-6 border-t border-black pt-0.5">( {profile.namaPerusahaan} )</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-zinc-500">{label}</span>
      <span className={`flex-1 ${bold ? "font-semibold text-zinc-900" : "text-zinc-700"}`}>: {value}</span>
    </div>
  );
}
