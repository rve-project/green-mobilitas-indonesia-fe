import { UserRole } from "./types";

export const MODULE_KEYS = [
  "dashboard",
  "barang-jasa",
  "penjualan",
  "pembelian",
  "manajemen-stok",
  "pelanggan",
  "supplier",
  "manajemen-karyawan",
  "laporan",
  "pengaturan",
  "manajemen-user",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

/**
 * Single source of truth for which roles can access which module.
 * Mirrored on the backend at src/config/permissions.ts — keep both in sync.
 */
export const MODULE_ROLES: Record<ModuleKey, UserRole[]> = {
  dashboard: ["superadmin", "admin", "staff"],
  "barang-jasa": ["superadmin", "admin", "staff"],
  penjualan: ["superadmin", "admin", "staff"],
  pembelian: ["superadmin", "admin", "staff"],
  "manajemen-stok": ["superadmin", "admin", "staff"],
  pelanggan: ["superadmin", "admin", "staff"],
  supplier: ["superadmin", "admin", "staff"],
  "manajemen-karyawan": ["superadmin", "admin"],
  laporan: ["superadmin", "admin"],
  pengaturan: ["superadmin", "admin"],
  "manajemen-user": ["superadmin"],
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Beranda",
  "barang-jasa": "Barang & Jasa",
  penjualan: "Penjualan",
  pembelian: "Pembelian",
  "manajemen-stok": "Manajemen Stok",
  pelanggan: "Pelanggan",
  supplier: "Supplier",
  "manajemen-karyawan": "Manajemen Karyawan",
  laporan: "Laporan",
  pengaturan: "Pengaturan",
  "manajemen-user": "Manajemen User",
};

/**
 * Modules a user can actually reach: the role's default set, optionally narrowed by a
 * per-user `allowedModules` restriction (an admin can only take away access their role
 * would otherwise grant — never add access beyond the role ceiling). "dashboard" is a
 * normal, togglable entry here like any other -- see AppShell for how a user without it
 * gets routed to whichever module they *do* have instead of being stuck on "/".
 */
export function effectiveModules(role: UserRole, allowedModules?: string[] | null): ModuleKey[] {
  const roleModules = MODULE_KEYS.filter((m) => MODULE_ROLES[m].includes(role));
  if (!allowedModules) return roleModules;
  const allowedSet = new Set(allowedModules);
  return roleModules.filter((m) => allowedSet.has(m));
}

export function canAccess(user: { role: UserRole; allowedModules?: string[] | null }, module: ModuleKey): boolean {
  return effectiveModules(user.role, user.allowedModules).includes(module);
}

const ROUTE_MODULES: { prefix: string; module: ModuleKey }[] = [
  { prefix: "/manajemen-user", module: "manajemen-user" },
  { prefix: "/lokasi", module: "pengaturan" },
  { prefix: "/pengaturan", module: "pengaturan" },
  { prefix: "/laporan", module: "laporan" },
  { prefix: "/manajemen-karyawan", module: "manajemen-karyawan" },
  { prefix: "/supplier", module: "supplier" },
  { prefix: "/pelanggan", module: "pelanggan" },
  { prefix: "/pembelian", module: "pembelian" },
  { prefix: "/manajemen-stok", module: "manajemen-stok" },
  { prefix: "/penjualan", module: "penjualan" },
  { prefix: "/barang-jasa", module: "barang-jasa" },
];

export function moduleForPath(pathname: string): ModuleKey | null {
  if (pathname === "/") return "dashboard";
  const match = ROUTE_MODULES.find((r) => pathname.startsWith(r.prefix));
  return match?.module ?? null;
}
