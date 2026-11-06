import { Invoice, StatusPekerjaan } from "@/lib/types";

/** The seven real statuses a job can be in. Legacy "belum_selesai" and "menunggu_sparepart"
 * (see the StatusPekerjaan type) are never offered here -- "menunggu_sparepart" was split into
 * inden_part/pending_part/part_susulan below. */
export const STATUS_PEKERJAAN_VALUES = [
  "antrian",
  "dikerjakan",
  "inden_part",
  "pending_part",
  "part_susulan",
  "selesai",
  "diterima_customer",
] as const;
export type StatusPekerjaanCanonical = (typeof STATUS_PEKERJAAN_VALUES)[number];

export const STATUS_PEKERJAAN_OPTIONS: { value: StatusPekerjaanCanonical; label: string }[] = [
  { value: "antrian", label: "Antrian" },
  { value: "dikerjakan", label: "Dikerjakan" },
  { value: "inden_part", label: "Inden Part" },
  { value: "pending_part", label: "Pending Part" },
  { value: "part_susulan", label: "Part Susulan" },
  { value: "selesai", label: "Selesai" },
  { value: "diterima_customer", label: "Diterima Customer" },
];

export const STATUS_PEKERJAAN_CONFIG: Record<StatusPekerjaanCanonical, { label: string; className: string }> = {
  antrian: { label: "Antrian", className: "bg-zinc-100 text-zinc-600" },
  dikerjakan: { label: "Dikerjakan", className: "bg-blue-50 text-blue-600" },
  inden_part: { label: "Inden Part", className: "bg-orange-50 text-orange-600" },
  pending_part: { label: "Pending Part", className: "bg-amber-50 text-amber-600" },
  part_susulan: { label: "Part Susulan", className: "bg-yellow-50 text-yellow-700" },
  selesai: { label: "Selesai", className: "bg-emerald-50 text-emerald-600" },
  diterima_customer: { label: "Diterima Customer", className: "bg-violet-50 text-violet-600" },
};

/** Legacy statuses that can still be sitting on old invoices but are no longer offered as a
 * choice. Each keeps rendering with its original label/color exactly as it did before the
 * split, instead of being silently recategorized into one of the new statuses above. */
const LEGACY_STATUS_CONFIG: Partial<Record<StatusPekerjaan, { label: string; className: string }>> = {
  menunggu_sparepart: { label: "Menunggu Sparepart", className: "bg-amber-50 text-amber-600" },
};

/** Old invoices only ever had "selesai" | "belum_selesai" -- undefined (never touched) and
 * the legacy "belum_selesai" both read as "antrian" so nothing silently disappears from the
 * tab breakdown just because it predates this field. Legacy "menunggu_sparepart" also falls
 * back to "antrian" here for tab/filter bucketing -- its own label is preserved separately by
 * statusPekerjaanConfig() below, this function only buckets invoices into a current status. */
export function normalizeStatusPekerjaan(status: StatusPekerjaan | undefined): StatusPekerjaanCanonical {
  if (status === "belum_selesai" || status === "menunggu_sparepart" || status === undefined) return "antrian";
  return status;
}

export function statusPekerjaanConfig(status: StatusPekerjaan | undefined) {
  if (status && status in LEGACY_STATUS_CONFIG) return LEGACY_STATUS_CONFIG[status]!;
  return STATUS_PEKERJAAN_CONFIG[normalizeStatusPekerjaan(status)];
}

export function invoiceStatusPekerjaanIs(invoice: Invoice, target: StatusPekerjaanCanonical): boolean {
  return normalizeStatusPekerjaan(invoice.statusPekerjaan) === target;
}
