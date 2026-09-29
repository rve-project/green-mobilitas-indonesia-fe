"use client";

import { useParams } from "next/navigation";
import { PembelianForm } from "@/components/pembelian/PembelianForm";

export default function EditInvoicePembelianPage() {
  const { id } = useParams<{ id: string }>();
  return <PembelianForm mode="edit" pembelianId={id} />;
}
