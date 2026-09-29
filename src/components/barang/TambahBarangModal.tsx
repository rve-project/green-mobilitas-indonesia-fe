"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { Barang, Lokasi, SATUAN_OPTIONS, Satuan, Supplier } from "@/lib/types";
import { LookupSearchSelectField } from "@/components/ui/LookupSearchSelectField";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { Select } from "@/components/ui/Select";

const STEPS_CREATE = ["Informasi Umum", "Harga per Unit", "Stok Awal"] as const;
const STEPS_EDIT = ["Informasi Umum", "Harga per Unit"] as const;

interface TambahBarangModalProps {
  item?: Barang;
  supplierList: Supplier[];
  onClose: () => void;
  onCreated: (barang: Barang) => void;
}

interface UnitConfig {
  hargaBeli: string;
  hargaJual: string;
  conversionFactor: string;
  komisi: string;
  barcode: string;
}

interface StokConfig {
  jumlah: string;
  lokasi: string;
  stokMinimum: string;
  stokMaksimum: string;
}

const emptyUnitConfig = (): UnitConfig => ({
  hargaBeli: "",
  hargaJual: "",
  conversionFactor: "1",
  komisi: "",
  barcode: "",
});

const emptyStokConfig = (): StokConfig => ({
  jumlah: "",
  lokasi: "",
  stokMinimum: "",
  stokMaksimum: "",
});

function unitConfigFrom(unit: Barang["units"][number]): UnitConfig {
  return {
    hargaBeli: String(unit.hargaBeli),
    hargaJual: String(unit.hargaJual),
    conversionFactor: String(unit.conversionFactor),
    komisi: unit.komisi !== undefined ? String(unit.komisi) : "",
    barcode: unit.barcode ?? "",
  };
}

