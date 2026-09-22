"use client";

import { FormEvent, useMemo, useState } from "react";
import { Package, Wrench, X } from "lucide-react";
import { api } from "@/lib/api";
import { Barang, Jasa, Paket, PaketItem } from "@/lib/types";
import { formatRupiah, hitungTotalSetelahDiskon } from "@/lib/format";
import { Toggle } from "@/components/ui/Toggle";
import { ItemPickerSection } from "@/components/barang/ItemPickerSection";

interface TambahPaketModalProps {
  item?: Paket;
  barangList: Barang[];
  jasaList: Jasa[];
  onClose: () => void;
  onCreated: (paket: Paket) => void;
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

function unitPriceOf(item: PaketItem, barangList: Barang[], jasaList: Jasa[]) {
  if (item.tipe === "barang") {
    const barang = barangList.find((b) => b.id === item.itemId);
    if (!barang) return 0;
    const unit = barang.units.find((u) => u.satuan === item.satuan);
    return unit?.hargaJual ?? barang.hargaJual;
  }
  return jasaList.find((j) => j.id === item.itemId)?.harga ?? 0;
}

function nameOf(item: PaketItem, barangList: Barang[], jasaList: Jasa[]) {
  if (item.tipe === "barang") return barangList.find((b) => b.id === item.itemId)?.nama ?? "Barang dihapus";
  return jasaList.find((j) => j.id === item.itemId)?.nama ?? "Jasa dihapus";
}

function subtitleOf(item: PaketItem, barangList: Barang[], jasaList: Jasa[]) {
  if (item.tipe === "barang") {
    const barang = barangList.find((b) => b.id === item.itemId);
    return barang ? `${barang.kode} · /unit` : "-";
  }
  const jasa = jasaList.find((j) => j.id === item.itemId);
  return jasa ? `${formatRupiah(jasa.harga)}/layanan` : "-";
}

function unitOptionsOf(item: PaketItem, barangList: Barang[]) {
  if (item.tipe !== "barang") return undefined;
  const barang = barangList.find((b) => b.id === item.itemId);
  if (!barang || barang.units.length === 0) return undefined;
  return barang.units.map((u) => ({ value: u.satuan, label: u.satuan }));
}

function defaultSatuanOf(barang?: Barang) {
  if (!barang) return undefined;
  return (barang.units.find((u) => u.isDefault) ?? barang.units[0])?.satuan ?? barang.satuan;
}

export function TambahPaketModal({ item, barangList, jasaList, onClose, onCreated }: TambahPaketModalProps) {
  const isEdit = Boolean(item);
  const [kode, setKode] = useState(item?.kode ?? "");
  const [nama, setNama] = useState(item?.nama ?? "");
  const [deskripsi, setDeskripsi] = useState(item?.deskripsi ?? "");
  const [items, setItems] = useState<PaketItem[]>(item?.items ?? []);
  const [pickBarang, setPickBarang] = useState("");
  const [pickJasa, setPickJasa] = useState("");
  const [aktif, setAktif] = useState(item?.aktif ?? true);
  const [tampilBooking, setTampilBooking] = useState(item?.tampilBooking ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const barangItems = items.filter((i) => i.tipe === "barang");
  const jasaItems = items.filter((i) => i.tipe === "jasa");

  const { totalSatuan, hargaPaket } = useMemo(() => {
    let total = 0;
    let afterDiskon = 0;
    for (const item of items) {
      const price = unitPriceOf(item, barangList, jasaList);
      total += price * item.qty;
      afterDiskon += hitungTotalSetelahDiskon(price * item.qty, item.diskonTipe, item.diskonPersen, item.diskonRp ?? 0);
    }
    return { totalSatuan: total, hargaPaket: afterDiskon };
  }, [items, barangList, jasaList]);

  function addItem(tipe: "barang" | "jasa", itemId: string) {
    if (!itemId || items.some((i) => i.tipe === tipe && i.itemId === itemId)) return;
    const satuan = tipe === "barang" ? defaultSatuanOf(barangList.find((b) => b.id === itemId)) : undefined;
    setItems((prev) => [...prev, { tipe, itemId, satuan, qty: 1, diskonTipe: "persen", diskonPersen: 0, diskonRp: 0 }]);
  }

  function updateItem(index: number, patch: Partial<PaketItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        kode: kode || undefined,
        nama,
        deskripsi: deskripsi || undefined,
        items,
        aktif,
        tampilBooking,
      };
      const saved = isEdit ? await api.updatePaket(item!.id, payload) : await api.createPaket(payload);
      onCreated(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan paket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between bg-green-600 px-6 py-4 text-white">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit Paket" : "Tambah Paket Baru"}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded p-1 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">Kode Paket (opsional)</span>
                <input
                  value={kode}
                  onChange={(e) => setKode(e.target.value)}
                  placeholder="Auto-generate jika kosong"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Nama Paket <span className="text-red-500">*</span>
                </span>
                <input
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="cth. Paket Ganti Oli"
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">Deskripsi</span>
              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Deskripsi singkat paket (opsional)"
                rows={2}
                className={inputClass}
              />
            </label>

            <ItemPickerSection<PaketItem>
              icon={<Package className="h-4 w-4 text-blue-500" />}
              title="Barang"
              emptyLabel="Belum ada barang ditambahkan"
              items={barangItems}
              catalog={barangList.map((b) => ({ id: b.id, label: `${b.nama} · ${formatRupiah(b.hargaJual)}` }))}
              pickValue={pickBarang}
              onPickChange={setPickBarang}
              onAdd={() => {
                addItem("barang", pickBarang);
                setPickBarang("");
              }}
              nameOf={(item) => nameOf(item, barangList, jasaList)}
              subtitleOf={(item) => subtitleOf(item, barangList, jasaList)}
              priceOf={(item) => unitPriceOf(item, barangList, jasaList)}
              unitOptionsOf={(item) => unitOptionsOf(item, barangList)}
              onUpdate={(item, patch) => updateItem(items.indexOf(item), patch)}
              onRemove={(item) => removeItem(items.indexOf(item))}
            />

            <ItemPickerSection<PaketItem>
              icon={<Wrench className="h-4 w-4 text-violet-500" />}
              title="Jasa"
              emptyLabel="Belum ada jasa ditambahkan"
              items={jasaItems}
              catalog={jasaList.map((j) => ({ id: j.id, label: `${j.nama} · ${formatRupiah(j.harga)}` }))}
              pickValue={pickJasa}
              onPickChange={setPickJasa}
              onAdd={() => {
                addItem("jasa", pickJasa);
                setPickJasa("");
              }}
              nameOf={(item) => nameOf(item, barangList, jasaList)}
              subtitleOf={(item) => subtitleOf(item, barangList, jasaList)}
              priceOf={(item) => unitPriceOf(item, barangList, jasaList)}
              onUpdate={(item, patch) => updateItem(items.indexOf(item), patch)}
              onRemove={(item) => removeItem(items.indexOf(item))}
            />

            <div className="space-y-2 rounded-xl border border-green-100 bg-green-50/60 p-4">
              <p className="text-sm font-semibold text-zinc-900">Ringkasan Harga</p>
              <div className="flex items-center justify-between text-sm text-zinc-600">
                <span>Total harga satuan (tanpa diskon)</span>
                <span>{formatRupiah(totalSatuan)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900">Harga Paket</span>
                <span className="text-lg font-bold text-green-600">{formatRupiah(hargaPaket)}</span>
              </div>
              <p className="text-xs text-zinc-400">
                Otomatis dihitung dari harga tiap barang/jasa setelah diskon di atas.
              </p>
            </div>

            <div className="space-y-4 border-t border-zinc-100 pt-4">
              <Toggle
                checked={aktif}
                onChange={setAktif}
                label="Status Paket"
                hint="Paket nonaktif tidak bisa digunakan di transaksi"
              />
              <Toggle
                checked={tampilBooking}
                onChange={setTampilBooking}
                label="Tampilkan di Form Booking"
                hint="Pelanggan bisa memilih paket ini saat mengajukan booking"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? "Menyimpan..." : isEdit ? "Perbarui Paket" : "Buat Paket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
