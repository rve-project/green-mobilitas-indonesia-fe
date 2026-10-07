import { Invoice, StatusPekerjaan } from "@/lib/types";

/** The five real statuses a job can be in. Legacy "belum_selesai" (see the StatusPekerjaan
 * type) is never offered here -- it's only ever read, normalized to "antrian". */
export const STATUS_PEKERJAAN_VALUES = [
  "antrian",
  "dikerjakan",
  "menunggu_sparepart",
  "selesai",
  "diterima_customer",
] as const;
export type StatusPekerjaanCanonical = (typeof STATUS_PEKERJAAN_VALUES)[number];

export const STATUS_PEKERJAAN_OPTIONS: { value: StatusPekerjaanCanonical; label: string }[] = [
  { value: "antrian", label: "Antrian" },
  { value: "dikerjakan", label: "Dikerjakan" },
  { value: "menunggu_sparepart", label: "Menunggu Sparepart" },
  { value: "selesai", label: "Selesai" },
  { value: "diterima_customer", label: "Diterima Customer" },
];

export const STATUS_PEKERJAAN_CONFIG: Record<StatusPekerjaanCanonical, { label: string; className: string }> = {
  antrian: { label: "Antrian", className: "bg-zinc-100 text-zinc-600" },
  dikerjakan: { label: "Dikerjakan", className: "bg-blue-50 text-blue-600" },
  menunggu_sparepart: { label: "Menunggu Sparepart", className: "bg-amber-50 text-amber-600" },
  selesai: { label: "Selesai", className: "bg-emerald-50 text-emerald-600" },
  diterima_customer: { label: "Diterima Customer", className: "bg-violet-50 text-violet-600" },
};

/** Old invoices only ever had "selesai" | "belum_selesai" -- undefined (never touched) and
 * the legacy "belum_selesai" both read as "antrian" so nothing silently disappears from the
 * new 4-way breakdown just because it predates this field. */
export function normalizeStatusPekerjaan(status: StatusPekerjaan | undefined): StatusPekerjaanCanonical {
  if (status === "belum_selesai" || status === undefined) return "antrian";
  return status;
}

export function statusPekerjaanConfig(status: StatusPekerjaan | undefined) {
  return STATUS_PEKERJAAN_CONFIG[normalizeStatusPekerjaan(status)];
}

export function invoiceStatusPekerjaanIs(invoice: Invoice, target: StatusPekerjaanCanonical): boolean {
  return normalizeStatusPekerjaan(invoice.statusPekerjaan) === target;
}
