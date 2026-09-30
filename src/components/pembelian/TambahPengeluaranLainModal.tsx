"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { PengeluaranLain } from "@/lib/types";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { DateInput } from "@/components/ui/DateInput";
import { LookupSearchSelectField } from "@/components/ui/LookupSearchSelectField";

interface TambahPengeluaranLainModalProps {
  onClose: () => void;
  onCreated: (item: PengeluaranLain) => void;
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

export function TambahPengeluaranLainModal({ onClose, onCreated }: TambahPengeluaranLainModalProps) {
  const [kategori, setKategori] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [jumlah, setJumlah] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createPengeluaranLain({
        kategori,
        deskripsi: deskripsi || undefined,
        tanggal: new Date(tanggal).toISOString(),
        jumlah: Number(jumlah) || 0,
        status: "selesai",
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pengeluaran lain");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between bg-green-600 px-6 py-4 text-white">
          <h2 className="text-lg font-semibold">Tambah Pengeluaran Lain</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded p-1 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                Kategori <span className="text-red-500">*</span>
              </span>
              <LookupSearchSelectField
                tipe="kategori-pengeluaran"
                label="Kategori Pengeluaran"
                value={kategori}
                onChange={setKategori}
                placeholder="Cari kategori pengeluaran..."
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">Deskripsi</span>
              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Deskripsi (opsional)"
                rows={3}
                className={inputClass}
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">Tanggal</span>
                <DateInput value={tanggal} onChange={setTanggal} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Jumlah <span className="text-red-500">*</span>
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    Rp
                  </span>
                  <RupiahInput
                    required
                    value={jumlah}
                    onChange={setJumlah}
                    placeholder="0"
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </label>
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
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
