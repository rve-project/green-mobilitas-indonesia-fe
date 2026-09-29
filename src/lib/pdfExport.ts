async function buildPdfFromElement(element: HTMLElement, orientation: "portrait" | "landscape") {
  const html2canvas = (await import("html2canvas-pro")).default;
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/jpeg", 0.98);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf;
}

export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  orientation: "portrait" | "landscape" = "portrait"
) {
  const pdf = await buildPdfFromElement(element, orientation);
  pdf.save(filename);
}

/** Opens the generated PDF in a new tab using the browser's native PDF viewer instead of
 * triggering a download. Printing straight from there never carries the page-URL/date/page-number
 * header and footer that Chrome's own "print this webpage" dialog stamps onto HTML pages -- the
 * PDF viewer treats it as a real document, not a page being printed.
 *
 * The tab is opened synchronously (blank, before the `await`) and only pointed at the PDF once
 * it's built -- html2canvas/jsPDF take a moment, and by the time they resolve the click that
 * triggered this call is no longer "recent" enough for browsers to allow window.open without
 * that being treated as a popup and blocked. Opening blank first keeps it tied to the click. */
export async function openElementAsPdf(element: HTMLElement, orientation: "portrait" | "landscape" = "portrait") {
  const tab = window.open("", "_blank");
  const pdf = await buildPdfFromElement(element, orientation);
  const blobUrl = pdf.output("bloburl");
  if (tab) tab.location.href = blobUrl.toString();
  else window.open(blobUrl, "_blank");
}
