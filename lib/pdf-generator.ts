import jsPDF from "jspdf";
import { PDFDocument } from "pdf-lib";

export interface PDFFormData {
  title: string;
  subtitle?: string;
  formType:
    | "pre-inspection"
    | "cancellation"
    | "storage-recovery"
    | "rental-agreement"
    | "claim";
  claimId: string;
  data: Record<string, any>;
  signatures?: Record<string, string | null>;
  images?: Record<string, string | null>;
}

// Sexy color palette
const colors = {
  primary: [4, 120, 87] as [number, number, number], // Deep emerald
  primaryDark: [6, 95, 70] as [number, number, number], // Dark emerald
  secondary: [31, 41, 55] as [number, number, number], // Dark gray
  accent: [234, 179, 8] as [number, number, number], // Soft amber
  light: [209, 250, 229] as [number, number, number], // Mint tint
  white: [255, 255, 255] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  darkText: [17, 24, 39] as [number, number, number],
};

// Format date as "day month year" (e.g., "18 February 2026")
function formatDate(
  dateInput: string | number | Date | undefined | null,
): string {
  if (!dateInput) return "—";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generatePDF(formData: PDFFormData): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper functions
  const addGradientHeader = () => {
    const headerHeight = 35; // smaller height
    const gradientSteps = 30; // fewer steps for smaller header

    // Create gradient effect
    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / gradientSteps;
      const r = Math.round(
        colors.primary[0] + (colors.primaryDark[0] - colors.primary[0]) * ratio,
      );
      const g = Math.round(
        colors.primary[1] + (colors.primaryDark[1] - colors.primary[1]) * ratio,
      );
      const b = Math.round(
        colors.primary[2] + (colors.primaryDark[2] - colors.primary[2]) * ratio,
      );
      pdf.setFillColor(r, g, b);
      pdf.rect(0, i * 1.2, pageWidth, 1.2, "F"); // slightly thinner rectangles
    }

    // Left side: Company Name
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.addImage(
      "/logo.jpeg",
      "JPEG",
      10, // x
      10, // y
      80, // width
      15, // height
    );

    // Right side: Address & Website
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    const rightText = `Derby Turn, Building 1, Derby Road
BURTON UPON TRENT Staffordshire DE141RX
Website: www.gogreenhire.co.uk`;
    const rightX = pageWidth - 10; // right margin
    const lines = rightText.split("\n");
    lines.forEach((line, index) => {
      pdf.text(line, rightX, 12 + index * 4, { align: "right" });
    });

    // Document title (optional: centered below header)
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(formData.title.toUpperCase(), pageWidth / 2, headerHeight, {
      align: "center",
    });

    return headerHeight + 5; // space after header
  };

  const addSectionHeader = (title: string, y: number): number => {
    // Section background
    pdf.setFillColor(...colors.light);
    pdf.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, "F");

    // Left accent bar
    pdf.setFillColor(...colors.primary);
    pdf.rect(margin, y, 3, 10, "F");

    // Section title
    pdf.setTextColor(...colors.primaryDark);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, margin + 8, y + 7);

    return y + 15;
  };
  function addWrappedText(
    text: string,
    x: number,
    y: number,
    maxW: number,
    fontSize = 10,
  ): number {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxW);
    pdf.text(lines, x, y);
    return y + lines.length * (fontSize * 0.3528 + 2); // approx line height
  }
  const addField = (
    label: string,
    value: string | number | boolean,
    x: number,
    y: number,
    width: number,
  ): number => {
    // Label
    pdf.setTextColor(...colors.gray);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(label, x, y);

    // Value with underline effect
    pdf.setTextColor(...colors.darkText);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    const displayValue =
      value === true ? "Yes" : value === false ? "No" : String(value || "—");
    pdf.text(displayValue, x, y + 5);

    // Subtle underline
    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.3);
    pdf.line(x, y + 6.5, x + width - 5, y + 6.5);

    return y + 12;
  };
  const addCheckbox = (
    label: string,
    checked: boolean,
    x: number,
    y: number,
  ): void => {
    // Checkbox (smaller)
    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.4);
    pdf.rect(x, y - 2.2, 3, 3);

    if (checked) {
      pdf.setFillColor(...colors.primary);
      pdf.rect(x + 0.5, y - 1.7, 2, 2, "F");
    }

    // Label (slightly smaller + closer)
    pdf.setTextColor(...colors.darkText);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(label, x + 5, y);
  };
  const addSignature = async (
    label: string,
    signatureData: string | null,
    x: number,
    y: number,
    width: number,
  ): Promise<number> => {
    // Label
    pdf.setTextColor(...colors.gray);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(label, x, y);

    // Signature box
    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.5);
    pdf.setFillColor(...colors.white);
    pdf.roundedRect(x, y + 2, width, 25, 2, 2, "FD");

    if (signatureData) {
      try {
        pdf.addImage(signatureData, "PNG", x + 2, y + 4, width - 4, 21);
      } catch (e) {
        pdf.setTextColor(...colors.gray);
        pdf.setFontSize(10);
        pdf.text("[Signature on file]", x + width / 2, y + 15, {
          align: "center",
        });
      }
    }

    return y + 32;
  };

  const addImage = async (
    label: string,
    imageData: string | null,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<number> => {
    // Label
    pdf.setTextColor(...colors.gray);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text(label, x, y);

    // Image box with border
    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.5);
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(x, y + 3, width, height, 3, 3, "FD");

    if (imageData) {
      try {
        // Determine image format from data URL
        const format = imageData.includes("image/png") ? "PNG" : "JPEG";
        pdf.addImage(imageData, format, x + 2, y + 5, width - 4, height - 4);
      } catch (e) {
        pdf.setTextColor(...colors.gray);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "italic");
        pdf.text("[Image on file]", x + width / 2, y + height / 2 + 3, {
          align: "center",
        });
      }
    } else {
      pdf.setTextColor(...colors.gray);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "italic");
      pdf.text("[No image provided]", x + width / 2, y + height / 2 + 3, {
        align: "center",
      });
    }

    return y + height + 8;
  };

  const addFooter = (pageNum: number) => {
    const footerY = pageHeight - 15;

    // Footer line
    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.5);
    pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    // Company info
    pdf.setTextColor(...colors.gray);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      "Go Green Car Hire Ltd | Derby Turn, Building 1, Derby Road, Burton-On-Trent, DE14 1RX",
      margin,
      footerY,
    );

    // Page number
    pdf.setTextColor(...colors.primary);
    pdf.text(`Page ${pageNum}`, pageWidth - margin, footerY, {
      align: "right",
    });

    // Claim reference
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Ref: ${formData.claimId}`, pageWidth / 2, footerY, {
      align: "center",
    });
  };

  const checkNewPage = (currentY: number, neededSpace: number): number => {
    if (currentY + neededSpace > pageHeight - 25) {
      pdf.addPage();
      yPos = margin;
      return margin;
    }
    return currentY;
  };

  // Generate header
  yPos = addGradientHeader();

  pdf.setTextColor(...colors.gray);
  pdf.setFontSize(6.5); // smaller, subtle
  pdf.text(
    `Generated: ${formatDate(new Date())}`,
    margin, // left side
    yPos,
  );
  yPos += 4;

  // Generate content based on form type
  switch (formData.formType) {
    case "pre-inspection":
      yPos = await generatePreInspectionPDF(
        pdf,
        formData,
        yPos,
        margin,
        pageWidth,
        {
          addSectionHeader,
          addField,
          addCheckbox,
          addSignature,
          addImage,
          checkNewPage,
        },
      );
      break;
    case "cancellation":
      yPos = await generateCancellationPDF(
        pdf,
        formData,
        yPos,
        margin,
        pageWidth,
        {
          addSectionHeader,
          addField,
          addSignature,
          checkNewPage,
        },
      );
      break;
    case "storage-recovery":
      yPos = await generateStoragePDF(pdf, formData, yPos, margin, pageWidth, {
        addSectionHeader,
        addField,
        addSignature,
        checkNewPage,
      });
      break;
    case "rental-agreement":
      yPos = await generateRentalPDF(pdf, formData, yPos, margin, pageWidth, {
        addSectionHeader,
        addField,
        addSignature,
        checkNewPage,
        addWrappedText,
      });
      break;
    case "claim":
      yPos = await generateClaimPDF(pdf, formData, yPos, margin, pageWidth, {
        addSectionHeader,
        addField,
        addCheckbox,
        addSignature,
        addImage,
        checkNewPage,
      });
      break;
  }

  // ────────────────────────────────────────────────
  //    Append terms.pdf ONLY for rental agreement
  // ────────────────────────────────────────────────
  if (formData.formType === "rental-agreement") {
    try {
      // Fetch the static terms PDF from public folder
      const termsResponse = await fetch("/terms.pdf");
      if (!termsResponse.ok) {
        console.warn("Could not load /terms.pdf – skipping append");
      } else {
        const termsArrayBuffer = await termsResponse.arrayBuffer();
        const termsPdfDoc = await PDFDocument.load(termsArrayBuffer);

        // Convert your current jsPDF document → Uint8Array
        const mainPdfBytes = pdf.output("arraybuffer");
        const mainPdfDoc = await PDFDocument.load(mainPdfBytes);

        // Copy all pages from terms.pdf into the main document
        const copiedPages = await mainPdfDoc.copyPages(
          termsPdfDoc,
          termsPdfDoc.getPageIndices(),
        );

        copiedPages.forEach((page) => {
          mainPdfDoc.addPage(page);
        });

        // Now generate final blob from the merged pdf-lib document
        const finalPdfBytes = await mainPdfDoc.save();
        return new Blob([finalPdfBytes], { type: "application/pdf" });
      }
    } catch (err) {
      console.error("Failed to append terms.pdf:", err);
      // → continue with original document (fail gracefully)
    }
  }

  // Normal output if no terms appended (or failed)
  return pdf.output("blob");
}

// Pre-Inspection PDF Generator
async function generatePreInspectionPDF(
  pdf: jsPDF,
  formData: PDFFormData,
  yPos: number,
  margin: number,
  pageWidth: number,
  helpers: any,
): Promise<number> {
  const { addSectionHeader, addField, checkNewPage, addSignature, addImage } =
    helpers;
  const data = formData.data;
  const colWidth = (pageWidth - margin * 2) / 4;

  // Basic Info Section
  yPos = addSectionHeader("VEHICLE & CUSTOMER INFORMATION", yPos);
  yPos = checkNewPage(yPos, 30);

  const basicFields = [
    { label: "Date", value: formatDate(data.date) },
    { label: "Customer", value: data.customer },
    { label: "Detailer", value: data.detailer },
    { label: "Car Reg", value: data.order_number },
  ];

  let xPos = margin;
  basicFields.forEach((field, i) => {
    addField(field.label, field.value, xPos, yPos, colWidth);
    xPos += colWidth;
  });
  yPos += 15;

  // Vehicle Info
  xPos = margin;
  const vehicleFields = [
    { label: "Year", value: data.year },
    { label: "Make", value: data.make },
    { label: "Model", value: data.model },
  ];
  vehicleFields.forEach((field) => {
    addField(field.label, field.value, xPos, yPos, colWidth);
    xPos += colWidth;
  });
  yPos += 20;

  // Checklist Items
  yPos = checkNewPage(yPos, 20);
  yPos = addSectionHeader("CONDITION CHECKLIST", yPos);

  const checklistItems = [
    "Deep Scratches",
    "Light Scratches",
    "Swirls / Holograms",
    "Clear Coat Failure",
    "Paint Chips",
    "Paint Oxidation",
    "Dents / Dings",
    "Body Rust",
    "Bumper Damage",
    "Wheel Damage",
    "Cracked Windshield",
    "Trunk Damage",
    "Ripped / Torn Flooring",
    "Ripped / Torn Seating",
    "Windshield Scratches / Chips",
    "Emblem Damaged / Missing",
    "Decal Damaged / Missing",
    "Cracked Headlight / Tail Light",
    "Fogged Headlight / Tail Light",
    "Tire Pressure",
    "Waterspot Density",
    "Floor Cleanliness",
    "Seat Cleanliness",
    "Glass Cleanliness",
    "Engine Bay Cleanliness",
    "Interior Cleanliness",
    "Exterior Cleanliness",
    "Dash / Console Cleanliness",
    "Interior Odour",
    "Pet Hair",
  ];

  const conditionColors: Record<string, [number, number, number]> = {
    Good: [16, 185, 129],
    Moderate: [245, 158, 11],
    Poor: [239, 68, 68],
  };

  // Create a table for checklist
  const tableWidth = pageWidth - margin * 2;
  const col1 = tableWidth * 0.5;
  const col2 = (tableWidth * 0.5) / 3;

  // Table header
  pdf.setFillColor(...colors.primaryDark);
  pdf.rect(margin, yPos, tableWidth, 8, "F");
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("Item", margin + 3, yPos + 5.5);
  pdf.text("Good", margin + col1 + 5, yPos + 5.5);
  pdf.text("Moderate", margin + col1 + col2 + 5, yPos + 5.5);
  pdf.text("Poor", margin + col1 + col2 * 2 + 5, yPos + 5.5);
  yPos += 10;

  checklistItems.forEach((item, i) => {
    yPos = checkNewPage(yPos, 8);

    const condition = data[`condition_${i + 1}`];
    const rowColor: [number, number, number] =
      i % 2 === 0 ? [255, 255, 255] : [249, 250, 251];

    pdf.setFillColor(...rowColor);
    pdf.rect(margin, yPos - 1, tableWidth, 7, "F");

    pdf.setTextColor(...colors.darkText);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${i + 1}. ${item}`, margin + 3, yPos + 4);

    // Condition indicators
    ["Good", "Moderate", "Poor"].forEach((cond, j) => {
      const xOffset = margin + col1 + col2 * j + 8;
      if (condition === cond) {
        pdf.setFillColor(...conditionColors[cond]);
        pdf.circle(xOffset, yPos + 3, 2, "F");
      } else {
        pdf.setDrawColor(...colors.gray);
        pdf.setLineWidth(0.3);
        pdf.circle(xOffset, yPos + 3, 2, "S");
      }
    });

    yPos += 7;
  });

  yPos += 10;

  // Notes & Recommendations
  yPos = checkNewPage(yPos, 40);
  yPos = addSectionHeader("NOTES & RECOMMENDATIONS", yPos);

  const notesWidth = (pageWidth - margin * 2 - 5) / 2;

  // Notes box
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin, yPos, notesWidth, 30, 2, 2, "F");
  pdf.setTextColor(...colors.gray);
  pdf.setFontSize(8);
  pdf.text("Notes:", margin + 3, yPos + 5);
  pdf.setTextColor(...colors.darkText);
  pdf.setFontSize(9);
  const notesLines = pdf.splitTextToSize(data.notes || "—", notesWidth - 6);
  pdf.text(notesLines, margin + 3, yPos + 10);

  // Recommendations box
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin + notesWidth + 5, yPos, notesWidth, 30, 2, 2, "F");
  pdf.setTextColor(...colors.gray);
  pdf.setFontSize(8);
  pdf.text("Recommendations:", margin + notesWidth + 8, yPos + 5);
  pdf.setTextColor(...colors.darkText);
  pdf.setFontSize(9);
  const recLines = pdf.splitTextToSize(
    data.recommendations || "—",
    notesWidth - 6,
  );
  pdf.text(recLines, margin + notesWidth + 8, yPos + 10);

  yPos += 40;

  // Vehicle Image (if exists)
  if (formData.images?.annotated_vehicle_image) {
    yPos = checkNewPage(yPos, 100);
    yPos = addSectionHeader("VEHICLE CONDITION IMAGE", yPos);
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = 80;
    yPos = await addImage(
      "Annotated Vehicle Image",
      formData.images.annotated_vehicle_image,
      margin,
      yPos,
      imageWidth,
      imageHeight,
    );
  }

  // Signatures
  yPos = checkNewPage(yPos, 45);
  yPos = addSectionHeader("SIGNATURES", yPos);

  const sigWidth = (pageWidth - margin * 2 - 10) / 2;
  yPos = await addSignature(
    "Customer Signature",
    formData.signatures?.customer || null,
    margin,
    yPos,
    sigWidth,
  );
  await addSignature(
    "Detailer Signature",
    formData.signatures?.detailer || null,
    margin + sigWidth + 10,
    yPos - 32,
    sigWidth,
  );

  return yPos;
}

