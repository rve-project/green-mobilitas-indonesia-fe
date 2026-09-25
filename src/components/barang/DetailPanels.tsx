"use client";

import { ReactNode, useState } from "react";
import clsx from "clsx";
import { Ban, CheckCircle2, Package, Pencil, Trash2, Wrench, X } from "lucide-react";
import { api } from "@/lib/api";
import { confirmDelete } from "@/lib/confirm";
import { Barang, Jasa, Paket, PaketItem, Supplier } from "@/lib/types";
import { formatDateLong, formatRupiah } from "@/lib/format";
import { hargaSatuanPaketItem, hitungHargaPaket, subtotalPaketItem } from "@/lib/paket";

function DrawerShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between bg-green-600 px-6 py-4 text-white">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded p-1 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ActionBar({
  onEdit,
  aktif,
  onToggle,
  toggling,
  onDelete,
  deleting,
}: {
  onEdit: () => void;
  aktif: boolean;
  onToggle: () => void;
  toggling: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
      >
        <Pencil className="h-4 w-4" />
        Edit
      </button>
      <button
        type="button"
        disabled={toggling}
        onClick={onToggle}
        className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {aktif ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        {toggling ? "Memproses..." : aktif ? "Nonaktifkan" : "Aktifkan"}
      </button>
      <button
        type="button"
        disabled={deleting}
        onClick={onDelete}
        className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        {deleting ? "Menghapus..." : "Hapus"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <span className="h-4 w-1 rounded bg-green-600" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoField({ label, value, span }: { label: string; value?: ReactNode; span?: boolean }) {
  return (
    <div className={clsx("rounded-lg bg-zinc-50 px-3 py-2", span && "col-span-2")}>
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-zinc-900">{value || "-"}</p>
    </div>
  );
}

function StatusBadge({ aktif }: { aktif: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        aktif ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
      )}
    >
      {aktif ? "Aktif" : "Nonaktif"}
    </span>
  );
}

// ---------------- Barang ----------------

interface BarangDetailPanelProps {
  barang: Barang;
  supplierList: Supplier[];
  onClose: () => void;
  onEdit: () => void;
  onUpdated: (barang: Barang) => void;
  onDeleted: (id: string) => void;
}

export function BarangDetailPanel({ barang, supplierList, onClose, onEdit, onUpdated, onDeleted }: BarangDetailPanelProps) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supplierNama = supplierList.find((s) => s.id === barang.supplierId)?.nama;

  async function handleToggle() {
    setToggling(true);
    try {
      const updated = await api.updateBarang(barang.id, { aktif: !barang.aktif });
      onUpdated(updated);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!(await confirmDelete(`Hapus barang "${barang.nama}"? Tindakan ini tidak bisa dibatalkan.`))) return;
    setDeleting(true);
    try {
      await api.deleteBarang(barang.id);
      onDeleted(barang.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DrawerShell title="Detail Barang" onClose={onClose}>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-zinc-900">{barang.nama}</h3>
          <StatusBadge aktif={barang.aktif} />
        </div>
        <p className="text-sm text-zinc-400">{barang.kode}</p>
      </div>

      <ActionBar onEdit={onEdit} aktif={barang.aktif} onToggle={handleToggle} toggling={toggling} onDelete={handleDelete} deleting={deleting} />

      <Section title="Informasi Item">
        <div className="grid grid-cols-2 gap-3">
          <InfoField label="Kategori" value={barang.kategori} />
          <InfoField label="Jenis" value={barang.jenis} />
          <InfoField label="Brand" value={barang.brand} />
          <InfoField label="Grup" value={barang.grup} />
          <InfoField label="Model" value={barang.model} />
          <InfoField label="Supplier" value={supplierNama} />
          <InfoField label="Deskripsi" value={barang.deskripsi} span />
        </div>
      </Section>

      <Section title="Harga per Unit">
        <div className="space-y-2">
          {barang.units.map((u) => {
            const margin = u.hargaBeli > 0 ? (((u.hargaJual - u.hargaBeli) / u.hargaBeli) * 100).toFixed(1) : "0.0";
            return (
              <div key={u.satuan} className="rounded-lg border border-zinc-100 p-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-900">{u.satuan}</p>
                  {u.isDefault && (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">Default</span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span>Beli: {formatRupiah(u.hargaBeli)}</span>
                  <span>Jual: {formatRupiah(u.hargaJual)}</span>
                  <span>Margin: {margin}%</span>
                  {u.komisi !== undefined && <span>Komisi: {u.komisi}%</span>}
                  {u.barcode && <span>Barcode: {u.barcode}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Stok & Lokasi">
        {barang.stokLokasi.length === 0 ? (
          <p className="text-sm text-zinc-400">Belum ada data stok tercatat</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="py-1.5 pr-3 font-medium">Lokasi</th>
                  <th className="py-1.5 pr-3 font-medium">Satuan</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Jumlah</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Min</th>
                  <th className="py-1.5 pr-0 text-right font-medium">Max</th>
                </tr>
              </thead>
              <tbody>
                {barang.stokLokasi.map((s, i) => (
                  <tr key={i} className="border-b border-zinc-50 last:border-0">
                    <td className="py-1.5 pr-3 text-zinc-700">
                      {s.lokasi}
                      {s.rak ? ` · ${s.rak}` : ""}
                    </td>
                    <td className="py-1.5 pr-3 text-zinc-500">{s.satuan}</td>
                    <td className="py-1.5 pr-3 text-right font-medium text-zinc-900">{s.jumlah}</td>
                    <td className="py-1.5 pr-3 text-right text-zinc-400">{s.stokMinimum ?? "-"}</td>
                    <td className="py-1.5 pr-0 text-right text-zinc-400">{s.stokMaksimum ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-400">
          Total stok saat ini: <span className="font-semibold text-zinc-600">{barang.stok}</span>
        </p>
      </Section>

      <p className="text-xs text-zinc-400">Dibuat {formatDateLong(barang.createdAt)}</p>
    </DrawerShell>
  );
}

// ---------------- Jasa ----------------

interface JasaDetailPanelProps {
  jasa: Jasa;
  onClose: () => void;
  onEdit: () => void;
  onUpdated: (jasa: Jasa) => void;
  onDeleted: (id: string) => void;
}

export function JasaDetailPanel({ jasa, onClose, onEdit, onUpdated, onDeleted }: JasaDetailPanelProps) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const aktif = jasa.aktif ?? true;

  async function handleToggle() {
    setToggling(true);
    try {
      const updated = await api.updateJasa(jasa.id, { aktif: !aktif });
      onUpdated(updated);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!(await confirmDelete(`Hapus jasa "${jasa.nama}"? Tindakan ini tidak bisa dibatalkan.`))) return;
    setDeleting(true);
    try {
      await api.deleteJasa(jasa.id);
      onDeleted(jasa.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <DrawerShell title="Detail Jasa" onClose={onClose}>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-zinc-900">{jasa.nama}</h3>
          <StatusBadge aktif={aktif} />
        </div>
        <p className="text-sm text-zinc-400">{jasa.kode}</p>
      </div>

      <ActionBar onEdit={onEdit} aktif={aktif} onToggle={handleToggle} toggling={toggling} onDelete={handleDelete} deleting={deleting} />

      <Section title="Informasi Service">
        <div className="grid grid-cols-2 gap-3">
          <InfoField label="Kategori" value={jasa.kategori} />
          <InfoField label="Jenis" value={jasa.jenis} />
          <InfoField label="Model" value={jasa.model} />
          <InfoField label="Komisi" value={`${jasa.komisi}%`} />
          <InfoField label="Harga Jual" value={formatRupiah(jasa.harga)} />
          <InfoField label="Tampil di Booking" value={jasa.tampilBooking ? "Ya" : "Tidak"} />
          <InfoField label="Deskripsi" value={jasa.deskripsi} span />
        </div>
      </Section>

      <p className="text-xs text-zinc-400">Dibuat {formatDateLong(jasa.createdAt)}</p>
    </DrawerShell>
  );
}

// ---------------- Paket ----------------

interface PaketDetailPanelProps {
  paket: Paket;
  barangList: Barang[];
  jasaList: Jasa[];
  onClose: () => void;
  onEdit: () => void;
  onUpdated: (paket: Paket) => void;
  onDeleted: (id: string) => void;
}

export function PaketDetailPanel({ paket, barangList, jasaList, onClose, onEdit, onUpdated, onDeleted }: PaketDetailPanelProps) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleToggle() {
    setToggling(true);
    try {
      const updated = await api.updatePaket(paket.id, { aktif: !paket.aktif });
      onUpdated(updated);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!(await confirmDelete(`Hapus paket "${paket.nama}"? Tindakan ini tidak bisa dibatalkan.`))) return;
    setDeleting(true);
    try {
      await api.deletePaket(paket.id);
      onDeleted(paket.id);
    } finally {
      setDeleting(false);
    }
  }

  function namaItem(itemId: string, tipe: "barang" | "jasa") {
    return tipe === "barang"
      ? barangList.find((b) => b.id === itemId)?.nama ?? "Barang dihapus"
      : jasaList.find((j) => j.id === itemId)?.nama ?? "Jasa dihapus";
  }

  const { totalSatuan, hargaPaket } = hitungHargaPaket(paket.items, barangList, jasaList);
  const hemat = Math.max(0, totalSatuan - hargaPaket);
  const hematPersen = totalSatuan > 0 ? (hemat / totalSatuan) * 100 : 0;

  const barangItems = paket.items.filter((i) => i.tipe === "barang");
  const jasaItems = paket.items.filter((i) => i.tipe === "jasa");

  return (
    <DrawerShell title="Detail Paket" onClose={onClose}>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-zinc-900">{paket.nama}</h3>
          <StatusBadge aktif={paket.aktif} />
        </div>
        <p className="text-sm text-zinc-400">{paket.kode}</p>
      </div>

      <ActionBar onEdit={onEdit} aktif={paket.aktif} onToggle={handleToggle} toggling={toggling} onDelete={handleDelete} deleting={deleting} />

      {paket.deskripsi && (
        <Section title="Deskripsi">
          <p className="text-sm text-zinc-600">{paket.deskripsi}</p>
        </Section>
      )}

      <Section title="Perbandingan Harga">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Total harga satuan</span>
            <span className="text-zinc-400 line-through">{formatRupiah(totalSatuan)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-900">Harga Paket</span>
            <span className="text-lg font-bold text-green-600">{formatRupiah(hargaPaket)}</span>
          </div>
          {hemat > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Hemat pelanggan</span>
              <span className="font-semibold text-green-600">
                {formatRupiah(hemat)} ({hematPersen.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      </Section>

      <Section title={`Barang (${barangItems.length})`}>
        {barangItems.length === 0 ? (
          <p className="text-sm text-zinc-400">Tidak ada barang dalam paket ini</p>
        ) : (
          <ul className="space-y-2">
            {barangItems.map((i, idx) => (
              <PaketItemRow
                key={idx}
                nama={namaItem(i.itemId, "barang")}
                item={i}
                hargaAsli={hargaSatuanPaketItem(i, barangList, jasaList) * i.qty}
                hargaSetelahDiskon={subtotalPaketItem(i, barangList, jasaList)}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Jasa (${jasaItems.length})`}>
        {jasaItems.length === 0 ? (
          <p className="text-sm text-zinc-400">Tidak ada jasa dalam paket ini</p>
        ) : (
          <ul className="space-y-2">
            {jasaItems.map((i, idx) => (
              <PaketItemRow
                key={idx}
                nama={namaItem(i.itemId, "jasa")}
                item={i}
                hargaAsli={hargaSatuanPaketItem(i, barangList, jasaList) * i.qty}
                hargaSetelahDiskon={subtotalPaketItem(i, barangList, jasaList)}
              />
            ))}
          </ul>
        )}
      </Section>

      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>Dibuat {formatDateLong(paket.createdAt)}</span>
        <span className="flex items-center gap-1">
          {barangItems.length > 0 && <Package className="h-3.5 w-3.5" />}
          {jasaItems.length > 0 && <Wrench className="h-3.5 w-3.5" />}
        </span>
      </div>
    </DrawerShell>
  );
}

function PaketItemRow({
  nama,
  item,
  hargaAsli,
  hargaSetelahDiskon,
}: {
  nama: string;
  item: PaketItem;
  hargaAsli: number;
  hargaSetelahDiskon: number;
}) {
  const adaDiskon = hargaSetelahDiskon < hargaAsli;
  const labelDiskon = item.diskonTipe === "rupiah" ? `Diskon ${formatRupiah(item.diskonRp ?? 0)}` : `Diskon ${item.diskonPersen}%`;
  return (
    <li className="rounded-lg bg-zinc-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-900">{nama}</p>
        <span className="text-xs text-zinc-500">× {item.qty}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        {adaDiskon ? <span className="text-xs font-medium text-green-600">{labelDiskon}</span> : <span />}
        <div className="text-right text-xs">
          {adaDiskon && <p className="text-zinc-400 line-through">{formatRupiah(hargaAsli)}</p>}
          <p className="font-semibold text-zinc-900">{formatRupiah(hargaSetelahDiskon)}</p>
        </div>
      </div>
    </li>
  );
}
