import { DiskonTipe } from "./types";

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumberId(n: number) {
  return n ? n.toLocaleString("id-ID") : "";
}

export function parseNumberId(s: string) {
  return Number(s.replace(/\D/g, "")) || 0;
}

export function hitungTotalSetelahDiskon(
  subtotalKotor: number,
  diskonTipe: DiskonTipe | undefined,
  diskonPersen: number,
  diskonRp: number
) {
  if (diskonTipe === "rupiah") {
    return Math.max(subtotalKotor - diskonRp, 0);
  }
  return subtotalKotor * (1 - diskonPersen / 100);
}

/** "disc 10%" / "disc Rp 10.000", or "" when the line has no discount. */
export function labelDiskon(item: { diskonTipe?: DiskonTipe; diskonPersen: number; diskonRp?: number }) {
  if (item.diskonTipe === "rupiah") return (item.diskonRp ?? 0) > 0 ? `disc ${formatRupiah(item.diskonRp ?? 0)}` : "";
  return item.diskonPersen > 0 ? `disc ${item.diskonPersen}%` : "";
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateLong(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateFull(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function daysBetween(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function withinLastDays(iso: string, days: number) {
  const diffMs = Date.now() - new Date(iso).getTime();
  return diffMs <= days * 24 * 60 * 60 * 1000;
}

export function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function servisTotal(items: { qty: number; hargaSatuan: number }[]) {
  return items.reduce((sum, item) => sum + item.qty * item.hargaSatuan, 0);
}
