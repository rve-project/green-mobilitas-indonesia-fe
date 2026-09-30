"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronDown, ChevronUp, ChevronsUpDown, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Invoice, Kendaraan, Pelanggan, StatusInvoice } from "@/lib/types";
import { formatDateLong, formatRupiah, withinLastDays } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/Panel";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { DetailInvoiceModal } from "@/components/penjualan/DetailInvoiceModal";

const TABS: { key: StatusInvoice; label: string }[] = [
  { key: "selesai", label: "Faktur" },
  { key: "draft", label: "Draft" },
  { key: "dibatalkan", label: "Dibatalkan" },
];

const PERIOD_OPTIONS = [
  { value: 7, label: "7 Hari Terakhir" },
  { value: 30, label: "30 Hari Terakhir" },
  { value: 90, label: "90 Hari Terakhir" },
  { value: 36500, label: "Semua Waktu" },
];

const STATUS_PEKERJAAN_OPTIONS = [
  { value: "selesai", label: "Selesai" },
  { value: "belum_selesai", label: "Belum Selesai" },
];

function StatusPekerjaanSelect({
  status,
  onChange,
}: {
  status: Invoice["statusPekerjaan"];
  onChange: (value: "selesai" | "belum_selesai") => void;
}) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Select
        value={status ?? "selesai"}
        onChange={(v) => onChange(v as "selesai" | "belum_selesai")}
        options={STATUS_PEKERJAAN_OPTIONS}
        className="w-40"
      />
    </div>
  );
}

function PembayaranBadge({ status }: { status: Invoice["statusPembayaran"] }) {
  const config = {
    lunas: { label: "Lunas", className: "bg-emerald-50 text-emerald-600" },
    belum_dibayar: { label: "Belum Dibayar", className: "bg-red-50 text-red-500" },
    dibayar_setengah: { label: "Dibayar Setengah", className: "bg-amber-50 text-amber-600" },
  }[status];
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}

type SortKey =
  | "kode"
  | "customer"
  | "kendaraan"
  | "plat"
  | "tanggal"
  | "total"
  | "statusPekerjaan"
  | "statusPembayaran";
type SortDir = "asc" | "desc";

function SortableTh({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "right";
}) {
  const active = activeKey === sortKey;
  return (
    <th className={clsx("py-2 font-medium", align === "right" ? "pr-4 text-right" : "pr-4")}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={clsx(
          "inline-flex w-full items-center gap-1 hover:text-zinc-700",
          align === "right" && "justify-end",
          active && "text-zinc-700"
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-300" />
        )}
      </button>
    </th>
  );
}

