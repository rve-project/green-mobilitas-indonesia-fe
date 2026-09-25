"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Download, FileSpreadsheet, Plus, Search, Upload, X } from "lucide-react";
import { api, ImportSummary } from "@/lib/api";
import { Barang, Jasa, Paket, Supplier } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { hitungHargaPaket } from "@/lib/paket";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/Panel";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { TambahBarangModal } from "@/components/barang/TambahBarangModal";
import { TambahJasaModal } from "@/components/barang/TambahJasaModal";
import { TambahPaketModal } from "@/components/barang/TambahPaketModal";
import { BarangDetailPanel, JasaDetailPanel, PaketDetailPanel } from "@/components/barang/DetailPanels";

type Tab = "barang" | "jasa" | "paket";

const TABS: { key: Tab; label: string }[] = [
  { key: "barang", label: "Barang" },
  { key: "jasa", label: "Jasa" },
  { key: "paket", label: "Paket" },
];

export default function BarangJasaPage() {
  const [tab, setTab] = useState<Tab>("barang");
  const [barang, setBarang] = useState<Barang[] | null>(null);
  const [jasa, setJasa] = useState<Jasa[] | null>(null);
  const [paket, setPaket] = useState<Paket[] | null>(null);
  const [supplier, setSupplier] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailBarang, setDetailBarang] = useState<Barang | null>(null);
  const [detailJasa, setDetailJasa] = useState<Jasa | null>(null);
  const [detailPaket, setDetailPaket] = useState<Paket | null>(null);
  const [editBarang, setEditBarang] = useState<Barang | null>(null);
  const [editJasa, setEditJasa] = useState<Jasa | null>(null);
  const [editPaket, setEditPaket] = useState<Paket | null>(null);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function changeTab(t: Tab) {
    setTab(t);
    setPage(1);
  }

  function changeSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  function reloadCatalog() {
    api.barang({ limit: 1000 }).then((res) => setBarang(res.data));
    api.jasa({ limit: 1000 }).then((res) => setJasa(res.data));
    api.paket({ limit: 1000 }).then((res) => setPaket(res.data));
  }

  useEffect(() => {
    reloadCatalog();
    api.supplier().then(setSupplier);
  }, []);

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const summary = tab === "barang" ? await api.importBarang(file) : await api.importJasa(file);
      setImportResult(summary);
      reloadCatalog();
    } catch (err) {
      setImportResult({
        created: 0,
        failed: 0,
        errors: [{ row: 0, message: err instanceof Error ? err.message : "Gagal mengimpor file" }],
      });
    } finally {
      setImporting(false);
    }
  }

  const filteredBarang = useMemo(() => {
    if (!barang) return null;
    const q = search.trim().toLowerCase();
    if (!q) return barang;
    return barang.filter((b) => b.kode.toLowerCase().includes(q) || b.nama.toLowerCase().includes(q));
  }, [barang, search]);

  const filteredJasa = useMemo(() => {
    if (!jasa) return null;
    const q = search.trim().toLowerCase();
    if (!q) return jasa;
    return jasa.filter((j) => j.kode.toLowerCase().includes(q) || j.nama.toLowerCase().includes(q));
  }, [jasa, search]);

  const filteredPaket = useMemo(() => {
    if (!paket) return null;
    const q = search.trim().toLowerCase();
    if (!q) return paket;
    return paket.filter((p) => p.kode.toLowerCase().includes(q) || p.nama.toLowerCase().includes(q));
  }, [paket, search]);

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader
        title="Barang & Jasa"
        subtitle="Kelola data sparepart, layanan, dan paket bengkel"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {tab !== "paket" && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportFile(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => (tab === "barang" ? api.downloadBarangTemplate() : api.downloadJasaTemplate())}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Template
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {importing ? "Mengimpor..." : "Import"}
                </button>
                <button
                  type="button"
                  onClick={() => (tab === "barang" ? api.exportBarang() : api.exportJasa())}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Input Baru
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex border-b border-zinc-100">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => changeTab(t.key)}
              className={clsx(
                "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
                tab === t.key ? "border-green-600 text-green-600" : "border-transparent text-zinc-400 hover:text-zinc-600"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Cari kode/nama..."
            className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        {tab === "barang" && (
          <BarangTable
            data={filteredBarang ? paginate(filteredBarang, page, pageSize) : null}
            onRowClick={setDetailBarang}
          />
        )}
        {tab === "jasa" && (
          <JasaTable data={filteredJasa ? paginate(filteredJasa, page, pageSize) : null} onRowClick={setDetailJasa} />
        )}
        {tab === "paket" && (
          <PaketTable
            data={filteredPaket ? paginate(filteredPaket, page, pageSize) : null}
            barang={barang ?? []}
            jasa={jasa ?? []}
            onRowClick={setDetailPaket}
          />
        )}

        {(() => {
          const activeFiltered = tab === "barang" ? filteredBarang : tab === "jasa" ? filteredJasa : filteredPaket;
          if (!activeFiltered || activeFiltered.length === 0) return null;
          return (
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={activeFiltered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          );
        })()}
      </div>

      {modalOpen && tab === "barang" && (
        <TambahBarangModal
          supplierList={supplier}
          onClose={() => setModalOpen(false)}
          onCreated={(item) => setBarang((prev) => [item, ...(prev ?? [])])}
        />
      )}
      {modalOpen && tab === "jasa" && (
        <TambahJasaModal
          onClose={() => setModalOpen(false)}
          onCreated={(item) => setJasa((prev) => [item, ...(prev ?? [])])}
        />
      )}
      {modalOpen && tab === "paket" && (
        <TambahPaketModal
          barangList={barang ?? []}
          jasaList={jasa ?? []}
          onClose={() => setModalOpen(false)}
          onCreated={(item) => setPaket((prev) => [item, ...(prev ?? [])])}
        />
      )}

      {detailBarang && (
        <BarangDetailPanel
          barang={detailBarang}
          supplierList={supplier}
          onClose={() => setDetailBarang(null)}
          onEdit={() => {
            setEditBarang(detailBarang);
            setDetailBarang(null);
          }}
          onUpdated={(item) => {
            setBarang((prev) => (prev ?? []).map((b) => (b.id === item.id ? item : b)));
            setDetailBarang(item);
          }}
          onDeleted={(id) => {
            setBarang((prev) => (prev ?? []).filter((b) => b.id !== id));
            setDetailBarang(null);
          }}
        />
      )}
      {detailJasa && (
        <JasaDetailPanel
          jasa={detailJasa}
          onClose={() => setDetailJasa(null)}
          onEdit={() => {
            setEditJasa(detailJasa);
            setDetailJasa(null);
          }}
          onUpdated={(item) => {
            setJasa((prev) => (prev ?? []).map((j) => (j.id === item.id ? item : j)));
            setDetailJasa(item);
          }}
          onDeleted={(id) => {
            setJasa((prev) => (prev ?? []).filter((j) => j.id !== id));
            setDetailJasa(null);
          }}
        />
      )}
      {detailPaket && (
        <PaketDetailPanel
          paket={detailPaket}
          barangList={barang ?? []}
          jasaList={jasa ?? []}
          onClose={() => setDetailPaket(null)}
          onEdit={() => {
            setEditPaket(detailPaket);
            setDetailPaket(null);
          }}
          onUpdated={(item) => {
            setPaket((prev) => (prev ?? []).map((p) => (p.id === item.id ? item : p)));
            setDetailPaket(item);
          }}
          onDeleted={(id) => {
            setPaket((prev) => (prev ?? []).filter((p) => p.id !== id));
            setDetailPaket(null);
          }}
        />
      )}

      {editBarang && (
        <TambahBarangModal
          item={editBarang}
          supplierList={supplier}
          onClose={() => setEditBarang(null)}
          onCreated={(item) => {
            setBarang((prev) => (prev ?? []).map((b) => (b.id === item.id ? item : b)));
            setEditBarang(null);
          }}
        />
      )}
      {editJasa && (
        <TambahJasaModal
          item={editJasa}
          onClose={() => setEditJasa(null)}
          onCreated={(item) => {
            setJasa((prev) => (prev ?? []).map((j) => (j.id === item.id ? item : j)));
            setEditJasa(null);
          }}
        />
      )}
      {editPaket && (
        <TambahPaketModal
          item={editPaket}
          barangList={barang ?? []}
          jasaList={jasa ?? []}
          onClose={() => setEditPaket(null)}
          onCreated={(item) => {
            setPaket((prev) => (prev ?? []).map((p) => (p.id === item.id ? item : p)));
            setEditPaket(null);
          }}
        />
      )}

      {importResult && <ImportResultModal summary={importResult} onClose={() => setImportResult(null)} />}
    </div>
  );
}

function ImportResultModal({ summary, onClose }: { summary: ImportSummary; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between bg-green-600 px-6 py-4 text-white">
          <h2 className="text-lg font-semibold">Hasil Import</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded p-1 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
              <p className="text-xs text-emerald-600">Berhasil</p>
              <p className="text-xl font-bold text-emerald-600">{summary.created}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-xs text-blue-600">Diperbarui</p>
              <p className="text-xl font-bold text-blue-600">{summary.updated ?? 0}</p>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
              <p className="text-xs text-red-500">Gagal</p>
              <p className="text-xl font-bold text-red-500">{summary.failed}</p>
            </div>
          </div>

          {summary.errors.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-900">Detail Kegagalan</p>
              <ul className="space-y-1.5">
                {summary.errors.map((e, i) => (
                  <li key={i} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                    {e.row > 0 && <span className="font-medium text-zinc-900">Baris {e.row}: </span>}
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-zinc-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function BarangTable({ data, onRowClick }: { data: Barang[] | null; onRowClick: (b: Barang) => void }) {
  if (!data) return <p className="text-sm text-zinc-400">Memuat…</p>;
  if (data.length === 0) return <EmptyState label="Belum ada data barang" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
            <th className="py-2 pr-4 font-medium">Kode</th>
            <th className="py-2 pr-4 font-medium">Nama Barang</th>
            <th className="py-2 pr-4 font-medium">Kategori</th>
            <th className="py-2 pr-4 font-medium">Brand</th>
            <th className="py-2 pr-4 font-medium">Satuan</th>
            <th className="py-2 pr-4 text-right font-medium">Harga Jual</th>
            <th className="py-2 pr-4 text-right font-medium">Stok</th>
            <th className="py-2 pr-0 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((b) => (
            <tr
              key={b.id}
              onClick={() => onRowClick(b)}
              className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
            >
              <td className="py-3 pr-4 font-medium text-zinc-900">{b.kode}</td>
              <td className="py-3 pr-4 text-zinc-700">{b.nama}</td>
              <td className="py-3 pr-4 text-zinc-500">{b.kategori}</td>
              <td className="py-3 pr-4 text-zinc-500">{b.brand ?? "-"}</td>
              <td className="py-3 pr-4 text-zinc-500">{b.satuan}</td>
              <td className="py-3 pr-4 text-right text-zinc-700">{formatRupiah(b.hargaJual)}</td>
              <td
                className={clsx(
                  "py-3 pr-4 text-right font-semibold",
                  b.stok <= 0 ? "text-red-600" : "text-zinc-900"
                )}
              >
                {b.stok}
              </td>
              <td className="py-3 pr-0">
                <span
                  className={clsx(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                    b.aktif ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
                  )}
                >
                  {b.aktif ? "Aktif" : "Nonaktif"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JasaTable({ data, onRowClick }: { data: Jasa[] | null; onRowClick: (j: Jasa) => void }) {
  if (!data) return <p className="text-sm text-zinc-400">Memuat…</p>;
  if (data.length === 0) return <EmptyState label="Belum ada data jasa" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
            <th className="py-2 pr-4 font-medium">Kode</th>
            <th className="py-2 pr-4 font-medium">Nama Jasa</th>
            <th className="py-2 pr-4 font-medium">Kategori</th>
            <th className="py-2 pr-4 font-medium">Jenis</th>
            <th className="py-2 pr-4 text-right font-medium">Harga</th>
            <th className="py-2 pr-0 text-right font-medium">Komisi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((j) => (
            <tr
              key={j.id}
              onClick={() => onRowClick(j)}
              className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
            >
              <td className="py-3 pr-4 font-medium text-zinc-900">{j.kode}</td>
              <td className="py-3 pr-4 text-zinc-700">{j.nama}</td>
              <td className="py-3 pr-4 text-zinc-500">{j.kategori}</td>
              <td className="py-3 pr-4 text-zinc-500">{j.jenis}</td>
              <td className="py-3 pr-4 text-right text-zinc-700">{formatRupiah(j.harga)}</td>
              <td className="py-3 pr-0 text-right text-zinc-500">{j.komisi}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaketTable({
  data,
  barang,
  jasa,
  onRowClick,
}: {
  data: Paket[] | null;
  barang: Barang[];
  jasa: Jasa[];
  onRowClick: (p: Paket) => void;
}) {
  if (!data) return <p className="text-sm text-zinc-400">Memuat…</p>;
  if (data.length === 0) return <EmptyState label="Belum ada data paket" />;

  function hargaPaket(p: Paket) {
    return hitungHargaPaket(p.items, barang, jasa).hargaPaket;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
            <th className="py-2 pr-4 font-medium">Kode</th>
            <th className="py-2 pr-4 font-medium">Nama Paket</th>
            <th className="py-2 pr-4 font-medium">Jumlah Item</th>
            <th className="py-2 pr-4 text-right font-medium">Harga Paket</th>
            <th className="py-2 pr-0 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr
              key={p.id}
              onClick={() => onRowClick(p)}
              className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
            >
              <td className="py-3 pr-4 font-medium text-zinc-900">{p.kode}</td>
              <td className="py-3 pr-4 text-zinc-700">{p.nama}</td>
              <td className="py-3 pr-4 text-zinc-500">{p.items.length} item</td>
              <td className="py-3 pr-4 text-right font-semibold text-zinc-900">{formatRupiah(hargaPaket(p))}</td>
              <td className="py-3 pr-0">
                <span
                  className={clsx(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                    p.aktif ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
                  )}
                >
                  {p.aktif ? "Aktif" : "Nonaktif"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
