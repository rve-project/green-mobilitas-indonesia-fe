"use client";

import { useParams } from "next/navigation";
import { InvoiceForm } from "@/components/penjualan/InvoiceForm";

export default function EditInvoicePenjualanPage() {
  const { id } = useParams<{ id: string }>();
  return <InvoiceForm mode="edit" invoiceId={id} />;
}
