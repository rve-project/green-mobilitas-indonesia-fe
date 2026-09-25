import { Barang, Jasa, PaketItem } from "./types";
import { hitungTotalSetelahDiskon } from "./format";

// Single source of truth for paket pricing -- the edit modal, the Paket list, and the
// detail drawer all price a paket through these, so they can't drift apart again (they
// used to: the list/detail ignored Rupiah discounts and per-unit prices).

/** Unit price of one paket item: the chosen unit's hargaJual for barang, else the jasa price. */
export function hargaSatuanPaketItem(item: PaketItem, barangList: Barang[], jasaList: Jasa[]) {
  if (item.tipe === "barang") {
    const barang = barangList.find((b) => b.id === item.itemId);
    if (!barang) return 0;
    const unit = barang.units.find((u) => u.satuan === item.satuan);
    return unit?.hargaJual ?? barang.hargaJual;
  }
  return jasaList.find((j) => j.id === item.itemId)?.harga ?? 0;
}

/** Line total of one paket item after its discount (persen or rupiah). */
export function subtotalPaketItem(item: PaketItem, barangList: Barang[], jasaList: Jasa[]) {
  const kotor = hargaSatuanPaketItem(item, barangList, jasaList) * item.qty;
  return hitungTotalSetelahDiskon(kotor, item.diskonTipe, item.diskonPersen, item.diskonRp ?? 0);
}

export function hitungHargaPaket(items: PaketItem[], barangList: Barang[], jasaList: Jasa[]) {
  let totalSatuan = 0;
  let hargaPaket = 0;
  for (const item of items) {
    totalSatuan += hargaSatuanPaketItem(item, barangList, jasaList) * item.qty;
    hargaPaket += subtotalPaketItem(item, barangList, jasaList);
  }
  return { totalSatuan, hargaPaket };
}
