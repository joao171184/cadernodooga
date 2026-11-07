import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfSection = { title: string; head: string[]; body: (string | number)[][] };

export function buildReportPdf(opts: {
  title: string;
  subtitle?: string;
  summary?: [string, string][];
  sections: PdfSection[];
}): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const brown: [number, number, number] = [92, 58, 33];
  doc.setFillColor(...brown);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("CADERNO DO OGÃ", 40, 30);
  doc.setFontSize(11);
  doc.text(opts.title, 40, 50);
  doc.setTextColor(40, 40, 40);
  let y = 90;
  if (opts.subtitle) { doc.setFontSize(10); doc.text(opts.subtitle, 40, y); y += 18; }
  if (opts.summary?.length) {
    autoTable(doc, {
      startY: y, body: opts.summary, theme: "plain",
      styles: { fontSize: 11 }, columnStyles: { 0: { fontStyle: "bold" } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  }
  for (const s of opts.sections) {
    doc.setFontSize(12);
    doc.text(s.title, 40, y);
    autoTable(doc, {
      startY: y + 8, head: [s.head], body: s.body.length ? s.body : [[ "Sem dados", ...s.head.slice(1).map(() => "") ]],
      headStyles: { fillColor: brown }, styles: { fontSize: 9 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  }
  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 40, doc.internal.pageSize.getHeight() - 20);
  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const brDate = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
