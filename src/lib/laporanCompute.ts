import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ClipboardCheck,
  Package,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  ShoppingCart,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  Barang,
  Invoice,
  Lokasi,
  PemasukanLain,
  PengeluaranBarang,
  PengeluaranLain,
  Pembelian,
  PenerimaanBarang,
  Retur,
  ReturPembelian,
  StokOpname,
} from "./types";
import { formatDate, formatRupiah } from "./format";

export type Category = "transaksi" | "stok" | "keuangan" | "aset";
export type ReportKey =
  | "penjualan"
  | "pembelian"
  | "penerimaan-barang"
  | "pengeluaran-barang"
  | "mutasi-stok"
  | "retur-pembelian"
  | "retur-penjualan"
  | "stok-opname"
  | "stok-per-lokasi"
  | "laba-rugi";

export interface ReportDef {
  key: ReportKey;
  label: string;
  icon: LucideIcon;
  kategori: Category;
  deskripsi: string;
  periodBased: boolean;
}

export const REPORTS: ReportDef[] = [
  { key: "penjualan", label: "Penjualan", icon: ShoppingCart, kategori: "transaksi", deskripsi: "Laporan transaksi penjualan berdasarkan periode", periodBased: true },
  { key: "pembelian", label: "Pembelian", icon: Package, kategori: "transaksi", deskripsi: "Laporan transaksi pembelian berdasarkan periode", periodBased: true },
  { key: "penerimaan-barang", label: "Penerimaan Barang", icon: ArrowDownToLine, kategori: "transaksi", deskripsi: "Laporan penerimaan barang masuk berdasarkan periode", periodBased: true },
  { key: "pengeluaran-barang", label: "Pengeluaran Barang", icon: ArrowUpFromLine, kategori: "transaksi", deskripsi: "Laporan pengeluaran barang keluar berdasarkan periode", periodBased: true },
  { key: "mutasi-stok", label: "Mutasi Stok", icon: RefreshCcw, kategori: "stok", deskripsi: "Ringkasan pergerakan stok masuk & keluar berdasarkan periode", periodBased: true },
  { key: "retur-pembelian", label: "Retur Pembelian", icon: RotateCcw, kategori: "transaksi", deskripsi: "Laporan retur pembelian ke supplier berdasarkan periode", periodBased: true },
  { key: "retur-penjualan", label: "Retur Penjualan", icon: RotateCw, kategori: "transaksi", deskripsi: "Laporan retur penjualan dari pelanggan berdasarkan periode", periodBased: true },
  { key: "stok-opname", label: "Stok Opname", icon: ClipboardCheck, kategori: "stok", deskripsi: "Laporan hasil stok opname berdasarkan periode", periodBased: true },
  { key: "stok-per-lokasi", label: "Stok per Lokasi", icon: Boxes, kategori: "stok", deskripsi: "Ringkasan stok saat ini per lokasi penyimpanan", periodBased: false },
  { key: "laba-rugi", label: "Laba Rugi", icon: TrendingUp, kategori: "keuangan", deskripsi: "Ringkasan laba rugi sederhana berdasarkan periode", periodBased: true },
];

export interface ReportResult {
  summary: { label: string; value: string }[];
  columns: string[];
  rows: string[][];
}

export interface LaporanDataset {
  invoice: Invoice[];
  pembelian: Pembelian[];
  penerimaanBarang: PenerimaanBarang[];
  pengeluaranBarang: PengeluaranBarang[];
  retur: Retur[];
  returPembelian: ReturPembelian[];
  stokOpname: StokOpname[];
  pemasukanLain: PemasukanLain[];
  pengeluaranLain: PengeluaranLain[];
  allBarang: Barang[];
  lokasiList: Lokasi[];
  pelangganMap: Map<string, string>;
  supplierMap: Map<string, string>;
  barangMap: Map<string, Barang>;
  invoiceKodeMap: Map<string, string>;
  pembelianKodeMap: Map<string, string>;
}

