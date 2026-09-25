import {
  Barang,
  CompanyProfile,
  DiskonTipe,
  Invoice,
  Jasa,
  Karyawan,
  KaryawanStats,
  Kendaraan,
  Lokasi,
  Lookup,
  LookupTipe,
  Mekanik,
  Paket,
  PemasukanLain,
  Pelanggan,
  PelangganStats,
  Pembayaran,
  PembayaranHutang,
  Pembelian,
  PengeluaranLain,
  PajakSetting,
  PeriodeGaji,
  Posisi,
  Retur,
  ReturPembelian,
  PenerimaanBarang,
  PengeluaranBarang,
  Servis,
  StokOpname,
  Supplier,
  SupplierStats,
  User,
  UserRole,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "bengkelku_token";

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ImportSummary {
  created: number;
  updated?: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const { headers: initHeaders, ...restInit } = init ?? {};
  const isFormData = restInit.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...restInit,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...initHeaders,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Gagal memanggil ${path} (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, data: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(data) });
const put = <T>(path: string, data: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(data) });
const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

const uploadFile = <T>(path: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return request<T>(path, { method: "POST", body: formData });
};

async function downloadFile(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Gagal mengunduh ${path} (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  pelanggan: (params?: { search?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString();
    return get<Pelanggan[]>(`/pelanggan${query ? `?${query}` : ""}`);
  },
  pelangganStats: () => get<PelangganStats>("/pelanggan/stats"),
  getPelanggan: (id: string) => get<Pelanggan>(`/pelanggan/${id}`),
  supplier: (params?: { search?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString();
    return get<Supplier[]>(`/supplier${query ? `?${query}` : ""}`);
  },
  supplierStats: () => get<SupplierStats>("/supplier/stats"),
  getSupplier: (id: string) => get<Supplier>(`/supplier/${id}`),
  kendaraan: () => get<Kendaraan[]>("/kendaraan"),
  mekanik: () => get<Mekanik[]>("/mekanik"),
  servis: () => get<Servis[]>("/servis"),
  barang: (params?: { search?: string; kategori?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.kategori) qs.set("kategori", params.kategori);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return get<PagedResult<Barang>>(`/barang${query ? `?${query}` : ""}`);
  },
  jasa: (params?: { search?: string; kategori?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.kategori) qs.set("kategori", params.kategori);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return get<PagedResult<Jasa>>(`/jasa${query ? `?${query}` : ""}`);
  },
  paket: (params?: { search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return get<PagedResult<Paket>>(`/paket${query ? `?${query}` : ""}`);
  },
  invoice: () => get<Invoice[]>("/invoice"),
  retur: () => get<Retur[]>("/retur"),
  pembayaran: () => get<Pembayaran[]>("/pembayaran"),
  pemasukanLain: () => get<PemasukanLain[]>("/pemasukan-lain"),
  posisi: (params?: { search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString();
    return get<Posisi[]>(`/posisi${query ? `?${query}` : ""}`);
  },
  lokasi: (params?: { search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString();
    return get<Lokasi[]>(`/lokasi${query ? `?${query}` : ""}`);
  },
  karyawan: (params?: { search?: string; posisiId?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.posisiId) qs.set("posisiId", params.posisiId);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString();
    return get<Karyawan[]>(`/karyawan${query ? `?${query}` : ""}`);
  },
  karyawanStats: () => get<KaryawanStats>("/karyawan/stats"),
  getKaryawan: (id: string) => get<Karyawan>(`/karyawan/${id}`),
  periodeGaji: () => get<PeriodeGaji[]>("/periode-gaji"),
  lookup: (tipe: LookupTipe, params?: { search?: string }) => {
    const qs = new URLSearchParams({ tipe });
    if (params?.search) qs.set("search", params.search);
    return get<Lookup[]>(`/pengaturan/lookup?${qs.toString()}`);
  },
  pembelian: () => get<Pembelian[]>("/pembelian"),
  returPembelian: () => get<ReturPembelian[]>("/retur-pembelian"),
  pembayaranHutang: () => get<PembayaranHutang[]>("/pembayaran-hutang"),
  pengeluaranLain: () => get<PengeluaranLain[]>("/pengeluaran-lain"),
  stokOpname: () => get<StokOpname[]>("/stok-opname"),
  exportStokOpname: (params: { days: number; search?: string }) => {
    const qs = new URLSearchParams({ days: String(params.days) });
    if (params.search?.trim()) qs.set("search", params.search.trim());
    return downloadFile(`/stok-opname/export?${qs}`, "stok-opname.xlsx");
  },
  getStokOpname: (id: string) => get<StokOpname>(`/stok-opname/${id}`),
  penerimaanBarang: () => get<PenerimaanBarang[]>("/penerimaan-barang"),
  getPenerimaanBarang: (id: string) => get<PenerimaanBarang>(`/penerimaan-barang/${id}`),
  pengeluaranBarang: () => get<PengeluaranBarang[]>("/pengeluaran-barang"),
  getPengeluaranBarang: (id: string) => get<PengeluaranBarang>(`/pengeluaran-barang/${id}`),

  createPelanggan: (data: Omit<Pelanggan, "id" | "kode" | "createdAt">) => post<Pelanggan>("/pelanggan", data),
  updatePelanggan: (id: string, data: Partial<Omit<Pelanggan, "id" | "kode" | "createdAt">>) =>
    put<Pelanggan>(`/pelanggan/${id}`, data),
  deletePelanggan: (id: string) => del<void>(`/pelanggan/${id}`),
  createSupplier: (data: Omit<Supplier, "id" | "kode" | "createdAt">) => post<Supplier>("/supplier", data),
  updateSupplier: (id: string, data: Partial<Omit<Supplier, "id" | "kode" | "createdAt">>) =>
    put<Supplier>(`/supplier/${id}`, data),
  deleteSupplier: (id: string) => del<void>(`/supplier/${id}`),
  createKendaraan: (data: Omit<Kendaraan, "id" | "createdAt">) => post<Kendaraan>("/kendaraan", data),
  updateKendaraan: (id: string, data: Partial<Omit<Kendaraan, "id" | "createdAt">>) =>
    put<Kendaraan>(`/kendaraan/${id}`, data),
  deleteKendaraan: (id: string) => del<void>(`/kendaraan/${id}`),
  createBarang: (
    data: Omit<Barang, "id" | "createdAt" | "satuan" | "hargaBeli" | "hargaJual" | "stok">
  ) => post<Barang>("/barang", data),
  createJasa: (data: Omit<Jasa, "id" | "createdAt">) => post<Jasa>("/jasa", data),
  createPaket: (data: Omit<Paket, "id" | "createdAt" | "kode"> & { kode?: string }) =>
    post<Paket>("/paket", data),
  updateBarang: (id: string, data: Partial<Omit<Barang, "id" | "createdAt">>) => put<Barang>(`/barang/${id}`, data),
  deleteBarang: (id: string) => del<void>(`/barang/${id}`),
  downloadBarangTemplate: () => downloadFile("/barang/template", "template-barang.xlsx"),
  exportBarang: () => downloadFile("/barang/export", "data-barang.xlsx"),
  importBarang: (file: File) => uploadFile<ImportSummary>("/barang/import", file),
  updateJasa: (id: string, data: Partial<Omit<Jasa, "id" | "createdAt">>) => put<Jasa>(`/jasa/${id}`, data),
  deleteJasa: (id: string) => del<void>(`/jasa/${id}`),
  downloadJasaTemplate: () => downloadFile("/jasa/template", "template-jasa.xlsx"),
  exportJasa: () => downloadFile("/jasa/export", "data-jasa.xlsx"),
  importJasa: (file: File) => uploadFile<ImportSummary>("/jasa/import", file),
  updatePaket: (id: string, data: Partial<Omit<Paket, "id" | "createdAt">>) => put<Paket>(`/paket/${id}`, data),
  deletePaket: (id: string) => del<void>(`/paket/${id}`),
  createInvoice: (data: {
    pelangganId: string;
    kendaraanIds?: string[];
    kilometer?: number;
    tanggal?: string;
    jatuhTempo?: string;
    syaratPembayaran?: string;
    catatan?: string;
    keluhan?: string;
    potonganPersen?: number;
    status?: Invoice["status"];
    dibayar?: number;
    items: {
      tipe: "barang" | "jasa";
      itemId: string;
      qty: number;
      diskonTipe?: DiskonTipe;
      diskonPersen: number;
      diskonRp?: number;
      hargaSatuan?: number;
      lokasi?: string;
      satuan?: string;
    }[];
  }) => post<Invoice>("/invoice", data),
  getInvoice: (id: string) => get<Invoice>(`/invoice/${id}`),
  updateInvoice: (id: string, data: Partial<Pick<Invoice, "status" | "dibayar">>) =>
    put<Invoice>(`/invoice/${id}`, data),
  createRetur: (data: {
    invoiceId: string;
    tanggal?: string;
    alasan?: string;
    items: { itemId: string; qty: number }[];
    potonganPersen?: number;
    potonganRp?: number;
    pajakPersen?: number;
    status?: Retur["status"];
  }) => post<Retur>("/retur", data),
  updateRetur: (
    id: string,
    data: Partial<{
      alasan?: string;
      items: { itemId: string; qty: number }[];
      potonganPersen?: number;
      potonganRp?: number;
      pajakPersen?: number;
      status: Retur["status"];
    }>
  ) => put<Retur>(`/retur/${id}`, data),
  createPembayaran: (data: { invoiceId: string; tanggal?: string; jumlah: number; metode?: string }) =>
    post<Pembayaran>("/pembayaran", data),
  createPemasukanLain: (data: Omit<PemasukanLain, "id" | "createdAt">) =>
    post<PemasukanLain>("/pemasukan-lain", data),
  createPosisi: (data: Omit<Posisi, "id" | "kode" | "createdAt">) => post<Posisi>("/posisi", data),
  updatePosisi: (id: string, data: Partial<Omit<Posisi, "id" | "kode" | "createdAt">>) =>
    put<Posisi>(`/posisi/${id}`, data),
  deletePosisi: (id: string) => del<void>(`/posisi/${id}`),
  createLokasi: (data: Omit<Lokasi, "id" | "createdAt">) => post<Lokasi>("/lokasi", data),
  updateLokasi: (id: string, data: Partial<Omit<Lokasi, "id" | "createdAt">>) => put<Lokasi>(`/lokasi/${id}`, data),
  deleteLokasi: (id: string) => del<void>(`/lokasi/${id}`),
  createKaryawan: (data: Omit<Karyawan, "id" | "kode" | "createdAt">) => post<Karyawan>("/karyawan", data),
  updateKaryawan: (id: string, data: Partial<Omit<Karyawan, "id" | "kode" | "createdAt">>) =>
    put<Karyawan>(`/karyawan/${id}`, data),
  deleteKaryawan: (id: string) => del<void>(`/karyawan/${id}`),
  createPeriodeGaji: (data: Omit<PeriodeGaji, "id" | "createdAt">) => post<PeriodeGaji>("/periode-gaji", data),
  createLookup: (data: { tipe: LookupTipe; nama: string; deskripsi?: string; jatuhTempoHari?: number }) =>
    post<Lookup>("/pengaturan/lookup", data),
  updateLookup: (id: string, data: { nama?: string; deskripsi?: string; jatuhTempoHari?: number }) =>
    put<Lookup>(`/pengaturan/lookup/${id}`, data),
  deleteLookup: (id: string) => del<void>(`/pengaturan/lookup/${id}`),
  getPajak: () => get<PajakSetting>("/pengaturan/pajak"),
  updatePajak: (data: Partial<PajakSetting>) => put<PajakSetting>("/pengaturan/pajak", data),
  getCompanyProfile: () => get<CompanyProfile>("/pengaturan/profil-perusahaan"),
  updateCompanyProfile: (data: Partial<CompanyProfile>) => put<CompanyProfile>("/pengaturan/profil-perusahaan", data),
  createPembelian: (data: {
    supplierId: string;
    tanggal?: string;
    jatuhTempo?: string;
    syaratPembayaran?: string;
    noInvoiceSupplier?: string;
    catatan?: string;
    potonganPersen?: number;
    biayaPengiriman?: number;
    biayaLainnya?: number;
    bebasPpn?: boolean;
    metodePembayaran?: string;
    catatanPembayaran?: string;
    status?: Pembelian["status"];
    dibayar?: number;
    items: {
      itemId: string;
      qty: number;
      diskonTipe?: DiskonTipe;
      diskonPersen: number;
      diskonRp?: number;
      hargaSatuan?: number;
      lokasi?: string;
      satuan?: string;
    }[];
  }) => post<Pembelian>("/pembelian", data),
  getPembelian: (id: string) => get<Pembelian>(`/pembelian/${id}`),
  updatePembelian: (id: string, data: Partial<Pick<Pembelian, "status" | "dibayar">>) =>
    put<Pembelian>(`/pembelian/${id}`, data),
  createReturPembelian: (data: {
    pembelianId: string;
    tanggal?: string;
    alasan?: string;
    items: { itemId: string; qty: number }[];
  }) => post<ReturPembelian>("/retur-pembelian", data),
  createPembayaranHutang: (data: { pembelianId: string; tanggal?: string; jumlah: number; metode?: string }) =>
    post<PembayaranHutang>("/pembayaran-hutang", data),
  createPengeluaranLain: (data: Omit<PengeluaranLain, "id" | "createdAt">) =>
    post<PengeluaranLain>("/pengeluaran-lain", data),
  createStokOpname: (data: { tanggal?: string; lokasi: string; catatan?: string; items: { itemId: string; stokFisik: number }[] }) =>
    post<StokOpname>("/stok-opname", data),
  createPenerimaanBarang: (data: {
    tanggal?: string;
    alasan: string;
    catatan?: string;
    status?: PenerimaanBarang["status"];
    items: { itemId: string; satuan?: string; lokasi: string; jumlah: number; hargaSatuan?: number; catatan?: string }[];
  }) => post<PenerimaanBarang>("/penerimaan-barang", data),
  updatePenerimaanBarang: (id: string, data: { status: PenerimaanBarang["status"] }) =>
    put<PenerimaanBarang>(`/penerimaan-barang/${id}`, data),
  createPengeluaranBarang: (data: {
    tanggal?: string;
    alasan: string;
    catatan?: string;
    status?: PengeluaranBarang["status"];
    items: { itemId: string; satuan?: string; lokasi: string; jumlah: number; hargaSatuan?: number; catatan?: string }[];
  }) => post<PengeluaranBarang>("/pengeluaran-barang", data),
  updatePengeluaranBarang: (id: string, data: { status: PengeluaranBarang["status"] }) =>
    put<PengeluaranBarang>(`/pengeluaran-barang/${id}`, data),
  login: (email: string, password: string) => post<{ token: string; user: User }>("/auth/login", { email, password }),
  logout: () => post<void>("/auth/logout", {}),
  me: () => get<User>("/auth/me"),
  users: () => get<User[]>("/users"),
  getUser: (id: string) => get<User>(`/users/${id}`),
  createUser: (data: { nama: string; email: string; password: string; role: UserRole; aktif?: boolean }) =>
    post<User>("/users", data),
  updateUser: (
    id: string,
    data: Partial<{ nama: string; email: string; password: string; role: UserRole; aktif: boolean }>
  ) => put<User>(`/users/${id}`, data),
  deleteUser: (id: string) => del<void>(`/users/${id}`),
};
