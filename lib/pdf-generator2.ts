// lib/pdf-generator.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface LongClaimPDFData {
  claimId: string;
  period: { starting_date: string | null; ending_date: string | null };
  claimCars: any[];                    // from /long-claim/.../cars
  claimantsByCar: Record<number, any[]>; // from /car/.../claimants
  totalDelivery: number;
  bill: number;                        // ← assumed to be the FINAL total (incl. VAT)
}

const colors = {
  primary: [4, 120, 87] as [number, number, number],
  primaryDark: [6, 95, 70] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  darkText: [17, 24, 39] as [number, number, number],
  lightBg: [249, 250, 251] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const VEHICLE_RATE = 53; // £53 per vehicle — change if needed

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

    const logoWidth = 45;
    const logoHeight = 18;
    const logoX = margin;
    const logoY = 4;

    doc.addImage(imgData, "JPEG", logoX, logoY, logoWidth, logoHeight);
  } catch (err) {
    console.warn("Could not load logo", err);
    doc.setFillColor(...colors.white);
    doc.rect(margin, 4, 28, 18, "F");
  }

  // Company info right-aligned
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

  // INVOICE title + Claim ID
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INVOICE", pageWidth / 2, 19, { align: "center" });

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

  // ─── Table ───────────────────────────────────────────────────────────────────
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
          idx === 0 ? `£${data.bill.toFixed(2)}` : "", // ← kept for now (will be replaced below)
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
    rowPageBreak: "avoid",
  });

  // ─── Compact Billing Summary ────────────────────────────────────────────────
  const tableEndY = (doc as any).lastAutoTable.finalY;

  // Calculate breakdown (assuming bill = final total incl. VAT)
  const vehicleCount = data.claimCars.length;
  const vehicleCharges = vehicleCount * VEHICLE_RATE;
  const deliveryTotal = data.totalDelivery;               // already provided
  const subTotal = vehicleCharges + deliveryTotal;
  const vatAmount = subTotal * 0.20;
  const grandTotal = subTotal + vatAmount;

  // You can decide which one to show as "Total Amount"
  // Option A: use calculated grandTotal
  // Option B: keep using data.bill (if it's guaranteed correct)
  const displayTotal = data.bill; // ← using input bill for now
  const billY = tableEndY + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);  // smaller font
  doc.setTextColor(...colors.darkText);

  const rightColX = pageWidth - margin;
  const labelX = pageWidth - 68;
  const rowSpacing = 4; // less space between rows

  // Row 1
  doc.text("Vehicles:", labelX, billY);
  doc.text(`${vehicleCount} × £${VEHICLE_RATE.toFixed(0)}`, rightColX, billY, { align: "right" });

  // Row 2
  doc.text("Vehicle charges:", labelX, billY + rowSpacing);
  doc.text(`£${vehicleCharges.toFixed(2)}`, rightColX, billY + rowSpacing, { align: "right" });

  // Row 3
  doc.text("Delivery charges:", labelX, billY + rowSpacing * 2);
  doc.text(`£${deliveryTotal.toFixed(2)}`, rightColX, billY + rowSpacing * 2, { align: "right" });

  // Subtotal line
  doc.setDrawColor(...colors.gray);
  doc.setLineWidth(0.3);
  doc.line(labelX - 2, billY + rowSpacing * 2.5, rightColX + 2, billY + rowSpacing * 2.5);

  doc.setFont("helvetica", "bold");
  doc.text("Subtotal:", labelX, billY + rowSpacing * 3.5); // increased a bit from 3 to 3.2
  doc.text(`£${subTotal.toFixed(2)}`, rightColX, billY + rowSpacing * 3.2, { align: "right" });

  // VAT
  doc.setFont("helvetica", "normal");
  doc.text("VAT (20%):", labelX, billY + rowSpacing * 4.5);
  doc.text(`£${vatAmount.toFixed(2)}`, rightColX, billY + rowSpacing * 4, { align: "right" });

  // Grand Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...colors.primaryDark);
  doc.text("Total Amount", labelX, billY + rowSpacing * 5.5); // reduced from 5.5 to 5
  doc.text(`£${grandTotal.toFixed(2)}`, rightColX, billY + rowSpacing * 5, { align: "right" });// Tiny footer


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