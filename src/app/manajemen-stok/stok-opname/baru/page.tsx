"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ClipboardList, Save, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Barang, Lokasi } from "@/lib/types";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Select } from "@/components/ui/Select";
import { DateInput } from "@/components/ui/DateInput";

interface OpnameRow {
  itemId: string;
  kode: string;
  nama: string;
  satuan: string;
  stokSistem: number;
  stokFisik: string;
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function StokOpnameBaruPage() {
  const router = useRouter();
  const [allBarang, setAllBarang] = useState<Barang[]>([]);
  const [lokasiList, setLokasiList] = useState<Lokasi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .barang({ limit: 1000 })
      .then((res) => setAllBarang(res.data))
      .finally(() => setLoading(false));
    api.lokasi().then(setLokasiList);
  }, []);

  const lokasiOptions = useMemo(
    () => lokasiList.filter((l) => l.status === "aktif").map((l) => l.nama),
    [lokasiList]
  );

  const [lokasi, setLokasi] = useState("");
  const [tanggal, setTanggal] = useState(todayInputDate);
  const [catatan, setCatatan] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<OpnameRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectLokasi(value: string) {
    setLokasi(value);
    const nextRows: OpnameRow[] = [];
    allBarang.forEach((b) => {
      b.stokLokasi
        .filter((sl) => sl.lokasi === value)
        .forEach((sl) => {
          nextRows.push({
            itemId: b.id,
            kode: b.kode,
            nama: b.nama,
            satuan: sl.satuan,
            stokSistem: sl.jumlah,
            stokFisik: String(sl.jumlah),
          });
        });
    });
    nextRows.sort((a, b) => a.nama.localeCompare(b.nama));
    setRows(nextRows);
  }

  function updateStokFisik(itemId: string, satuan: string, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.itemId === itemId && r.satuan === satuan ? { ...r, stokFisik: value } : r))
    );
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.nama.toLowerCase().includes(q) || r.kode.toLowerCase().includes(q));
  }, [rows, search]);

  const totalDiperiksa = rows.length;
  const totalSelisih = rows.filter((r) => (Number(r.stokFisik) || 0) !== r.stokSistem).length;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.createStokOpname({
        lokasi,
        tanggal: tanggal ? new Date(tanggal).toISOString() : undefined,
        catatan: catatan || undefined,
        items: rows.map((r) => ({ itemId: r.itemId, stokFisik: Number(r.stokFisik) || 0 })),
      });
      router.push("/manajemen-stok/stok-opname");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan stok opname");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb items={[{ label: "Stok Opname", href: "/manajemen-stok/stok-opname" }, { label: "Buat Baru" }]} />
          <h1 className="text-2xl font-bold text-zinc-900">Buat Stok Opname</h1>
          <p className="text-sm text-zinc-500">Cocokkan stok fisik dengan stok sistem per lokasi</p>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            Lokasi <span className="text-red-500">*</span>
          </span>
          <Select
            value={lokasi}
            onChange={selectLokasi}
            disabled={loading}
            placeholder={loading ? "Memuat lokasi..." : "Pilih lokasi..."}
            options={lokasiOptions.map((l) => ({ value: l, label: l }))}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">Tanggal Opname</span>
          <DateInput value={tanggal} onChange={setTanggal} />
        </label>
      </div>

      {!loading && lokasiOptions.length === 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-600">
          Belum ada data lokasi. Tambahkan lokasi terlebih dahulu lewat menu Lokasi.
        </p>
      )}

      {lokasi && (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-green-600 px-4 py-3 text-white">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardList className="h-4 w-4" /> Hitung Fisik — {lokasi} ({totalDiperiksa} item)
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-200" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau kode..."
                  className="w-56 rounded-lg bg-white/15 py-1.5 pl-9 pr-3 text-sm text-white placeholder:text-green-100 focus:outline-none"
                />
              </div>
            </div>
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-4 py-2 font-medium">Kode</th>
                    <th className="px-4 py-2 font-medium">Nama</th>
                    <th className="px-4 py-2 font-medium">Satuan</th>
                    <th className="px-4 py-2 text-right font-medium">Stok Sistem</th>
                    <th className="px-4 py-2 text-right font-medium">Stok Fisik</th>
                    <th className="px-4 py-2 text-right font-medium">Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-zinc-400">
                        Tidak ada barang ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r) => {
                      const stokFisik = Number(r.stokFisik) || 0;
                      const selisih = stokFisik - r.stokSistem;
                      return (
                        <tr key={`${r.itemId}-${r.satuan}`} className="border-b border-zinc-50 last:border-0">
                          <td className="px-4 py-2 text-zinc-500">{r.kode}</td>
                          <td className="px-4 py-2 font-medium text-zinc-900">{r.nama}</td>
                          <td className="px-4 py-2 text-zinc-700">{r.satuan}</td>
                          <td className="px-4 py-2 text-right text-zinc-700">{r.stokSistem}</td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              value={r.stokFisik}
                              onChange={(e) => updateStokFisik(r.itemId, r.satuan, e.target.value)}
                              className="w-24 rounded-lg border border-zinc-200 px-2 py-1.5 text-right text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span
                              className={clsx(
                                "font-semibold",
                                selisih === 0 ? "text-zinc-400" : selisih > 0 ? "text-emerald-600" : "text-red-600"
                              )}
                            >
                              {selisih > 0 ? `+${selisih}` : selisih}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">Catatan</span>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={3}
                placeholder="Catatan hasil opname (opsional)..."
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">
              {totalDiperiksa} item diperiksa ·{" "}
              <span className={clsx("font-semibold", totalSelisih > 0 ? "text-amber-600" : "text-zinc-500")}>
                {totalSelisih} item selisih
              </span>
            </p>
            <button
              type="button"
              disabled={submitting || rows.length === 0}
              onClick={handleSubmit}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              {submitting ? "Menyimpan..." : "Simpan Stok Opname"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
