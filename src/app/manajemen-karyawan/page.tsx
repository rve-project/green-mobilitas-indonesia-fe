"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CheckCircle2, FileText, Pencil, Plus, Search, Trash2, Users, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { confirmDelete } from "@/lib/confirm";
import { Karyawan, KaryawanStats, PeriodeGaji, Posisi } from "@/lib/types";
import { formatDate, formatRupiah } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/Panel";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { TambahKaryawanModal } from "@/components/karyawan/TambahKaryawanModal";
import { TambahPosisiModal } from "@/components/karyawan/TambahPosisiModal";
import { BuatPeriodeGajiModal } from "@/components/karyawan/BuatPeriodeGajiModal";

type Tab = "karyawan" | "gaji" | "posisi";

const TABS: { key: Tab; label: string }[] = [
  { key: "karyawan", label: "Karyawan" },
  { key: "gaji", label: "Gaji & Komisi" },
  { key: "posisi", label: "Posisi" },
];

export default function ManajemenKaryawanPage() {
  const [tab, setTab] = useState<Tab>("karyawan");
  const [karyawan, setKaryawan] = useState<Karyawan[] | null>(null);
  const [posisi, setPosisi] = useState<Posisi[] | null>(null);
  const [periodeGaji, setPeriodeGaji] = useState<PeriodeGaji[] | null>(null);

  function refreshKaryawan() {
    api.karyawan().then(setKaryawan);
  }
  function refreshPosisi() {
    api.posisi().then(setPosisi);
  }
  function refreshPeriodeGaji() {
    api.periodeGaji().then(setPeriodeGaji);
  }

  useEffect(() => {
    refreshKaryawan();
    refreshPosisi();
    refreshPeriodeGaji();
  }, []);

  return (
    <div className="flex-1 space-y-6 px-4 py-5 sm:px-8 sm:py-6">
      <PageHeader
        title="Manajemen Karyawan"
        subtitle="Kelola data dan informasi karyawan"
        action={
          tab === "karyawan" ? (
            <KaryawanBaruButton
              posisiList={posisi ?? []}
              onSaved={() => refreshKaryawan()}
              onPosisiCreated={() => refreshPosisi()}
            />
          ) : undefined
        }
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex border-b border-zinc-100">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
                tab === t.key ? "border-green-600 text-green-600" : "border-transparent text-zinc-400 hover:text-zinc-600"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "karyawan" && <KaryawanTab karyawan={karyawan} posisi={posisi ?? []} />}
        {tab === "gaji" && (
          <GajiKomisiTab
            periodeGaji={periodeGaji}
            karyawanList={karyawan ?? []}
            posisiList={posisi ?? []}
            onSaved={refreshPeriodeGaji}
          />
        )}
        {tab === "posisi" && <PosisiTab posisi={posisi} onChanged={refreshPosisi} />}
      </div>
    </div>
  );
}

function KaryawanBaruButton({
  posisiList,
  onSaved,
  onPosisiCreated,
}: {
  posisiList: Posisi[];
  onSaved: (k: Karyawan) => void;
  onPosisiCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
      >
        <Plus className="h-4 w-4" />
        Karyawan Baru
      </button>
      {open && (
        <TambahKaryawanModal
          posisiList={posisiList}
          onClose={() => setOpen(false)}
          onSaved={(k) => onSaved(k)}
          onPosisiCreated={onPosisiCreated}
        />
      )}
    </>
  );
}

