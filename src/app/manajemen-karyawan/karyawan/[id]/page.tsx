"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Ban, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { confirmDelete } from "@/lib/confirm";
import { Karyawan, PeriodeGaji, Posisi, SATUAN_GAJI_OPTIONS } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/Panel";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { TambahKaryawanModal } from "@/components/karyawan/TambahKaryawanModal";

function satuanLabel(value: string) {
  return SATUAN_GAJI_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export default function KaryawanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [karyawan, setKaryawan] = useState<Karyawan | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [posisiList, setPosisiList] = useState<Posisi[]>([]);
  const [periodeGaji, setPeriodeGaji] = useState<PeriodeGaji[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [riwayatPage, setRiwayatPage] = useState(1);
  const [riwayatPageSize, setRiwayatPageSize] = useState(10);

  function refreshKaryawan() {
    api
      .getKaryawan(id)
      .then(setKaryawan)
      .catch(() => setNotFound(true));
  }

  useEffect(() => {
    refreshKaryawan();
    api.posisi().then(setPosisiList);
    api.periodeGaji().then(setPeriodeGaji);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const posisiNama = posisiList.find((p) => p.id === karyawan?.posisiId)?.nama;

  const riwayatGaji = useMemo(
    () =>
      periodeGaji
        .map((p) => ({ periode: p, row: p.rows.find((r) => r.karyawanId === id) }))
        .filter((entry) => entry.row)
        .sort((a, b) => new Date(b.periode.createdAt).getTime() - new Date(a.periode.createdAt).getTime()),
    [periodeGaji, id]
  );

  async function handleToggleStatus() {
    if (!karyawan) return;
    setBusy(true);
    try {
      const nextStatus = karyawan.status === "aktif" ? "nonaktif" : "aktif";
      const updated = await api.updateKaryawan(karyawan.id, { status: nextStatus });
      setKaryawan(updated);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!karyawan) return;
    if (!(await confirmDelete(`Hapus karyawan "${karyawan.nama}"? Tindakan ini tidak bisa dibatalkan.`))) return;
    setBusy(true);
    try {
      await api.deleteKaryawan(karyawan.id);
      router.push("/manajemen-karyawan");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex-1 px-4 py-5 sm:px-8 sm:py-6">
        <EmptyState label="Karyawan tidak ditemukan" />
        <Link
          href="/manajemen-karyawan"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-green-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Manajemen Karyawan
        </Link>
      </div>
    );
  }

  if (!karyawan) {
    return <div className="flex-1 px-4 py-5 sm:px-8 sm:py-6 text-sm text-zinc-400">Memuat…</div>;
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb items={[{ label: "Manajemen Karyawan", href: "/manajemen-karyawan" }, { label: karyawan.nama }]} />
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{karyawan.nama}</h1>
            <StatusBadge status={karyawan.status} />
          </div>
          <p className="text-sm text-zinc-500">{karyawan.kode}</p>
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
            {karyawan.status === "aktif" ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {karyawan.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
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

      <Section title="Informasi Pribadi">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoField label="Kode Karyawan" value={karyawan.kode} />
          <InfoField label="NIK" value={karyawan.nik} />
          <InfoField label="Email" value={karyawan.email} />
          <InfoField label="Nomor Telepon" value={karyawan.telepon} />
          <InfoField label="Alamat" value={karyawan.alamat} span />
        </div>
      </Section>

      <Section title="Informasi Ketenagakerjaan">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoField label="Posisi" value={posisiNama} />
          <InfoField label="Tanggal Masuk" value={formatDate(karyawan.tanggalMasuk)} />
          <InfoField label="Satuan Gaji" value={satuanLabel(karyawan.satuanGaji)} />
          <InfoField label="Gaji" value={formatRupiah(karyawan.gaji)} />
        </div>
      </Section>

      <Section title="Riwayat Gaji">
        {riwayatGaji.length === 0 ? (
          <EmptyState label="Belum ada riwayat gaji" />
        ) : (
          <>
            <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-100">
              {paginate(riwayatGaji, riwayatPage, riwayatPageSize).map(({ periode, row }) => (
                <div key={periode.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{periode.nama}</p>
                    <p className="text-xs text-zinc-400">
                      Gaji Pokok {formatRupiah(row!.gajiPokok)} • Komisi {formatRupiah(row!.komisi)} • Potongan{" "}
                      {formatRupiah(row!.potongan)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-blue-600">{formatRupiah(row!.totalTerima)}</p>
                </div>
              ))}
            </div>
            <Pagination
              page={riwayatPage}
              pageSize={riwayatPageSize}
              totalItems={riwayatGaji.length}
              onPageChange={setRiwayatPage}
              onPageSizeChange={(size) => {
                setRiwayatPageSize(size);
                setRiwayatPage(1);
              }}
            />
          </>
        )}
      </Section>

      {editOpen && (
        <TambahKaryawanModal
          karyawan={karyawan}
          posisiList={posisiList}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setKaryawan(updated)}
          onPosisiCreated={(p) => setPosisiList((prev) => [...prev, p])}
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

function StatusBadge({ status }: { status: Karyawan["status"] }) {
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
