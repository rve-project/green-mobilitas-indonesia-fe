"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { api } from "@/lib/api";
import { CompanyProfile, Invoice, Kendaraan, Pelanggan } from "@/lib/types";
import { formatDateFull, formatRupiah, hitungTotalSetelahDiskon } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

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
        <Breadcrumb
          items={[
            { label: "Faktur Penjualan", href: "/penjualan/faktur" },
            { label: `Cetak ${JENIS_LABEL[jenis]}` },
          ]}
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
    <div className="relative mx-auto w-[210mm] bg-white p-[12mm] text-[13px] shadow-lg print:w-auto print:shadow-none">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 overflow-hidden">
        <div className="h-40 w-40 -translate-y-8 translate-x-8 rotate-45 bg-green-600" />
      </div>

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Bottom-aligned (items-end on their own sub-row) instead of centered against this
              row's cross-axis. w-auto (not a fixed square w-24/w-12) matters just as much as
              that: GMI's glyph is wide (~1.8:1), so forcing it into a square box would
              letterbox it with empty space top and bottom even post-crop, and items-end would
              then align the EMPTY BOX's bottom, not the glyph's -- Vinfast (~1:1, no
              letterboxing at any box size) would still end up visibly lower than GMI's ink. */}
          <div className="flex shrink-0 items-end gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-gmi-green.png?v=2" alt="Logo" className="h-24 w-auto object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-vinfast.png" alt="Vinfast" className="h-12 w-auto object-contain" />
          </div>
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

      {/* Customer/vehicle box gets more width than the short date/number box beside it
          -- an even 50/50 split was cramping the address into 3-4 wrapped lines. */}
      <div className="mt-4 grid grid-cols-[3fr_2fr] gap-3">
        <div className="rounded-lg border border-zinc-300 p-2.5 text-xs">
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
        <div className="rounded-lg border border-zinc-300 p-2.5 text-xs">
          <p className="text-sm font-bold text-zinc-900">
            {JENIS_LABEL[jenis]}: {nomor}
          </p>
          <Row label="Tanggal" value={formatDateFull(invoice.tanggal)} />
          {jenis !== "kwitansi" && invoice.jatuhTempo && (
            <Row label="Jatuh Tempo" value={formatDateFull(invoice.jatuhTempo)} />
          )}
        </div>
      </div>

      {jenis === "kwitansi" ? (
        <div className="mt-4 space-y-2 rounded-lg border border-zinc-300 p-3 text-xs">
          <Row label="Sejumlah" value={formatRupiah(invoice.dibayar)} bold />
          <Row label="Terbilang" value={terbilang(invoice.dibayar)} />
          <Row label="Untuk Pembayaran" value={`Invoice ${invoice.kode}`} />
          <Row label="Diterima Oleh" value={profile.namaPerusahaan} />
        </div>
      ) : (
        <>
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
              {invoice.items.map((item, i) => {
                const rowTotal = hitungTotalSetelahDiskon(item.qty * item.hargaSatuan, item.diskonTipe, item.diskonPersen, item.diskonRp ?? 0);
                const rowDiskon = item.qty * item.hargaSatuan - rowTotal;
                return (
                  <tr key={`${item.itemId}-${i}`} className="border-b border-zinc-200">
                    <td className="px-2 py-1.5">{item.nama}</td>
                    <td className="px-2 py-1.5 text-right">{item.qty}</td>
                    <td className="px-2 py-1.5">{item.tipe === "jasa" ? "Jasa" : (item.satuan ?? "-")}</td>
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
                {pajakNominal > 0 && (
                  <tr className="border-b border-zinc-200">
                    <td className="py-1 font-medium">Pajak</td>
                    <td className="py-1 text-right">{formatRupiah(pajakNominal)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1 text-sm font-bold">Total</td>
                  <td className="py-1 text-right text-sm font-bold">{formatRupiah(invoice.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg border border-zinc-300 p-3 text-[11px] leading-snug text-zinc-700">
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

      <div className="mt-14 flex justify-between text-center text-xs">
        <div className="w-56">
          <p className="mb-20">{jenis === "kwitansi" ? "Pengirim" : "Pelanggan"}</p>
          <p className="truncate border-t border-zinc-400 pt-1">{pelanggan.nama}</p>
        </div>
        <div className="w-56">
          <p className="mb-20">{jenis === "kwitansi" ? "Penerima" : " "}</p>
          <p className="truncate border-t border-zinc-400 pt-1">{profile.namaPerusahaan}</p>
        </div>
      </div>
    </div>
  );
}

/** Matches bengkel-be/dot.invoices.pdf exactly: full-width bordered/boxed layout (this
 * is continuous tractor-feed dot-matrix paper, close to A4 width -- not a narrow
 * thermal receipt, which is what this component used to render before). Pure black
 * text/borders only -- no color fills, no gradients; a dot-matrix printer can't render
 * either, and the reference document has none. Logo uses /logo-gmi-mono.png (the brand
 * mark recolored solid black on a transparent background -- the original logo-gmi.png
 * is green on an opaque black square, which would print as a big black block). */
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
    <div className="mx-auto w-[190mm] bg-white p-[8mm] text-[10px] leading-tight text-black shadow-lg print:w-auto print:shadow-none">
      {/* Header: title + status on the left, logo top-right */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-bold">{JENIS_LABEL[jenis]}</p>
          {jenis === "proforma" && (
            <p className="mt-0.5 text-[9px] text-zinc-600">Invoice ini bersifat proforma (specimen), belum dibayarkan.</p>
          )}
        </div>
        <div className="flex items-end gap-2">
          {/* items-end + w-auto (not a fixed square w-6/w-10): GMI's glyph is wide (~1.8:1),
              so a square box would letterbox it with empty space top/bottom even post-crop --
              items-end would then align the EMPTY BOX's bottom, not the glyph's, leaving
              Vinfast's (~1:1, no letterboxing) ink visibly lower than GMI's.
              Flat black silhouette, not the chrome/gradient original -- a dot-matrix
              printer can't render gradients (see the component doc comment above about
              /logo-gmi-mono.png). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-vinfast-mono.png" alt="Vinfast" className="h-6 w-auto shrink-0 object-contain" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-gmi-mono.png?v=2" alt="Logo" className="h-10 w-auto shrink-0 object-contain" />
        </div>
      </div>

      <div className="my-2 border-t border-black" />

      {/* Company info + document meta */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold">{profile.namaPerusahaan}</p>
          <p>{profile.alamat}</p>
          <p>
            Telp: {profile.telepon || "-"} {profile.email ? `| Email: ${profile.email}` : ""}
          </p>
        </div>
        <table className="border border-black text-[10px]">
          <tbody>
            <tr>
              <td className="border border-black px-2 py-0.5 font-semibold">No. {JENIS_LABEL[jenis]}</td>
              <td className="border border-black px-2 py-0.5">{nomor}</td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-0.5 font-semibold">Tanggal</td>
              <td className="border border-black px-2 py-0.5">{formatDateFull(invoice.tanggal)}</td>
            </tr>
            {jenis !== "kwitansi" && invoice.jatuhTempo && (
              <tr>
                <td className="border border-black px-2 py-0.5 font-semibold">Jatuh Tempo</td>
                <td className="border border-black px-2 py-0.5">{formatDateFull(invoice.jatuhTempo)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pelanggan / Kendaraan boxes */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="border border-black p-2">
          <p className="font-bold">{jenis === "kwitansi" ? "DITERIMA DARI" : "PELANGGAN"}</p>
          <p>{pelanggan.nama}</p>
          {pelanggan.email && <p>Email: {pelanggan.email}</p>}
          <p>{pelanggan.alamat}</p>
        </div>
        {jenis !== "kwitansi" && (
          <div className="border border-black p-2">
            <p className="font-bold">KENDARAAN</p>
            {kendaraanUtama ? (
              <>
                <p>
                  {kendaraanUtama.merk} {kendaraanUtama.model}
                </p>
                <p>
                  Plat: {kendaraanUtama.platNomor} | Tahun: {kendaraanUtama.tahun} | Warna: {kendaraanUtama.warna ?? "-"}
                  {invoice.kilometer !== undefined ? ` | KM: ${invoice.kilometer}` : ""}
                </p>
              </>
            ) : (
              <p>-</p>
            )}
          </div>
        )}
      </div>

      {jenis === "kwitansi" ? (
        <div className="mt-2 border border-black p-2">
          <p className="font-bold">RINCIAN PEMBAYARAN</p>
          <p>Sejumlah : {formatRupiah(invoice.dibayar)}</p>
          <p>Terbilang : {terbilang(invoice.dibayar)}</p>
          <p>Untuk Pembayaran : Invoice {invoice.kode}</p>
        </div>
      ) : (
        <>
          <p className="mt-2 font-bold">JASA / LAYANAN</p>
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 text-left font-semibold">Layanan</th>
                <th className="border border-black px-2 py-1 text-right font-semibold">Qty</th>
                <th className="border border-black px-2 py-1 text-right font-semibold">Harga</th>
                <th className="border border-black px-2 py-1 text-right font-semibold">Diskon</th>
                <th className="border border-black px-2 py-1 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => {
                const rowTotal = hitungTotalSetelahDiskon(item.qty * item.hargaSatuan, item.diskonTipe, item.diskonPersen, item.diskonRp ?? 0);
                const rowDiskon = item.qty * item.hargaSatuan - rowTotal;
                return (
                  <tr key={`${item.itemId}-${i}`}>
                    <td className="border border-black px-2 py-1">{item.nama}</td>
                    <td className="border border-black px-2 py-1 text-right">
                      {item.qty} {item.tipe === "jasa" ? "" : (item.satuan ?? "")}
                    </td>
                    <td className="border border-black px-2 py-1 text-right">{formatRupiah(item.hargaSatuan)}</td>
                    <td className="border border-black px-2 py-1 text-right">{rowDiskon > 0 ? formatRupiah(rowDiskon) : "-"}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatRupiah(rowTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Signatures (left) + totals box (right), same row like the reference */}
          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="flex flex-1 justify-around text-center">
              <div>
                <p className="mb-28">Pelanggan</p>
                <p className="border-t border-black px-4 pt-0.5">( {pelanggan.nama} )</p>
              </div>
              <div>
                <p className="mb-28">Hormat kami</p>
                <p className="border-t border-black px-4 pt-0.5">( {profile.namaPerusahaan} )</p>
              </div>
            </div>
            <table className="w-56 border-collapse border border-black text-[10px]">
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-0.5">Subtotal</td>
                  <td className="border border-black px-2 py-0.5 text-right">{formatRupiah(subtotal)}</td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-0.5">Diskon</td>
                  <td className="border border-black px-2 py-0.5 text-right">{diskonNominal > 0 ? `-${formatRupiah(diskonNominal)}` : "-"}</td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-0.5">Pajak (PPN)</td>
                  <td className="border border-black px-2 py-0.5 text-right">{pajakNominal > 0 ? formatRupiah(pajakNominal) : "-"}</td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-1 font-bold">TOTAL</td>
                  <td className="border border-black px-2 py-1 text-right font-bold">{formatRupiah(invoice.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-2 border border-black p-2">
            <p className="font-bold">INFORMASI PEMBAYARAN</p>
            <table className="text-[10px]">
              <tbody>
                <tr>
                  <td className="w-24 py-0.5 font-semibold">Bank</td>
                  <td className="py-0.5">: {profile.bankNama || "-"}</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-semibold">No. Rekening</td>
                  <td className="py-0.5">: {profile.bankNoRekening || "-"}</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-semibold">Atas Nama</td>
                  <td className="py-0.5">: {profile.bankAtasNama || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-2 font-bold">KETERANGAN</p>
          <div className="min-h-16 space-y-0.5 border border-black p-2 text-[10px] leading-snug">
            {invoice.metodePembayaran && (
              <p>
                <span className="font-semibold">Cara Bayar</span>: {invoice.metodePembayaran}
              </p>
            )}
            {invoice.catatan && <p>{invoice.catatan}</p>}
            <p className="mt-1 font-semibold">*Catatan:</p>
            <p>- Harap cantumkan nomor invoice ({invoice.kode}) pada berita transfer.</p>
            <p>
              - Kirimkan bukti transfer ke WhatsApp {profile.telepon || "-"} atau email {profile.email || "-"}.
            </p>
            <p className="mt-1">Terima kasih atas kerja samanya!</p>
          </div>
        </>
      )}
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