// Cancellation Notice PDF Generator
async function generateCancellationPDF(
  pdf: jsPDF,
  formData: PDFFormData,
  yPos: number,
  margin: number,
  pageWidth: number,
  helpers: any,
): Promise<number> {
  const { addSectionHeader, addField, addSignature, checkNewPage } = helpers;
  const data = formData.data;

  // Recipient section
  yPos = addSectionHeader("TO: GO GREEN CAR HIRE LTD", yPos);

  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 35, 2, 2, "F");
  pdf.setTextColor(...colors.darkText);
  pdf.setFontSize(10);
  pdf.text(
    [
      "Derby Turn, Building 1",
      "Derby Road",
      "Burton-On-Trent",
      "United Kingdom",
      "DE14 1RX",
    ],
    margin + 5,
    yPos + 8,
  );
  yPos += 42;

  // Cancellation Statement
  yPos = checkNewPage(yPos, 40);
  yPos = addSectionHeader("CANCELLATION STATEMENT", yPos);

  pdf.setFillColor(...colors.light);
  pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 2, 2, "F");
  pdf.setTextColor(...colors.darkText);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const statement = `I, ${data.name || "________"}, hereby give notice that I wish to cancel my contract in respect of the storage and the hire agreement entered on.`;
  const statementLines = pdf.splitTextToSize(
    statement,
    pageWidth - margin * 2 - 10,
  );
  pdf.text(statementLines, margin + 5, yPos + 8);
  yPos += 32;

  // Personal Details
  yPos = checkNewPage(yPos, 50);
  yPos = addSectionHeader("PERSONAL DETAILS", yPos);

  const colWidth = (pageWidth - margin * 2) / 2;
  addField("Name", data.name, margin, yPos, colWidth);
  addField("Email", data.email, margin + colWidth, yPos, colWidth);
  yPos += 15;
  addField("Address", data.address, margin, yPos, colWidth);
  addField("Postcode", data.postcode, margin + colWidth, yPos, colWidth);
  yPos += 15;
  addField(
    "Cancellation Date",
    formatDate(data.cancellation_date),
    margin,
    yPos,
    colWidth,
  );
  yPos += 25;

  // Signature
  yPos = addSectionHeader("SIGNATURE", yPos);
  yPos = await addSignature(
    "Client Signature",
    formData.signatures?.cancellation_signature || null,
    margin,
    yPos,
    pageWidth - margin * 2,
  );

  return yPos;
}

