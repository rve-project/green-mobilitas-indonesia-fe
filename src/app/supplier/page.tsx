"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Building2, CheckCircle2, Plus, Search, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Supplier, SupplierStats } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/Panel";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { SortableTh, SortResetButton } from "@/components/ui/SortableTh";
import { useSort, compareMulti } from "@/lib/useSort";
import { TambahSupplierModal } from "@/components/supplier/TambahSupplierModal";

type SortKey = "kode" | "nama" | "email" | "telepon" | "kota" | "tipe" | "status";

const STATUS_ORDER: Record<Supplier["status"], number> = {
  aktif: 0,
  nonaktif: 1,
};

export default function SupplierPage() {
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier[] | null>(null);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const { criteria, toggleSort, resetSort, isDefault } = useSort<SortKey>("kode", "asc");

  function refresh() {
    api.supplier().then(setSupplier);
    api.supplierStats().then(setStats);
  }

  useEffect(() => {
    refresh();
  }, []);

  function sortValue(s: Supplier, key: SortKey): string | number {
    switch (key) {
      case "kode":
        return s.kode.toLowerCase();
      case "nama":
        return s.nama.toLowerCase();
      case "email":
        return (s.email ?? "").toLowerCase();
      case "telepon":
        return (s.telepon ?? "").toLowerCase();
      case "kota":
        return (s.kota ?? "").toLowerCase();
      case "tipe":
        return (s.tipe ?? "").toLowerCase();
      case "status":
        return STATUS_ORDER[s.status];
    }
  }

  const filtered = useMemo(() => {
    if (!supplier) return null;
    const q = search.trim().toLowerCase();
    return supplier
      .filter((s) => {
        const matchesSearch = !q || s.kode.toLowerCase().includes(q) || s.nama.toLowerCase().includes(q);
        const matchesStatus = !statusFilter || s.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => compareMulti(a, b, criteria, sortValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier, search, statusFilter, criteria]);

  const paged = filtered ? paginate(filtered, page, pageSize) : null;

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader
        title="Supplier"
        subtitle="Kelola data supplier Anda"
        action={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Supplier Baru
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Supplier"
          value={stats?.total ?? "-"}
          icon={Building2}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <StatCard
          label="Aktif"
          value={stats?.aktif ?? "-"}
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
        />
        <StatCard
          label="Nonaktif"
          value={stats?.nonaktif ?? "-"}
          icon={XCircle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-1.5 text-sm font-medium text-zinc-700">Cari Supplier</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari kode/nama supplier..."
                className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:w-72"
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">Status</p>
              <SortResetButton visible={!isDefault} onReset={resetSort} />
            </div>
            <Select
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              className="w-full sm:w-44"
              options={[
                { value: "", label: "Semua" },
                { value: "aktif", label: "Aktif" },
                { value: "nonaktif", label: "Nonaktif" },
              ]}
            />
          </div>
        </div>

        <div className="mt-5">
          {!paged ? (
            <p className="text-sm text-zinc-400">Memuat…</p>
          ) : paged.length === 0 ? (
            <EmptyState label="Belum ada data supplier" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                    <SortableTh label="Kode Supplier" sortKey="kode" criteria={criteria} onSort={toggleSort} />
                    <SortableTh label="Nama Supplier" sortKey="nama" criteria={criteria} onSort={toggleSort} />
                    <SortableTh label="Email" sortKey="email" criteria={criteria} onSort={toggleSort} />
                    <SortableTh label="No. Handphone" sortKey="telepon" criteria={criteria} onSort={toggleSort} />
                    <SortableTh label="Kota" sortKey="kota" criteria={criteria} onSort={toggleSort} />
                    <SortableTh label="Tipe" sortKey="tipe" criteria={criteria} onSort={toggleSort} />
                    <SortableTh label="Status" sortKey="status" criteria={criteria} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => router.push(`/supplier/${s.id}`)}
                      className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
                    >
                      <td className="py-3 pr-4 font-medium text-zinc-900">{s.kode}</td>
                      <td className="py-3 pr-4 text-zinc-700">{s.nama}</td>
                      <td className="py-3 pr-4 text-zinc-500">{s.email || "-"}</td>
                      <td className="py-3 pr-4 text-zinc-500">{s.telepon || "-"}</td>
                      <td className="py-3 pr-4 text-zinc-500">{s.kota || "-"}</td>
                      <td className="py-3 pr-4 text-zinc-500">{s.tipe || "-"}</td>
                      <td className="py-3 pr-4">
                        <StatusSupplierBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered && filtered.length > 0 && (
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
          )}
        </div>
      </div>

      {modalOpen && (
        <TambahSupplierModal onClose={() => setModalOpen(false)} onSaved={() => refresh()} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: number | string;
  icon: typeof Building2;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <span className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", iconBg)}>
        <Icon className={clsx("h-5 w-5", iconColor)} />
      </span>
      <div>
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
      </div>
    </div>
  );
}

function StatusSupplierBadge({ status }: { status: "aktif" | "nonaktif" }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "aktif" ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
      )}
    >
      {status === "aktif" ? "Aktif" : "Nonaktif"}
    </span>
  );
}
