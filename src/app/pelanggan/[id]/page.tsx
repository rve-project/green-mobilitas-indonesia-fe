"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Ban, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { confirmDelete } from "@/lib/confirm";
import { Invoice, Kendaraan, Pelanggan } from "@/lib/types";
import { formatDateLong, formatRupiah } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/Panel";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { TambahPelangganModal } from "@/components/pelanggan/TambahPelangganModal";
import { TambahKendaraanModal } from "@/components/pelanggan/TambahKendaraanModal";

const STATUS_INVOICE_CONFIG: Record<Invoice["status"], { label: string; className: string }> = {
  draft: { label: "Proses", className: "bg-amber-50 text-amber-600" },
  selesai: { label: "Selesai", className: "bg-emerald-50 text-emerald-600" },
  dibatalkan: { label: "Dibatalkan", className: "bg-red-50 text-red-500" },
};

const STATUS_PEMBAYARAN_CONFIG: Record<Invoice["statusPembayaran"], { label: string; className: string }> = {
  belum_dibayar: { label: "Belum", className: "bg-red-50 text-red-500" },
  dibayar_setengah: { label: "Sebagian", className: "bg-amber-50 text-amber-600" },
  lunas: { label: "Lunas", className: "bg-emerald-50 text-emerald-600" },
};

