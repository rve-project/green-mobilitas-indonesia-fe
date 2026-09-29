"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Ban, CheckCircle2, Filter, Pencil, Target, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { confirmDelete } from "@/lib/confirm";
import { Pembelian, Supplier } from "@/lib/types";
import { formatDateLong, formatRupiah } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/Panel";
import { TambahSupplierModal } from "@/components/supplier/TambahSupplierModal";

type Tab = "info" | "insentif";

const RIWAYAT_PAGE_SIZE = 5;

const STATUS_PEMBELIAN_CONFIG: Record<Pembelian["status"], { label: string; className: string }> = {
  draft: { label: "Proses", className: "bg-amber-50 text-amber-600" },
  selesai: { label: "Selesai", className: "bg-emerald-50 text-emerald-600" },
  dibatalkan: { label: "Dibatalkan", className: "bg-red-50 text-red-500" },
};

const STATUS_PEMBAYARAN_CONFIG: Record<Pembelian["statusPembayaran"], { label: string; className: string }> = {
  belum_dibayar: { label: "Belum", className: "bg-red-50 text-red-500" },
  dibayar_setengah: { label: "Sebagian", className: "bg-amber-50 text-amber-600" },
  lunas: { label: "Lunas", className: "bg-emerald-50 text-emerald-600" },
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pembelian, setPembelian] = useState<Pembelian[]>([]);
  const [riwayatPage, setRiwayatPage] = useState(1);

  useEffect(() => {
    api
      .getSupplier(id)
      .then(setSupplier)
      .catch(() => setNotFound(true));
    api.pembelian().then(setPembelian);
  }, [id]);

  const pembelianMilik = useMemo(
    () =>
      pembelian
        .filter((p) => p.supplierId === id)
        .sort((a, b) => a.kode.localeCompare(b.kode)),
    [pembelian, id]
  );

  const ringkasan = useMemo(() => {
    const totalPembelian = pembelianMilik.reduce((sum, p) => sum + p.total, 0);
    const totalDibayar = pembelianMilik.reduce((sum, p) => sum + p.dibayar, 0);
    const sisaHutang = pembelianMilik.reduce((sum, p) => {
      const net = p.total - (p.returTotal ?? 0);
      return sum + Math.max(0, net - p.dibayar);
    }, 0);
    return {
      totalTransaksi: pembelianMilik.length,
      totalPembelian,
      totalDibayar,
      sisaHutang,
    };
  }, [pembelianMilik]);

  const riwayatTotalPages = Math.max(1, Math.ceil(pembelianMilik.length / RIWAYAT_PAGE_SIZE));
  const riwayatPaged = pembelianMilik.slice(
    (riwayatPage - 1) * RIWAYAT_PAGE_SIZE,
    riwayatPage * RIWAYAT_PAGE_SIZE
  );

  async function handleToggleStatus() {
    if (!supplier) return;
    setBusy(true);
    try {
      const nextStatus = supplier.status === "aktif" ? "nonaktif" : "aktif";
      const updated = await api.updateSupplier(supplier.id, { status: nextStatus });
      setSupplier(updated);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!supplier) return;
    if (!(await confirmDelete(`Hapus supplier "${supplier.nama}"? Tindakan ini tidak bisa dibatalkan.`))) return;
    setBusy(true);
    try {
      await api.deleteSupplier(supplier.id);
      router.push("/supplier");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex-1 px-4 py-5 sm:px-8 sm:py-6">
        <EmptyState label="Supplier tidak ditemukan" />
        <Link href="/supplier" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-green-600">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke daftar supplier
        </Link>
      </div>
    );
  }

  if (!supplier) {
    return <div className="flex-1 px-4 py-5 sm:px-8 sm:py-6 text-sm text-zinc-400">Memuat…</div>;
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb items={[{ label: "Supplier", href: "/supplier" }, { label: supplier.nama }]} />
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{supplier.nama}</h1>
            <StatusBadge status={supplier.status} />
          </div>
          <p className="text-sm text-zinc-500">{supplier.kode}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleToggleStatus}
            className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {supplier.status === "aktif" ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {supplier.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </button>
        </div>
      </div>

      <div className="flex border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setTab("info")}
          className={clsx(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
            tab === "info" ? "border-green-600 text-green-600" : "border-transparent text-zinc-400 hover:text-zinc-600"
          )}
        >
          Informasi & Transaksi
        </button>
        <button
          type="button"
          onClick={() => setTab("insentif")}
          className={clsx(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
            tab === "insentif" ? "border-green-600 text-green-600" : "border-transparent text-zinc-400 hover:text-zinc-600"
          )}
        >
          <Target className="h-4 w-4" />
          Monitoring Insentif
        </button>
      </div>

      {tab === "info" ? (
        <>
          <Section title="Informasi Supplier">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField label="Kode Supplier" value={supplier.kode} />
              <InfoField label="Tipe" value={supplier.tipe} />
              <InfoField label="Email" value={supplier.email} span />
              <InfoField label="No. Handphone" value={supplier.telepon} />
              <InfoField label="Syarat Bayar" value={supplier.syaratPembayaran} />
            </div>
          </Section>

          <Section title="Ringkasan Pembelian">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <SummaryStat label="Total Transaksi" value={String(ringkasan.totalTransaksi)} />
              <SummaryStat label="Total Pembelian" value={formatRupiah(ringkasan.totalPembelian)} />
              <SummaryStat label="Total Dibayar" value={formatRupiah(ringkasan.totalDibayar)} tone="emerald" />
              <SummaryStat label="Sisa Hutang" value={formatRupiah(ringkasan.sisaHutang)} tone="amber" />
              <SummaryStat label="Saldo Kredit" value={formatRupiah(supplier?.saldoKredit ?? 0)} tone="emerald" />
            </div>

            <p className="mt-6 mb-3 text-sm font-semibold text-zinc-700">Transaksi Terbaru</p>
            <div className="mb-4 rounded-lg border border-zinc-200 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <Filter className="h-3.5 w-3.5" />
                Filter Transaksi
              </p>
              <input
                disabled
                placeholder="Filter berdasarkan tanggal..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-400 disabled:bg-zinc-50"
              />
            </div>

            {pembelianMilik.length === 0 ? (
              <EmptyState label="Belum ada transaksi pembelian" />
            ) : (
              <>
                <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-100">
                  {riwayatPaged.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-green-600">{p.kode}</p>
                        <p className="text-xs text-zinc-400">{formatDateLong(p.tanggal)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill {...STATUS_PEMBELIAN_CONFIG[p.status]} />
                        <Pill {...STATUS_PEMBAYARAN_CONFIG[p.statusPembayaran]} />
                        <span className="w-28 text-right text-sm font-semibold text-zinc-900">
                          {formatRupiah(p.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
                  <span>
                    Menampilkan {(riwayatPage - 1) * RIWAYAT_PAGE_SIZE + 1}-
                    {Math.min(riwayatPage * RIWAYAT_PAGE_SIZE, pembelianMilik.length)} dari {pembelianMilik.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={riwayatPage === 1}
                      onClick={() => setRiwayatPage((p) => p - 1)}
                      className="rounded-lg border border-zinc-200 px-2 py-1 disabled:opacity-40"
                    >
                      {"<"}
                    </button>
                    <span>{riwayatPage}</span>
                    <button
                      type="button"
                      disabled={riwayatPage === riwayatTotalPages}
                      onClick={() => setRiwayatPage((p) => p + 1)}
                      className="rounded-lg border border-zinc-200 px-2 py-1 disabled:opacity-40"
                    >
                      {">"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </Section>

          <Section title="Lokasi">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField label="Alamat" value={supplier.alamat} span />
              <InfoField label="Kota" value={supplier.kota} />
              <InfoField label="Alamat Pengiriman" value={supplier.alamatPengiriman} span />
              <InfoField label="Alamat Penagihan" value={supplier.alamatPenagihan} span />
            </div>
          </Section>
        </>
      ) : (
        <Section title="Monitoring Insentif">
          <EmptyState label="Fitur Monitoring Insentif belum tersedia" />
        </Section>
      )}

      {editOpen && (
        <TambahSupplierModal
          supplier={supplier}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setSupplier(updated)}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900">
        <span className="h-4 w-1 rounded bg-green-600" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoField({ label, value, span }: { label: string; value?: string; span?: boolean }) {
  return (
    <div className={clsx("rounded-lg bg-zinc-50 px-3 py-2", span && "col-span-2")}>
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-zinc-900">{value || "-"}</p>
    </div>
  );
}

function Pill({ label, className }: { label: string; className: string }) {
  return <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", className)}>{label}</span>;
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" }) {
  return (
    <div
      className={clsx(
        "rounded-lg border px-3 py-2",
        tone === "emerald" && "border-emerald-100 bg-emerald-50",
        tone === "amber" && "border-amber-100 bg-amber-50",
        !tone && "border-zinc-100 bg-zinc-50"
      )}
    >
      <p
        className={clsx(
          "text-xs",
          tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-zinc-500"
        )}
      >
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold text-zinc-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Supplier["status"] }) {
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
