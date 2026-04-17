// lib/pdf-generator2.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface LongClaimPDFData {
  claimId: string;
  period: { starting_date: string | null; ending_date: string | null };
  claimCars: any[]; // CarItem[]
  claimantsByCar: Record<number, any[]>; // Claimant[]
  totalDelivery: number;
  dailyRates: Record<number, number>;
  hirer_name?: string;
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
  
  // Get the exact UTC timestamp for midnight on both dates
  const utcStart = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
  const utcEnd = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
  
  const diff = (utcEnd - utcStart) / (1000 * 60 * 60 * 24);
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
  const hirer_name = data.hirer_name || "";

  // ─── Header (white background) ───────────────────────────────────────────────
  const headerHeight = 26;
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // ─── Logo ─────────────────────────────────────────────────────────────────────
  try {
    const img = await fetch("/logo.png").then(res => res.blob());
    const imgData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(img);
    });
    doc.addImage(imgData, "JPEG", margin, 4, 70, 12);
  } catch (err) {
    console.warn("Logo failed", err);
  }

  // ─── Company info ─────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...colors.primaryDark);
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

  // ─── Invoice title ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...colors.primaryDark);
  doc.text("INVOICE", pageWidth / 2, 19, { align: "center" });

  // ─── Bill To (Sovereign only) + Total Duration ────────────────────────────────
  if (hirer_name && hirer_name.toLowerCase() === "sovereign") {
    doc.setFontSize(8);
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

    let y = headerHeight + 11;
    billTo.forEach(line => {
      doc.text(line, margin, y);
      y += 3.6;
    });

    // Add spacing after address
    y += 4;

    // ─── Total Duration ─ always show, regardless of hirer name
    const days = calculateDays(data.period.starting_date, data.period.ending_date);

    doc.setFontSize(8);
    doc.setTextColor(...colors.gray);
    const label = "Total Duration:";
    doc.text(label, margin, y);

    doc.setTextColor(...colors.darkText);
    const labelWidth = doc.getTextWidth(label);
    doc.text(`${days} days`, margin + labelWidth + 1, y); // 2.5 = nice small gap
  }
  // ─── Period, Generated, Invoice Number ────────────────────────────────────────
  const infoX = pageWidth - 65;
  const days = calculateDays(data.period.starting_date, data.period.ending_date); 

  doc.setFontSize(8);
  doc.setTextColor(...colors.gray);
  doc.text("Period:", infoX, headerHeight + 6);
  doc.setTextColor(...colors.darkText);
  doc.text(
    `${formatDate(data.period.starting_date)} – ${formatDate(data.period.ending_date)}`,
    infoX,
    headerHeight + 10
  );

  doc.setTextColor(...colors.gray);
  doc.text("Generated:", infoX, headerHeight + 16);
  doc.setTextColor(...colors.darkText);
  doc.text(new Date().toLocaleDateString("en-GB"), infoX, headerHeight + 20);

  doc.setTextColor(...colors.gray);
  doc.text("Invoice Number:", infoX, headerHeight + 26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.primaryDark);
  doc.text(data.claimId, infoX, headerHeight + 30);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.darkText);
  // ─── Main Table ───────────────────────────────────────────────────────────────
  // Extra space for the new "Total Duration" line
  const tableStartY = headerHeight + 48;

  const body: any[] = [];
  let sltCounter = 1;
  const formatSlt = (n: number) => `SLT${String(n).padStart(3, "0")}`;
  data.claimCars.forEach(car => {
    const claimants = data.claimantsByCar[car.id] || [];
    const dailyRate = data.dailyRates[car.id] || 0;
    const hireAmount = dailyRate * days;

    if (claimants.length === 0) {
      body.push([
        formatSlt(sltCounter++),         // ID
        "—",                             // Ref No
        "No claimants",                  // Claimant
        car.reg_no || "—",               // Reg
        car.name || "—",                 // Vehicle
        car.model || "—",                // Model
        `£${dailyRate.toFixed(2)}`,      // Daily Rate
        "—",                             // Dates
        "—",                             // Location
        "—",                             // Delivery
        `£${hireAmount.toFixed(2)}`,     // Hire Total
      ]);
    } else {
      claimants.forEach((cl: any, idx: number) => {
        body.push([
          cl.claimant_id || "—",                                         // ID
          cl.ref_no || "—",                                              // Ref No
          cl.name || "—",                                                // Claimant
          idx === 0 ? (car.reg_no || "—") : "",                          // Reg
          idx === 0 ? (car.name || "—") : "",                            // Vehicle
          idx === 0 ? (car.model || "—") : "",                           // Model
          idx === 0 ? `£${dailyRate.toFixed(2)}` : "",                   // Daily Rate
          `${formatDate(cl.start_date)} – ${formatDate(cl.end_date)}`,   // Dates
          cl.location || "—",                                            // Location
          `£${(cl.delivery_charges || 0).toFixed(2)}`,                   // Delivery
          idx === 0 ? `£${hireAmount.toFixed(2)}` : "",                  // Hire Total
        ]);
      });
    }
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [
      ["ID", "Your Ref No", "Claimant", "Reg", "Vehicle", "Model", "Daily Rate", "Dates", "Location", "Delivery £", "Hire Total £"]
    ],
    body,
    theme: "grid",
    styles: {
      fontSize: 5.5, // Smaller font size to prevent multi-line rows
      cellPadding: 1.2,
      lineColor: [215, 215, 215],
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: colors.primary,
      textColor: colors.white,
      fontSize: 6.0, // Reduced header font size
      fontStyle: "bold",
      cellPadding: 1.6,
    },
    alternateRowStyles: { fillColor: colors.lightBg },
    columnStyles: {
      0: { cellWidth: 11, halign: "center" }, // ID
      1: { cellWidth: 18 },                   // Ref No
      2: { cellWidth: 23 },                   // Claimant
      3: { cellWidth: 13 },                   // Reg
      4: { cellWidth: 15 },                   // Vehicle
      5: { cellWidth: 13 },                   // Model
      6: { cellWidth: 12, halign: "right" },  // Daily Rate
      7: { cellWidth: 38 },                   // Dates (Expanded to fit single line)
      8: { cellWidth: 23 },                   // Location
      9: { cellWidth: 12, halign: "right" },  // Delivery £
      10: { cellWidth: 14, halign: "right" }, // Hire Total
    },
    didParseCell(hookData) {
      if ([6, 9, 10].includes(hookData.column.index)) {
        hookData.cell.styles.halign = "right";
      }
      if (hookData.column.index === 0) {
        hookData.cell.styles.halign = "center";
      }
    },
    margin: { left: margin, right: margin },
    rowPageBreak: "avoid",
  });

  // ─── Billing Summary ──────────────────────────────────────────────────────────
  const tableEndY = (doc as any).lastAutoTable.finalY || 100;
  
  // Add this explanation note
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...colors.gray);
  doc.text(
    "* Hire amount = Daily rate × Total days in claim period",
    margin,
    tableEndY + 6
  );

  // Calculate totals 
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

  const carRowsHeight = 0; 
  const summaryStartY = billY + carRowsHeight + 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...colors.darkText);

  doc.text("Total Hire:", labelX, summaryStartY + rowSpacing * 0);
  doc.text(`£${totalHire.toFixed(2)}`, rightColX, summaryStartY + rowSpacing * 0, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text("Delivery charges:", labelX, summaryStartY + rowSpacing * 1);
  doc.text(`£${deliveryTotal.toFixed(2)}`, rightColX, summaryStartY + rowSpacing * 1, { align: "right" });

  // Separator before subtotal
  doc.setDrawColor(...colors.gray);
  doc.setLineWidth(0.4);
  doc.line(labelX - 2, summaryStartY + rowSpacing * 1.4, rightColX + 2, summaryStartY + rowSpacing * 1.4);

  doc.setFont("helvetica", "bold");
  doc.text("Subtotal:", labelX, summaryStartY + rowSpacing * 2.4);
  doc.text(`£${subTotal.toFixed(2)}`, rightColX, summaryStartY + rowSpacing * 2.4, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text("VAT (20%):", labelX, summaryStartY + rowSpacing * 3.4);
  doc.text(`£${vatAmount.toFixed(2)}`, rightColX, summaryStartY + rowSpacing * 3.4, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...colors.primaryDark);
  doc.text("Total Amount Due", labelX, summaryStartY + rowSpacing * 4.8);
  doc.text(`£${grandTotal.toFixed(2)}`, rightColX, summaryStartY + rowSpacing * 4.8, { align: "right" });

  return doc.output("arraybuffer") as any;
}