// Storage & Recovery PDF Generator
async function generateStoragePDF(
  pdf: jsPDF,
  formData: PDFFormData,
  yPos: number,
  margin: number,
  pageWidth: number,
  helpers: any,
): Promise<number> {
  const { addSectionHeader, addField, addSignature, checkNewPage } = helpers;
  const data = formData.data;
  const colWidth = (pageWidth - margin * 2) / 3;

  // Client Details
  yPos = addSectionHeader("CLIENT DETAILS", yPos);
  addField("Name", data.name, margin, yPos, colWidth);
  addField("Postcode", data.postcode, margin + colWidth, yPos, colWidth);
  yPos += 15;
  addField("Address Line 1", data.address1, margin, yPos, colWidth * 1.5);
  addField(
    "Address Line 2",
    data.address2,
    margin + colWidth * 1.5,
    yPos,
    colWidth * 1.5,
  );
  yPos += 20;

  // Vehicle Information
  yPos = checkNewPage(yPos, 30);
  yPos = addSectionHeader("VEHICLE INFORMATION", yPos);
  addField("Make", data.vehicle_make, margin, yPos, colWidth);
  addField("Model", data.vehicle_model, margin + colWidth, yPos, colWidth);
  addField(
    "Registration",
    data.registration_number,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 20;

  // Recovery & Storage Details
  yPos = checkNewPage(yPos, 50);
  yPos = addSectionHeader("RECOVERY & STORAGE DETAILS", yPos);
  addField(
    "Date of Recovery",
    formatDate(data.date_of_recovery),
    margin,
    yPos,
    colWidth,
  );
  addField(
    "Storage Start",
    formatDate(data.storage_start_date),
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Storage End",
    formatDate(data.storage_end_date),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 15;
  addField("Number of Days", data.number_of_days, margin, yPos, colWidth);
  addField(
    "Charges Per Day",
    `£${data.charges_per_day || "0.00"}`,
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Total Storage",
    `£${data.total_storage_charge || "0.00"}`,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 20;

  // Invoice Summary
  yPos = checkNewPage(yPos, 60);
  yPos = addSectionHeader("INVOICE SUMMARY", yPos);

  // Invoice table
  const tableData = [
    ["Description", "Amount"],
    ["Recovery Charge", `£${data.recovery_charge || "0.00"}`],
    ["Total Storage Charge", `£${data.total_storage_charge || "0.00"}`],
    ["Subtotal", `£${data.subtotal || "0.00"}`],
    ["VAT (20%)", `£${data.vat_amount || "0.00"}`],
  ];

  let tableY = yPos;
  const tableWidth = pageWidth - margin * 2;

  tableData.forEach((row, i) => {
    const isHeader = i === 0;
    const bgColor: [number, number, number] = isHeader
      ? colors.primaryDark
      : i % 2 === 0
        ? [249, 250, 251]
        : [255, 255, 255];

    pdf.setFillColor(...bgColor);
    pdf.rect(margin, tableY, tableWidth, 8, "F");

    pdf.setTextColor(...(isHeader ? colors.white : colors.darkText));
    pdf.setFontSize(9);
    pdf.setFont("helvetica", isHeader ? "bold" : "normal");
    pdf.text(row[0], margin + 5, tableY + 5.5);
    pdf.text(row[1], pageWidth - margin - 5, tableY + 5.5, { align: "right" });

    tableY += 8;
  });

  // Total row
  pdf.setFillColor(...colors.primary);
  pdf.rect(margin, tableY, tableWidth, 10, "F");
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("INVOICE TOTAL", margin + 5, tableY + 7);
  pdf.text(
    `£${data.invoice_total || "0.00"}`,
    pageWidth - margin - 5,
    tableY + 7,
    { align: "right" },
  );

  yPos = tableY + 20;

  // Deferred Payment & Cancellation Terms
  yPos = checkNewPage(yPos, 80); // make sure enough space
  yPos = addSectionHeader("DEFERRED PAYMENT & CANCELLATION TERMS", yPos);

  // Terms content
  const termsText = `
I understand the recovery and storage costs are on a deferred payment basis and will be due and owing from me on completion of storage and that invoices are payable by me to Go Green Car Hire Ltd in no more than one instalment beginning from the date of this agreement within a period of no more than 51 weeks beginning from the date of this agreement.

It is my contractual obligation to pay the outstanding charges as provided by the deferred payment provision.

I further understand that if I fail to co-operate in the pursuit of my claim for damages or appoint other solicitors to act on my behalf, then I understand and agree that the account for recovery and storage will be immediately due and payable by me to Go Green Car Hire Ltd.

This contract constitutes all terms and conditions under this agreement.

You have the right to cancel this agreement within 14 days starting from the date signed on this agreement. Written cancellation notice must be sent within 14 days either by post or email to the address stated above. I understand that any charges incurred will be liable to immediate payment by me.
`;

  // Split into lines for PDF
  const termsLines = pdf.splitTextToSize(termsText, pageWidth - margin * 2);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...colors.darkText);

  termsLines.forEach((line) => {
    pdf.text(line, margin, yPos);
    yPos += 5; // line height
  });

  yPos += 10; // extra spacing before signatures

  // Signatures
  yPos = checkNewPage(yPos, 45);
  yPos = addSectionHeader("SIGNATURES", yPos);

  const sigWidth = (pageWidth - margin * 2 - 10) / 2;
  yPos = await addSignature(
    "Client Signature",
    formData.signatures?.client_signature || null,
    margin,
    yPos,
    sigWidth,
  );
  await addSignature(
    "Owner Signature",
    formData.signatures?.owner_signature || null,
    margin + sigWidth + 10,
    yPos - 32,
    sigWidth,
  );
  yPos = checkNewPage(yPos, 40);
  yPos = addSectionHeader("STORAGE LOCATION", yPos);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...colors.darkText);

  const storageText = [
    "LITTLE BURTON EAST",
    "Burton-on-Trent, Staffordshire",
    "DE14 1PS",
  ];

  storageText.forEach((line, i) => {
    const lineY = yPos + i * 7;
    pdf.text(line, margin + 5, lineY, { align: "left" });
  });

  yPos += storageText.length * 7 + 12; // line spacing + extra gap after section

  return yPos;
}

// Compact Rental Agreement PDF Generator
// Compact Rental Agreement PDF Generator
async function generateRentalPDF(
  pdf,
  formData,
  initialY = 15,
  margin = 12,
  pageWidth,
  helpers,
) {
  const {
    addSectionHeader,
    addField,
    addSignature,
    checkNewPage,
    addWrappedText,
  } = helpers;
  const data = formData.data ?? {};
  const sigs = formData.signatures ?? {};
  let y = initialY;
  const fullWidth = pageWidth - margin * 2;
  const col3 = fullWidth / 3;
  const col4 = fullWidth / 4;
  const half = fullWidth / 2;

  // Helper function to format dates
  const formatDate = (date) => {
    return date ? new Date(date).toLocaleDateString() : "—";
  };

  // ─── Header ───────────────────────────────────────

  // Save the starting Y for right-side block
  const headerStartY = y;

  pdf.setFontSize(6.5);
  pdf.setTextColor(107, 114, 128);
  pdf.text(`Claim ID: ${formData.claimId || "—"}`, margin, y);

  y += 4;
  pdf.text(`Invoice ID: ${formData.claimId || "—"}`, margin, y);

  // 👉 RIGHT SIDE ADDRESS (only if claimId starts with "S")
  if (formData.claimId && formData.claimId.startsWith("S")) {
    const rightX = pageWidth - margin;
    let rightY = headerStartY;

    pdf.setFontSize(5.5);
    pdf.setTextColor(0, 0, 0);

    const addressLines = [
      "To : Sovereign Automotive, 1st Floor, The Kirkgate",
      "19 - 33 Church Street, Epsom, Surrey",
      "KT17 APF",
    ];

    addressLines.forEach((line) => {
      pdf.text(line, rightX, rightY, { align: "right" });
      rightY += 3.5;
    });
  }

  y += 4;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;
  // ─── 1. Hirer's Details + 9. Hire Vehicle (MERGED SIDE BY SIDE) ───────────
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("1. Hirer's Details", margin, y);
  pdf.text("2. Hire Vehicle", margin + half + 8, y);
  y += 4;

  // LEFT COLUMN - Hirer Details
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);

  // Title & Name
  pdf.setTextColor(80, 80, 80);
  pdf.text("Title", margin, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.title || "—", margin + 25, y);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Hirer's Name", margin, y + 3.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.hirer_name || "—", margin + 25, y + 3.5);

  // RIGHT COLUMN - Hire Vehicle
  pdf.setTextColor(80, 80, 80);
  pdf.text("Reg", margin + half + 8, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.hire_vehicle_reg || "—", margin + half + 30, y);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Make", margin + half + 65, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.hire_vehicle_make || "—", margin + half + 80, y);

  pdf.setTextColor(80, 80, 80);
  pdf.text("Model", margin + half + 8, y + 3.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.hire_vehicle_model || "—", margin + half + 30, y + 3.5);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Group", margin + half + 65, y + 3.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.hire_vehicle_group || "—", margin + half + 80, y + 3.5);

  y += 9;

  // LEFT - Permanent Address
  pdf.setTextColor(80, 80, 80);
  pdf.text("Permanent Address:", margin, y);
  y += 3;
  pdf.setFontSize(6);
  pdf.setTextColor(0, 0, 0);
  const addrLines = pdf.splitTextToSize(
    data.permanent_address || "—",
    half - 12,
  );
  pdf.text(addrLines, margin + 2, y);
  const addrHeight = addrLines.length * 3;

  // RIGHT - Dates & Fuel
  pdf.setFontSize(6.5);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Date Out", margin + half + 8, y - 3);
  pdf.setTextColor(0, 0, 0);
  pdf.text(formatDate(data.hire_vehicle_date_out), margin + half + 30, y - 3);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Date In", margin + half + 65, y - 3);
  pdf.setTextColor(0, 0, 0);
  pdf.text(formatDate(data.hire_vehicle_date_in), margin + half + 80, y - 3);

  pdf.setTextColor(80, 80, 80);
  pdf.text("Fuel Out", margin + half + 8, y + 1);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.hire_vehicle_fuel_out || "—", margin + half + 30, y + 1);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Fuel In", margin + half + 65, y + 1);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.hire_vehicle_fuel_in || "—", margin + half + 80, y + 1);

  y += Math.max(addrHeight, 6) + 4;

  // ─── Separator ────────────────────────────────────────
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── 2. Additional Driver (conditional) ────────────

  y = checkNewPage(y, 20);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("3. Driver's Details", margin, y);
  y += 3.5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);

  pdf.setTextColor(80, 80, 80);
  pdf.text("Licence No", margin, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.new_licence_no || "—", margin + 25, y);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Date Issued", margin + col3, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(formatDate(data.new_date_issued), margin + col3 + 25, y);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Expiry Date", margin + col3 * 2, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(formatDate(data.new_expiry_date), margin + col3 * 2 + 25, y);
  y += 3.5;

  pdf.setTextColor(80, 80, 80);
  pdf.text("DOB", margin, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(formatDate(data.new_dob), margin + 25, y);

  y += 5;

  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  const hasAdditionalDriver = !!(
    data.additional_driver_name?.trim() ||
    data.licence_no?.trim() ||
    data.date_issued?.trim() ||
    data.expiry_date?.trim() ||
    data.dob?.trim() ||
    data.date_test_passed?.trim() ||
    data.occupation?.trim()
  );

  y = checkNewPage(y, 20);

  // ---- Section 4 Heading (ALWAYS SHOWN)
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("4. Additional Driver's Details", margin, y);
  y += 4;

  if (!hasAdditionalDriver) {
    // ---- No Additional Driver Text
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(120, 120, 120);
    pdf.text("No additional driver", margin, y);
    y += 6;
  } else {
    // ---- Full Details (Only when data exists)
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Name", margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.additional_driver_name || "—", margin + 25, y);
    y += 3.5;

    pdf.setTextColor(80, 80, 80);
    pdf.text("Licence No", margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.licence_no || "—", margin + 25, y);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Date Issued", margin + col3, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(formatDate(data.date_issued), margin + col3 + 25, y);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Expiry Date", margin + col3 * 2, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(formatDate(data.expiry_date), margin + col3 * 2 + 25, y);
    y += 3.5;

    pdf.setTextColor(80, 80, 80);
    pdf.text("DOB", margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(formatDate(data.dob), margin + 25, y);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Occupation", margin + col3 * 2, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.occupation || "—", margin + col3 * 2 + 25, y);
    y += 5;
  }

  // ---- Divider Line (Always)
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── 3. Hire Agreement Terms ───────────────────────
  y = checkNewPage(y, 20);
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.text("5. Hire Agreement Terms", margin, y);
  y += 3.5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Daily Rate", margin, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.daily_rate || "—", margin + 30, y);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Policy Excess", margin + half, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.policy_excess || "—", margin + half + 30, y);
  y += 3.5;

  pdf.setTextColor(80, 80, 80);
  pdf.text("Deposit", margin, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.deposit || "—", margin + 30, y);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Refuelling Charge", margin + half, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.refuelling_charge || "—", margin + half + 30, y);
  y += 5;

  if (sigs.hirer_signature_terms) {
    const sigY = y;
    y = await addSignature(
      "Hirer (Terms)",
      sigs.hirer_signature_terms,
      margin,
      y,
      half - 10,
    );
    if (sigs.company_signature) {
      await addSignature(
        "For and on behalf of Go Green Car Hire Ltd",
        sigs.company_signature,
        margin + half,
        sigY,
        half - 10,
      );
    }
  }
  y += 4;

  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── 4. Hirer's Own Insurance (conditional) ────────
  const hasOwnInsurance = !!(
    data.insurance_company?.trim() ||
    data.policy_no?.trim() ||
    data.insurance_dates?.trim() ||
    (data.own_insurance_confirm?.trim() &&
      data.own_insurance_confirm.trim().toLowerCase() !== "no") ||
    sigs.hirer_signature_insurance ||
    data.insurance_date?.trim() ||
    data.insurance_time?.trim()
  );

  y = checkNewPage(y, 25);

  // ---- Section 6 Heading (ALWAYS)
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("6. Hirer's Own Insurance (if applicable)", margin, y);
  y += 4;

  if (!hasOwnInsurance) {
    // ---- No Own Insurance Text
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(120, 120, 120);
    pdf.text("No own insurance provided", margin, y);
    y += 6;
  } else {
    // ---- Insurance Details
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Insurance Company", margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.insurance_company || "—", margin + 40, y);
    y += 3.5;

    pdf.setTextColor(80, 80, 80);
    pdf.text("Policy No", margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.policy_no || "—", margin + 40, y);
    y += 3.5;

    pdf.setTextColor(80, 80, 80);
    pdf.text("Start & Expiry", margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.insurance_dates || "—", margin + 40, y);
    y += 3.5;

    pdf.setTextColor(0, 0, 0);
    pdf.text(
      `Covered by own insurance: ${data.own_insurance_confirm || "No"}`,
      margin,
      y,
    );
    y += 5;

    if (sigs.hirer_signature_insurance) {
      y = await addSignature(
        "Hirer (Insurance)",
        sigs.hirer_signature_insurance,
        margin,
        y,
        half,
      );
    }

    pdf.setTextColor(80, 80, 80);
    pdf.text("Date", pageWidth - margin - 40, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(formatDate(data.insurance_date), pageWidth - margin - 25, y);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Time", margin + 50, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.insurance_time || "—", margin + 65, y);
    y += 5;
  }

  // ---- Divider (ALWAYS)
  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── 5. Insurance Proposal + 6. Medical (MERGED SIDE BY SIDE) ───────
  y = checkNewPage(y, 30);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("7. Insurance Proposal", margin, y);
  pdf.text("8. Medical Declaration", margin + half + 8, y);
  y += 4;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);

  // LEFT - Insurance Proposal
  const proposalQ = [
    ["Motoring offence (3yrs)?", data.motoring_offence_3yrs],
    ["Disqualified (5yrs)?", data.disqualified_5yrs],
    ["Accident/loss (3yrs)?", data.accident_3yrs],
    ["Insurance declined (5yrs)?", data.insurance_declined_5yrs],
    ["Dishonesty conviction?", data.dishonesty_conviction],
  ];

  const leftY = y;
  proposalQ.forEach(([label, val]) => {
    pdf.setTextColor(0, 0, 0);
    pdf.text(`• ${label}`, margin, y);
    pdf.text(val || "—", margin + 50, y);
    y += 3;
  });

  // RIGHT - Medical
  let rightY = leftY;
  pdf.setTextColor(0, 0, 0);
  const med1 = pdf.splitTextToSize(
    `Diabetes, fits, heart condition: ${data.medical_condition1 || "—"}`,
    half - 12,
  );
  pdf.text(med1, margin + half + 8, rightY);
  rightY += med1.length * 3 + 1.5;

  const med2 = pdf.splitTextToSize(
    `Other condition impairing driving: ${data.medical_condition2 || "—"}`,
    half - 12,
  );
  pdf.text(med2, margin + half + 8, rightY);
  rightY += med2.length * 3 + 1.5;

  if (data.medical_details?.trim()) {
    pdf.setTextColor(80, 80, 80);
    pdf.text("Details:", margin + half + 8, rightY);
    rightY += 2.5;
    pdf.setTextColor(0, 0, 0);
    const medDetails = pdf.splitTextToSize(data.medical_details, half - 12);
    pdf.text(medDetails, margin + half + 10, rightY);
    rightY += medDetails.length * 2.5;
  }

  y = Math.max(y, rightY) + 4;

  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── 7. Additional Driver Authorization ────────────
  y = checkNewPage(y, 10);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("9. Additional Driver Authorization", margin, y);
  y += 3.5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.text(
    `Will any other person drive? ${data.additional_driver_auth || "—"}`,
    margin,
    y,
  );
  y += 5;

  // ─── VERY IMPORTANT Disclosure ─────────────────────
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(0, 100, 0);
  pdf.text("VERY IMPORTANT:", margin, y);
  y += 3.5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.5);
  pdf.setTextColor(0, 0, 0);
  const importantText =
    "You are reminded of the need to disclose any fact which the insurers would take into account in the assessment and acceptance of the proposal. If you have any doubt as to whether certain facts are relevant, please contact the self drive hire operator. It is an offence under the Road Traffic Acts to make a false statement or withhold any material information for the purpose of obtaining motor insurance.";
  const importantLines = pdf.splitTextToSize(importantText, fullWidth);
  pdf.text(importantLines, margin, y);
  y += importantLines.length * 2.5 + 3;

  // ─── 1984 Data Protection Act ──────────────────────
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(0, 100, 0);
  pdf.text("1984 Data Protection Act", margin, y);
  y += 3.5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.5);
  pdf.setTextColor(0, 0, 0);
  const dataProtectionText =
    "Insurers maintain a motor insurance anti-fraud and theft register. In line with the 1984 Data Protection Act's first data protection principle, which is concerned with the obtaining of information, we wish to advise you that insurance companies exchange information with each other to detect fraudulent claims.";
  const dpLines = pdf.splitTextToSize(dataProtectionText, fullWidth);
  pdf.text(dpLines, margin, y);
  y += dpLines.length * 2.5 + 4;

  // ─── 8. Declaration ────────────────────────────────
  y = checkNewPage(y, 25);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("10. Declaration", margin, y);
  y += 3.5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.5);
  const declarationText =
    "I declare that all statements and particulars given by me in this proposal, which I have read over, are correct, and no material fact has been omitted, mis-represented or mis-stated. I am not aware of any other circumstances likely to affect the risk. I understand that I shall not allow the vehicle to be driven by any person not authorised by the underwriter to drive the vehicle during the period of hire.";
  const declLines = pdf.splitTextToSize(declarationText, fullWidth);
  pdf.text(declLines, margin, y);
  y += declLines.length * 2.5 + 2;

  pdf.setFontSize(6.5);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Date", pageWidth - margin - 40, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(formatDate(data.declaration_date), pageWidth - margin - 25, y);
  y += 3.5;

  if (sigs.declaration_signature) {
    y = await addSignature(
      "Hirer – Declaration",
      sigs.declaration_signature,
      margin,
      y,
      fullWidth,
    );
  }
  y += 4;

  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  const hasChangeVehicle = !!(
    data.change_vehicle_reg?.trim() ||
    data.change_vehicle_make?.trim() ||
    data.change_vehicle_model?.trim() ||
    data.change_vehicle_group?.trim()
  );

  y = checkNewPage(y, 15);

  // ---- Section 11 Heading (ALWAYS)
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("11. Change of Hire Vehicle", margin, y);
  y += 4;

  if (!hasChangeVehicle) {
    // ---- No Change Text
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(120, 120, 120);
    pdf.text("No change of hire vehicle", margin, y);
    y += 6;
  } else {
    // ---- Vehicle Change Details
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Reg", margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.change_vehicle_reg || "—", margin + 20, y);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Make", margin + col4, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.change_vehicle_make || "—", margin + col4 + 20, y);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Model", margin + col4 * 2, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.change_vehicle_model || "—", margin + col4 * 2 + 20, y);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Group", margin + col4 * 3, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.change_vehicle_group || "—", margin + col4 * 3 + 20, y);

    y += 5;
  }

  // ─── 11. Charges Summary ───────────────────────────
  y = checkNewPage(y, 35);
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.text("12. Charges Summary", margin, y);
  y += 3.5;

  const chargesRows = [
    ["Admin Fee", `£${Number(data.admin_fee || 0).toFixed(2)}`],
    ["Delivery Charge", `£${Number(data.delivery_charge || 0).toFixed(2)}`],
    ["CDW Per Day", `£${Number(data.cdw_per_day || 0).toFixed(2)}`],
    [
      "Total Days",
      data.total_days !== undefined ? String(data.total_days) : "—",
    ],
    ["Rate per Day", `£${Number(data.rate_per_day || 0).toFixed(2)}`],
    ["Refuelling Total", `£${Number(data.refuelling_total || 0).toFixed(2)}`],
    ["Subtotal", `£${Number(data.subtotal || 0).toFixed(2)}`],
    ["VAT (20%)", `£${Number(data.vat || 0).toFixed(2)}`],
    ["TOTAL COST", `£${Number(data.total_cost || 0).toFixed(2)}`],
  ];

  let ty = y;
  pdf.setFont("helvetica", "normal");
  chargesRows.forEach((row, i) => {
    const isTotal = i === chargesRows.length - 1;
    pdf.setFillColor(
      isTotal ? 34 : i % 2 === 0 ? 245 : 255,
      isTotal ? 197 : i % 2 === 0 ? 245 : 255,
      isTotal ? 94 : i % 2 === 0 ? 245 : 255,
    );
    pdf.rect(margin, ty, fullWidth, 5, "F");
    pdf.setTextColor(isTotal ? 255 : 0, isTotal ? 255 : 0, isTotal ? 255 : 0);
    pdf.setFont("helvetica", isTotal ? "bold" : "normal");
    pdf.setFontSize(isTotal ? 7 : 6.5);
    pdf.text(row[0], margin + 4, ty + 3.5);
    pdf.text(row[1], pageWidth - margin - 4, ty + 3.5, { align: "right" });
    ty += 5;
  });
  y = ty + 4;

  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── Parking Fines & Congestion Charges ────────────
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("Parking Fines & Congestion Charges", margin, y);
  y += 3.5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.5);
  const parkingText =
    "To cover administration costs a surcharge of £30 will be made for parking tickets left unpaid in addition to the amount of the fine.";
  const parkingLines = pdf.splitTextToSize(parkingText, fullWidth);
  pdf.text(parkingLines, margin, y);
  y += parkingLines.length * 2.5 + 2;

  const congestionText =
    "The hirer accepts full responsibility to pay any congestion charge upon demand together with an administration fee of £30 and any other associated costs/charges or penalties which may arise therefrom.";
  const congestionLines = pdf.splitTextToSize(congestionText, fullWidth);
  pdf.text(congestionLines, margin, y);
  y += congestionLines.length * 2.5 + 4;

  // ─── 12. Statement of Liability ────────────────────
  y = checkNewPage(y, 20);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("13. Statement of Liability", margin, y);
  y += 3.5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Date", pageWidth - margin - 40, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.liability_date || "—", pageWidth - margin - 25, y);
  y += 3;

  pdf.setFontSize(5.5);
  const liabilityText =
    "I acknowledge that during the currency of this rental agreement for the purpose of s86 of the Road Traffic Offenders Act 1986 and schedule 6 Road Traffic Act 1991 (as amended or replaced by any new legislation) I will be liable as the owner of the vehicle hired in respect of any fixed penalty offence or parking charge incurred in respect of the vehicle.";
  const liabilityLines = pdf.splitTextToSize(liabilityText, fullWidth);
  pdf.text(liabilityLines, margin, y);
  y += liabilityLines.length * 2.5 + 3;

  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  if (sigs.liability_signature) {
    y = await addSignature(
      "Hirer – Liability",
      sigs.liability_signature,
      margin,
      y,
      fullWidth,
    );
  }

  return y;
}

