"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Building2,
  Calendar,
  ChevronUp,
  CreditCard,
  FileText,
  LayoutGrid,
  List as ListIcon,
  Package,
  Pencil,
  Percent,
  Plus,
  Save,
  Search,
  Settings2,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { api } from "@/lib/api";
import { Barang, DiskonTipe, Lokasi, Lookup, PajakSetting, Supplier } from "@/lib/types";
import { formatDate, formatNumberId, formatRupiah, hitungTotalSetelahDiskon, parseNumberId } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { DiskonItemInput } from "@/components/ui/DiskonItemInput";
import { IdSearchSelectField } from "@/components/ui/IdSearchSelectField";
import { LookupSearchSelectField } from "@/components/ui/LookupSearchSelectField";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { DateInput } from "@/components/ui/DateInput";
import { TambahSupplierModal } from "@/components/supplier/TambahSupplierModal";
import { TambahBarangModal } from "@/components/barang/TambahBarangModal";

interface WorkingItem {
  itemId: string;
  qty: number;
  diskonTipe: DiskonTipe;
  diskonPersen: number;
  diskonRp: number;
  hargaSatuan?: number;
  satuan?: string;
  lokasi?: string;
}

const STEPS = ["Pilih Item", "Detail Invoice", "Review & Simpan"];

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

function roundToNearest(value: number, step: number) {
  if (!step) return value;
  return Math.round(value / step) * step;
}

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-6">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2 sm:gap-3">
          <div className="flex flex-col items-center gap-1">
            <div
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                i <= step ? "bg-green-600 text-white" : "bg-zinc-100 text-zinc-400"
              )}
            >
              {i + 1}
            </div>
            <span className={clsx("text-xs font-medium", i <= step ? "text-green-600" : "text-zinc-400")}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={clsx("h-px w-16 sm:w-28", i < step ? "bg-green-600" : "bg-zinc-200")} />}
        </div>
      ))}
    </div>
  );
}

interface PembelianFormProps {
  mode: "create" | "edit";
  pembelianId?: string;
}