function KaryawanTab({ karyawan, posisi }: { karyawan: Karyawan[] | null; posisi: Posisi[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [posisiFilter, setPosisiFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const posisiMap = useMemo(() => new Map(posisi.map((p) => [p.id, p.nama])), [posisi]);

  const stats: KaryawanStats | null = useMemo(() => {
    if (!karyawan) return null;
    return {
      total: karyawan.length,
      aktif: karyawan.filter((k) => k.status === "aktif").length,
      nonaktif: karyawan.filter((k) => k.status === "nonaktif").length,
    };
  }, [karyawan]);

  const filtered = useMemo(() => {
    if (!karyawan) return null;
    const q = search.trim().toLowerCase();
    return karyawan
      .filter((k) => {
        const matchesSearch =
          !q ||
          k.kode.toLowerCase().includes(q) ||
          k.nama.toLowerCase().includes(q) ||
          (k.email ?? "").toLowerCase().includes(q) ||
          (k.telepon ?? "").toLowerCase().includes(q);
        const matchesPosisi = !posisiFilter || k.posisiId === posisiFilter;
        return matchesSearch && matchesPosisi;
      })
      .sort((a, b) => a.kode.localeCompare(b.kode));
  }, [karyawan, search, posisiFilter]);

  const paged = filtered ? paginate(filtered, page, pageSize) : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Karyawan"
          value={stats?.total ?? "-"}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <StatCard
          label="Aktif"
          value={stats?.aktif ?? "-"}
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
        />
        <StatCard
          label="Nonaktif"
          value={stats?.nonaktif ?? "-"}
          icon={XCircle}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-1.5 text-sm font-medium text-zinc-700">Cari Karyawan</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari kode/nama/email/telepon karyawan..."
              className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:w-80"
            />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-zinc-700">Posisi</p>
          <Select
            value={posisiFilter}
            onChange={(v) => {
              setPosisiFilter(v);
              setPage(1);
            }}
            className="w-full sm:w-44"
            options={[{ value: "", label: "Semua" }, ...posisi.map((p) => ({ value: p.id, label: p.nama }))]}
          />
        </div>
      </div>

      {!paged ? (
        <p className="text-sm text-zinc-400">Memuat…</p>
      ) : paged.length === 0 ? (
        <EmptyState label="Belum ada data karyawan" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                <th className="py-2 pr-4 font-medium">Kode Karyawan</th>
                <th className="py-2 pr-4 font-medium">Nama Karyawan</th>
                <th className="py-2 pr-4 font-medium">Kontak</th>
                <th className="py-2 pr-4 font-medium">Posisi</th>
                <th className="py-2 pr-4 font-medium">Tanggal Masuk</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((k) => (
                <tr
                  key={k.id}
                  onClick={() => router.push(`/manajemen-karyawan/karyawan/${k.id}`)}
                  className="cursor-pointer border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
                >
                  <td className="py-3 pr-4 font-medium text-zinc-900">{k.kode}</td>
                  <td className="py-3 pr-4 text-zinc-700">{k.nama}</td>
                  <td className="py-3 pr-4 text-zinc-500">{k.telepon || k.email || "-"}</td>
                  <td className="py-3 pr-4 text-zinc-500">{k.posisiId ? posisiMap.get(k.posisiId) ?? "-" : "-"}</td>
                  <td className="py-3 pr-4 text-zinc-500">{formatDate(k.tanggalMasuk)}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={k.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

function GajiKomisiTab({
  periodeGaji,
  karyawanList,
  posisiList,
  onSaved,
}: {
  periodeGaji: PeriodeGaji[] | null;
  karyawanList: Karyawan[];
  posisiList: Posisi[];
  onSaved: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const paged = periodeGaji ? paginate(periodeGaji, page, pageSize) : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Riwayat Periode Gaji</h3>
          <p className="text-sm text-zinc-500">Daftar periode penggajian yang telah dibuat</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Buat Periode Baru
        </button>
      </div>

      {!periodeGaji ? (
        <p className="text-sm text-zinc-400">Memuat…</p>
      ) : periodeGaji.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-200 py-16">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <FileText className="h-5 w-5 text-zinc-400" />
          </span>
          <p className="font-medium text-zinc-700">Belum ada periode gaji</p>
          <p className="text-sm text-zinc-400">Silakan buat periode gaji baru untuk memulai</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-2 flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Buat Periode Baru
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {(paged ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-4">
                <div>
                  <p className="font-semibold text-zinc-900">{p.nama}</p>
                  <p className="text-xs text-zinc-400">
                    {p.rows.length} karyawan • dibuat {formatDate(p.createdAt)}
                  </p>
                </div>
                <p className="font-semibold text-zinc-900">{formatRupiah(p.totalKeseluruhan)}</p>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={periodeGaji.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}

      {modalOpen && (
        <BuatPeriodeGajiModal
          karyawanList={karyawanList}
          posisiList={posisiList}
          onClose={() => setModalOpen(false)}
          onSaved={() => onSaved()}
        />
      )}
    </div>
  );
}

function PosisiTab({ posisi, onChanged }: { posisi: Posisi[] | null; onChanged: () => void }) {
  const [search, setSearch] = useState("");
  const [modalState, setModalState] = useState<{ open: boolean; edit?: Posisi }>({ open: false });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    if (!posisi) return null;
    const q = search.trim().toLowerCase();
    const rows = q ? posisi.filter((p) => p.nama.toLowerCase().includes(q) || p.kode.toLowerCase().includes(q)) : posisi;
    return [...rows].sort((a, b) => a.kode.localeCompare(b.kode));
  }, [posisi, search]);

  const paged = filtered ? paginate(filtered, page, pageSize) : null;

  async function handleDelete(p: Posisi) {
    if (!(await confirmDelete(`Hapus posisi "${p.nama}"?`))) return;
    await api.deletePosisi(p.id);
    onChanged();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Posisi</h3>
          <p className="text-sm text-zinc-500">Kelola posisi/jabatan karyawan</p>
        </div>
        <button
          type="button"
          onClick={() => setModalState({ open: true })}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Tambah Posisi
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Cari posisi..."
          className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {!filtered ? (
        <p className="text-sm text-zinc-400">Memuat…</p>
      ) : filtered.length === 0 ? (
        <EmptyState label="Belum ada data posisi" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                <th className="py-2 pr-4 font-medium">Kode</th>
                <th className="py-2 pr-4 font-medium">Nama Posisi</th>
                <th className="py-2 pr-4 font-medium">Deskripsi</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-0 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(paged ?? []).map((p) => (
                <tr key={p.id} className="border-b border-zinc-50 last:border-0">
                  <td className="py-3 pr-4 font-medium text-zinc-900">{p.kode}</td>
                  <td className="py-3 pr-4 text-zinc-700">{p.nama}</td>
                  <td className="py-3 pr-4 text-zinc-500">{p.deskripsi || "-"}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={clsx(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        p.aktif ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
                      )}
                    >
                      {p.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="py-3 pr-0">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label="Edit posisi"
                        onClick={() => setModalState({ open: true, edit: p })}
                        className="rounded p-1.5 text-blue-500 hover:bg-blue-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Hapus posisi"
                        onClick={() => handleDelete(p)}
                        className="rounded p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {modalState.open && (
        <TambahPosisiModal
          posisi={modalState.edit}
          onClose={() => setModalState({ open: false })}
          onSaved={() => onChanged()}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <span className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", iconBg)}>
        <Icon className={clsx("h-5 w-5", iconColor)} />
      </span>
      <div>
        <p className="text-sm text-zinc-500">{label}</p>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "aktif" | "nonaktif" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "aktif" ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
      )}
    >
      {status === "aktif" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {status === "aktif" ? "Aktif" : "Nonaktif"}
    </span>
  );
}