// Accident Claim Form PDF Generator
async function generateClaimPDF(
  pdf: jsPDF,
  formData: PDFFormData,
  yPos: number,
  margin: number,
  pageWidth: number,
  helpers: any,
): Promise<number> {
  const {
    addSectionHeader,
    addField,
    addCheckbox,
    addSignature,
    addImage,
    checkNewPage,
  } = helpers;
  const data = formData.data;
  const colWidth = (pageWidth - margin * 2) / 3;

  // Checklist
  yPos = addSectionHeader("CHECKLIST", yPos);
  const checklistItems = [
    "V.D",
    "DVLA",
    "BADGE",
    "RECOVERY",
    "HIRE",
    "NI NO",
    "STORAGE",
    "PLATE",
    "LICENCE",
    "LOGBOOK",
    "PI",
  ];
  let xPos = margin;
  const spacing = 28; // smaller spacing so 6 fit nicely
  checklistItems.forEach((item, i) => {
    if (i > 0 && i % 6 === 0) {
      xPos = margin;
      yPos += 8;
    }
    const fieldName = `checklist_${item.toLowerCase().replace(/ /g, "_")}`;
    const formattedLabel = item === "PI" ? "P.I" : item;
    addCheckbox(formattedLabel, !!data[fieldName], xPos, yPos);
    xPos += spacing;
  });
  yPos += 15;

  // Date of Claim
  addField(
    "Date of Claim",
    formatDate(data.date_of_claim),
    margin,
    yPos,
    colWidth,
  );
  yPos += 20;

  // Vehicle Owner Details
  yPos = checkNewPage(yPos, 60);
  yPos = addSectionHeader("VEHICLE OWNER DETAILS", yPos);
  addField("Full Name", data.owner_full_name, margin, yPos, colWidth);
  addField("Email", data.owner_email, margin + colWidth, yPos, colWidth);
  addField(
    "Telephone",
    data.owner_telephone,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 15;
  addField("Address", data.owner_address, margin, yPos, colWidth * 2);
  addField(
    "Postcode",
    data.owner_postcode,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 15;
  addField("Date of Birth", formatDate(data.owner_dob), margin, yPos, colWidth);
  addField(
    "NI Number",
    data.owner_ni_number,
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Occupation",
    data.owner_occupation,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 20;

  // Driver Details
  yPos = checkNewPage(yPos, 80);
  yPos = addSectionHeader("DRIVER DETAILS", yPos);
  addField("Full Name", data.driver_full_name, margin, yPos, colWidth);
  addField("Email", data.driver_email, margin + colWidth, yPos, colWidth);
  addField(
    "Telephone",
    data.driver_telephone,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 15;
  addField("Address", data.driver_address, margin, yPos, colWidth * 2);
  addField(
    "Postcode",
    data.driver_postcode,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 15;
  addField(
    "Date of Birth",
    formatDate(data.driver_dob),
    margin,
    yPos,
    colWidth,
  );
  addField(
    "NI Number",
    data.driver_ni_number,
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Occupation",
    data.driver_occupation,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 20;

  // Client Vehicle Details
  yPos = checkNewPage(yPos, 40);
  yPos = addSectionHeader("CLIENT VEHICLE DETAILS", yPos);
  addField("Make", data.client_vehicle_make, margin, yPos, colWidth);
  addField(
    "Model",
    data.client_vehicle_model,
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Registration",
    data.client_registration,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 15;
  addField("Policy No", data.client_policy_no, margin, yPos, colWidth);
  addField(
    "Cover Type",
    data.client_cover_type,
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Policy Holder",
    data.client_policy_holder,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 20;

  // Third Party Details
  yPos = checkNewPage(yPos, 100);
  yPos = addSectionHeader("THIRD PARTY DETAILS", yPos);
  addField("Name", data.third_party_name, margin, yPos, colWidth);
  addField("Email", data.third_party_email, margin + colWidth, yPos, colWidth);
  addField(
    "Telephone",
    data.third_party_telephone,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 15;
  addField("Address", data.third_party_address, margin, yPos, colWidth * 2);
  addField(
    "Postcode",
    data.third_party_postcode,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 15;
  addField(
    "Date of Birth",
    formatDate(data.third_party_dob),
    margin,
    yPos,
    colWidth,
  );
  addField(
    "NI Number",
    data.third_party_ni_number,
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Occupation",
    data.third_party_occupation,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 15;
  addField(
    "Vehicle Make",
    data.third_party_vehicle_make,
    margin,
    yPos,
    colWidth,
  );
  addField(
    "Vehicle Model",
    data.third_party_vehicle_model,
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Registration",
    data.third_party_registration,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 15;
  addField("Policy No", data.third_party_policy_no, margin, yPos, colWidth);
  addField(
    "Policy Holder",
    data.third_party_policy_holder,
    margin + colWidth,
    yPos,
    colWidth * 2,
  );
  yPos += 20;

  // Accident Details
  yPos = checkNewPage(yPos, 50);
  yPos = addSectionHeader("ACCIDENT DETAILS", yPos);
  addField("Date", formatDate(data.accident_date), margin, yPos, colWidth);
  addField("Time", data.accident_time, margin + colWidth, yPos, colWidth);
  addField(
    "Location",
    data.accident_location,
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 15;

  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 2, 2, "F");
  pdf.setTextColor(...colors.gray);
  pdf.setFontSize(8);
  pdf.text("Description:", margin + 3, yPos + 5);
  pdf.setTextColor(...colors.darkText);
  pdf.setFontSize(9);
  const descLines = pdf.splitTextToSize(
    data.accident_description || "—",
    pageWidth - margin * 2 - 10,
  );
  pdf.text(descLines, margin + 3, yPos + 12);
  yPos += 32;

  // Road & Weather Conditions
  yPos = checkNewPage(yPos, 40);
  yPos = addSectionHeader("ROAD & WEATHER CONDITIONS", yPos);
  addField(
    "Road Conditions",
    data.road_conditions,
    margin,
    yPos,
    colWidth * 1.5,
  );
  addField(
    "Weather Conditions",
    data.weather_conditions,
    margin + colWidth * 1.5,
    yPos,
    colWidth * 1.5,
  );
  yPos += 20;

  // Fault & Opinions
  yPos = checkNewPage(yPos, 40);
  yPos = addSectionHeader("FAULT OPINION & DETAILS", yPos);
  addField("Fault Opinion", data.fault_opinion, margin, yPos, colWidth * 1.5);
  addField(
    "Reason for Fault Opinion",
    data.fault_reason,
    margin + colWidth * 1.5,
    yPos,
    colWidth * 1.5,
  );
  yPos += 20;

  // Witness 1
  if (data.witness1_name) {
    yPos = checkNewPage(yPos, 30);
    yPos = addSectionHeader("WITNESS 1", yPos);
    addField("Name", data.witness1_name, margin, yPos, colWidth);
    addField(
      "Address",
      data.witness1_address,
      margin + colWidth,
      yPos,
      colWidth * 2,
    );
    yPos += 15;
    addField("Postcode", data.witness1_postcode, margin, yPos, colWidth);
    addField(
      "Telephone",
      data.witness1_telephone,
      margin + colWidth,
      yPos,
      colWidth * 2,
    );
    yPos += 20;
  }

  // Witness 2
  if (data.witness2_name) {
    yPos = checkNewPage(yPos, 30);
    yPos = addSectionHeader("WITNESS 2", yPos);
    addField("Name", data.witness2_name, margin, yPos, colWidth);
    addField(
      "Address",
      data.witness2_address,
      margin + colWidth,
      yPos,
      colWidth * 2,
    );
    yPos += 15;
    addField("Postcode", data.witness2_postcode, margin, yPos, colWidth);
    addField(
      "Telephone",
      data.witness2_telephone,
      margin + colWidth,
      yPos,
      colWidth * 2,
    );
    yPos += 20;
  }

  // Loss of Earnings
  if (data.loss_of_earnings) {
    yPos = checkNewPage(yPos, 20);
    yPos = addSectionHeader("LOSS OF EARNINGS", yPos);
    addField(
      "Loss of Earnings Claimed",
      data.loss_of_earnings,
      margin,
      yPos,
      colWidth,
    );
    addField(
      "Employer Details",
      data.employer_details,
      margin + colWidth,
      yPos,
      colWidth * 2,
    );
    yPos += 20;
  }

  // Direction Drawings
  const drawingWidth = (pageWidth - margin * 2 - 5) / 2;
  const drawingHeight = 55;

  if (
    formData.images?.direction_before_drawing ||
    formData.images?.direction_after_drawing
  ) {
    yPos = checkNewPage(yPos, 75);
    yPos = addSectionHeader("DIRECTION OF TRAVEL", yPos);

    const beforeY = yPos;
    yPos = await addImage(
      "Before Accident",
      formData.images?.direction_before_drawing || null,
      margin,
      yPos,
      drawingWidth,
      drawingHeight,
    );
    await addImage(
      "After Accident",
      formData.images?.direction_after_drawing || null,
      margin + drawingWidth + 5,
      beforeY,
      drawingWidth,
      drawingHeight,
    );
  }

  // Circumstance Drawing
  if (formData.images?.circumstance_drawing) {
    yPos = checkNewPage(yPos, 75);
    yPos = addSectionHeader("ACCIDENT CIRCUMSTANCE DIAGRAM", yPos);
    yPos = await addImage(
      "Circumstance Drawing",
      formData.images.circumstance_drawing,
      margin,
      yPos,
      pageWidth - margin * 2,
      60,
    );
  }

  // Declaration Section
  yPos = checkNewPage(yPos, 40);
  yPos = addSectionHeader("DECLARATION", yPos);
  addField(
    "Declared By",
    data.print_name,
    margin,
    yPos,
    pageWidth - margin * 2,
  );
  yPos += 15;
  addField("Declaration Date", data.declaration_date, margin, yPos, colWidth);
  yPos += 20;

  // Signature
  yPos = checkNewPage(yPos, 45);
  yPos = addSectionHeader("SIGNATURE", yPos);
  yPos = await addSignature(
    "Client Signature",
    formData.signatures?.client || null,
    margin,
    yPos,
    pageWidth - margin * 2,
  );

  return yPos;
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function emailPDF(
  blob: Blob,
  email: string,
  subject: string,
  formType: string,
  claimId: string,
  title: string,
) {
  const formData = new FormData();
  formData.append("file", blob, `${title}-${claimId}.pdf`);
  formData.append("email", email);
  formData.append("subject", subject);
  formData.append("formType", formType);
  formData.append("claimId", claimId);

  const response = await fetch("/api/send-pdf-email", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to send email");
  }

  return response.json();
}