export function PembelianForm({ mode, pembelianId }: PembelianFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [step, setStep] = useState(0);
  const [loadingPembelian, setLoadingPembelian] = useState(isEdit);
  const [existingDibayar, setExistingDibayar] = useState(0);

  const [allBarang, setAllBarang] = useState<Barang[]>([]);
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [pajakSetting, setPajakSetting] = useState<PajakSetting>({ aktif: false, persentase: 0, pembulatan: 0 });
  const [syaratPembayaranLookup, setSyaratPembayaranLookup] = useState<Lookup[]>([]);
  const [lokasiList, setLokasiList] = useState<Lokasi[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.barang({ limit: 1000 }), api.supplier(), api.getPajak(), api.lookup("syarat-pembayaran"), api.lokasi()])
      .then(([barangRes, supplierRes, pajakRes, syaratRes, lokasiRes]) => {
        setAllBarang(barangRes.data);
        setSupplierList(supplierRes);
        setPajakSetting(pajakRes);
        setSyaratPembayaranLookup(syaratRes);
        setLokasiList(lokasiRes);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat data"));
  }, []);

  function barangById(itemId: string) {
    return allBarang.find((b) => b.id === itemId);
  }

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [catalogData, setCatalogData] = useState<{ data: Barang[]; total: number }>({ data: [], total: 0 });
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    api.barang({ search: search || undefined, kategori: kategoriFilter || undefined, page, limit: pageSize }).then((res) => {
      if (!cancelled) setCatalogData({ data: res.data, total: res.total });
    });
    return () => {
      cancelled = true;
    };
  }, [search, kategoriFilter, page, pageSize]);

  const kategoriOptions = useMemo(() => Array.from(new Set(allBarang.map((b) => b.kategori))).sort(), [allBarang]);

  const [workingItems, setWorkingItems] = useState<WorkingItem[]>([]);

  function addItem(itemId: string) {
    const barang = barangById(itemId);
    setWorkingItems((prev) => {
      if (prev.some((i) => i.itemId === itemId)) return prev;
      return [
        ...prev,
        {
          itemId,
          qty: 0,
          diskonTipe: "persen",
          diskonPersen: 0,
          diskonRp: 0,
          hargaSatuan: barang?.hargaBeli ?? 0,
          satuan: barang?.units.find((u) => u.isDefault)?.satuan ?? barang?.units[0]?.satuan,
        },
      ];
    });
  }

  function toggleItem(itemId: string) {
    if (workingItems.some((i) => i.itemId === itemId)) {
      setWorkingItems((prev) => prev.filter((i) => i.itemId !== itemId));
    } else {
      addItem(itemId);
    }
  }

  function isChecked(itemId: string): boolean {
    return workingItems.some((i) => i.itemId === itemId);
  }

  function updateWorkingItem(item: WorkingItem, patch: Partial<WorkingItem>) {
    setWorkingItems((prev) => prev.map((i) => (i === item ? { ...i, ...patch } : i)));
  }

  function removeWorkingItem(item: WorkingItem) {
    setWorkingItems((prev) => prev.filter((i) => i !== item));
  }

  function nameOf(item: WorkingItem) {
    return barangById(item.itemId)?.nama ?? "Barang dihapus";
  }

  function kodeOf(item: WorkingItem) {
    return barangById(item.itemId)?.kode ?? "-";
  }

  function stokOf(item: WorkingItem) {
    return barangById(item.itemId)?.stok ?? 0;
  }

  function unitOptionsOf(item: WorkingItem): string[] {
    const barang = barangById(item.itemId);
    return barang ? Array.from(new Set(barang.units.map((u) => u.satuan))) : [];
  }

  const lokasiOptions = useMemo(
    () => lokasiList.filter((l) => l.status === "aktif").map((l) => l.nama),
    [lokasiList]
  );

  function priceOf(item: WorkingItem) {
    return item.hargaSatuan ?? 0;
  }

  const selectedCount = workingItems.length;

  const subtotal = useMemo(
    () =>
      workingItems.reduce(
        (sum, item) =>
          sum + hitungTotalSetelahDiskon(priceOf(item) * item.qty, item.diskonTipe, item.diskonPersen, item.diskonRp),
        0
      ),
    [workingItems]
  );

  const [supplierId, setSupplierId] = useState("");
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [showTambahSupplier, setShowTambahSupplier] = useState(false);
  const [tanggalInvoice, setTanggalInvoice] = useState(todayInputDate);
  const [noInvoiceSupplier, setNoInvoiceSupplier] = useState("");
  const [syaratPembayaran, setSyaratPembayaran] = useState("");
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState("");
  const [potonganPersen, setPotonganPersen] = useState("");
  const [biayaPengiriman, setBiayaPengiriman] = useState("");
  const [biayaLainnya, setBiayaLainnya] = useState("");
  const [bebasPpn, setBebasPpn] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [bayarLunas, setBayarLunas] = useState(false);
  const [paymentSectionOpen, setPaymentSectionOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<{ metode: string; jumlah: string }[]>([
    { metode: "Cash", jumlah: "" },
  ]);
  const [catatanPembayaran, setCatatanPembayaran] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit mode: load the existing pembelian and prefill every field once it arrives.
  // Payment fields are intentionally left alone -- editing here only changes what was
  // purchased, not what's been paid (see the "Informasi Pembayaran" section below).
  useEffect(() => {
    if (!isEdit || !pembelianId) return;
    let cancelled = false;
    api.getPembelian(pembelianId).then((p) => {
      if (cancelled) return;
      setSupplierId(p.supplierId);
      setTanggalInvoice(p.tanggal ? p.tanggal.slice(0, 10) : todayInputDate());
      setNoInvoiceSupplier(p.noInvoiceSupplier ?? "");
      setSyaratPembayaran(p.syaratPembayaran ?? "");
      setTanggalJatuhTempo(p.jatuhTempo ? p.jatuhTempo.slice(0, 10) : "");
      setPotonganPersen(p.potonganPersen ? String(p.potonganPersen) : "");
      setBiayaPengiriman(p.biayaPengiriman ? String(p.biayaPengiriman) : "");
      setBiayaLainnya(p.biayaLainnya ? String(p.biayaLainnya) : "");
      setBebasPpn(Boolean(p.bebasPpn));
      setCatatan(p.catatan ?? "");
      setExistingDibayar(p.dibayar);
      setWorkingItems(
        p.items.map((it) => ({
          itemId: it.itemId,
          qty: it.qty,
          diskonTipe: it.diskonTipe ?? "persen",
          diskonPersen: it.diskonPersen,
          diskonRp: it.diskonRp ?? 0,
          hargaSatuan: it.hargaSatuan,
          satuan: it.satuan,
          lokasi: it.lokasi,
        }))
      );
      setStep(1);
      setLoadingPembelian(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isEdit, pembelianId]);

  function handleSyaratPembayaranChange(nama: string) {
    setSyaratPembayaran(nama);
    const match = syaratPembayaranLookup.find((l) => l.nama === nama);
    if (match?.jatuhTempoHari === undefined) return;
    const base = tanggalInvoice ? new Date(tanggalInvoice) : new Date();
    base.setDate(base.getDate() + match.jatuhTempoHari);
    setTanggalJatuhTempo(base.toISOString().slice(0, 10));
  }

  const supplierTerpilih = supplierList.find((s) => s.id === supplierId);

  const potongan = Number(potonganPersen) || 0;
  const ongkir = Number(biayaPengiriman) || 0;
  const lainnya = Number(biayaLainnya) || 0;
  const dpp = subtotal * (1 - potongan / 100);
  const pajakPersenEfektif = !bebasPpn && pajakSetting.aktif ? pajakSetting.persentase : 0;
  const pajakNominal = roundToNearest(dpp * (pajakPersenEfektif / 100), pajakSetting.pembulatan);
  const totalInvoice = dpp + pajakNominal + ongkir + lainnya;

  const semuaLokasiTerisi = workingItems.every((i) => !!i.lokasi);

  function addPaymentMethod() {
    setPaymentMethods((prev) => [...prev, { metode: "Cash", jumlah: "" }]);
  }

  function updatePaymentMethod(index: number, patch: Partial<{ metode: string; jumlah: string }>) {
    setPaymentMethods((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removePaymentMethod(index: number) {
    setPaymentMethods((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleBayarLunas(checked: boolean) {
    setBayarLunas(checked);
    if (checked) {
      setPaymentMethods([{ metode: paymentMethods[0]?.metode ?? "Cash", jumlah: String(Math.round(totalInvoice)) }]);
    }
  }

  const totalDibayar = bayarLunas
    ? totalInvoice
    : paymentMethods.reduce((sum, p) => sum + (Number(p.jumlah) || 0), 0);
  const sisaTagihan = Math.max(0, totalInvoice - totalDibayar);
  const statusPembayaranLabel =
    totalInvoice <= 0 || totalDibayar >= totalInvoice ? "Lunas" : totalDibayar <= 0 ? "Belum Bayar" : "Dibayar Setengah";
  const statusPembayaranClass =
    statusPembayaranLabel === "Lunas"
      ? "text-emerald-600"
      : statusPembayaranLabel === "Belum Bayar"
        ? "text-red-500"
        : "text-amber-600";

  async function handleSubmit(status: "selesai" | "draft" = "selesai") {
    setSubmitting(true);
    setError(null);
    try {
      const items = workingItems.map(({ itemId, qty, diskonTipe, diskonPersen, diskonRp, hargaSatuan, lokasi, satuan }) => ({
        itemId,
        qty,
        diskonTipe,
        diskonPersen,
        diskonRp,
        hargaSatuan,
        lokasi,
        satuan,
      }));

      if (isEdit && pembelianId) {
        await api.updatePembelian(pembelianId, {
          supplierId,
          tanggal: tanggalInvoice ? new Date(tanggalInvoice).toISOString() : undefined,
          jatuhTempo: tanggalJatuhTempo ? new Date(tanggalJatuhTempo).toISOString() : undefined,
          syaratPembayaran: syaratPembayaran || undefined,
          noInvoiceSupplier: noInvoiceSupplier || undefined,
          catatan: catatan || undefined,
          potonganPersen: potongan || undefined,
          biayaPengiriman: ongkir || undefined,
          biayaLainnya: lainnya || undefined,
          bebasPpn,
          items,
        });
        router.push("/pembelian/faktur");
        return;
      }

      const created = await api.createPembelian({
        supplierId,
        tanggal: tanggalInvoice ? new Date(tanggalInvoice).toISOString() : undefined,
        jatuhTempo: tanggalJatuhTempo ? new Date(tanggalJatuhTempo).toISOString() : undefined,
        syaratPembayaran: syaratPembayaran || undefined,
        noInvoiceSupplier: noInvoiceSupplier || undefined,
        catatan: catatan || undefined,
        potonganPersen: potongan || undefined,
        biayaPengiriman: ongkir || undefined,
        biayaLainnya: lainnya || undefined,
        bebasPpn,
        metodePembayaran: paymentMethods.map((p) => p.metode).join(", ") || undefined,
        catatanPembayaran: catatanPembayaran || undefined,
        status,
        dibayar: totalDibayar,
        items,
      });
      router.push("/pembelian/faktur");
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan invoice");
    } finally {
      setSubmitting(false);
    }
  }

  const todayLabel = formatDate(new Date().toISOString());

  function renderItemRow(item: WorkingItem, index: number) {
    const units = unitOptionsOf(item);
    const price = priceOf(item);
    const rowTotal = hitungTotalSetelahDiskon(price * item.qty, item.diskonTipe, item.diskonPersen, item.diskonRp);
    return (
      <div key={`${item.itemId}-${index}`} className="rounded-lg border border-zinc-200 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-900">{nameOf(item)}</p>
              <p className="text-xs text-zinc-400">{kodeOf(item)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600">
              Stok: {stokOf(item)}
            </span>
            {!item.lokasi && (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-600">
                Pilih Lokasi
              </span>
            )}
            <button
              type="button"
              onClick={() => removeWorkingItem(item)}
              aria-label={`Hapus ${nameOf(item)}`}
              className="text-zinc-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Unit</label>
            <Select
              value={item.satuan ?? units[0] ?? ""}
              onChange={(v) => updateWorkingItem(item, { satuan: v })}
              options={units.map((u) => ({ value: u, label: u }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Lokasi Pengiriman</label>
            <Select
              value={item.lokasi ?? ""}
              onChange={(v) => updateWorkingItem(item, { lokasi: v || undefined })}
              disabled={lokasiOptions.length === 0}
              placeholder={lokasiOptions.length === 0 ? "Tidak ada lokasi" : "Pilih Sublokasi Pengiriman"}
              options={lokasiOptions.map((l) => ({ value: l, label: l }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Harga</label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumberId(item.hargaSatuan ?? 0)}
              onChange={(e) => updateWorkingItem(item, { hargaSatuan: parseNumberId(e.target.value) })}
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Diskon Item</label>
            <DiskonItemInput
              tipe={item.diskonTipe}
              persen={item.diskonPersen}
              rupiah={item.diskonRp}
              onChange={(patch) => updateWorkingItem(item, patch)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Qty</label>
            <input
              type="number"
              min={0}
              value={item.qty}
              onChange={(e) => updateWorkingItem(item, { qty: Number(e.target.value) || 0 })}
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs text-zinc-500">Total</p>
            <p className="text-sm font-semibold text-zinc-900">{formatRupiah(rowTotal)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadingPembelian) {
    return (
      <div className="flex-1 px-4 py-5 sm:px-8 sm:py-6">
        <p className="text-sm text-zinc-400">Memuat invoice...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: "Faktur Pembelian", href: "/pembelian/faktur" },
              { label: isEdit ? "Edit Invoice" : "Buat Invoice" },
            ]}
          />
          <h1 className="text-2xl font-bold text-zinc-900">{isEdit ? "Edit Invoice Pembelian" : "Buat Invoice Pembelian"}</h1>
          <p className="text-sm text-zinc-500">
            {STEPS[step]} • Tanggal: {todayLabel}
          </p>
        </div>
      </div>

      <StepBar step={step} />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {step === 0 && (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-3 rounded-xl bg-green-600 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-green-200" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari kode item atau nama barang..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-green-200 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Item Baru
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select
              value={kategoriFilter}
              onChange={(v) => {
                setKategoriFilter(v);
                setPage(1);
              }}
              className="w-36"
              options={[{ value: "", label: "Filter" }, ...kategoriOptions.map((k) => ({ value: k, label: k }))]}
            />
            <div className="flex overflow-hidden rounded-lg border border-zinc-200">
              <button
                type="button"
                aria-label="Tampilan grid"
                onClick={() => setView("grid")}
                className={clsx("p-2", view === "grid" ? "bg-zinc-100 text-zinc-700" : "bg-white text-zinc-400")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Tampilan list"
                onClick={() => setView("list")}
                className={clsx("p-2", view === "list" ? "bg-green-600 text-white" : "bg-white text-zinc-400")}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {catalogData.data.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-400">Tidak ada data ditemukan</p>
          ) : view === "list" ? (
            <div className="divide-y divide-zinc-50">
              {catalogData.data.map((entry) => (
                <label
                  key={entry.id}
                  className={clsx(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-3",
                    isChecked(entry.id) ? "bg-green-50" : "hover:bg-zinc-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked(entry.id)}
                    onChange={() => toggleItem(entry.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                    <Package className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-zinc-400">{entry.kode}</span>
                    <span className="block truncate text-sm font-medium text-zinc-900">{entry.nama}</span>
                  </span>
                  <span
                    className={clsx(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                      isChecked(entry.id) ? "bg-green-100 text-green-600" : "bg-zinc-100 text-zinc-600"
                    )}
                  >
                    {entry.satuan} · {entry.stok}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {catalogData.data.map((entry) => (
                <label
                  key={entry.id}
                  className="flex cursor-pointer flex-col gap-2 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                      <Package className="h-4 w-4" />
                    </span>
                    <input
                      type="checkbox"
                      checked={isChecked(entry.id)}
                      onChange={() => toggleItem(entry.id)}
                      className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">{entry.kode}</p>
                    <p className="truncate text-sm font-medium text-zinc-900">{entry.nama}</p>
                  </div>
                  <span className="w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {entry.satuan} · {entry.stok}
                  </span>
                </label>
              ))}
            </div>
          )}

          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={catalogData.total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
            <span className="text-sm text-zinc-500">{selectedCount} item dipilih</span>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingBag className="h-4 w-4" />
              Lanjutkan
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Konfigurasi Invoice</h2>
            <p className="text-sm text-zinc-500">Lengkapi detail supplier dan atur jumlah item</p>
          </div>

          {pajakSetting.aktif && (
            <div className="flex items-center gap-3 rounded-xl bg-green-600 px-4 py-3 text-white">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Percent className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{bebasPpn ? "Invoice Bebas Pajak" : "Invoice Dikenakan Pajak"}</p>
                <p className="text-xs text-green-100">
                  {bebasPpn
                    ? "PPN tidak diterapkan pada invoice ini (diatur di Pengaturan Tambahan)"
                    : `Pajak ${pajakSetting.persentase}% akan diterapkan pada invoice ini`}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Building2 className="h-4 w-4 text-green-600" /> Informasi Invoice
              </p>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Supplier <span className="text-red-500">*</span>
                </span>
                {!supplierId && !supplierPickerOpen && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setSupplierPickerOpen(true)}
                      className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-green-200 p-6 text-sm font-medium text-green-600 hover:bg-green-50"
                    >
                      <Plus className="h-5 w-5" />
                      Pilih Supplier
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTambahSupplier(true)}
                      className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-200 p-6 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      <Plus className="h-5 w-5" />
                      Tambah Supplier
                    </button>
                  </div>
                )}
                {!supplierId && supplierPickerOpen && (
                  <IdSearchSelectField
                    value={supplierId}
                    onChange={(id) => {
                      if (id) {
                        setSupplierId(id);
                        setSupplierPickerOpen(false);
                      }
                    }}
                    options={supplierList.map((s) => ({ id: s.id, label: s.nama, sublabel: s.telepon }))}
                    onAddNew={() => setShowTambahSupplier(true)}
                    placeholder="Cari nama supplier..."
                  />
                )}
                {supplierId && (
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{supplierTerpilih?.nama}</p>
                      <p className="text-xs text-zinc-400">{supplierTerpilih?.telepon}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSupplierId("")}
                      className="text-sm font-medium text-green-600 hover:underline"
                    >
                      Ganti
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Calendar className="h-4 w-4 text-green-600" /> Tanggal
              </p>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">Tanggal Invoice</span>
                <DateInput value={tanggalInvoice} onChange={setTanggalInvoice} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">No. Invoice Supplier</span>
                <input
                  value={noInvoiceSupplier}
                  onChange={(e) => setNoInvoiceSupplier(e.target.value)}
                  placeholder="Nomor invoice dari supplier (opsional)"
                  className={inputClass}
                />
              </label>

              <p className="flex items-center gap-2 border-t border-zinc-100 pt-3 text-sm font-semibold text-zinc-900">
                <CreditCard className="h-4 w-4 text-green-600" /> Syarat Pembayaran
              </p>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Syarat Pembayaran <span className="text-red-500">*</span>
                </span>
                <LookupSearchSelectField
                  tipe="syarat-pembayaran"
                  label="Syarat Pembayaran"
                  value={syaratPembayaran}
                  onChange={handleSyaratPembayaranChange}
                  placeholder="Cari syarat pembayaran..."
                  required
                  showJatuhTempo
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">Tanggal Jatuh Tempo</span>
                <DateInput value={tanggalJatuhTempo} onChange={setTanggalJatuhTempo} />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200">
            <div className="flex items-center justify-between rounded-t-xl bg-green-600 px-4 py-3 text-white">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Package className="h-4 w-4" /> Daftar Barang ({workingItems.length})
              </p>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Barang
              </button>
            </div>
            <div className="space-y-2 rounded-b-xl bg-white p-3">
              {workingItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-400">Belum ada barang dipilih</p>
              ) : (
                workingItems.map((item, i) => renderItemRow(item, i))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Settings2 className="h-4 w-4 text-zinc-500" /> Pengaturan Tambahan
              </p>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">Potongan Global</span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={potonganPersen}
                    onChange={(e) => setPotonganPersen(e.target.value)}
                    placeholder="Masukkan persentase diskon (0-100)"
                    className={`${inputClass} pr-8`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">%</span>
                </div>
              </label>

              {pajakSetting.aktif && (
                <label className="flex items-center gap-2 border-t border-zinc-100 pt-3 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={bebasPpn}
                    onChange={(e) => setBebasPpn(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                  />
                  Bebas PPN untuk invoice ini
                </label>
              )}

              <div className="grid grid-cols-1 gap-4 border-t border-zinc-100 pt-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700">
                    <Truck className="h-3.5 w-3.5" /> Biaya Pengiriman (Rp)
                  </span>
                  <RupiahInput
                    value={biayaPengiriman}
                    onChange={setBiayaPengiriman}
                    placeholder="Contoh: 50.000"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">Biaya Lainnya (Rp)</span>
                  <RupiahInput
                    value={biayaLainnya}
                    onChange={setBiayaLainnya}
                    placeholder="Contoh: 25.000"
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="block border-t border-zinc-100 pt-3">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">Catatan</span>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={3}
                  placeholder="Catatan atau instruksi khusus..."
                  className={inputClass}
                />
              </label>
            </div>

            <div className="space-y-2 rounded-xl bg-green-600 p-4 text-white shadow-sm">
              <p className="text-sm font-semibold">Ringkasan Pembayaran</p>
              <div className="flex items-center justify-between text-sm text-green-50">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/20 pb-2 text-sm text-green-50">
                <span>Diskon</span>
                <span>-{formatRupiah(subtotal - dpp)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-green-50">
                <span>Sebelum Pajak:</span>
                <span>{formatRupiah(dpp)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-green-50">
                <span>{bebasPpn ? "Pajak (Bebas PPN)" : `Pajak (${pajakPersenEfektif}%)`}:</span>
                <span>+{formatRupiah(pajakNominal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-green-50">
                <span>Biaya Pengiriman:</span>
                <span>+{formatRupiah(ongkir)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-green-50">
                <span>Biaya Lainnya:</span>
                <span>+{formatRupiah(lainnya)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/20 pt-2 text-base font-bold">
                <span>Total:</span>
                <span>{formatRupiah(totalInvoice)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Kembali
            </button>
            <button
              type="button"
              disabled={!supplierId || !syaratPembayaran || workingItems.length === 0 || !semuaLokasiTerisi}
              onClick={() => setStep(2)}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Lanjut ke Review
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Review & Simpan</h2>
            <p className="text-sm text-blue-600">Pastikan semua informasi sudah benar sebelum menyimpan</p>
          </div>

          <div className="overflow-hidden rounded-xl bg-gradient-to-r from-green-800 to-green-600 p-5 text-white shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">Informasi Invoice</p>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-green-100">Tanggal Invoice</p>
                <p className="text-sm font-semibold">
                  {tanggalInvoice ? formatDate(new Date(tanggalInvoice).toISOString()) : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-100">Supplier</p>
                <p className="text-sm font-semibold">{supplierTerpilih?.nama ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-green-100">Syarat Bayar</p>
                <p className="text-sm font-semibold">{syaratPembayaran || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-green-100">Total Item</p>
                <p className="text-sm font-semibold">{workingItems.length}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-green-100 shadow-sm">
              <div className="flex items-center justify-between bg-green-50 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-900">Informasi Supplier</p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-green-200 px-3 py-1 text-xs font-semibold text-green-600 hover:bg-green-100"
                >
                  Ubah
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 bg-white p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-zinc-400">Nama</p>
                  <p className="text-sm font-semibold text-zinc-900">{supplierTerpilih?.nama ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Kode</p>
                  <p className="text-sm font-semibold text-zinc-900">{supplierTerpilih?.kode ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Telepon</p>
                  <p className="text-sm font-semibold text-zinc-900">{supplierTerpilih?.telepon || "-"}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-green-100 shadow-sm">
              <div className="flex items-center justify-between bg-green-50 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-900">Detail Pembelian</p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-green-200 px-3 py-1 text-xs font-semibold text-green-600 hover:bg-green-100"
                >
                  Ubah
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 bg-white p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-zinc-400">No. Invoice Supplier</p>
                  <p className="text-sm font-semibold text-zinc-900">{noInvoiceSupplier || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Tanggal Jatuh Tempo</p>
                  <p className="text-sm font-semibold text-zinc-900">
                    {tanggalJatuhTempo ? formatDate(new Date(tanggalJatuhTempo).toISOString()) : "-"}
                  </p>
                </div>
                {catatan && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-zinc-400">Catatan</p>
                    <p className="text-sm text-zinc-700">{catatan}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <div className="bg-green-600 px-4 py-3 text-white">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Package className="h-4 w-4" /> Barang Pembelian ({workingItems.length})
              </p>
            </div>
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-4 py-2 font-medium">Nama</th>
                    <th className="px-4 py-2 font-medium">Unit</th>
                    <th className="px-4 py-2 font-medium">Lokasi</th>
                    <th className="px-4 py-2 text-right font-medium">Harga</th>
                    <th className="px-4 py-2 text-right font-medium">Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Disc</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                    <th className="px-4 py-2 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {workingItems.map((item, i) => {
                    const price = priceOf(item);
                    const rowTotal = hitungTotalSetelahDiskon(price * item.qty, item.diskonTipe, item.diskonPersen, item.diskonRp);
                    const diskonLabel =
                      item.diskonTipe === "rupiah"
                        ? item.diskonRp > 0
                          ? formatRupiah(item.diskonRp)
                          : "-"
                        : item.diskonPersen > 0
                          ? `${item.diskonPersen}%`
                          : "-";
                    return (
                      <tr key={`${item.itemId}-${i}`} className="border-b border-zinc-50 last:border-0">
                        <td className="px-4 py-3 text-zinc-900">{nameOf(item)}</td>
                        <td className="px-4 py-3 text-zinc-700">{item.satuan ?? "-"}</td>
                        <td className="px-4 py-3 text-zinc-700">{item.lokasi ?? "-"}</td>
                        <td className="px-4 py-3 text-right text-zinc-700">{formatRupiah(price)}</td>
                        <td className="px-4 py-3 text-right text-zinc-700">{item.qty}</td>
                        <td className="px-4 py-3 text-right text-zinc-700">{diskonLabel}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatRupiah(rowTotal)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setStep(1)}
                              aria-label={`Ubah ${nameOf(item)}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeWorkingItem(item)}
                              aria-label={`Hapus ${nameOf(item)}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-green-600 p-4 text-white shadow-sm">
            <p className="text-sm font-semibold">Ringkasan Perhitungan</p>
            <div className="flex items-center justify-between text-sm text-green-50">
              <span>Subtotal Item</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/20 pb-2 text-sm text-green-50">
              <span>Diskon (%)</span>
              <span>-{formatRupiah(subtotal - dpp)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-green-50">
              <span>Sebelum Pajak</span>
              <span>{formatRupiah(dpp)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-green-50">
              <span>{bebasPpn ? "Pajak (Bebas PPN)" : `Pajak (PPN) ${pajakPersenEfektif}%`}</span>
              <span>+{formatRupiah(pajakNominal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-green-50">
              <span>Biaya Pengiriman</span>
              <span>+{formatRupiah(ongkir)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-green-50">
              <span>Biaya Lainnya</span>
              <span>+{formatRupiah(lainnya)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/20 pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatRupiah(totalInvoice)}</span>
            </div>
          </div>

          {isEdit ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Sudah Dibayar</span>
                <span className="font-medium text-zinc-900">{formatRupiah(existingDibayar)}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Pembayaran tidak diubah lewat form ini. Gunakan bagian &quot;Catat Pembayaran&quot; di detail pembelian untuk mencatat pembayaran baru.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-zinc-900">Informasi Pembayaran</p>
                  <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                    <input
                      type="checkbox"
                      checked={bayarLunas}
                      onChange={(e) => toggleBayarLunas(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                    />
                    Bayar Lunas
                  </label>
                  {!paymentSectionOpen && (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                      Opsional (untuk pembayaran sebagian)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentSectionOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-green-200 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50"
                >
                  {paymentSectionOpen ? (
                    <>
                      <ChevronUp className="h-4 w-4" /> Sembunyikan
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" /> Bayar Sekarang
                    </>
                  )}
                </button>
              </div>

              {paymentSectionOpen && (
                <div className="mt-4 space-y-4 border-t border-zinc-100 pt-4">
                  <div className="space-y-3">
                    {paymentMethods.map((pm, i) => (
                      <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-zinc-700">Metode Pembayaran</label>
                          <Select
                            value={pm.metode}
                            onChange={(v) => updatePaymentMethod(i, { metode: v })}
                            options={[
                              { value: "Cash", label: "Cash" },
                              { value: "Transfer", label: "Transfer" },
                              { value: "Kartu Debit/Kredit", label: "Kartu Debit/Kredit" },
                            ]}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="mb-1.5 block text-sm font-medium text-zinc-700">Jumlah Dibayar</label>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                                Rp
                              </span>
                              <RupiahInput
                                value={pm.jumlah}
                                onChange={(v) => updatePaymentMethod(i, { jumlah: v })}
                                placeholder="0"
                                className={`${inputClass} pl-8`}
                              />
                            </div>
                          </div>
                          {paymentMethods.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePaymentMethod(i)}
                              aria-label="Hapus metode"
                              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 hover:border-red-200 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addPaymentMethod}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Metode
                  </button>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-zinc-700">Catatan Pembayaran</span>
                    <input
                      value={catatanPembayaran}
                      onChange={(e) => setCatatanPembayaran(e.target.value)}
                      placeholder="Contoh: Pembayaran penuh"
                      className={inputClass}
                    />
                  </label>

                  <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Status Pembayaran:</p>
                      <p className="text-xs text-zinc-500">Total yang harus dibayar: {formatRupiah(sisaTagihan)}</p>
                    </div>
                    <span className={clsx("text-sm font-bold", statusPembayaranClass)}>{statusPembayaranLabel}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Kembali
            </button>
            <div className="flex items-center gap-2">
              {!isEdit && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit("draft")}
                  className="flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  Simpan Draft
                </button>
              )}
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit("selesai")}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {submitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTambahSupplier && (
        <TambahSupplierModal
          onClose={() => setShowTambahSupplier(false)}
          onSaved={(s) => {
            setSupplierList((prev) => [s, ...prev]);
            setSupplierId(s.id);
            setShowTambahSupplier(false);
          }}
        />
      )}

      {quickAddOpen && (
        <TambahBarangModal
          supplierList={supplierList}
          onClose={() => setQuickAddOpen(false)}
          onCreated={(created) => {
            setAllBarang((prev) => [created, ...prev]);
            addItem(created.id);
            setQuickAddOpen(false);
          }}
        />
      )}
    </div>
  );
}
