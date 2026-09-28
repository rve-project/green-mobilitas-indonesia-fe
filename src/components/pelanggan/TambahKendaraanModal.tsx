"use client";

import { FormEvent, useState } from "react";
import { X, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { Kendaraan } from "@/lib/types";
import { LookupSearchSelectField } from "@/components/ui/LookupSearchSelectField";

interface TambahKendaraanModalProps {
  pelangganId: string;
  kendaraan?: Kendaraan;
  onClose: () => void;
  onSaved: (kendaraan: Kendaraan) => void;
}

export function TambahKendaraanModal({ pelangganId, kendaraan, onClose, onSaved }: TambahKendaraanModalProps) {
  const isEdit = Boolean(kendaraan);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipe, setTipe] = useState(kendaraan?.tipe ?? "");
  const [merk, setMerk] = useState(kendaraan?.merk ?? "");
  const [model, setModel] = useState(kendaraan?.model ?? "");
  const [platNomor, setPlatNomor] = useState(kendaraan?.platNomor ?? "");
  const [tahun, setTahun] = useState(String(kendaraan?.tahun ?? new Date().getFullYear()));
  const [warna, setWarna] = useState(kendaraan?.warna ?? "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { tipe, merk, model, platNomor, tahun: Number(tahun), warna: warna || undefined };
      const saved = isEdit
        ? await api.updateKendaraan(kendaraan!.id, payload)
        : await api.createKendaraan({ pelangganId, ...payload });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kendaraan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between bg-green-600 px-6 py-4 text-white">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit Kendaraan" : "Tambah Kendaraan Baru"}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded p-1 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          {isEdit ? (
            <div className="rounded-lg bg-zinc-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Informasi Kendaraan</p>
              <p className="mt-1 font-semibold text-zinc-900">
                {merk} {model}
              </p>
              <p className="text-sm text-zinc-500">{tipe}</p>
            </div>
          ) : (
            <>
              <Field label="Tipe Kendaraan" required>
                <LookupSearchSelectField
                  tipe="tipe-kendaraan"
                  label="Tipe Kendaraan"
                  value={tipe}
                  onChange={setTipe}
                  placeholder="Cari tipe kendaraan..."
                  required
                />
              </Field>
              <Field label="Merek Kendaraan" required>
                <LookupSearchSelectField
                  tipe="brand-kendaraan"
                  label="Merek Kendaraan"
                  value={merk}
                  onChange={setMerk}
                  placeholder="Cari merek kendaraan..."
                  required
                />
              </Field>
              <Field label="Model Kendaraan" required>
                <LookupSearchSelectField
                  tipe="model-kendaraan"
                  label="Model Kendaraan"
                  value={model}
                  onChange={setModel}
                  placeholder="Cari model kendaraan..."
                  required
                />
              </Field>
            </>
          )}
          <Field label="TNKB (Nomor Polisi)" required>
            <input
              required
              value={platNomor}
              onChange={(e) => setPlatNomor(e.target.value)}
              placeholder="Contoh: B 6481 ADH"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tahun Pembuatan" required>
              <input
                required
                type="number"
                min={1900}
                value={tahun}
                onChange={(e) => setTahun(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Warna">
              <input
                value={warna}
                onChange={(e) => setWarna(e.target.value)}
                placeholder="Contoh: Merah"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
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
              className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              {submitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Kendaraan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