function humanize(s: string) {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export interface StokPerLokasiFilter {
  lokasi?: string;
  subLokasi?: string;
  cariItem?: string;
}

export function computeReport(
  key: ReportKey,
  period: { start: Date; end: Date },
  d: LaporanDataset,
  stokPerLokasiFilter?: StokPerLokasiFilter
): ReportResult {
  function inPeriod(iso: string) {
    const t = new Date(iso).getTime();
    return t >= period.start.getTime() && t < period.end.getTime();
  }

  switch (key) {
    case "penjualan": {
      const rows = d.invoice.filter((i) => inPeriod(i.tanggal));
      const totalOmzet = rows.reduce((s, i) => s + i.total, 0);
      const totalDibayar = rows.reduce((s, i) => s + i.dibayar, 0);
      return {
        summary: [
          { label: "Jumlah Transaksi", value: String(rows.length) },
          { label: "Total Omzet", value: formatRupiah(totalOmzet) },
          { label: "Total Dibayar", value: formatRupiah(totalDibayar) },
          { label: "Outstanding", value: formatRupiah(Math.max(0, totalOmzet - totalDibayar)) },
        ],
        columns: ["Kode", "Tanggal", "Pelanggan", "Total", "Dibayar", "Status"],
        rows: rows.map((i) => [
          i.kode,
          formatDate(i.tanggal),
          d.pelangganMap.get(i.pelangganId) ?? "-",
          formatRupiah(i.total),
          formatRupiah(i.dibayar),
          humanize(i.statusPembayaran),
        ]),
      };
    }
    case "pembelian": {
      const rows = d.pembelian.filter((p) => inPeriod(p.tanggal));
      const totalOmzet = rows.reduce((s, p) => s + p.total, 0);
      const totalDibayar = rows.reduce((s, p) => s + p.dibayar, 0);
      const totalQty = rows.reduce((s, p) => s + p.items.reduce((si, it) => si + it.qty, 0), 0);
      return {
        summary: [
          { label: "Jumlah Transaksi", value: String(rows.length) },
          { label: "Total Qty Dibeli", value: String(totalQty) },
          { label: "Total Pembelian", value: formatRupiah(totalOmzet) },
          { label: "Total Dibayar", value: formatRupiah(totalDibayar) },
          { label: "Outstanding", value: formatRupiah(Math.max(0, totalOmzet - totalDibayar)) },
        ],
        columns: ["Kode", "Tanggal", "Supplier", "Total Qty", "Stok Sekarang", "Total", "Dibayar", "Status"],
        rows: rows.map((p) => [
          p.kode,
          formatDate(p.tanggal),
          d.supplierMap.get(p.supplierId) ?? "-",
          String(p.items.reduce((si, it) => si + it.qty, 0)),
          p.items.map((it) => String(d.barangMap.get(it.itemId)?.stok ?? "-")).join(", "),
          formatRupiah(p.total),
          formatRupiah(p.dibayar),
          humanize(p.statusPembayaran),
        ]),
      };
    }
    case "penerimaan-barang": {
      const rows = d.penerimaanBarang.filter((p) => inPeriod(p.tanggal));
      const totalNilai = rows.reduce((s, p) => s + p.items.reduce((si, it) => si + (it.hargaSatuan ?? 0) * it.jumlah, 0), 0);
      const totalItem = rows.reduce((s, p) => s + p.items.length, 0);
      return {
        summary: [
          { label: "Jumlah Dokumen", value: String(rows.length) },
          { label: "Total Baris Item", value: String(totalItem) },
          { label: "Total Nilai", value: formatRupiah(totalNilai) },
        ],
        columns: ["Kode", "Tanggal", "Alasan", "Jumlah Item", "Total Nilai", "Status"],
        rows: rows.map((p) => [
          p.kode,
          formatDate(p.tanggal),
          p.alasan || "-",
          String(p.items.length),
          formatRupiah(p.items.reduce((si, it) => si + (it.hargaSatuan ?? 0) * it.jumlah, 0)),
          humanize(p.status),
        ]),
      };
    }
    case "pengeluaran-barang": {
      const rows = d.pengeluaranBarang.filter((p) => inPeriod(p.tanggal));
      const totalNilai = rows.reduce((s, p) => s + p.items.reduce((si, it) => si + (it.hargaSatuan ?? 0) * it.jumlah, 0), 0);
      const totalItem = rows.reduce((s, p) => s + p.items.length, 0);
      return {
        summary: [
          { label: "Jumlah Dokumen", value: String(rows.length) },
          { label: "Total Baris Item", value: String(totalItem) },
          { label: "Total Nilai", value: formatRupiah(totalNilai) },
        ],
        columns: ["Kode", "Tanggal", "Alasan", "Jumlah Item", "Total Nilai", "Status"],
        rows: rows.map((p) => [
          p.kode,
          formatDate(p.tanggal),
          p.alasan || "-",
          String(p.items.length),
          formatRupiah(p.items.reduce((si, it) => si + (it.hargaSatuan ?? 0) * it.jumlah, 0)),
          humanize(p.status),
        ]),
      };
    }
    case "mutasi-stok": {
      const masuk = d.penerimaanBarang
        .filter((p) => inPeriod(p.tanggal))
        .map((p) => ({
          tanggal: p.tanggal,
          jenis: "Masuk",
          kode: p.kode,
          jumlahItem: p.items.length,
          nilai: p.items.reduce((si, it) => si + (it.hargaSatuan ?? 0) * it.jumlah, 0),
        }));
      const keluar = d.pengeluaranBarang
        .filter((p) => inPeriod(p.tanggal))
        .map((p) => ({
          tanggal: p.tanggal,
          jenis: "Keluar",
          kode: p.kode,
          jumlahItem: p.items.length,
          nilai: p.items.reduce((si, it) => si + (it.hargaSatuan ?? 0) * it.jumlah, 0),
        }));
      const combined = [...masuk, ...keluar].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      const totalNilaiMasuk = masuk.reduce((s, m) => s + m.nilai, 0);
      const totalNilaiKeluar = keluar.reduce((s, m) => s + m.nilai, 0);
      return {
        summary: [
          { label: "Dokumen Masuk", value: String(masuk.length) },
          { label: "Dokumen Keluar", value: String(keluar.length) },
          { label: "Nilai Masuk", value: formatRupiah(totalNilaiMasuk) },
          { label: "Nilai Keluar", value: formatRupiah(totalNilaiKeluar) },
        ],
        columns: ["Tanggal", "Jenis", "Kode", "Jumlah Item", "Nilai"],
        rows: combined.map((m) => [formatDate(m.tanggal), m.jenis, m.kode, String(m.jumlahItem), formatRupiah(m.nilai)]),
      };
    }
    case "retur-pembelian": {
      const rows = d.returPembelian.filter((r) => inPeriod(r.tanggal));
      const totalNilai = rows.reduce((s, r) => s + r.total, 0);
      return {
        summary: [
          { label: "Jumlah Retur", value: String(rows.length) },
          { label: "Total Nilai Retur", value: formatRupiah(totalNilai) },
        ],
        columns: ["Kode", "Tanggal", "Pembelian Terkait", "Total"],
        rows: rows.map((r) => [r.kode, formatDate(r.tanggal), d.pembelianKodeMap.get(r.pembelianId) ?? "-", formatRupiah(r.total)]),
      };
    }
    case "retur-penjualan": {
      const rows = d.retur.filter((r) => inPeriod(r.tanggal));
      const totalNilai = rows.reduce((s, r) => s + r.total, 0);
      return {
        summary: [
          { label: "Jumlah Retur", value: String(rows.length) },
          { label: "Total Nilai Retur", value: formatRupiah(totalNilai) },
        ],
        columns: ["Kode", "Tanggal", "Invoice Terkait", "Total", "Status"],
        rows: rows.map((r) => [
          r.kode,
          formatDate(r.tanggal),
          d.invoiceKodeMap.get(r.invoiceId) ?? "-",
          formatRupiah(r.total),
          humanize(r.status),
        ]),
      };
    }
    case "stok-opname": {
      const rows = d.stokOpname.filter((o) => inPeriod(o.tanggal));
      const totalItem = rows.reduce((s, o) => s + o.items.length, 0);
      const totalSelisih = rows.reduce((s, o) => s + o.totalSelisihItem, 0);
      return {
        summary: [
          { label: "Jumlah Opname", value: String(rows.length) },
          { label: "Total Item Diperiksa", value: String(totalItem) },
          { label: "Total Item Selisih", value: String(totalSelisih) },
        ],
        columns: ["Kode", "Tanggal", "Lokasi", "Jumlah Item", "Item Selisih"],
        rows: rows.map((o) => [o.kode, formatDate(o.tanggal), o.lokasi, String(o.items.length), String(o.totalSelisihItem)]),
      };
    }
    case "stok-per-lokasi": {
      const lokasiFilter = stokPerLokasiFilter?.lokasi?.trim();
      const subLokasiFilter = stokPerLokasiFilter?.subLokasi?.trim().toLowerCase();
      const cariItemFilter = stokPerLokasiFilter?.cariItem?.trim().toLowerCase();

      const rowsData: { kode: string; nama: string; lokasi: string; subLokasi: string; qty: number; satuan: string }[] = [];
      d.allBarang.forEach((b) => {
        if (cariItemFilter && !b.kode.toLowerCase().includes(cariItemFilter) && !b.nama.toLowerCase().includes(cariItemFilter)) {
          return;
        }
        b.stokLokasi.forEach((sl) => {
          if (lokasiFilter && sl.lokasi !== lokasiFilter) return;
          if (subLokasiFilter && !(sl.rak ?? "").toLowerCase().includes(subLokasiFilter)) return;
          rowsData.push({ kode: b.kode, nama: b.nama, lokasi: sl.lokasi, subLokasi: sl.rak || "-", qty: sl.jumlah, satuan: sl.satuan });
        });
      });
      rowsData.sort((a, b) => a.nama.localeCompare(b.nama));

      return {
        summary: [
          { label: "Total Items", value: String(rowsData.length) },
          { label: "Total Qty", value: String(rowsData.reduce((s, r) => s + r.qty, 0)) },
        ],
        columns: ["Kode Item", "Nama Item", "Lokasi", "Sub Lokasi", "Qty System", "Unit"],
        rows: rowsData.map((r) => [r.kode, r.nama, r.lokasi, r.subLokasi, String(r.qty), r.satuan]),
      };
    }
    case "laba-rugi": {
      const invoicesInPeriod = d.invoice.filter((i) => inPeriod(i.tanggal));
      const omzetNetto = invoicesInPeriod.reduce((s, i) => s + Math.max(0, i.total - (i.returTotal ?? 0)), 0);
      const hpp = invoicesInPeriod.reduce((s, i) => {
        const itemCost = i.items.reduce((si, it) => {
          if (it.tipe !== "barang") return si;
          const barang = d.barangMap.get(it.itemId);
          return si + (barang?.hargaBeli ?? 0) * it.qty;
        }, 0);
        return s + itemCost;
      }, 0);
      const pemasukanLainTotal = d.pemasukanLain
        .filter((p) => inPeriod(p.tanggal) && p.status === "selesai")
        .reduce((s, p) => s + p.jumlah, 0);
      const pengeluaranLainTotal = d.pengeluaranLain
        .filter((p) => inPeriod(p.tanggal) && p.status === "selesai")
        .reduce((s, p) => s + p.jumlah, 0);
      const labaKotor = omzetNetto - hpp;
      const labaBersih = labaKotor + pemasukanLainTotal - pengeluaranLainTotal;
      return {
        summary: [
          { label: "Omzet (Netto)", value: formatRupiah(omzetNetto) },
          { label: "Laba Kotor", value: formatRupiah(labaKotor) },
          { label: "Laba Bersih", value: formatRupiah(labaBersih) },
        ],
        columns: ["Komponen", "Nilai"],
        rows: [
          ["Omzet Penjualan (Netto)", formatRupiah(omzetNetto)],
          ["Harga Pokok Penjualan (HPP)", formatRupiah(hpp)],
          ["Laba Kotor", formatRupiah(labaKotor)],
          ["Pemasukan Lain", formatRupiah(pemasukanLainTotal)],
          ["Pengeluaran Lain", formatRupiah(pengeluaranLainTotal)],
          ["Laba Bersih", formatRupiah(labaBersih)],
        ],
      };
    }
  }
}

const BULAN_NAMA = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function periodRangeFromSearchParams(params: URLSearchParams): { start: Date; end: Date; label: string } {
  const mode = params.get("mode") === "rentang" ? "rentang" : "bulanan";
  if (mode === "rentang") {
    const mulai = params.get("mulai") || "";
    const selesai = params.get("selesai") || "";
    const start = mulai ? new Date(mulai) : new Date(0);
    const end = selesai ? new Date(new Date(selesai).getTime() + 24 * 60 * 60 * 1000) : new Date();
    const label = `${mulai ? formatDate(mulai) : "-"} s/d ${selesai ? formatDate(selesai) : "-"}`;
    return { start, end, label };
  }
  const bulan = Number(params.get("bulan")) || new Date().getMonth() + 1;
  const tahun = Number(params.get("tahun")) || new Date().getFullYear();
  return {
    start: new Date(tahun, bulan - 1, 1),
    end: new Date(tahun, bulan, 1),
    label: `${BULAN_NAMA[bulan - 1]} ${tahun}`,
  };
}

export async function fetchLaporanDataset(api: typeof import("./api").api): Promise<LaporanDataset> {
  const [
    invoice,
    pembelian,
    penerimaanBarang,
    pengeluaranBarang,
    retur,
    returPembelian,
    stokOpname,
    pemasukanLain,
    pengeluaranLain,
    pelanggan,
    supplier,
    barangRes,
    lokasiList,
  ] = await Promise.all([
    api.invoice(),
    api.pembelian(),
    api.penerimaanBarang(),
    api.pengeluaranBarang(),
    api.retur(),
    api.returPembelian(),
    api.stokOpname(),
    api.pemasukanLain(),
    api.pengeluaranLain(),
    api.pelanggan(),
    api.supplier(),
    api.barang({ limit: 1000 }),
    api.lokasi(),
  ]);

  return {
    invoice,
    pembelian,
    penerimaanBarang,
    pengeluaranBarang,
    retur,
    returPembelian,
    stokOpname,
    pemasukanLain,
    pengeluaranLain,
    allBarang: barangRes.data,
    lokasiList,
    pelangganMap: new Map(pelanggan.map((p) => [p.id, p.nama])),
    supplierMap: new Map(supplier.map((s) => [s.id, s.nama])),
    barangMap: new Map(barangRes.data.map((b) => [b.id, b])),
    invoiceKodeMap: new Map(invoice.map((i) => [i.id, i.kode])),
    pembelianKodeMap: new Map(pembelian.map((p) => [p.id, p.kode])),
  };
}
