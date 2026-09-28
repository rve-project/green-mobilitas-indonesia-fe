"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { CompanyProfile } from "@/lib/types";
import { formatDate } from "@/lib/format";
import {
  computeReport,
  fetchLaporanDataset,
  LaporanDataset,
  periodRangeFromSearchParams,
  REPORTS,
  ReportKey,
  ReportResult,
} from "@/lib/laporanCompute";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { downloadElementAsPdf } from "@/lib/pdfExport";

export default function CetakLaporanPage() {
  const searchParams = useSearchParams();
  const jenis = (searchParams.get("jenis") as ReportKey) || "pembelian";
  const reportDef = REPORTS.find((r) => r.key === jenis);

  const [dataset, setDataset] = useState<LaporanDataset | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([fetchLaporanDataset(api), api.getCompanyProfile()]).then(([d, p]) => {
      setDataset(d);
      setProfile(p);
    });
  }, []);

  if (!dataset || !profile || !reportDef) {
    return <div className="p-8 text-sm text-zinc-400">Memuat laporan…</div>;
  }

  const { start, end, label: periodeLabel } = periodRangeFromSearchParams(searchParams);
  const result: ReportResult = computeReport(jenis, { start, end }, dataset);
  const tanggalCetak = new Date();

  async function handleDownloadPdf() {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(printRef.current, `laporan-${jenis}-${Date.now()}.pdf`, "portrait");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      <div className="mx-auto flex max-w-[210mm] items-center justify-between py-4 print:hidden">
        <Breadcrumb items={[{ label: "Laporan", href: "/laporan" }, { label: `Cetak Laporan ${reportDef.label}` }]} className="" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Membuat PDF..." : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </button>
        </div>
      </div>

      <div ref={printRef} className="relative mx-auto w-[210mm] bg-white p-[12mm] text-[12px] shadow-lg print:w-auto print:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-gmi-green.png" alt="Logo" className="h-11 w-11 object-contain" />
            <div>
              <p className="text-base font-bold leading-none text-zinc-900">{profile.namaPerusahaan}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{profile.alamat}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-zinc-900">Laporan {reportDef.label}</p>
            <p className="mt-1 text-[11px] text-zinc-500">Periode: {periodeLabel}</p>
            <p className="text-[11px] text-zinc-500">Tanggal Cetak: {formatDate(tanggalCetak.toISOString())}</p>
          </div>
        </div>

        <div className="mt-2 h-[3px] w-full bg-green-600" />

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {result.summary.map((s) => (
            <div key={s.label} className="rounded-lg border border-zinc-200 p-2.5">
              <p className="text-[10px] text-zinc-500">{s.label}</p>
              <p className="mt-0.5 text-[13px] font-bold text-zinc-900">{s.value}</p>
            </div>
          ))}
        </div>

        <table className="mt-4 w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="bg-green-600 text-white">
              {result.columns.map((c) => (
                <th key={c} className="px-2 py-1.5 font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={result.columns.length} className="py-6 text-center text-zinc-400">
                  Tidak ada data pada periode ini
                </td>
              </tr>
            ) : (
              result.rows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1.5 text-zinc-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        <p className="mt-6 text-center text-[10px] text-zinc-400">
          Dicetak otomatis oleh Sistem {profile.namaPerusahaan} | {formatDate(tanggalCetak.toISOString())},{" "}
          {new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(tanggalCetak).replace(":", ".")}
        </p>
      </div>
    </div>
  );
}
