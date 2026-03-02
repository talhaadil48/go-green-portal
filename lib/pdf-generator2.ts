// lib/pdf-generator.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface LongClaimPDFData {
  claimId: string;
  period: { starting_date: string | null; ending_date: string | null };
  claimCars: any[];                    // CarItem[]
  claimantsByCar: Record<number, any[]>; // Claimant[]
  totalDelivery: number;
  dailyRates: Record<number, number>;    // ← now required
}

const colors = {
  primary: [4, 120, 87] as [number, number, number],
  primaryDark: [6, 95, 70] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  darkText: [17, 24, 39] as [number, number, number],
  lightBg: [249, 250, 251] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function calculateDays(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  const diff = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diff) + 1;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export async function generateLongClaimInvoicePDF(data: LongClaimPDFData): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 9;

  // Header gradient
  const headerHeight = 26;
  const gradientSteps = 18;
  for (let i = 0; i < gradientSteps; i++) {
    const ratio = i / gradientSteps;
    const r = Math.round(colors.primary[0] + (colors.primaryDark[0] - colors.primary[0]) * ratio);
    const g = Math.round(colors.primary[1] + (colors.primaryDark[1] - colors.primary[1]) * ratio);
    const b = Math.round(colors.primary[2] + (colors.primaryDark[2] - colors.primary[2]) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(0, i * (headerHeight / gradientSteps), pageWidth, headerHeight / gradientSteps + 1, "F");
  }

  // Logo
  try {
    const img = await fetch("/logo.jpeg").then(res => res.blob());
    const imgData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(img);
    });
    doc.addImage(imgData, "JPEG", margin, 4, 45, 18);
  } catch (err) {
    console.warn("Logo failed", err);
  }

  // Company info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...colors.white);
  const companyLines = [
    "Derby Turn, Building 1, Derby Road",
    "BURTON UPON TRENT Staffordshire DE141RX",
    "www.gogreenhire.co.uk",
  ];
  let y = 7;
  companyLines.forEach(line => {
    doc.text(line, pageWidth - margin, y, { align: "right" });
    y += 3;
  });

  // Invoice title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INVOICE", pageWidth / 2, 19, { align: "center" });
  doc.setFontSize(9.5);
  doc.text(`Claim ${data.claimId}`, pageWidth / 2, 24, { align: "center" });

  // Bill To
  doc.setFontSize(9);
  doc.setTextColor(...colors.darkText);
  doc.setFont("helvetica", "bold");
  doc.text("To:", margin, headerHeight + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const billTo = [
    "Sovereign Automotive",
    "1st Floor, The Kirkgate",
    "19 - 33 Church Street, Epsom, Surrey",
    "KT17 APF",
  ];
  y = headerHeight + 11;
  billTo.forEach(line => {
    doc.text(line, margin, y);
    y += 3.6;
  });

  // Period & Generated
  doc.setFontSize(8);
  doc.setTextColor(...colors.gray);
  doc.text("Period:", pageWidth - 65, headerHeight + 6);
  doc.setTextColor(...colors.darkText);
  doc.text(
    `${formatDate(data.period.starting_date)} – ${formatDate(data.period.ending_date)}`,
    pageWidth - 65,
    headerHeight + 10
  );

  doc.setTextColor(...colors.gray);
  doc.text("Generated:", pageWidth - 65, headerHeight + 16);
  doc.setTextColor(...colors.darkText);
  doc.text(new Date().toLocaleDateString("en-GB"), pageWidth - 65, headerHeight + 20);

  // ─── Main Table ───────────────────────────────────────────────────────────────
  const tableStartY = headerHeight + 28;
  const days = calculateDays(data.period.starting_date, data.period.ending_date);

  const body: any[] = [];

  data.claimCars.forEach(car => {
    const claimants = data.claimantsByCar[car.id] || [];
    const dailyRate = data.dailyRates[car.id] || 0;
    const hireAmount = dailyRate * days;

    if (claimants.length === 0) {
      body.push([
        car.name || "—",
        car.model || "—",
        car.reg_no || "—",
        "No claimants",
        "—",
        "—",
        "—",
        "—",
        `£${hireAmount.toFixed(2)}`,
      ]);
    } else {
      claimants.forEach((cl: any, idx: number) => {
        body.push([
          idx === 0 ? (car.name || "—") : "",
          idx === 0 ? (car.model || "—") : "",
          idx === 0 ? (car.reg_no || "—") : "",
          cl.name || "—",
          `${formatDate(cl.start_date)} – ${formatDate(cl.end_date)}`,
          cl.location || "—",
          cl.miles != null ? cl.miles : "—",
          `£${(cl.delivery_charges || 0).toFixed(2)}`,
          idx === 0 ? `£${hireAmount.toFixed(2)}` : "",
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [["Vehicle", "Model", "Reg", "Claimant", "Dates", "Location", "Miles", "Delivery £"]],
    body,
    theme: "grid",
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
      lineColor: [215, 215, 215],
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: colors.primary,
      textColor: colors.white,
      fontSize: 7.2,
      fontStyle: "bold",
      cellPadding: 1.6,
    },
    alternateRowStyles: { fillColor: colors.lightBg },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 22 },
      2: { cellWidth: 24 },
      3: { cellWidth: 30 },
      4: { cellWidth: 35 },
      5: { cellWidth: 28 },
      6: { cellWidth: 14, halign: "right" },
      7: { cellWidth: 15, halign: "right" },
    },
    margin: { left: margin, right: margin },
    didParseCell(data) {
      if ([6, 7, 8].includes(data.column.index)) {
        data.cell.styles.halign = "right";
      }
     
    },
    rowPageBreak: "avoid",
  });

  // ─── Billing Summary ─────────────────────────────────────────────────────────
  const tableEndY = (doc as any).lastAutoTable.finalY || 100;

  const totalHire = data.claimCars.reduce((sum, car) => {
    const rate = data.dailyRates[car.id] || 0;
    return sum + rate * days;
  }, 0);

  const deliveryTotal = data.totalDelivery;
  const subTotal = totalHire + deliveryTotal;
  const vatAmount = subTotal * 0.2;
  const grandTotal = subTotal + vatAmount;

  const billY = tableEndY + 8;
  const rightColX = pageWidth - margin;
  const labelX = pageWidth - 68;
  const rowSpacing = 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...colors.darkText);

  doc.text("Hire charges:", labelX, billY);
  doc.text(`£${totalHire.toFixed(2)}`, rightColX, billY, { align: "right" });

  doc.text("Delivery charges:", labelX, billY + rowSpacing);
  doc.text(`£${deliveryTotal.toFixed(2)}`, rightColX, billY + rowSpacing, { align: "right" });

  doc.setDrawColor(...colors.gray);
  doc.setLineWidth(0.4);
  doc.line(labelX - 2, billY + rowSpacing * 1.4, rightColX + 2, billY + rowSpacing * 1.4);

  doc.setFont("helvetica", "bold");
  doc.text("Subtotal:", labelX, billY + rowSpacing * 2.4);
  doc.text(`£${subTotal.toFixed(2)}`, rightColX, billY + rowSpacing * 2.4, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text("VAT (20%):", labelX, billY + rowSpacing * 3.4);
  doc.text(`£${vatAmount.toFixed(2)}`, rightColX, billY + rowSpacing * 3.4, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...colors.primaryDark);
  doc.text("Total Amount Due", labelX, billY + rowSpacing * 4.8);
  doc.text(`£${grandTotal.toFixed(2)}`, rightColX, billY + rowSpacing * 4.8, { align: "right" });

  return doc.output("arraybuffer") as any;
}