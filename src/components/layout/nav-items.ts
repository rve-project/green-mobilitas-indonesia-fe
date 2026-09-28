import {
  Building2,
  ClipboardList,
  FileBarChart,
  Home,
  MapPin,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavItem[];
  module: ModuleKey;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: "Utama",
    items: [
      { label: "Beranda", href: "/", icon: Home, module: "dashboard" },
      { label: "Barang & Jasa", href: "/barang-jasa", icon: Package, module: "barang-jasa" },
      {
        label: "Penjualan",
        href: "/penjualan/faktur",
        icon: ShoppingCart,
        module: "penjualan",
        children: [
          { label: "Faktur Penjualan", href: "/penjualan/faktur", icon: ShoppingCart, module: "penjualan" },
          { label: "Retur Penjualan", href: "/penjualan/retur", icon: ShoppingCart, module: "penjualan" },
          { label: "Piutang", href: "/penjualan/piutang", icon: ShoppingCart, module: "penjualan" },
          { label: "Pemasukan Lain", href: "/penjualan/pemasukan-lain", icon: ShoppingCart, module: "penjualan" },
        ],
      },
      {
        label: "Pembelian",
        href: "/pembelian/faktur",
        icon: Package,
        module: "pembelian",
        children: [
          { label: "Faktur Pembelian", href: "/pembelian/faktur", icon: Package, module: "pembelian" },
          { label: "Retur Pembelian", href: "/pembelian/retur", icon: Package, module: "pembelian" },
          { label: "Hutang", href: "/pembelian/hutang", icon: Package, module: "pembelian" },
          { label: "Pengeluaran Lain", href: "/pembelian/pengeluaran-lain", icon: Package, module: "pembelian" },
        ],
      },
      {
        label: "Manajemen Stok",
        href: "/manajemen-stok/stok-opname",
        icon: ClipboardList,
        module: "manajemen-stok",
        children: [
          { label: "Stok Opname", href: "/manajemen-stok/stok-opname", icon: ClipboardList, module: "manajemen-stok" },
          {
            label: "Penerimaan Barang",
            href: "/manajemen-stok/penerimaan-barang",
            icon: ClipboardList,
            module: "manajemen-stok",
          },
          {
            label: "Pengeluaran Barang",
            href: "/manajemen-stok/pengeluaran-barang",
            icon: ClipboardList,
            module: "manajemen-stok",
          },
        ],
      },
      { label: "Pelanggan", href: "/pelanggan", icon: Users, module: "pelanggan" },
      { label: "Supplier", href: "/supplier", icon: Building2, module: "supplier" },
      { label: "Manajemen Karyawan", href: "/manajemen-karyawan", icon: UserCog, module: "manajemen-karyawan" },
      { label: "Laporan", href: "/laporan", icon: FileBarChart, module: "laporan" },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      { label: "Pengaturan", href: "/pengaturan", icon: Settings, module: "pengaturan" },
      { label: "Manajemen User", href: "/manajemen-user", icon: ShieldCheck, module: "manajemen-user" },
      { label: "Lokasi", href: "/lokasi", icon: MapPin, module: "pengaturan" },
    ],
  },
];
