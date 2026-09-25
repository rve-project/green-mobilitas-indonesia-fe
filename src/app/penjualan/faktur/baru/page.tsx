"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  CreditCard,
  LayoutGrid,
  List as ListIcon,
  Layers,
  MessageSquare,
  Package,
  Percent,
  Plus,
  Search,
  Settings2,
  ShoppingCart,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { api } from "@/lib/api";
import { Barang, DiskonTipe, Jasa, Kendaraan, Lokasi, Lookup, PajakSetting, Paket, Pelanggan } from "@/lib/types";
import { formatDate, formatNumberId, formatRupiah, hitungTotalSetelahDiskon, parseNumberId } from "@/lib/format";
import { hargaSatuanPaketItem } from "@/lib/paket";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { type PickableItem } from "@/components/barang/ItemPickerSection";
import { DiskonItemInput } from "@/components/ui/DiskonItemInput";
import { IdSearchSelectField } from "@/components/ui/IdSearchSelectField";
import { LookupSearchSelectField } from "@/components/ui/LookupSearchSelectField";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { DateInput } from "@/components/ui/DateInput";
import { TambahPelangganModal } from "@/components/pelanggan/TambahPelangganModal";

type CatalogTab = "barang" | "jasa" | "paket";
type CatalogEntry = Barang | Jasa | Paket;

interface WorkingItem extends PickableItem {
  fromPaketId?: string;
  hargaSatuan?: number;
  lokasi?: string;
  diskonTipe: DiskonTipe;
  diskonRp: number;
}

const STEPS = ["Pilih Item", "Detail Invoice", "Review & Simpan"];

const TABS: { key: CatalogTab; label: string; icon: ReactNode }[] = [
  { key: "barang", label: "Barang", icon: <Package className="h-4 w-4" /> },
  { key: "jasa", label: "Jasa", icon: <Wrench className="h-4 w-4" /> },
  { key: "paket", label: "Paket", icon: <Layers className="h-4 w-4" /> },
];

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
                i === step ? "bg-green-600 text-white" : i < step ? "bg-green-100 text-green-600" : "bg-zinc-100 text-zinc-400"
              )}
            >
              {i + 1}
            </div>
            <span className={clsx("text-xs font-medium", i <= step ? "text-green-600" : "text-zinc-400")}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className="h-px w-16 bg-zinc-200 sm:w-28" />}
        </div>
      ))}
    </div>
  );
}

export default function BuatInvoicePenjualanPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [allBarang, setAllBarang] = useState<Barang[]>([]);
  const [allJasa, setAllJasa] = useState<Jasa[]>([]);
  const [tabTotals, setTabTotals] = useState<Record<CatalogTab, number>>({ barang: 0, jasa: 0, paket: 0 });
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [kendaraanList, setKendaraanList] = useState<Kendaraan[]>([]);
  const [pajakSetting, setPajakSetting] = useState<PajakSetting>({ aktif: false, persentase: 0, pembulatan: 0 });
  const [syaratPembayaranLookup, setSyaratPembayaranLookup] = useState<Lookup[]>([]);
  const [lokasiList, setLokasiList] = useState<Lokasi[]>([]);

  useEffect(() => {
    Promise.all([
      api.barang({ limit: 1000 }),
      api.jasa({ limit: 1000 }),
      api.paket({ limit: 1 }),
      api.pelanggan(),
      api.kendaraan(),
      api.getPajak(),
      api.lookup("syarat-pembayaran"),
      api.lokasi(),
    ]).then(([barangRes, jasaRes, paketRes, pelangganRes, kendaraanRes, pajakRes, syaratRes, lokasiRes]) => {
      setAllBarang(barangRes.data);
      setAllJasa(jasaRes.data);
      setTabTotals({ barang: barangRes.total, jasa: jasaRes.total, paket: paketRes.total });
      setPelangganList(pelangganRes);
      setKendaraanList(kendaraanRes);
      setPajakSetting(pajakRes);
      setSyaratPembayaranLookup(syaratRes);
      setLokasiList(lokasiRes);
    });
  }, []);

  function catalogPriceOf(tipe: "barang" | "jasa", itemId: string) {
    if (tipe === "barang") return allBarang.find((b) => b.id === itemId)?.hargaJual ?? 0;
    return allJasa.find((j) => j.id === itemId)?.harga ?? 0;
  }

  function catalogUnitOf(tipe: "barang" | "jasa", itemId: string) {
    if (tipe !== "barang") return undefined;
    const barang = allBarang.find((b) => b.id === itemId);
    return barang?.units.find((u) => u.isDefault)?.satuan ?? barang?.units[0]?.satuan;
  }

  const [tab, setTab] = useState<CatalogTab>("barang");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [catalogData, setCatalogData] = useState<{ tab: CatalogTab; data: CatalogEntry[]; total: number }>({
    tab: "barang",
    data: [],
    total: 0,
  });

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const params = { search: search || undefined, page, limit: pageSize };
    const request =
      tab === "barang"
        ? api.barang({ ...params, kategori: kategoriFilter || undefined })
        : tab === "jasa"
          ? api.jasa({ ...params, kategori: kategoriFilter || undefined })
          : api.paket(params);
    request.then((res) => {
      if (!cancelled) setCatalogData({ tab, data: res.data, total: res.total });
    });
    return () => {
      cancelled = true;
    };
  }, [tab, search, kategoriFilter, page, pageSize]);

  const kategoriOptions = useMemo(() => {
    const source = tab === "barang" ? allBarang : tab === "jasa" ? allJasa : [];
    return Array.from(new Set(source.map((x) => x.kategori))).sort();
  }, [tab, allBarang, allJasa]);

  const [workingItems, setWorkingItems] = useState<WorkingItem[]>([]);
  const [selectedPaketIds, setSelectedPaketIds] = useState<Set<string>>(new Set());

  // A given (tipe, itemId) may only appear once in workingItems -- otherwise row keys collide
  // when an item is picked both directly and via a paket.
  function toggleItem(tipe: "barang" | "jasa", itemId: string) {
    setWorkingItems((prev) => {
      const existing = prev.find((i) => i.tipe === tipe && i.itemId === itemId);
      if (existing) {
        if (existing.fromPaketId) return prev; // only removable by unchecking its paket
        return prev.filter((i) => i !== existing);
      }
      return [
        ...prev,
        {
          tipe,
          itemId,
          qty: 1,
          diskonTipe: "persen",
          diskonPersen: 0,
          diskonRp: 0,
          hargaSatuan: catalogPriceOf(tipe, itemId),
          satuan: catalogUnitOf(tipe, itemId),
        },
      ];
    });
  }

  // Paket selection is tracked separately from workingItems: a paket may contribute zero new
  // rows (all its items already selected elsewhere) yet must still show as checked.
  function togglePaket(paket: Paket) {
    const willSelect = !selectedPaketIds.has(paket.id);
    setSelectedPaketIds((prev) => {
      const next = new Set(prev);
      if (willSelect) next.add(paket.id);
      else next.delete(paket.id);
      return next;
    });
    setWorkingItems((prev) => {
      if (!willSelect) return prev.filter((i) => i.fromPaketId !== paket.id);
      const existingKeys = new Set(prev.map((i) => `${i.tipe}:${i.itemId}`));
      const exploded: WorkingItem[] = paket.items
        .filter((pi) => !existingKeys.has(`${pi.tipe}:${pi.itemId}`))
        // Carry over everything the paket defines -- unit, discount (persen or rupiah),
        // and that unit's price -- so the invoice lines match the paket's price.
        .map((pi) => ({
          tipe: pi.tipe,
          itemId: pi.itemId,
          qty: pi.qty,
          diskonTipe: pi.diskonTipe ?? "persen",
          diskonPersen: pi.diskonPersen,
          diskonRp: pi.diskonRp ?? 0,
          fromPaketId: paket.id,
          hargaSatuan: hargaSatuanPaketItem(pi, allBarang, allJasa),
          satuan: pi.satuan ?? catalogUnitOf(pi.tipe, pi.itemId),
        }));
      return [...prev, ...exploded];
    });
  }

  function isChecked(entry: CatalogEntry): boolean {
    if (catalogData.tab === "paket") return selectedPaketIds.has(entry.id);
    return workingItems.some((i) => i.tipe === catalogData.tab && i.itemId === entry.id);
  }

  function toggleEntry(entry: CatalogEntry) {
    if (catalogData.tab === "paket") togglePaket(entry as Paket);
    else toggleItem(catalogData.tab, entry.id);
  }

  function rowInfo(entry: CatalogEntry): { kode: string; nama: string; badge: string } {
    if (catalogData.tab === "barang") {
      const b = entry as Barang;
      return { kode: b.kode, nama: b.nama, badge: `${b.satuan} · ${b.stok}` };
    }
    if (catalogData.tab === "jasa") {
      const j = entry as Jasa;
      return { kode: j.kode, nama: j.nama, badge: "JASA" };
    }
    const p = entry as Paket;
    return { kode: p.kode, nama: p.nama, badge: `${p.items.length} item` };
  }

  const selectedCount = workingItems.filter((i) => !i.fromPaketId).length + selectedPaketIds.size;

  function updateWorkingItem(item: WorkingItem, patch: Partial<WorkingItem>) {
    setWorkingItems((prev) => prev.map((i) => (i === item ? { ...i, ...patch } : i)));
  }

  function removeWorkingItem(item: WorkingItem) {
    setWorkingItems((prev) => prev.filter((i) => i !== item));
  }

  function nameOf(item: WorkingItem) {
    if (item.tipe === "barang") return allBarang.find((b) => b.id === item.itemId)?.nama ?? "Barang dihapus";
    return allJasa.find((j) => j.id === item.itemId)?.nama ?? "Jasa dihapus";
  }

  function kodeOf(item: WorkingItem) {
    if (item.tipe === "barang") return allBarang.find((b) => b.id === item.itemId)?.kode ?? "-";
    return allJasa.find((j) => j.id === item.itemId)?.kode ?? "-";
  }

  function stokOf(item: WorkingItem) {
    return allBarang.find((b) => b.id === item.itemId)?.stok ?? 0;
  }

  function unitOptionsOf(item: WorkingItem): string[] {
    if (item.tipe !== "barang") return [];
    const barang = allBarang.find((b) => b.id === item.itemId);
    return barang ? Array.from(new Set(barang.units.map((u) => u.satuan))) : [];
  }

  function lokasiOptionsOf(item: WorkingItem): string[] {
    if (item.tipe !== "barang") return [];
    return lokasiList.filter((l) => l.status === "aktif").map((l) => l.nama);
  }

  function priceOf(item: WorkingItem) {
    return item.hargaSatuan ?? 0;
  }

  const barangWorkingItems = workingItems.filter((i) => i.tipe === "barang");
  const jasaWorkingItems = workingItems.filter((i) => i.tipe === "jasa");

  const subtotal = useMemo(
    () =>
      workingItems.reduce(
        (sum, item) =>
          sum + hitungTotalSetelahDiskon(priceOf(item) * item.qty, item.diskonTipe, item.diskonPersen, item.diskonRp),
        0
      ),
    [workingItems]
  );

  const [pelangganId, setPelangganId] = useState("");
  const [pelangganPickerOpen, setPelangganPickerOpen] = useState(false);
  const [showTambahPelanggan, setShowTambahPelanggan] = useState(false);
  const [kendaraanIds, setKendaraanIds] = useState<string[]>([]);
  const [kendaraanPickerOpen, setKendaraanPickerOpen] = useState(false);
  const kendaraanPickerRef = useRef<HTMLDivElement>(null);
  const [keluhan, setKeluhan] = useState("");
  const [kilometer, setKilometer] = useState("");
  const [tanggalInvoice, setTanggalInvoice] = useState(todayInputDate);
  const [syaratPembayaran, setSyaratPembayaran] = useState("");
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState("");
  const [potonganPersen, setPotonganPersen] = useState("");
  const [catatan, setCatatan] = useState("");
  const [dibayar, setDibayar] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (kendaraanPickerRef.current && !kendaraanPickerRef.current.contains(e.target as Node)) {
        setKendaraanPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Selecting a pelanggan auto-selects all of their registered vehicles; the user can then
  // deselect individual ones in the multi-pick panel.
  function selectPelanggan(id: string) {
    setPelangganId(id);
    setKendaraanIds(id ? kendaraanList.filter((k) => k.pelangganId === id).map((k) => k.id) : []);
  }

  function toggleKendaraan(id: string) {
    setKendaraanIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Auto-fill jatuh tempo from the selected syarat pembayaran's jatuhTempoHari; still editable after.
  function handleSyaratPembayaranChange(nama: string) {
    setSyaratPembayaran(nama);
    const match = syaratPembayaranLookup.find((l) => l.nama === nama);
    if (match?.jatuhTempoHari === undefined) return;
    const base = tanggalInvoice ? new Date(tanggalInvoice) : new Date();
    base.setDate(base.getDate() + match.jatuhTempoHari);
    setTanggalJatuhTempo(base.toISOString().slice(0, 10));
  }

  const kendaraanMilikPelanggan = kendaraanList.filter((k) => k.pelangganId === pelangganId);
  const pelangganTerpilih = pelangganList.find((p) => p.id === pelangganId);
  const kendaraanTerpilihList = kendaraanList.filter((k) => kendaraanIds.includes(k.id));

  const potongan = Number(potonganPersen) || 0;
  const dpp = subtotal * (1 - potongan / 100);
  const pajakPersenEfektif = pajakSetting.aktif ? pajakSetting.persentase : 0;
  const pajakNominal = roundToNearest(dpp * (pajakPersenEfektif / 100), pajakSetting.pembulatan);
  const totalInvoice = dpp + pajakNominal;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createInvoice({
        pelangganId,
        kendaraanIds: kendaraanIds.length ? kendaraanIds : undefined,
        tanggal: tanggalInvoice ? new Date(tanggalInvoice).toISOString() : undefined,
        jatuhTempo: tanggalJatuhTempo ? new Date(tanggalJatuhTempo).toISOString() : undefined,
        syaratPembayaran: syaratPembayaran || undefined,
        catatan: catatan || undefined,
        keluhan: keluhan || undefined,
        kilometer: Number(kilometer) || undefined,
        potonganPersen: potongan || undefined,
        dibayar: Number(dibayar) || 0,
        items: workingItems.map(({ tipe, itemId, qty, diskonTipe, diskonPersen, diskonRp, hargaSatuan, lokasi, satuan }) => ({
          tipe,
          itemId,
          qty,
          diskonTipe,
          diskonPersen,
          diskonRp,
          hargaSatuan,
          lokasi,
          satuan,
        })),
      });
      router.push("/penjualan/faktur");
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
    const lokasiOptions = lokasiOptionsOf(item);
    const price = priceOf(item);
    const rowTotal = hitungTotalSetelahDiskon(price * item.qty, item.diskonTipe, item.diskonPersen, item.diskonRp);
    return (
      <div key={`${item.tipe}-${item.itemId}-${index}`} className="rounded-lg border border-zinc-200 p-3">
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
            {item.tipe === "barang" && (
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                Stok: {stokOf(item)}
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

        <div
          className={clsx(
            "mt-3 grid grid-cols-2 gap-3",
            item.tipe === "barang" ? "sm:grid-cols-6" : "sm:grid-cols-4"
          )}
        >
          {item.tipe === "barang" && (
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Unit</label>
              <Select
                value={item.satuan ?? units[0] ?? ""}
                onChange={(v) => {
                  const unitPrice = allBarang.find((b) => b.id === item.itemId)?.units.find((u) => u.satuan === v)?.hargaJual;
                  updateWorkingItem(item, { satuan: v, ...(unitPrice !== undefined ? { hargaSatuan: unitPrice } : {}) });
                }}
                options={units.map((u) => ({ value: u, label: u }))}
              />
            </div>
          )}
          {item.tipe === "barang" && (
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Lokasi</label>
              <Select
                value={item.lokasi ?? ""}
                onChange={(v) => updateWorkingItem(item, { lokasi: v || undefined })}
                disabled={lokasiOptions.length === 0}
                placeholder={lokasiOptions.length === 0 ? "Tidak ada lokasi" : "Pilih lokasi..."}
                options={lokasiOptions.map((l) => ({ value: l, label: l }))}
              />
            </div>
          )}
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
            <label className="mb-1 block text-xs text-zinc-500">Jumlah</label>
            <input
              type="number"
              min={1}
              value={item.qty}
              onChange={(e) => updateWorkingItem(item, { qty: Number(e.target.value) || 1 })}
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

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Buat Invoice Penjualan</h1>
          <p className="text-sm text-zinc-500">
            {STEPS[step]} • Tanggal: {todayLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/penjualan/faktur")}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
      </div>

      <StepBar step={step} />

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {step === 0 && (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 rounded-xl bg-green-600 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-green-200" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari kode item, nama barang, atau jasa..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-green-200 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setTab(t.key);
                    setPage(1);
                    setKategoriFilter("");
                  }}
                  className={clsx(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    tab === t.key ? "bg-green-50 text-green-600" : "text-zinc-500 hover:bg-zinc-50"
                  )}
                >
                  {t.icon}
                  {t.label}
                  <span
                    className={clsx(
                      "rounded-full px-1.5 py-0.5 text-xs font-bold",
                      tab === t.key ? "bg-green-600 text-white" : "bg-zinc-200 text-zinc-500"
                    )}
                  >
                    {tabTotals[t.key]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={kategoriFilter}
                onChange={(v) => {
                  setKategoriFilter(v);
                  setPage(1);
                }}
                disabled={tab === "paket"}
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
          </div>

          {catalogData.data.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-400">Tidak ada data ditemukan</p>
          ) : view === "list" ? (
            <div className="divide-y divide-zinc-50">
              {catalogData.data.map((entry) => {
                const info = rowInfo(entry);
                return (
                  <label
                    key={entry.id}
                    className="flex cursor-pointer items-center gap-3 px-2 py-3 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked(entry)}
                      onChange={() => toggleEntry(entry)}
                      className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                      {catalogData.tab === "barang" ? (
                        <Package className="h-4 w-4" />
                      ) : catalogData.tab === "jasa" ? (
                        <Wrench className="h-4 w-4" />
                      ) : (
                        <Layers className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-zinc-400">{info.kode}</span>
                      <span className="block truncate text-sm font-medium text-zinc-900">{info.nama}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                      {info.badge}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {catalogData.data.map((entry) => {
                const info = rowInfo(entry);
                return (
                  <label
                    key={entry.id}
                    className="flex cursor-pointer flex-col gap-2 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50"
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                        {catalogData.tab === "barang" ? (
                          <Package className="h-4 w-4" />
                        ) : catalogData.tab === "jasa" ? (
                          <Wrench className="h-4 w-4" />
                        ) : (
                          <Layers className="h-4 w-4" />
                        )}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked(entry)}
                        onChange={() => toggleEntry(entry)}
                        className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">{info.kode}</p>
                      <p className="truncate text-sm font-medium text-zinc-900">{info.nama}</p>
                    </div>
                    <span className="w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                      {info.badge}
                    </span>
                  </label>
                );
              })}
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
              <ShoppingCart className="h-4 w-4" />
              Lanjutkan
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Konfigurasi Invoice</h2>
            <p className="text-sm text-zinc-500">Lengkapi detail pelanggan dan atur jumlah item</p>
          </div>

          {pajakSetting.aktif && (
            <div className="flex items-center gap-3 rounded-xl bg-green-600 px-4 py-3 text-white">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Percent className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Invoice Dikenakan Pajak</p>
                <p className="text-xs text-green-100">Pajak {pajakSetting.persentase}% akan diterapkan pada invoice ini</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <User className="h-4 w-4 text-green-600" /> Informasi Invoice
              </p>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Pelanggan <span className="text-red-500">*</span>
                </span>
                {!pelangganId && !pelangganPickerOpen && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPelangganPickerOpen(true)}
                      className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-green-200 p-6 text-sm font-medium text-green-600 hover:bg-green-50"
                    >
                      <Plus className="h-5 w-5" />
                      Pilih Pelanggan
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTambahPelanggan(true)}
                      className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-200 p-6 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      <Plus className="h-5 w-5" />
                      Tambah Customer Baru
                    </button>
                  </div>
                )}
                {!pelangganId && pelangganPickerOpen && (
                  <IdSearchSelectField
                    value={pelangganId}
                    onChange={(id) => {
                      if (id) {
                        selectPelanggan(id);
                        setPelangganPickerOpen(false);
                      }
                    }}
                    options={pelangganList.map((p) => ({ id: p.id, label: p.nama, sublabel: p.telepon }))}
                    onAddNew={() => setShowTambahPelanggan(true)}
                    placeholder="Cari nama pelanggan..."
                  />
                )}
                {pelangganId && (
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{pelangganTerpilih?.nama}</p>
                      <p className="text-xs text-zinc-400">{pelangganTerpilih?.telepon}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectPelanggan("")}
                      className="text-sm font-medium text-green-600 hover:underline"
                    >
                      Ganti
                    </button>
                  </div>
                )}
              </div>

              <div ref={kendaraanPickerRef} className="relative">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">Informasi Kendaraan</span>
                <button
                  type="button"
                  disabled={!pelangganId}
                  onClick={() => setKendaraanPickerOpen((v) => !v)}
                  className={`${inputClass} flex items-center justify-between text-left disabled:bg-zinc-50 disabled:text-zinc-400`}
                >
                  <span>{pelangganId ? `Pilih Kendaraan (${kendaraanIds.length})` : "Pilih pelanggan dahulu"}</span>
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                </button>
                {kendaraanPickerOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
                    {kendaraanMilikPelanggan.length === 0 ? (
                      <p className="px-2 py-1.5 text-sm text-zinc-400">Pelanggan ini belum punya kendaraan terdaftar</p>
                    ) : (
                      kendaraanMilikPelanggan.map((k) => (
                        <label key={k.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-50">
                          <input
                            type="checkbox"
                            checked={kendaraanIds.includes(k.id)}
                            onChange={() => toggleKendaraan(k.id)}
                            className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
                          />
                          {k.platNomor} · {k.merk} {k.model}
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">Kilometer</span>
                <input
                  type="number"
                  min={0}
                  value={kilometer}
                  onChange={(e) => setKilometer(e.target.value)}
                  placeholder="Contoh: 15000"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700">
                  <MessageSquare className="h-3.5 w-3.5" /> Keluhan / Masalah
                </span>
                <textarea
                  value={keluhan}
                  onChange={(e) => setKeluhan(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Motor sering mati mendadak saat berkendara"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Calendar className="h-4 w-4 text-green-600" /> Tanggal
              </p>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">Tanggal Invoice</span>
                <DateInput value={tanggalInvoice} onChange={setTanggalInvoice} />
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
                <Package className="h-4 w-4" /> Daftar Barang ({barangWorkingItems.length})
              </p>
              <button
                type="button"
                onClick={() => {
                  setTab("barang");
                  setStep(0);
                }}
                className="flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Barang
              </button>
            </div>
            <div className="space-y-2 rounded-b-xl bg-white p-3">
              {barangWorkingItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-400">Belum ada barang dipilih</p>
              ) : (
                barangWorkingItems.map((item, i) => renderItemRow(item, i))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200">
            <div className="flex items-center justify-between rounded-t-xl bg-green-600 px-4 py-3 text-white">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Wrench className="h-4 w-4" /> Daftar Jasa ({jasaWorkingItems.length})
              </p>
              <button
                type="button"
                onClick={() => {
                  setTab("jasa");
                  setStep(0);
                }}
                className="flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Jasa
              </button>
            </div>
            <div className="space-y-2 rounded-b-xl bg-white p-3">
              {jasaWorkingItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-400">Belum ada jasa dipilih</p>
              ) : (
                jasaWorkingItems.map((item, i) => renderItemRow(item, i))
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
                    placeholder="Masukkan %"
                    className={`${inputClass} pr-8`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">%</span>
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-700">Catatan</span>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={3}
                  placeholder="Tambahkan catatan invoice..."
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
              {potongan > 0 && (
                <div className="flex items-center justify-between text-sm text-green-50">
                  <span>Potongan Global ({potongan}%)</span>
                  <span>-{formatRupiah(subtotal - dpp)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-green-50">
                <span>DPP</span>
                <span>{formatRupiah(dpp)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-green-50">
                <span>Pajak ({pajakPersenEfektif}%)</span>
                <span>{formatRupiah(pajakNominal)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/20 pt-2 text-base font-bold">
                <span>Total</span>
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
              disabled={!pelangganId || !syaratPembayaran || workingItems.length === 0}
              onClick={() => setStep(2)}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Lanjut ke Review
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-zinc-400">Pelanggan</p>
              <p className="text-sm font-medium text-zinc-900">{pelangganTerpilih?.nama ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Kendaraan</p>
              <p className="text-sm font-medium text-zinc-900">
                {kendaraanTerpilihList.length > 0
                  ? kendaraanTerpilihList.map((k) => k.platNomor).join(", ")
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Syarat Pembayaran</p>
              <p className="text-sm font-medium text-zinc-900">{syaratPembayaran || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Tanggal Jatuh Tempo</p>
              <p className="text-sm font-medium text-zinc-900">
                {tanggalJatuhTempo ? formatDate(new Date(tanggalJatuhTempo).toISOString()) : "-"}
              </p>
            </div>
            {kilometer && (
              <div>
                <p className="text-xs text-zinc-400">Kilometer</p>
                <p className="text-sm font-medium text-zinc-900">{kilometer} km</p>
              </div>
            )}
            {keluhan && (
              <div className="sm:col-span-2">
                <p className="text-xs text-zinc-400">Keluhan / Masalah</p>
                <p className="text-sm text-zinc-700">{keluhan}</p>
              </div>
            )}
            {catatan && (
              <div className="sm:col-span-2">
                <p className="text-xs text-zinc-400">Catatan</p>
                <p className="text-sm text-zinc-700">{catatan}</p>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Nama</th>
                  <th className="py-2 pr-4 text-right font-medium">Qty</th>
                  <th className="py-2 pr-4 text-right font-medium">Harga</th>
                  <th className="py-2 pr-4 text-right font-medium">Diskon</th>
                  <th className="py-2 pr-0 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {workingItems.map((item, i) => {
                  const price = priceOf(item);
                  const rowSubtotal = hitungTotalSetelahDiskon(price * item.qty, item.diskonTipe, item.diskonPersen, item.diskonRp);
                  const diskonLabel =
                    item.diskonTipe === "rupiah"
                      ? item.diskonRp > 0
                        ? formatRupiah(item.diskonRp)
                        : "-"
                      : `${item.diskonPersen}%`;
                  return (
                    <tr key={`${item.tipe}-${item.itemId}-${i}`} className="border-b border-zinc-50 last:border-0">
                      <td className="py-3 pr-4 text-zinc-900">{nameOf(item)}</td>
                      <td className="py-3 pr-4 text-right text-zinc-700">{item.qty}</td>
                      <td className="py-3 pr-4 text-right text-zinc-700">{formatRupiah(price)}</td>
                      <td className="py-3 pr-4 text-right text-zinc-700">{diskonLabel}</td>
                      <td className="py-3 pr-0 text-right font-semibold text-zinc-900">{formatRupiah(rowSubtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 rounded-xl border border-green-100 bg-green-50/60 p-4">
            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>Subtotal</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            {potongan > 0 && (
              <div className="flex items-center justify-between text-sm text-zinc-600">
                <span>Potongan Global ({potongan}%)</span>
                <span>-{formatRupiah(subtotal - dpp)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>DPP</span>
              <span>{formatRupiah(dpp)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>Pajak ({pajakPersenEfektif}%)</span>
              <span>{formatRupiah(pajakNominal)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-green-100 pt-2">
              <span className="text-sm font-semibold text-zinc-900">Total Invoice</span>
              <span className="text-lg font-bold text-green-600">{formatRupiah(totalInvoice)}</span>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">Jumlah Dibayar</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">Rp</span>
              <RupiahInput
                value={dibayar}
                onChange={setDibayar}
                placeholder="0 (belum dibayar)"
                className={`${inputClass} pl-8`}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-400">Kosongkan jika pelanggan belum membayar. Isi penuh jika lunas di tempat.</p>
          </label>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Kembali
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? "Menyimpan..." : "Simpan Invoice"}
            </button>
          </div>
        </div>
      )}

      {showTambahPelanggan && (
        <TambahPelangganModal
          onClose={() => setShowTambahPelanggan(false)}
          onSaved={(p) => {
            setPelangganList((prev) => [p, ...prev]);
            selectPelanggan(p.id);
            setShowTambahPelanggan(false);
          }}
        />
      )}
    </div>
  );
}
