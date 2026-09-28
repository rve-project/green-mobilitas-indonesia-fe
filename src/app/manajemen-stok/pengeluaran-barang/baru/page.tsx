"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Barang, Lokasi } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { IdSearchSelectField } from "@/components/ui/IdSearchSelectField";
import { Select } from "@/components/ui/Select";

interface DraftRow {
  itemId: string;
  nama: string;
  kode: string;
  satuan: string;
  lokasi: string;
  jumlah: number;
  hargaSatuan?: number;
  catatan?: string;
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

export default function PengeluaranBarangBaruPage() {
  const router = useRouter();
  const [allBarang, setAllBarang] = useState<Barang[]>([]);
  const [lokasiList, setLokasiList] = useState<Lokasi[]>([]);

  useEffect(() => {
    api.barang({ limit: 1000 }).then((res) => setAllBarang(res.data));
    api.lokasi().then(setLokasiList);
  }, []);

  const [alasan, setAlasan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [items, setItems] = useState<DraftRow[]>([]);

  const [pickItemId, setPickItemId] = useState("");
  const [pickSatuan, setPickSatuan] = useState("");
  const [pickLokasi, setPickLokasi] = useState("");
  const [pickJumlah, setPickJumlah] = useState("");
  const [pickHarga, setPickHarga] = useState("");
  const [pickCatatan, setPickCatatan] = useState("");

  const pickedBarang = allBarang.find((b) => b.id === pickItemId);
  const unitOptions = pickedBarang ? Array.from(new Set(pickedBarang.units.map((u) => u.satuan))) : [];
  const lokasiOptions = lokasiList.filter((l) => l.status === "aktif").map((l) => l.nama);
  const tersedia =
    pickedBarang?.stokLokasi.find((sl) => sl.lokasi === pickLokasi && sl.satuan === pickSatuan)?.jumlah ?? 0;
  const jumlahMelebihiStok = pickLokasi !== "" && (Number(pickJumlah) || 0) > tersedia;

  function selectItem(id: string) {
    setPickItemId(id);
    const barang = allBarang.find((b) => b.id === id);
    setPickSatuan(barang?.units.find((u) => u.isDefault)?.satuan ?? barang?.units[0]?.satuan ?? "");
    setPickLokasi("");
  }

  function resetPicker() {
    setPickItemId("");
    setPickSatuan("");
    setPickLokasi("");
    setPickJumlah("");
    setPickHarga("");
    setPickCatatan("");
  }

  function handleAddItem() {
    const jumlah = Number(pickJumlah) || 0;
    if (!pickedBarang || !pickLokasi || jumlah <= 0 || jumlah > tersedia) return;
    setItems((prev) => [
      ...prev,
      {
        itemId: pickedBarang.id,
        nama: pickedBarang.nama,
        kode: pickedBarang.kode,
        satuan: pickSatuan || pickedBarang.satuan,
        lokasi: pickLokasi,
        jumlah,
        hargaSatuan: Number(pickHarga) > 0 ? Number(pickHarga) : undefined,
        catatan: pickCatatan || undefined,
      },
    ]);
    resetPicker();
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(status: "draft" | "terposting") {
    setSubmitting(true);
    setError(null);
    try {
      await api.createPengeluaranBarang({
        alasan,
        catatan: catatan || undefined,
        status,
        items: items.map(({ itemId, satuan, lokasi, jumlah, hargaSatuan, catatan }) => ({
          itemId,
          satuan,
          lokasi,
          jumlah,
          hargaSatuan,
          catatan,
        })),
      });
      router.push("/manajemen-stok/pengeluaran-barang");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pengeluaran barang");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = alasan.trim().length > 0 && items.length > 0 && !submitting;

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb
            items={[{ label: "Pengeluaran Barang", href: "/manajemen-stok/pengeluaran-barang" }, { label: "Buat Baru" }]}
          />
          <h1 className="text-2xl font-bold text-zinc-900">Pengeluaran Barang Baru</h1>
          <p className="text-sm text-zinc-500">Buat pengeluaran barang baru</p>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            Alasan <span className="text-red-500">*</span>
          </span>
          <input
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Contoh: Barang rusak, dipakai untuk servis internal"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">Catatan</span>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={3}
            placeholder="Catatan tambahan (opsional)"
            className={inputClass}
          />
        </label>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Detail Item ({items.length})</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-lg bg-zinc-50 p-4 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">Item</span>
            <IdSearchSelectField
              value={pickItemId}
              onChange={selectItem}
              options={allBarang.map((b) => ({ id: b.id, label: b.nama, sublabel: b.kode }))}
              placeholder="Cari..."
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">Unit</span>
            <Select
              value={pickSatuan}
              onChange={setPickSatuan}
              disabled={!pickedBarang}
              placeholder="Pilih"
              options={unitOptions.map((u) => ({ value: u, label: u }))}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">Lokasi</span>
            <Select
              value={pickLokasi}
              onChange={setPickLokasi}
              disabled={!pickedBarang}
              placeholder={lokasiOptions.length === 0 ? "Belum ada data lokasi" : "Pilih lokasi..."}
              options={lokasiOptions.map((l) => ({ value: l, label: l }))}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">
              Jumlah {pickLokasi && <span className="text-zinc-400">(tersedia: {tersedia})</span>}
            </span>
            <input
              type="number"
              min={0}
              max={tersedia || undefined}
              value={pickJumlah}
              onChange={(e) => setPickJumlah(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">Harga Satuan (opsional)</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">Rp</span>
              <input
                type="number"
                min={0}
                value={pickHarga}
                onChange={(e) => setPickHarga(e.target.value)}
                placeholder="0"
                className={`${inputClass} pl-8`}
              />
            </div>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">Catatan Item</span>
            <input
              value={pickCatatan}
              onChange={(e) => setPickCatatan(e.target.value)}
              placeholder="Catatan item (opsional)"
              className={inputClass}
            />
          </label>
          <div className="flex items-end sm:col-span-1">
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!pickedBarang || !pickLokasi || (Number(pickJumlah) || 0) <= 0 || jumlahMelebihiStok}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Tambah
            </button>
          </div>
        </div>
        {jumlahMelebihiStok && (
          <p className="mt-2 text-xs font-medium text-red-600">
            Jumlah melebihi stok tersedia di lokasi ini ({tersedia}).
          </p>
        )}

        <div className="mt-4">
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">
              Belum ada item. Isi form di atas lalu klik &quot;Tambah&quot; untuk menambahkannya.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                    <th className="py-2 pr-4 font-medium">Item</th>
                    <th className="py-2 pr-4 font-medium">Unit</th>
                    <th className="py-2 pr-4 font-medium">Lokasi</th>
                    <th className="py-2 pr-4 text-right font-medium">Jumlah</th>
                    <th className="py-2 pr-4 text-right font-medium">Harga/Unit</th>
                    <th className="py-2 pr-4 font-medium">Catatan</th>
                    <th className="py-2 pr-0" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={`${item.itemId}-${item.lokasi}-${i}`} className="border-b border-zinc-50 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-zinc-900">{item.nama}</p>
                        <p className="text-xs text-zinc-400">{item.kode}</p>
                      </td>
                      <td className="py-3 pr-4 text-zinc-700">{item.satuan}</td>
                      <td className="py-3 pr-4 text-zinc-700">{item.lokasi}</td>
                      <td className="py-3 pr-4 text-right text-zinc-700">{item.jumlah}</td>
                      <td className="py-3 pr-4 text-right text-zinc-700">
                        {item.hargaSatuan ? formatRupiah(item.hargaSatuan) : "-"}
                      </td>
                      <td className="py-3 pr-4 text-zinc-500">{item.catatan ?? "-"}</td>
                      <td className="py-3 pr-0 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          aria-label={`Hapus ${item.nama}`}
                          className="text-zinc-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/manajemen-stok/pengeluaran-barang")}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => handleSubmit("draft")}
          className="flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FileText className="h-4 w-4" />
          Simpan sebagai Draft
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => handleSubmit("terposting")}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          {submitting ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}