export function TambahBarangModal({ item, supplierList, onClose, onCreated }: TambahBarangModalProps) {
  const isEdit = Boolean(item);
  const STEPS = isEdit ? STEPS_EDIT : STEPS_CREATE;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kode, setKode] = useState(item?.kode ?? "");
  const [nama, setNama] = useState(item?.nama ?? "");
  const [kategori, setKategori] = useState(item?.kategori ?? "");
  const [jenis, setJenis] = useState(item?.jenis ?? "");
  const [deskripsi, setDeskripsi] = useState(item?.deskripsi ?? "");
  const [tampilBooking, setTampilBooking] = useState(item?.tampilBooking ?? true);

  const [brand, setBrand] = useState(item?.brand ?? "");
  const [grup, setGrup] = useState(item?.grup ?? "");
  const [model, setModel] = useState(item?.model ?? "");
  const [supplierId, setSupplierId] = useState(item?.supplierId ?? "");

  const [selectedUnits, setSelectedUnits] = useState<Satuan[]>(item?.units.map((u) => u.satuan) ?? []);
  const [defaultUnit, setDefaultUnit] = useState<Satuan | "">(
    item ? (item.units.find((u) => u.isDefault) ?? item.units[0])?.satuan ?? "" : ""
  );
  const [unitConfigs, setUnitConfigs] = useState<Record<string, UnitConfig>>(
    item ? Object.fromEntries(item.units.map((u) => [u.satuan, unitConfigFrom(u)])) : {}
  );
  const [stokConfigs, setStokConfigs] = useState<Record<string, StokConfig>>({});

  const [lokasiList, setLokasiList] = useState<Lokasi[]>([]);
  useEffect(() => {
    api.lokasi().then(setLokasiList);
  }, []);
  const lokasiOptions = useMemo(
    () => lokasiList.filter((l) => l.status === "aktif").map((l) => ({ value: l.nama, label: l.nama })),
    [lokasiList]
  );

  const isLastStep = step === STEPS.length - 1;

  function toggleUnit(unit: Satuan) {
    setSelectedUnits((prev) => {
      const isSelected = prev.includes(unit);
      const next = isSelected ? prev.filter((u) => u !== unit) : [...prev, unit];

      if (isSelected) {
        setUnitConfigs((c) => Object.fromEntries(Object.entries(c).filter(([key]) => key !== unit)));
        setStokConfigs((c) => Object.fromEntries(Object.entries(c).filter(([key]) => key !== unit)));
        setDefaultUnit((d) => (d === unit ? (next[0] ?? "") : d));
      } else {
        setUnitConfigs((c) => ({ ...c, [unit]: emptyUnitConfig() }));
        setStokConfigs((c) => ({ ...c, [unit]: emptyStokConfig() }));
        setDefaultUnit((d) => d || unit);
      }

      return next;
    });
  }

  function updateUnitConfig(unit: string, patch: Partial<UnitConfig>) {
    setUnitConfigs((prev) => ({ ...prev, [unit]: { ...prev[unit], ...patch } }));
  }

  function updateStokConfig(unit: string, patch: Partial<StokConfig>) {
    setStokConfigs((prev) => ({ ...prev, [unit]: { ...(prev[unit] ?? emptyStokConfig()), ...patch } }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (step === 0 && selectedUnits.length === 0) {
      setError("Pilih minimal satu unit");
      return;
    }

    if (!isLastStep) {
      setError(null);
      setStep((s) => s + 1);
      return;
    }

    if (!isEdit) {
      const missingLokasi = selectedUnits.some((unit) => {
        const cfg = stokConfigs[unit] ?? emptyStokConfig();
        return Number(cfg.jumlah) > 0 && !cfg.lokasi;
      });
      if (missingLokasi) {
        setError("Pilih lokasi untuk setiap unit yang diisi stok awalnya");
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const units = selectedUnits.map((unit) => {
        const cfg = unitConfigs[unit] ?? emptyUnitConfig();
        return {
          satuan: unit,
          hargaBeli: Number(cfg.hargaBeli) || 0,
          hargaJual: Number(cfg.hargaJual) || 0,
          conversionFactor: Number(cfg.conversionFactor) || 1,
          komisi: cfg.komisi ? Number(cfg.komisi) : undefined,
          barcode: cfg.barcode || undefined,
          isDefault: unit === defaultUnit,
        };
      });
      const basePayload = {
        kode,
        nama,
        kategori,
        jenis: jenis || undefined,
        grup: grup || undefined,
        deskripsi: deskripsi || undefined,
        brand: brand || undefined,
        model: model || undefined,
        supplierId: supplierId || undefined,
        tampilBooking,
        units,
      };
      const saved = isEdit
        ? await api.updateBarang(item!.id, basePayload)
        : await api.createBarang({
            ...basePayload,
            aktif: true,
            stokLokasi: selectedUnits
              .map((unit) => {
                const cfg = stokConfigs[unit] ?? emptyStokConfig();
                const jumlah = Number(cfg.jumlah) || 0;
                if (jumlah <= 0 || !cfg.lokasi) return null;
                return {
                  satuan: unit,
                  lokasi: cfg.lokasi,
                  jumlah,
                  stokMinimum: cfg.stokMinimum ? Number(cfg.stokMinimum) : undefined,
                  stokMaksimum: cfg.stokMaksimum ? Number(cfg.stokMaksimum) : undefined,
                };
              })
              .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
          });
      onCreated(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan barang");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between bg-green-600 px-6 py-4 text-white">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit Barang" : "Tambah Barang"}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded p-1 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-zinc-200 px-6">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={clsx(
                "border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                i === step ? "border-green-600 text-green-600" : "border-transparent text-zinc-400 hover:text-zinc-600"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            {step === 0 && (
              <>
                <div className="space-y-4 rounded-xl bg-zinc-50 p-4">
                  <p className="text-sm font-semibold text-zinc-700">Informasi Dasar</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Kode Item" required>
                      <input
                        required
                        value={kode}
                        onChange={(e) => setKode(e.target.value)}
                        placeholder="ITEM001"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Nama Item" required>
                      <input
                        required
                        value={nama}
                        onChange={(e) => setNama(e.target.value)}
                        placeholder="Nama item"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Kategori" required>
                      <LookupSearchSelectField
                        tipe="kategori"
                        label="Kategori"
                        value={kategori}
                        onChange={setKategori}
                        placeholder="Cari kategori..."
                        required
                      />
                    </Field>
                    <Field label="Jenis" required>
                      <LookupSearchSelectField
                        tipe="jenis"
                        label="Jenis"
                        value={jenis}
                        onChange={setJenis}
                        placeholder="Cari jenis..."
                        required
                      />
                    </Field>
                  </div>
                  <Field label="Deskripsi">
                    <textarea
                      value={deskripsi}
                      onChange={(e) => setDeskripsi(e.target.value)}
                      placeholder="Deskripsi item (opsional)"
                      rows={3}
                      className={inputClass}
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-zinc-600">
                    <input
                      type="checkbox"
                      checked={tampilBooking}
                      onChange={(e) => setTampilBooking(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                    />
                    Tampilkan di form booking pelanggan
                  </label>
                </div>

                <div className="space-y-4 rounded-xl bg-zinc-50 p-4">
                  <p className="text-sm font-semibold text-zinc-700">Informasi Barang</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Brand" required>
                      <LookupSearchSelectField
                        tipe="brand"
                        label="Brand"
                        value={brand}
                        onChange={setBrand}
                        placeholder="Cari brand..."
                        required
                      />
                    </Field>
                    <Field label="Grup" required>
                      <LookupSearchSelectField
                        tipe="grup"
                        label="Grup"
                        value={grup}
                        onChange={setGrup}
                        placeholder="Cari grup..."
                        required
                      />
                    </Field>
                  </div>
                  <Field label="Model">
                    <LookupSearchSelectField
                      tipe="model"
                      label="Model"
                      value={model}
                      onChange={setModel}
                      placeholder="Cari model..."
                    />
                  </Field>
                  <Field label="Supplier">
                    <Select
                      value={supplierId}
                      onChange={setSupplierId}
                      options={[
                        { value: "", label: "Pilih Supplier (Opsional)" },
                        ...supplierList.map((s) => ({ value: s.id, label: s.nama })),
                      ]}
                    />
                  </Field>
                  <Field label="Unit" required>
                    <div className="grid grid-cols-4 gap-2">
                      {SATUAN_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleUnit(option)}
                          className={clsx(
                            "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                            selectedUnits.includes(option)
                              ? "border-green-600 bg-green-50 text-green-600"
                              : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <SelectedUnitsBanner units={selectedUnits} />

                <div className="rounded-xl bg-zinc-50 p-4">
                  <p className="text-sm font-semibold text-zinc-700">Harga per Unit</p>
                  <div className="mt-3 space-y-4">
                    {selectedUnits.map((unit) => {
                      const cfg = unitConfigs[unit] ?? emptyUnitConfig();
                      const beli = Number(cfg.hargaBeli) || 0;
                      const jual = Number(cfg.hargaJual) || 0;
                      const margin = beli > 0 ? (((jual - beli) / beli) * 100).toFixed(1) : "0.0";
                      return (
                        <div key={unit} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-zinc-900">{unit}</p>
                            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                              <input
                                type="radio"
                                name="defaultUnit"
                                checked={defaultUnit === unit}
                                onChange={() => setDefaultUnit(unit)}
                                className="h-3.5 w-3.5 text-green-600 focus:ring-green-500"
                              />
                              Unit Default
                            </label>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Field label="Harga Beli" required>
                              <RupiahInput
                                required
                                value={cfg.hargaBeli}
                                onChange={(v) => updateUnitConfig(unit, { hargaBeli: v })}
                                placeholder="0"
                                className={inputClass}
                              />
                            </Field>
                            <Field label="Harga Jual" required>
                              <RupiahInput
                                required
                                value={cfg.hargaJual}
                                onChange={(v) => updateUnitConfig(unit, { hargaJual: v })}
                                placeholder="0"
                                className={inputClass}
                              />
                            </Field>
                            <Field label="Conversion Factor" required>
                              <input
                                required
                                type="number"
                                min={0}
                                value={cfg.conversionFactor}
                                onChange={(e) => updateUnitConfig(unit, { conversionFactor: e.target.value })}
                                className={inputClass}
                              />
                            </Field>
                          </div>
                          <Field label="Komisi">
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={cfg.komisi}
                                onChange={(e) => updateUnitConfig(unit, { komisi: e.target.value })}
                                placeholder="Masukkan %"
                                className={`${inputClass} pl-8`}
                              />
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                                %
                              </span>
                            </div>
                          </Field>
                          <Field label="Barcode (Opsional)">
                            <input
                              value={cfg.barcode}
                              onChange={(e) => updateUnitConfig(unit, { barcode: e.target.value })}
                              placeholder="Masukkan barcode barang"
                              className={inputClass}
                            />
                          </Field>
                          <p className="text-xs text-zinc-400">
                            Margin: <span className="font-semibold text-zinc-600">{margin}%</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <SelectedUnitsBanner units={selectedUnits} />

                <div className="rounded-xl bg-zinc-50 p-4">
                  <p className="text-sm font-semibold text-zinc-700">Stok Awal (Opsional)</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Tentukan jumlah stok awal untuk setiap unit (opsional - dapat dilewati)
                  </p>

                  <div className="mt-3 space-y-4">
                    {selectedUnits.map((unit) => {
                      const cfg = stokConfigs[unit] ?? emptyStokConfig();
                      return (
                        <div key={unit} className="rounded-lg border border-zinc-200 bg-white p-4">
                          <p className="mb-3 text-sm font-semibold text-zinc-900">{unit}</p>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label="Jumlah Stok">
                              <input
                                type="number"
                                min={0}
                                value={cfg.jumlah}
                                onChange={(e) => updateStokConfig(unit, { jumlah: e.target.value })}
                                placeholder="0"
                                className={inputClass}
                              />
                            </Field>
                            <Field label="Lokasi">
                              <Select
                                value={cfg.lokasi}
                                onChange={(v) => updateStokConfig(unit, { lokasi: v })}
                                disabled={lokasiOptions.length === 0}
                                placeholder={lokasiOptions.length === 0 ? "Tidak ada lokasi" : "Pilih lokasi..."}
                                options={lokasiOptions}
                              />
                            </Field>
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label="Stok Minimum">
                              <input
                                type="number"
                                min={0}
                                value={cfg.stokMinimum}
                                onChange={(e) => updateStokConfig(unit, { stokMinimum: e.target.value })}
                                placeholder="0"
                                className={inputClass}
                              />
                            </Field>
                            <Field label="Stok Maksimum">
                              <input
                                type="number"
                                min={0}
                                value={cfg.stokMaksimum}
                                onChange={(e) => updateStokConfig(unit, { stokMaksimum: e.target.value })}
                                placeholder="0"
                                className={inputClass}
                              />
                            </Field>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4">
            <button
              type="button"
              onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              {step === 0 ? "Batal" : "Kembali"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              {isLastStep
                ? submitting
                  ? "Menyimpan..."
                  : isEdit
                    ? "Perbarui Barang"
                    : "Simpan Barang"
                : "Selanjutnya"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SelectedUnitsBanner({ units }: { units: Satuan[] }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4">
      <p className="text-sm font-semibold text-zinc-700">Unit yang Dipilih</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {units.map((u) => (
          <span key={u} className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
            {u}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Unit dipilih di tab &quot;Informasi Umum&quot;. Konfigurasi di bawah ini berlaku untuk setiap unit tersebut.
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
