"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Target } from "lucide-react";
import { Invoice, Kendaraan } from "@/lib/types";
import { EmptyState } from "@/components/ui/Panel";
import {
  invoiceStatusPekerjaanIs,
  STATUS_PEKERJAAN_OPTIONS,
  StatusPekerjaanCanonical,
} from "@/lib/statusPekerjaan";

interface MonitoringServisPanelProps {
  invoice: Invoice[];
  kendaraan: Kendaraan[];
}

function platLabel(inv: Invoice, kendaraan: Kendaraan[]) {
  return (
    kendaraan
      .filter((k) => inv.kendaraanIds?.includes(k.id))
      .map((k) => k.platNomor)
      .join(", ") || "-"
  );
}

function kendaraanLabel(inv: Invoice, kendaraan: Kendaraan[]) {
  return kendaraan
    .filter((k) => inv.kendaraanIds?.includes(k.id))
    .map((k) => `${k.merk} ${k.model}`)
    .join(", ");
}

export function MonitoringServisPanel({ invoice, kendaraan }: MonitoringServisPanelProps) {
  const [tab, setTab] = useState<StatusPekerjaanCanonical>("antrian");

  // Only real (non-draft, non-dibatalkan) invoices represent an actual job -- a draft isn't
  // a work order yet, and a cancelled one no longer is one.
  const jobs = invoice.filter((inv) => inv.status === "selesai");

  const filtered = jobs
    .filter((inv) => invoiceStatusPekerjaanIs(inv, tab))
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
    .slice(0, 6);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
            <Target className="h-4 w-4 text-green-600" />
            Monitoring Servis
          </h3>
          <p className="text-xs text-zinc-400">Pantau progres servis kendaraan pelanggan</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-zinc-100">
        {STATUS_PEKERJAAN_OPTIONS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={clsx(
              "border-b-2 px-3 pb-2 text-xs font-semibold transition-colors",
              tab === t.value
                ? "border-green-600 text-green-600"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState label="Tidak ada servis di kategori ini" />
      ) : (
        <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {filtered.map((inv) => (
            <li key={inv.id}>
              <Link
                href={`/penjualan/faktur/${inv.id}`}
                className="block rounded-lg border border-zinc-100 p-3 hover:bg-zinc-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">{platLabel(inv, kendaraan)}</p>
                  <span className="shrink-0 text-xs font-semibold text-green-600">{inv.kode}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{kendaraanLabel(inv, kendaraan) || "-"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
