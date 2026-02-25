// lib/pdf-generator.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// Important: make sure to import the logo (Vite/React → ?url, Next.js → import, plain node → fs.readFileSync, etc.)
// For most modern setups with bundler (Vite / webpack / etc.):
interface LongClaimPDFData {
  claimId: string;
  period: { starting_date: string | null; ending_date: string | null };
  claimCars: any[];                    // from /long-claim/.../cars
  claimantsByCar: Record<number, any[]>; // from /car/.../claimants
  totalDelivery: number;
  bill: number;
}

const colors = {
  primary: [4, 120, 87] as [number, number, number],
  primaryDark: [6, 95, 70] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  darkText: [17, 24, 39] as [number, number, number],
  lightBg: [249, 250, 251] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export async function generateLongClaimInvoicePDF(data: LongClaimPDFData): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 9;

  // ─── Compact gradient header ────────────────────────────────────────────────
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

  // ─── Logo (left side) ───────────────────────────────────────────────────────
  try {
    const img = await fetch("/logo.jpeg").then(res => res.blob());
    const imgData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(img);
    });

    // Adjust these values to fit your logo nicely
    const logoWidth = 45;
    const logoHeight = 18;           // keep aspect ratio in mind
    const logoX = margin;
    const logoY = 4;

    doc.addImage(imgData, "JPEG", logoX, logoY, logoWidth, logoHeight);
  } catch (err) {
    console.warn("Could not load logo", err);
    // fallback: just skip or draw placeholder rectangle
    doc.setFillColor(...colors.white);
    doc.rect(margin, 4, 28, 18, "F");
  }

  // Company info right-aligned (moved a bit left to give logo space)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...colors.white);

  const company = [
    "Derby Turn, Building 1, Derby Road",
    "BURTON UPON TRENT Staffordshire DE141RX",
    "www.gogreenhire.co.uk",
  ];

  let y = 7;
  company.forEach(line => {
    doc.text(line, pageWidth - margin, y, { align: "right" });
    y += 3;
  });

  // INVOICE title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INVOICE", pageWidth / 2, 19, { align: "center" });

  // Claim ID
  doc.setFontSize(9.5);
  doc.text(`Claim ${data.claimId}`, pageWidth / 2, 24, { align: "center" });

  // ─── Bill To block ───────────────────────────────────────────────────────────
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

  // ─── Period & Generated ──────────────────────────────────────────────────────
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

  // ─── Tighter / smaller Excel-style table ────────────────────────────────────
  const tableStartY = headerHeight + 28;

  const body: any[] = [];

  data.claimCars.forEach(car => {
    const claimants = data.claimantsByCar[car.id] || [];

    if (claimants.length === 0) {
      body.push([car.name || "—", car.model || "—", car.reg_no || "—", "No claimants", "—", "—", "—", "—", ""]);
    } else {
      claimants.forEach((cl: any, idx: number) => {
        body.push([
          idx === 0 ? (car.name || "—") : "",
          idx === 0 ? (car.model || "—") : "",
          idx === 0 ? (car.reg_no || "—") : "",
          cl.name || "—",
          `${formatDate(cl.start_date)} – ${formatDate(cl.end_date)}`,
          cl.location || "—",
          cl.miles != null ? `${cl.miles}` : "—",
          `£${Number(cl.delivery_charges || 0).toFixed(2)}`,
          idx === 0 ? `£${data.bill.toFixed(2)}` : "",
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [["Car", "Model", "Reg", "Claimant", "Dates", "Location", "Miles", "Delivery £"]],
    body,
    theme: "grid",
    styles: {
      fontSize: 6.5,          // ← smaller font
      cellPadding: 1.2,       // ← much tighter padding
      lineColor: [215, 215, 215],
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: colors.primary,
      textColor: colors.white,
      fontSize: 7.2,          // slightly smaller header too
      fontStyle: "bold",
      cellPadding: 1.6,
    },
    alternateRowStyles: { fillColor: colors.lightBg },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 21 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 36 },
      5: { cellWidth: 32 },
      6: { cellWidth: 13, halign: "right" },
      7: { cellWidth: 17, halign: "right" },
      8: { cellWidth: 19, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    didParseCell(data) {
      if ([6, 7, 8].includes(data.column.index)) {
        data.cell.styles.halign = "right";
      }
      if (data.column.index === 8) {
        data.cell.styles.textColor = colors.primaryDark;
      }
    },
    rowPageBreak: "avoid",   // try to keep claimant groups together
  });

  // Final total line (in case table is short)
  const finalY = (doc as any).lastAutoTable.finalY + 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...colors.primaryDark);
  doc.text("Total Amount", pageWidth - 50, finalY);
  doc.text(`£${data.bill.toFixed(2)}`, pageWidth - 10, finalY, { align: "right" });

  // Tiny footer
  doc.setFontSize(6.2);
  doc.setTextColor(...colors.gray);
  doc.text(
    `Generated ${new Date().toLocaleString("en-GB")} • Go Green Hire`,
    pageWidth / 2,
    doc.internal.pageSize.height - 6,
    { align: "center" }
  );

  return doc.output("arraybuffer") as any;
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