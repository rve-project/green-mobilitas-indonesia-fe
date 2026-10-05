"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Download, FileText, Printer, RefreshCcw } from "lucide-react";
import { api } from "@/lib/api";
import { Category, fetchLaporanDataset, computeReport, LaporanDataset, REPORTS, ReportKey, ReportResult } from "@/lib/laporanCompute";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { DateInput } from "@/components/ui/DateInput";

const CATEGORY_TABS: { key: "semua" | Category; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "transaksi", label: "Transaksi" },
  { key: "stok", label: "Stok" },
  { key: "keuangan", label: "Keuangan" },
  { key: "aset", label: "Aset" },
];

const BULAN_OPTIONS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
].map((label, i) => ({ value: String(i + 1), label }));

export default function LaporanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState<LaporanDataset | null>(null);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    fetchLaporanDataset(api).then((d) => {
      setDataset(d);
      setLoading(false);
    });
  }, []);

  const [activeCategory, setActiveCategory] = useState<"semua" | Category>("semua");
  const [selectedReport, setSelectedReport] = useState<ReportKey>("penjualan");
  const [periodMode, setPeriodMode] = useState<"bulanan" | "rentang">("bulanan");
  const now = new Date();
  const [bulan, setBulan] = useState(String(now.getMonth() + 1));
  const [tahun, setTahun] = useState(String(now.getFullYear()));
  const [tanggalMulai, setTanggalMulai] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [tanggalSelesai, setTanggalSelesai] = useState(() => now.toISOString().slice(0, 10));
  const [result, setResult] = useState<ReportResult | null>(null);

  // Filters specific to the "Stok per Lokasi" report -- it's not period-based, it filters
  // by warehouse location instead (see the periodBased flag on its ReportDef).
  const [stokLokasi, setStokLokasi] = useState("");
  const [stokSubLokasi, setStokSubLokasi] = useState("");
  const [stokCariItem, setStokCariItem] = useState("");

  // One-time admin fix-up for the "barang.stok vs stokLokasi out of sync" gap -- see the
  // reconcileStokLokasi* backend endpoints for why this is needed.
  const [reconcileChecking, setReconcileChecking] = useState(false);
  const [reconcilePreview, setReconcilePreview] = useState<{
    count: number;
    items: { id: string; kode: string; nama: string; stok: number; stokLokasiSum: number; selisih: number }[];
  } | null>(null);
  const [reconcileApplying, setReconcileApplying] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{ fixed: number } | null>(null);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  // Barang whose catalog record is gone but still show up in old Pembelian/Penerimaan
  // history (most likely deleted after being referenced) -- recreated at their original id.
  const [orphanChecking, setOrphanChecking] = useState(false);
  const [orphanPreview, setOrphanPreview] = useState<{
    count: number;
    items: { itemId: string; kode: string; nama: string; satuan: string; hargaBeli: number; stok: number }[];
  } | null>(null);
  const [orphanApplying, setOrphanApplying] = useState(false);
  const [orphanResult, setOrphanResult] = useState<{ restored: number } | null>(null);
  const [orphanError, setOrphanError] = useState<string | null>(null);

  const lokasiOptions = useMemo(
    () => (dataset?.lokasiList ?? []).filter((l) => l.status === "aktif").map((l) => ({ value: l.nama, label: l.nama })),
    [dataset]
  );

  const tahunOptions = useMemo(() => {
    const currentYear = now.getFullYear();
    const years = new Set<number>([currentYear]);
    if (dataset) {
      [...dataset.invoice, ...dataset.pembelian].forEach((d) => years.add(new Date(d.tanggal).getFullYear()));
    }
    return Array.from(years)
      .sort((a, b) => b - a)
      .map((y) => ({ value: String(y), label: String(y) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset]);

  const visibleReports = REPORTS.filter((r) => activeCategory === "semua" || r.kategori === activeCategory);
  const selectedDef = REPORTS.find((r) => r.key === selectedReport);

  function selectCategory(cat: "semua" | Category) {
    setActiveCategory(cat);
    setResult(null);
    const stillVisible = REPORTS.some((r) => r.key === selectedReport && (cat === "semua" || r.kategori === cat));
    if (!stillVisible) {
      const first = REPORTS.find((r) => cat === "semua" || r.kategori === cat);
      if (first) setSelectedReport(first.key);
    }
  }

  function selectReport(key: ReportKey) {
    setSelectedReport(key);
    setResult(null);
  }

  function handleReset() {
    setActiveCategory("semua");
    setSelectedReport("penjualan");
    setPeriodMode("bulanan");
    setBulan(String(now.getMonth() + 1));
    setTahun(String(now.getFullYear()));
    setTanggalMulai(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    setTanggalSelesai(now.toISOString().slice(0, 10));
    setStokLokasi("");
    setStokSubLokasi("");
    setStokCariItem("");
    setResult(null);
    setExportError(null);
  }

  function periodRange(): { start: Date; end: Date } {
    if (periodMode === "bulanan") {
      const y = Number(tahun);
      const m = Number(bulan) - 1;
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
    }
    const start = tanggalMulai ? new Date(tanggalMulai) : new Date(0);
    const end = tanggalSelesai ? new Date(new Date(tanggalSelesai).getTime() + 24 * 60 * 60 * 1000) : new Date();
    return { start, end };
  }

  function generate() {
    if (!dataset) return;
    if (selectedReport === "stok-per-lokasi") {
      setResult(
        computeReport(selectedReport, periodRange(), dataset, {
          lokasi: stokLokasi || undefined,
          subLokasi: stokSubLokasi || undefined,
          cariItem: stokCariItem || undefined,
        })
      );
    } else {
      setResult(computeReport(selectedReport, periodRange(), dataset));
    }
    setExportError(null);
  }

  async function checkReconcile() {
    setReconcileError(null);
    setReconcileResult(null);
    setReconcileChecking(true);
    try {
      const preview = await api.reconcileStokLokasiPreview();
      setReconcilePreview(preview);
    } catch (err) {
      setReconcileError(err instanceof Error ? err.message : "Gagal memeriksa data");
    } finally {
      setReconcileChecking(false);
    }
  }

  async function applyReconcile() {
    setReconcileApplying(true);
    setReconcileError(null);
    try {
      const res = await api.reconcileStokLokasi();
      setReconcileResult({ fixed: res.fixed });
      setReconcilePreview(null);
      if (selectedReport === "stok-per-lokasi") generate();
    } catch (err) {
      setReconcileError(err instanceof Error ? err.message : "Gagal memperbaiki data");
    } finally {
      setReconcileApplying(false);
    }
  }

  async function checkOrphans() {
    setOrphanError(null);
    setOrphanResult(null);
    setOrphanChecking(true);
    try {
      const preview = await api.orphanedItemsPreview();
      setOrphanPreview(preview);
    } catch (err) {
      setOrphanError(err instanceof Error ? err.message : "Gagal memeriksa data");
    } finally {
      setOrphanChecking(false);
    }
  }

  async function applyRestoreOrphans() {
    setOrphanApplying(true);
    setOrphanError(null);
    try {
      const res = await api.restoreOrphanedItems();
      setOrphanResult({ restored: res.restored });
      setOrphanPreview(null);
      if (selectedReport === "stok-per-lokasi") generate();
    } catch (err) {
      setOrphanError(err instanceof Error ? err.message : "Gagal memulihkan data");
    } finally {
      setOrphanApplying(false);
    }
  }

  function periodQuery(): URLSearchParams {
    const params = new URLSearchParams({ mode: periodMode });
    if (periodMode === "bulanan") {
      params.set("bulan", bulan);
      params.set("tahun", tahun);
    } else {
      params.set("mulai", tanggalMulai);
      params.set("selesai", tanggalSelesai);
    }
    if (selectedReport === "stok-per-lokasi") {
      if (stokLokasi) params.set("lokasi", stokLokasi);
      if (stokSubLokasi) params.set("subLokasi", stokSubLokasi);
      if (stokCariItem) params.set("cariItem", stokCariItem);
    }
    return params;
  }

  async function handleExportXlsx() {
    if (!result || !selectedDef) return;
    setExportingXlsx(true);
    setExportError(null);
    try {
      await api.exportLaporanXlsx({
        sheetName: selectedDef.label,
        headers: result.columns,
        rows: result.rows,
        filename: `laporan-${selectedDef.key}-${Date.now()}.xlsx`,
      });
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Gagal mengunduh Excel");
    } finally {
      setExportingXlsx(false);
    }
  }

  function handleExportPdf() {
    const params = periodQuery();
    if (selectedReport === "penjualan") {
      router.push(`/laporan/penjualan/cetak?${params.toString()}`);
      return;
    }
    params.set("jenis", selectedReport);
    router.push(`/laporan/cetak?${params.toString()}`);
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader title="Laporan" subtitle="Generate dan ekspor laporan ERP" />

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Filter Laporan</p>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectCategory(tab.key)}
              className={clsx(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                activeCategory === tab.key
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-zinc-400">Memuat data laporan...</p>
        ) : visibleReports.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">Belum ada laporan tersedia untuk kategori ini.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {visibleReports.map((r) => {
              const Icon = r.icon;
              const active = selectedReport === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => selectReport(r.key)}
                  className={clsx(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors",
                    active ? "border-green-500 bg-green-50 text-green-700" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {r.label}
                </button>
              );
            })}
          </div>
        )}

        {selectedDef && (
          <p className="mt-3 text-xs text-zinc-400">{selectedDef.deskripsi}</p>
        )}

        {selectedDef?.periodBased && (
          <>
            <div className="mt-5 flex gap-2 border-t border-zinc-100 pt-4">
              <button
                type="button"
                onClick={() => setPeriodMode("bulanan")}
                className={clsx(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium",
                  periodMode === "bulanan" ? "border-green-600 bg-green-50 text-green-700" : "border-zinc-200 text-zinc-500"
                )}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode("rentang")}
                className={clsx(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium",
                  periodMode === "rentang" ? "border-green-600 bg-green-50 text-green-700" : "border-zinc-200 text-zinc-500"
                )}
              >
                Rentang Tanggal
              </button>
            </div>

            {periodMode === "bulanan" ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:w-96">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">Bulan</span>
                  <Select value={bulan} onChange={setBulan} options={BULAN_OPTIONS} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">Tahun</span>
                  <Select value={tahun} onChange={setTahun} options={tahunOptions} />
                </label>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:w-96">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">Tanggal Mulai</span>
                  <DateInput value={tanggalMulai} onChange={setTanggalMulai} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">Tanggal Selesai</span>
                  <DateInput value={tanggalSelesai} onChange={setTanggalSelesai} />
                </label>
              </div>
            )}
          </>
        )}

        {selectedReport === "stok-per-lokasi" && (
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">Lokasi</span>
              <Select
                value={stokLokasi}
                onChange={setStokLokasi}
                options={lokasiOptions}
                placeholder="Semua Lokasi"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">Sub Lokasi (Opsional)</span>
              <input
                value={stokSubLokasi}
                onChange={(e) => setStokSubLokasi(e.target.value)}
                placeholder="Cari..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">Cari Item</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  value={stokCariItem}
                  onChange={(e) => setStokCariItem(e.target.value)}
                  placeholder="Kode atau nama item..."
                  className="w-full rounded-lg border border-zinc-200 py-2 pl-8 pr-3 text-sm"
                />
              </div>
            </label>
          </div>
        )}

        {selectedReport === "stok-per-lokasi" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-4 py-3">
            <p className="flex-1 text-xs text-amber-700">
              Kalau ada barang yang stoknya tidak muncul di sini padahal sudah dibeli (datanya belum tercatat per
              lokasi), klik tombol ini untuk memeriksa dan memperbaikinya.
            </p>
            <button
              type="button"
              disabled={reconcileChecking}
              onClick={checkReconcile}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
            >
              {reconcileChecking ? "Memeriksa..." : "Cek & Perbaiki Data Stok"}
            </button>
          </div>
        )}
        {reconcileResult && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Selesai. {reconcileResult.fixed} barang diperbaiki.
          </p>
        )}
        {reconcileError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{reconcileError}</p>}

        {selectedReport === "stok-per-lokasi" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-4 py-3">
            <p className="flex-1 text-xs text-amber-700">
              Kalau ada barang yang pernah dibeli (muncul di Pembelian) tapi sekarang tidak ada lagi di menu Barang &amp;
              Jasa, klik ini untuk memunculkannya kembali beserta stoknya.
            </p>
            <button
              type="button"
              disabled={orphanChecking}
              onClick={checkOrphans}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
            >
              {orphanChecking ? "Memeriksa..." : "Cek Barang Hilang dari Katalog"}
            </button>
          </div>
        )}
        {orphanResult && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Selesai. {orphanResult.restored} barang dimunculkan kembali ke katalog.
          </p>
        )}
        {orphanError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{orphanError}</p>}

        {exportError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{exportError}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4">
          <button
            type="button"
            disabled={loading || !selectedDef}
            onClick={generate}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            {selectedReport === "stok-per-lokasi" ? "Tampilkan Stok" : "Generate Laporan"}
          </button>
          <button
            type="button"
            disabled={!result || exportingXlsx}
            onClick={handleExportXlsx}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exportingXlsx ? "Mengunduh..." : "Export Excel"}
          </button>
          <button
            type="button"
            disabled={!result}
            onClick={handleExportPdf}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {result && selectedDef && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-zinc-900">Hasil: {selectedDef.label}</p>

          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {result.summary.map((s) => (
              <div key={s.label} className="rounded-lg bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">{s.label}</p>
                <p className="mt-1 text-sm font-bold text-zinc-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  {result.columns.map((c) => (
                    <th key={c} className="py-2 pr-4 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.length === 0 ? (
                  <tr>
                    <td colSpan={result.columns.length} className="py-6 text-center text-sm text-zinc-400">
                      Tidak ada data pada periode ini
                    </td>
                  </tr>
                ) : (
                  result.rows.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-50 last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="py-2.5 pr-4 text-zinc-700">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reconcilePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-zinc-900">Perbaiki Data Stok per Lokasi</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {reconcilePreview.count === 0
                  ? "Semua data stok per lokasi sudah sesuai, tidak ada yang perlu diperbaiki."
                  : `Ditemukan ${reconcilePreview.count} barang yang stok per lokasinya belum sesuai dengan stok total. Selisihnya akan ditambahkan ke lokasi "GMI Harapan Indah".`}
              </p>
            </div>
            {reconcilePreview.count > 0 && (
              <div className="max-h-72 overflow-y-auto px-6 py-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-zinc-400">
                      <th className="py-1.5 pr-3 font-medium">Kode</th>
                      <th className="py-1.5 pr-3 font-medium">Nama</th>
                      <th className="py-1.5 pr-3 text-right font-medium">Stok Total</th>
                      <th className="py-1.5 pr-3 text-right font-medium">Stok per Lokasi</th>
                      <th className="py-1.5 text-right font-medium">Selisih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconcilePreview.items.map((item) => (
                      <tr key={item.id} className="border-t border-zinc-50">
                        <td className="py-1.5 pr-3 font-medium text-green-600">{item.kode}</td>
                        <td className="py-1.5 pr-3 text-zinc-700">{item.nama}</td>
                        <td className="py-1.5 pr-3 text-right text-zinc-700">{item.stok}</td>
                        <td className="py-1.5 pr-3 text-right text-zinc-700">{item.stokLokasiSum}</td>
                        <td className="py-1.5 text-right font-semibold text-amber-600">
                          {item.selisih > 0 ? "+" : ""}
                          {item.selisih}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setReconcilePreview(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Batal
              </button>
              {reconcilePreview.count > 0 && (
                <button
                  type="button"
                  disabled={reconcileApplying}
                  onClick={applyReconcile}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
                >
                  {reconcileApplying ? "Memperbaiki..." : `Perbaiki ${reconcilePreview.count} Barang`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {orphanPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-zinc-900">Barang Hilang dari Katalog</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {orphanPreview.count === 0
                  ? "Tidak ada barang yang hilang dari katalog."
                  : `Ditemukan ${orphanPreview.count} barang yang pernah dibeli tapi sudah tidak ada di katalog. Stoknya dihitung ulang dari riwayat transaksi dan akan dimasukkan ke lokasi "GMI Harapan Indah".`}
              </p>
            </div>
            {orphanPreview.count > 0 && (
              <div className="max-h-72 overflow-y-auto px-6 py-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-zinc-400">
                      <th className="py-1.5 pr-3 font-medium">Kode</th>
                      <th className="py-1.5 pr-3 font-medium">Nama</th>
                      <th className="py-1.5 text-right font-medium">Stok Dihitung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orphanPreview.items.map((item) => (
                      <tr key={item.itemId} className="border-t border-zinc-50">
                        <td className="py-1.5 pr-3 font-medium text-green-600">{item.kode}</td>
                        <td className="py-1.5 pr-3 text-zinc-700">{item.nama}</td>
                        <td className="py-1.5 text-right font-semibold text-zinc-900">
                          {item.stok} {item.satuan}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setOrphanPreview(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Batal
              </button>
              {orphanPreview.count > 0 && (
                <button
                  type="button"
                  disabled={orphanApplying}
                  onClick={applyRestoreOrphans}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
                >
                  {orphanApplying ? "Memulihkan..." : `Munculkan ${orphanPreview.count} Barang`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
