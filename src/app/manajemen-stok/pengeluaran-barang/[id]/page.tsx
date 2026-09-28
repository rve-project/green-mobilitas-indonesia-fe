"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import clsx from "clsx";
import { Calendar, CheckCircle2, Package, User } from "lucide-react";
import { api } from "@/lib/api";
import { PengeluaranBarang } from "@/lib/types";
import { formatDateFull, formatRupiah } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

function StatusBadge({ status }: { status: PengeluaranBarang["status"] }) {
  const config = {
    draft: { label: "Draft", className: "bg-zinc-100 text-zinc-600" },
    terposting: { label: "Terposting", className: "bg-emerald-50 text-emerald-600" },
  }[status];
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}

export default function PengeluaranBarangDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<PengeluaranBarang | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPengeluaranBarang(id)
      .then(setItem)
      .catch(() => setNotFound(true));
  }, [id]);

  async function handlePost() {
    setPosting(true);
    setError(null);
    try {
      const updated = await api.updatePengeluaranBarang(id, { status: "terposting" });
      setItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memposting pengeluaran barang");
    } finally {
      setPosting(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex-1 px-4 py-5 sm:px-8 sm:py-6">
        <p className="text-sm text-zinc-400">Data pengeluaran barang tidak ditemukan.</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex-1 px-4 py-5 sm:px-8 sm:py-6">
        <p className="text-sm text-zinc-400">Memuat…</p>
      </div>
    );
  }

  const totalNilai = item.items.reduce((sum, i) => sum + (i.hargaSatuan ?? 0) * i.jumlah, 0);

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: "Pengeluaran Barang", href: "/manajemen-stok/pengeluaran-barang" },
              { label: `#${item.kode}` },
            ]}
          />
          <h1 className="text-2xl font-bold text-zinc-900">Pengeluaran Barang #{item.kode}</h1>
          <p className="text-sm text-zinc-500">Lihat detail pengeluaran barang</p>
        </div>
        {item.status === "draft" && (
          <button
            type="button"
            disabled={posting}
            onClick={handlePost}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            {posting ? "Memposting..." : "Posting Sekarang"}
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <Calendar className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs text-zinc-400">Tanggal</p>
            <p className="text-sm font-semibold text-zinc-900">{formatDateFull(item.tanggal)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Package className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs text-zinc-400">Jumlah Item</p>
            <p className="text-sm font-semibold text-zinc-900">{item.items.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <User className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs text-zinc-400">Status</p>
            <StatusBadge status={item.status} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Informasi Umum</h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-400">Nomor Pengeluaran</p>
            <p className="text-sm font-semibold text-zinc-900">{item.kode}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Alasan</p>
            <p className="text-sm font-semibold text-zinc-900">{item.alasan}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Jumlah Item</p>
            <p className="text-sm font-semibold text-zinc-900">{item.items.length}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Catatan</p>
            <p className="text-sm text-zinc-700">{item.catatan || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">{item.status === "terposting" ? "Tanggal Terposting" : "Tanggal Dibuat"}</p>
            <p className="text-sm font-semibold text-zinc-900">
              {item.postedAt ? formatDateFull(item.postedAt) : formatDateFull(item.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">{item.status === "terposting" ? "Diposting Oleh" : "Dibuat Oleh"}</p>
            <p className="text-sm font-semibold text-zinc-900">{item.dibuatOleh || "-"}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <div className="bg-green-600 px-4 py-3 text-white">
          <p className="text-sm font-semibold">Detail Barang</p>
        </div>
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 font-medium">Lokasi</th>
                <th className="px-4 py-2 text-right font-medium">Jumlah</th>
                <th className="px-4 py-2 text-right font-medium">Harga/Unit</th>
                <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                <th className="px-4 py-2 font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {item.items.map((row, i) => (
                <tr key={`${row.itemId}-${i}`} className="border-b border-zinc-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{row.nama}</p>
                    <p className="text-xs text-zinc-400">{row.kode}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{row.satuan}</td>
                  <td className="px-4 py-3 text-zinc-700">{row.lokasi}</td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">{row.jumlah}</td>
                  <td className="px-4 py-3 text-right text-zinc-700">
                    {row.hargaSatuan ? formatRupiah(row.hargaSatuan) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-900">
                    {row.hargaSatuan ? formatRupiah(row.hargaSatuan * row.jumlah) : "-"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{row.catatan ?? "-"}</td>
                </tr>
              ))}
            </tbody>
            {totalNilai > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">
                    Total Nilai
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{formatRupiah(totalNilai)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
