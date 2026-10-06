"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Car, ClipboardList, PiggyBank, TrendingUp, Trophy, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { Invoice, Kendaraan, Mekanik, PemasukanLain, Pelanggan, PengeluaranLain, Servis } from "@/lib/types";
import { formatDate, formatRupiah, servisTotal } from "@/lib/format";
import {
  computeKpis,
  computeMonthlyServis,
  kendaraanLabel,
  recentServis,
  topKendaraanByServis,
  topMekanik,
  topPelanggan,
} from "@/lib/dashboard";
import { KpiCard } from "@/components/ui/KpiCard";
import { Panel, EmptyState } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ServisChart } from "@/components/dashboard/ServisChart";
import { MonitoringServisPanel } from "@/components/dashboard/MonitoringServisPanel";

interface RawData {
  pelanggan: Pelanggan[];
  kendaraan: Kendaraan[];
  mekanik: Mekanik[];
  servis: Servis[];
  invoice: Invoice[];
  pemasukanLain: PemasukanLain[];
  pengeluaranLain: PengeluaranLain[];
}

export default function Home() {
  const [data, setData] = useState<RawData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.pelanggan(),
      api.kendaraan(),
      api.mekanik(),
      api.servis(),
      api.invoice(),
      api.pemasukanLain(),
      api.pengeluaranLain(),
    ])
      .then(([pelanggan, kendaraan, mekanik, servis, invoice, pemasukanLain, pengeluaranLain]) => {
        if (!cancelled) setData({ pelanggan, kendaraan, mekanik, servis, invoice, pemasukanLain, pengeluaranLain });
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <p className="font-medium text-red-700">Gagal memuat data dari API</p>
          <p className="mt-1 text-sm text-red-500">{error}</p>
          <p className="mt-3 text-xs text-zinc-500">
            Pastikan backend (bengkel-be) berjalan di{" "}
            {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-400">
        Memuat data dashboard…
      </div>
    );
  }

  const kpis = computeKpis(data);
  const monthly = computeMonthlyServis(data.servis);
  const topKendaraan = topKendaraanByServis(data);
  const mekanikTerbaik = topMekanik(data);
  const pelangganUtama = topPelanggan(data);
  const terakhir = recentServis(data.servis);

  return (
    <div className="flex-1 space-y-8 px-4 py-5 sm:px-8 sm:py-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Hello, admin Bengkel!</h1>
        <p className="text-sm text-zinc-500">Ringkasan &amp; Analisis Operasional Bengkel</p>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-900">
          Indikator Kinerja Utama
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Pendapatan Hari Ini"
            value={formatRupiah(kpis.pendapatanHariIni)}
            hint="Dari servis & pemasukan lain hari ini"
            icon={Wallet}
            accent="green"
          />
          <KpiCard
            label="Laba Hari Ini"
            value={formatRupiah(kpis.labaHariIni)}
            hint="Pendapatan dikurangi pengeluaran lain hari ini"
            icon={PiggyBank}
            accent="blue"
          />
          <KpiCard
            label="Servis Masuk Hari Ini"
            value={String(kpis.servisMasukHariIni)}
            hint="Work order baru hari ini"
            icon={Car}
            accent="amber"
          />
          <KpiCard
            label="Servis Aktif"
            value={String(kpis.servisAktif)}
            hint="Sedang antrian / dikerjakan"
            icon={ClipboardList}
            accent="violet"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title={
            <>
              <TrendingUp className="h-4 w-4 text-green-600" />
              Statistik Servis Bulanan
            </>
          }
          className="lg:col-span-2"
        >
          <ServisChart data={monthly} />
        </Panel>

        <MonitoringServisPanel invoice={data.invoice} kendaraan={data.kendaraan} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Ringkasan Operasional</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Kendaraan Sering Servis">
            {topKendaraan.length === 0 ? (
              <EmptyState label="Belum ada data servis" />
            ) : (
              <ul className="space-y-3">
                {topKendaraan.map(({ kendaraan, count }, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-700">{kendaraanLabel(kendaraan)}</span>
                    <span className="font-semibold text-zinc-900">{count}x servis</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title={
              <>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Servis Menunggu Sparepart
              </>
            }
          >
            {(() => {
              const menunggu = data.servis.filter((s) => s.status === "menunggu_sparepart");
              if (menunggu.length === 0) {
                return (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-200 text-sm text-emerald-600">
                    Tidak ada servis tertunda
                  </div>
                );
              }
              return (
                <ul className="space-y-3">
                  {menunggu.slice(0, 5).map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-700">
                        {kendaraanLabel(data.kendaraan.find((k) => k.id === s.kendaraanId))}
                      </span>
                      <StatusBadge status={s.status} />
                    </li>
                  ))}
                </ul>
              );
            })()}
          </Panel>
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <Trophy className="h-4 w-4 text-green-600" />
          Mitra Teratas
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Mekanik Terbaik" action={<span className="text-xs font-semibold text-blue-500">TOP 5</span>}>
            {mekanikTerbaik.length === 0 ? (
              <EmptyState label="Belum ada data mekanik" />
            ) : (
              <ol className="space-y-3">
                {mekanikTerbaik.map(({ mekanik, count, revenue }, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900">{mekanik?.nama ?? "Tidak diketahui"}</p>
                      <p className="text-xs text-zinc-400">{count} servis</p>
                    </div>
                    <span className="text-sm font-semibold text-zinc-900">{formatRupiah(revenue)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Pelanggan Utama" action={<span className="text-xs font-semibold text-emerald-500">TOP 5</span>}>
            {pelangganUtama.length === 0 ? (
              <EmptyState label="Belum ada data pelanggan" />
            ) : (
              <ol className="space-y-3">
                {pelangganUtama.map(({ pelanggan, count, revenue }, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900">{pelanggan?.nama ?? "Tidak diketahui"}</p>
                      <p className="text-xs text-zinc-400">{count} servis</p>
                    </div>
                    <span className="text-sm font-semibold text-zinc-900">{formatRupiah(revenue)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Servis Terakhir</h2>
        <Panel title="Riwayat Servis Terbaru">
          {terakhir.length === 0 ? (
            <EmptyState label="Belum ada data servis" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                    <th className="py-2 pr-4 font-medium">Kendaraan</th>
                    <th className="py-2 pr-4 font-medium">Keluhan</th>
                    <th className="py-2 pr-4 font-medium">Tanggal</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-0 text-right font-medium">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {terakhir.map((s) => (
                    <tr key={s.id} className="border-b border-zinc-50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-zinc-900">
                        {kendaraanLabel(data.kendaraan.find((k) => k.id === s.kendaraanId))}
                      </td>
                      <td className="max-w-[220px] truncate py-3 pr-4 text-zinc-500">{s.keluhan}</td>
                      <td className="py-3 pr-4 text-zinc-500">{formatDate(s.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="py-3 pr-0 text-right font-semibold text-zinc-900">
                        {formatRupiah(servisTotal(s.items))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
