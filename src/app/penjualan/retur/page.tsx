"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Package, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Invoice, Pelanggan, Retur } from "@/lib/types";
import { formatDateLong, formatRupiah } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { BuatReturWizard } from "@/components/penjualan/BuatReturWizard";

function StatusReturBadge({ status }: { status: Retur["status"] }) {
  const config = {
    draft: { label: "Draft", className: "bg-zinc-100 text-zinc-600" },
    ongoing: { label: "Ongoing", className: "bg-amber-50 text-amber-600" },
    selesai: { label: "Selesai", className: "bg-emerald-50 text-emerald-600" },
  }[status ?? "selesai"];
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}

export default function ReturPenjualanPage() {
  const [retur, setRetur] = useState<Retur[] | null>(null);
  const [invoice, setInvoice] = useState<Invoice[]>([]);
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    api.retur().then(setRetur);
    api.invoice().then(setInvoice);
    api.pelanggan().then(setPelanggan);
  }, []);

  function kodeInvoice(invoiceId: string) {
    return invoice.find((i) => i.id === invoiceId)?.kode ?? "-";
  }

  const sortedRetur = useMemo(
    () => (retur ? [...retur].sort((a, b) => a.kode.localeCompare(b.kode)) : null),
    [retur]
  );

  if (creating) {
    return (
      <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
        <BuatReturWizard
          invoiceList={invoice}
          pelangganList={pelanggan}
          onClose={() => setCreating(false)}
          onCreated={(item) => setRetur((prev) => [item, ...(prev ?? [])])}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader
        title="Retur Penjualan"
        subtitle="Kelola retur penjualan Anda"
        action={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Retur Baru
          </button>
        }
      />

      <Panel title="Daftar Retur Penjualan">
        {!sortedRetur ? (
          <p className="text-sm text-zinc-400">Memuat…</p>
        ) : sortedRetur.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
            <Package className="h-10 w-10 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-500">Belum ada retur penjualan</p>
            <p className="text-xs text-zinc-400">Buat retur baru untuk mulai mencatat pengembalian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Kode</th>
                  <th className="py-2 pr-4 font-medium">Invoice</th>
                  <th className="py-2 pr-4 font-medium">Tanggal</th>
                  <th className="py-2 pr-4 font-medium">Alasan</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-0 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {paginate(sortedRetur, page, pageSize).map((r) => (
                  <tr key={r.id} className="border-b border-zinc-50 last:border-0">
                    <td className="py-3 pr-4 font-semibold text-green-600">{r.kode}</td>
                    <td className="py-3 pr-4 text-zinc-700">{kodeInvoice(r.invoiceId)}</td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateLong(r.tanggal)}</td>
                    <td className="max-w-[240px] truncate py-3 pr-4 text-zinc-500">{r.alasan ?? "-"}</td>
                    <td className="py-3 pr-4">
                      <StatusReturBadge status={r.status} />
                    </td>
                    <td className="py-3 pr-0 text-right font-semibold text-zinc-900">{formatRupiah(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={sortedRetur.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}