export default function FakturPenjualanPage() {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice[] | null>(null);
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [kendaraan, setKendaraan] = useState<Kendaraan[]>([]);
  const [tab, setTab] = useState<StatusInvoice>("selesai");
  const [search, setSearch] = useState("");
  const [periodDays, setPeriodDays] = useState(30);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("kode");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  async function handleStatusPekerjaanChange(id: string, value: "selesai" | "belum_selesai") {
    const previous = invoice?.find((inv) => inv.id === id)?.statusPekerjaan;
    setInvoice((prev) => prev?.map((inv) => (inv.id === id ? { ...inv, statusPekerjaan: value } : inv)) ?? null);
    try {
      await api.updateInvoice(id, { statusPekerjaan: value });
    } catch {
      setInvoice((prev) => prev?.map((inv) => (inv.id === id ? { ...inv, statusPekerjaan: previous } : inv)) ?? null);
    }
  }

  useEffect(() => {
    api.invoice().then(setInvoice);
    api.pelanggan().then(setPelanggan);
    api.kendaraan().then(setKendaraan);
  }, []);

  const pelangganMap = useMemo(() => new Map(pelanggan.map((p) => [p.id, p.nama])), [pelanggan]);
  const namaPelanggan = (id: string) => pelangganMap.get(id) ?? "-";
  const kendaraanLabel = (inv: Invoice) =>
    kendaraan
      .filter((k) => inv.kendaraanIds?.includes(k.id))
      .map((k) => `${k.merk} ${k.model}`)
      .join(", ");
  const platLabel = (inv: Invoice) =>
    kendaraan
      .filter((k) => inv.kendaraanIds?.includes(k.id))
      .map((k) => k.platNomor)
      .join(", ");

  const STATUS_PEKERJAAN_ORDER: Record<NonNullable<Invoice["statusPekerjaan"]>, number> = {
    belum_selesai: 0,
    selesai: 1,
  };
  const STATUS_PEMBAYARAN_ORDER: Record<Invoice["statusPembayaran"], number> = {
    belum_dibayar: 0,
    dibayar_setengah: 1,
    lunas: 2,
  };

  function sortValue(inv: Invoice, key: SortKey): string | number {
    switch (key) {
      case "kode":
        return inv.kode;
      case "customer":
        return namaPelanggan(inv.pelangganId).toLowerCase();
      case "kendaraan":
        return kendaraanLabel(inv).toLowerCase();
      case "plat":
        return platLabel(inv).toLowerCase();
      case "tanggal":
        return new Date(inv.tanggal).getTime();
      case "total":
        return inv.total;
      case "statusPekerjaan":
        return STATUS_PEKERJAAN_ORDER[inv.statusPekerjaan ?? "selesai"];
      case "statusPembayaran":
        return STATUS_PEMBAYARAN_ORDER[inv.statusPembayaran];
    }
  }

  const filtered = useMemo(() => {
    if (!invoice) return null;
    const q = search.trim().toLowerCase();
    return invoice
      .filter((inv) => inv.status === tab)
      .filter((inv) => withinLastDays(inv.tanggal, periodDays))
      .filter((inv) => {
        if (!q) return true;
        const kendaraanInv = kendaraan.filter((k) => inv.kendaraanIds?.includes(k.id));
        return (
          inv.kode.toLowerCase().includes(q) ||
          (pelangganMap.get(inv.pelangganId) ?? "").toLowerCase().includes(q) ||
          kendaraanInv.some((k) => k.platNomor.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const va = sortValue(a, sortKey);
        const vb = sortValue(b, sortKey);
        const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
        return sortDir === "asc" ? cmp : -cmp;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, tab, search, periodDays, kendaraan, pelangganMap, sortKey, sortDir]);

  const summary = useMemo(() => {
    const scoped = invoice?.filter((inv) => inv.status === tab && withinLastDays(inv.tanggal, periodDays)) ?? [];
    const sum = (predicate: (inv: Invoice) => boolean) =>
      scoped.filter(predicate).reduce((s, inv) => s + inv.total, 0);
    return {
      semua: sum(() => true),
      lunas: sum((inv) => inv.statusPembayaran === "lunas"),
      belumDibayar: sum((inv) => inv.statusPembayaran === "belum_dibayar"),
      setengah: sum((inv) => inv.statusPembayaran === "dibayar_setengah"),
    };
  }, [invoice, tab, periodDays]);

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader
        title="Penjualan"
        subtitle="Kelola data penjualan Anda"
        action={
          <button
            type="button"
            onClick={() => router.push("/penjualan/faktur/baru")}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Invoice Baru
          </button>
        }
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex border-b border-zinc-100">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                }}
                className={clsx(
                  "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
                  tab === t.key ? "border-green-600 text-green-600" : "border-transparent text-zinc-400 hover:text-zinc-600"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nomor invoice, pelanggan, plat..."
                className="w-72 rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <Select
              value={String(periodDays)}
              onChange={(v) => {
                setPeriodDays(Number(v));
                setPage(1);
              }}
              className="w-44"
              options={PERIOD_OPTIONS.map((opt) => ({ value: String(opt.value), label: opt.label }))}
            />
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl bg-green-800 p-4 text-white">
            <p className="text-sm text-green-100">Semua</p>
            <p className="mt-1 text-xl font-bold">{formatRupiah(summary.semua)}</p>
          </div>
          <div className="rounded-xl border border-green-100 p-4">
            <p className="text-sm text-green-600">Lunas</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{formatRupiah(summary.lunas)}</p>
          </div>
          <div className="rounded-xl border border-green-100 p-4">
            <p className="text-sm text-green-600">Belum Dibayarkan</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{formatRupiah(summary.belumDibayar)}</p>
          </div>
          <div className="rounded-xl border border-green-100 p-4">
            <p className="text-sm text-green-600">Dibayarkan Setengah</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{formatRupiah(summary.setengah)}</p>
          </div>
        </div>

        {!filtered ? (
          <p className="text-sm text-zinc-400">Memuat…</p>
        ) : filtered.length === 0 ? (
          <EmptyState label="Belum ada data invoice" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  <SortableTh label="Kode" sortKey="kode" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortableTh label="Customer" sortKey="customer" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortableTh label="Kendaraan" sortKey="kendaraan" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortableTh label="Plat Nomor" sortKey="plat" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortableTh label="Tgl Penjualan" sortKey="tanggal" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortableTh
                    label="Total"
                    sortKey="total"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTh
                    label="Status Pekerjaan"
                    sortKey="statusPekerjaan"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableTh
                    label="Pembayaran"
                    sortKey="statusPembayaran"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {paginate(filtered, page, pageSize).map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id)}
                    className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
                  >
                    <td className="py-3 pr-4 font-semibold text-green-600">{inv.kode}</td>
                    <td className="py-3 pr-4 text-zinc-700">{namaPelanggan(inv.pelangganId)}</td>
                    <td className="py-3 pr-4 text-zinc-700">{kendaraanLabel(inv) || "-"}</td>
                    <td className="py-3 pr-4 text-zinc-700">{platLabel(inv) || "-"}</td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateLong(inv.tanggal)}</td>
                    <td className="py-3 pr-4 text-right">
                      <p className="font-semibold text-zinc-900">{formatRupiah(inv.total)}</p>
                      {!!inv.returTotal && (
                        <p className="text-xs font-medium text-red-500">- {formatRupiah(inv.returTotal)} retur</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPekerjaanSelect
                        status={inv.statusPekerjaan}
                        onChange={(v) => handleStatusPekerjaanChange(inv.id, v)}
                      />
                    </td>
                    <td className="py-3 pr-0">
                      <PembayaranBadge status={inv.statusPembayaran} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {selectedId && filtered && (
        <DetailInvoiceModal
          invoiceId={selectedId}
          ids={filtered.map((inv) => inv.id)}
          pelangganList={pelanggan}
          kendaraanList={kendaraan}
          onClose={() => setSelectedId(null)}
          onNavigate={setSelectedId}
          onDeleted={(id) => {
            setInvoice((prev) => prev?.filter((inv) => inv.id !== id) ?? null);
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}