export default function PelangganDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pelanggan, setPelanggan] = useState<Pelanggan | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [kendaraan, setKendaraan] = useState<Kendaraan[]>([]);
  const [invoice, setInvoice] = useState<Invoice[]>([]);
  const [riwayatPage, setRiwayatPage] = useState(1);
  const [riwayatPageSize, setRiwayatPageSize] = useState(5);
  const [kendaraanPage, setKendaraanPage] = useState(1);
  const [kendaraanPageSize, setKendaraanPageSize] = useState(10);

  const [editOpen, setEditOpen] = useState(false);
  const [kendaraanModal, setKendaraanModal] = useState<{ open: boolean; edit?: Kendaraan }>({ open: false });
  const [busy, setBusy] = useState(false);

  function refreshPelanggan() {
    api
      .getPelanggan(id)
      .then(setPelanggan)
      .catch(() => setNotFound(true));
  }

  useEffect(() => {
    refreshPelanggan();
    api.kendaraan().then(setKendaraan);
    api.invoice().then(setInvoice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const kendaraanMilik = useMemo(() => kendaraan.filter((k) => k.pelangganId === id), [kendaraan, id]);
  const invoiceMilik = useMemo(
    () =>
      invoice
        .filter((inv) => inv.pelangganId === id)
        .sort((a, b) => a.kode.localeCompare(b.kode)),
    [invoice, id]
  );

  const ringkasan = useMemo(() => {
    const totalJumlah = invoiceMilik.reduce((sum, inv) => sum + inv.total, 0);
    const totalDibayar = invoiceMilik.reduce((sum, inv) => sum + inv.dibayar, 0);
    const sisaPiutang = invoiceMilik.reduce((sum, inv) => {
      const net = inv.total - (inv.returTotal ?? 0);
      return sum + Math.max(0, net - inv.dibayar);
    }, 0);
    return {
      totalTransaksi: invoiceMilik.length,
      totalJumlah,
      totalDibayar,
      sisaPiutang,
    };
  }, [invoiceMilik]);

  const riwayatPaged = paginate(invoiceMilik, riwayatPage, riwayatPageSize);

  async function handleToggleStatus() {
    if (!pelanggan) return;
    setBusy(true);
    try {
      const nextStatus = pelanggan.status === "aktif" ? "nonaktif" : "aktif";
      const updated = await api.updatePelanggan(pelanggan.id, { status: nextStatus });
      setPelanggan(updated);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!pelanggan) return;
    if (!(await confirmDelete(`Hapus pelanggan "${pelanggan.nama}"? Tindakan ini tidak bisa dibatalkan.`))) return;
    setBusy(true);
    try {
      await api.deletePelanggan(pelanggan.id);
      router.push("/pelanggan");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteKendaraan(k: Kendaraan) {
    if (!(await confirmDelete(`Hapus kendaraan ${k.platNomor}?`))) return;
    await api.deleteKendaraan(k.id);
    setKendaraan((prev) => prev.filter((item) => item.id !== k.id));
  }

  if (notFound) {
    return (
      <div className="flex-1 px-4 py-5 sm:px-8 sm:py-6">
        <EmptyState label="Pelanggan tidak ditemukan" />
        <Link href="/pelanggan" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-green-600">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke daftar pelanggan
        </Link>
      </div>
    );
  }

  if (!pelanggan) {
    return <div className="flex-1 px-4 py-5 sm:px-8 sm:py-6 text-sm text-zinc-400">Memuat…</div>;
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb items={[{ label: "Pelanggan", href: "/pelanggan" }, { label: pelanggan.nama }]} />
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{pelanggan.nama}</h1>
            <StatusBadge status={pelanggan.status} />
          </div>
          <p className="text-sm text-zinc-500">{pelanggan.kode}</p>
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
            {pelanggan.status === "aktif" ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {pelanggan.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
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

      <Section title="Informasi Pelanggan">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoField label="Kode Pelanggan" value={pelanggan.kode} />
          <InfoField label="NPWP" value={pelanggan.npwp} />
          <InfoField label="NIK" value={pelanggan.nik} />
          <InfoField label="Email" value={pelanggan.email} />
          <InfoField label="No. Handphone" value={pelanggan.telepon} />
          <InfoField label="Limit Kredit" value={formatRupiah(pelanggan.plafonKredit ?? 0)} />
          <InfoField label="Syarat Pembayaran" value={pelanggan.syaratPembayaran} />
          <InfoField label="Nama PIC" value={pelanggan.namaPIC} />
          <InfoField label="Kontak PIC" value={pelanggan.kontakPIC} />
        </div>
      </Section>

      <Section
        title="Kendaraan"
        action={
          <button
            type="button"
            onClick={() => setKendaraanModal({ open: true })}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Tambah Kendaraan
          </button>
        }
      >
        {kendaraanMilik.length === 0 ? (
          <EmptyState label="Belum ada kendaraan" />
        ) : (
          <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {paginate(kendaraanMilik, kendaraanPage, kendaraanPageSize).map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-zinc-900">{k.platNomor}</p>
                  <p className="text-xs text-zinc-500">
                    {k.merk} {k.model}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {k.tipe} {k.warna ? `• ${k.warna}` : ""} • {k.tahun}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Edit kendaraan"
                    onClick={() => setKendaraanModal({ open: true, edit: k })}
                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Hapus kendaraan"
                    onClick={() => handleDeleteKendaraan(k)}
                    className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={kendaraanPage}
            pageSize={kendaraanPageSize}
            totalItems={kendaraanMilik.length}
            onPageChange={setKendaraanPage}
            onPageSizeChange={(size) => {
              setKendaraanPageSize(size);
              setKendaraanPage(1);
            }}
          />
          </>
        )}
      </Section>

      <Section title="Ringkasan Pembelian">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <SummaryStat label="Total Transaksi" value={String(ringkasan.totalTransaksi)} />
          <SummaryStat label="Total Jumlah" value={formatRupiah(ringkasan.totalJumlah)} />
          <SummaryStat label="Total Dibayar" value={formatRupiah(ringkasan.totalDibayar)} tone="emerald" />
          <SummaryStat label="Sisa Piutang" value={formatRupiah(ringkasan.sisaPiutang)} tone="amber" />
          <SummaryStat label="Saldo Kredit" value={formatRupiah(pelanggan?.saldoKredit ?? 0)} tone="emerald" />
        </div>

        <p className="mt-6 mb-3 text-sm font-semibold text-zinc-700">Transaksi Terbaru</p>
        {invoiceMilik.length === 0 ? (
          <EmptyState label="Belum ada transaksi" />
        ) : (
          <>
            <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-100">
              {riwayatPaged.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-green-600">{inv.kode}</p>
                    <p className="text-xs text-zinc-400">{formatDateLong(inv.tanggal)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill {...STATUS_INVOICE_CONFIG[inv.status]} />
                    <Pill {...STATUS_PEMBAYARAN_CONFIG[inv.statusPembayaran]} />
                    <span className="w-28 text-right text-sm font-semibold text-zinc-900">
                      {formatRupiah(inv.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={riwayatPage}
              pageSize={riwayatPageSize}
              totalItems={invoiceMilik.length}
              onPageChange={setRiwayatPage}
              onPageSizeChange={(size) => {
                setRiwayatPageSize(size);
                setRiwayatPage(1);
              }}
            />
          </>
        )}
      </Section>

      <Section title="Lokasi">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoField label="Alamat" value={pelanggan.alamat} span />
          <InfoField label="Kota" value={pelanggan.kota} />
          <InfoField label="Alamat Pengiriman" value={pelanggan.alamatPengiriman} span />
          <InfoField label="Alamat Penagihan" value={pelanggan.alamatPenagihan} span />
        </div>
      </Section>

      {editOpen && (
        <TambahPelangganModal
          pelanggan={pelanggan}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setPelanggan(updated)}
        />
      )}

      {kendaraanModal.open && (
        <TambahKendaraanModal
          pelangganId={pelanggan.id}
          kendaraan={kendaraanModal.edit}
          onClose={() => setKendaraanModal({ open: false })}
          onSaved={(saved) =>
            setKendaraan((prev) =>
              prev.some((k) => k.id === saved.id) ? prev.map((k) => (k.id === saved.id ? saved : k)) : [saved, ...prev]
            )
          }
        />
      )}
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
          <span className="h-4 w-1 rounded bg-green-600" />
          {title}
        </h3>
        {action}
      </div>
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

function Pill({ label, className }: { label: string; className: string }) {
  return <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", className)}>{label}</span>;
}

function StatusBadge({ status }: { status: Pelanggan["status"] }) {
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
