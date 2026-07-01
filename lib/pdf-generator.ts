import jsPDF from "jspdf";
import { PDFDocument } from "pdf-lib";

export interface PDFFormData {
  refNo?: string;
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

// Helper to uppercase any value safely
function up(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "YES" : "NO";
  const str = String(value).trim();
  if (!str) return "—";
  return str.toUpperCase();
}

// Format date as "day month year" (e.g., "18 FEBRUARY 2026")
function formatDate(
  dateInput: string | number | Date | undefined | null,
): string {
  if (!dateInput) return "—";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput).toUpperCase();

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase();
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
  function addWrappedText(
    text: string,
    x: number,
    y: number,
    maxW: number,
    fontSize = 10,
  ): number {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text.toUpperCase(), maxW);
    pdf.text(lines, x, y);
    return y + lines.length * (fontSize * 0.3528 + 2);
  }

  // Helper functions
  const addGradientHeader = () => {
    const headerHeight = 35;
    const gradientSteps = 30;

    // Starting from white → going toward primaryDark
    const startColor = [255, 255, 255];           // white
    const endColor = [255, 255, 255]  // fallback if primaryDark missing

    for (let i = 0; i < gradientSteps; i++) {
      const ratio = i / (gradientSteps - 1);     // 0 → 1

      const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * ratio);
      const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * ratio);
      const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * ratio);

      pdf.setFillColor(r, g, b);
      pdf.rect(0, i * (headerHeight / gradientSteps), pageWidth, headerHeight / gradientSteps + 0.5, "F");
    }

    // ────────────────────────────────────────────────
    // Text colors – choose depending on your brand colors
    // Option A: always white (usually safest on dark bottom)
    pdf.setTextColor(30, 30, 30);   // white

    // Option B: very dark gray (if bottom is still quite light)
    // pdf.setTextColor(30, 30, 30);

    // Option C: two-tone (white on bottom, dark on top) – more advanced
    // You can split text drawing if needed (see comment below)

    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");

    pdf.addImage(
      "/logo.png",
      "JPEG",
      4,
      7,
      80,
      15,
    );

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");

    const rightText = `Derby Turn, Building 1, Derby Road
BURTON UPON TRENT Staffordshire DE141RX
Website: www.gogreenhire.co.uk`;

    const rightX = pageWidth - 10;
    const lines = rightText.split("\n");

    lines.forEach((line, index) => {
      pdf.text(line, rightX, 12 + index * 4, { align: "right" });
    });

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(formData.title.toUpperCase(), pageWidth / 2, headerHeight, {
      align: "center",
    });

    return headerHeight + 5;
  };
  const addSectionHeader = (title: string, y: number): number => {
    pdf.setFillColor(...colors.light);
    pdf.roundedRect(margin, y, pageWidth - margin * 2, 6, 1.5, 1.5, "F");

    pdf.setFillColor(...colors.primary);
    pdf.rect(margin, y, 2, 6, "F");

    pdf.setTextColor(...colors.primaryDark);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, margin + 5, y + 4.5);

    return y + 8;
  };

  const addField = (
    label: string,
    value: string | number | boolean,
    x: number,
    y: number,
    width: number,
  ): number => {
    pdf.setTextColor(...colors.gray);
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "normal");
    pdf.text(label, x, y + 0.5);

    pdf.setTextColor(...colors.darkText);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    // UPPERCASE all field values
    const displayValue = up(value);
    pdf.text(displayValue, x, y + 4);

    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.25);
    pdf.line(x, y + 5.2, x + width - 4, y + 5.2);

    return y + 7;
  };

  const addCheckbox = (
    label: string,
    checked: boolean,
    x: number,
    y: number,
  ): void => {
    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.35);
    pdf.rect(x, y - 1.8, 2.8, 2.8);

    if (checked) {
      pdf.setFillColor(...colors.primary);
      pdf.rect(x + 0.4, y - 1.4, 2, 2, "F");
    }

    pdf.setTextColor(...colors.darkText);
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "normal");
    pdf.text(label, x + 4.2, y);
  };

  const fetchBase64 = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/image-to-base64?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      return data.base64 || null;
    } catch (err) {
      console.error("Failed to fetch image base64:", err);
      return null;
    }
  };

  const addSignature = async (
    label: string,
    signatureUrl: string | null,
    x: number,
    y: number,
    width: number,
  ): Promise<number> => {

    pdf.setTextColor(...colors.gray);
    pdf.setFontSize(6);
    pdf.text(label, x, y + 1);

    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.4);
    pdf.setFillColor(...colors.white);
    pdf.roundedRect(x, y + 2.5, width, 18, 2, 2, "FD");

    if (signatureUrl) {
      const signatureData = await fetchBase64(signatureUrl);
      if (signatureData) {
        try {
          pdf.addImage(signatureData, "PNG", x + 1.5, y + 4, width - 3, 15);
        } catch {
          pdf.setTextColor(...colors.gray);
          pdf.setFontSize(7);
          pdf.text("[Signature]", x + width / 2, y + 11, { align: "center" });
        }
      }
    }

    return y + 23;
  };

  const fetchAndCompress = async (
    url: string,
    maxWidth = 800,
    quality = 0.7
  ): Promise<string | null> => {
    try {
      const res = await fetch(`/api/image-to-base64?url=${encodeURIComponent(url)}`);
      const { base64 } = await res.json();
      if (!base64) return null;

      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = base64;
      });
    } catch (err) {
      console.error("Image fetch/compress failed:", err);
      return null;
    }
  };

  const addImage = async (
    label: string,
    imageUrl: string | null,
    x: number,
    y: number,
    width: number,
    height: number = 28
  ): Promise<number> => {
    pdf.setTextColor(...colors.gray);
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "bold");
    pdf.text(label, x, y + 1);

    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.4);
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(x, y + 2.5, width, height, 2, 2, "FD");

    if (imageUrl) {
      const imageData = await fetchAndCompress(imageUrl, 800, 0.7);
      if (imageData) {
        try {
          pdf.addImage(imageData, "JPEG", x + 1.5, y + 3.5, width - 3, height - 5);
        } catch {
          pdf.setTextColor(...colors.gray);
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "italic");
          pdf.text("[Image]", x + width / 2, y + height / 2 + 2, { align: "center" });
        }
      } else {
        pdf.setTextColor(...colors.gray);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "italic");
        pdf.text("No image", x + width / 2, y + height / 2 + 2, { align: "center" });
      }
    } else {
      pdf.setTextColor(...colors.gray);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "italic");
      pdf.text("No image", x + width / 2, y + height / 2 + 2, { align: "center" });
    }

    return y + height + 6;
  };

  const addFooter = (pageNum: number) => {
    const footerY = pageHeight - 15;

    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.5);
    pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    pdf.setTextColor(...colors.gray);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      "Go Green Car Hire Ltd | Derby Turn, Building 1, Derby Road, Burton-On-Trent, DE14 1RX",
      margin,
      footerY,
    );

    pdf.setTextColor(...colors.primary);
    pdf.text(`Page ${pageNum}`, pageWidth - margin, footerY, {
      align: "right",
    });

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Ref: ${formData.claimId}`, pageWidth / 2, footerY, {
      align: "center",
    });
  };

  const checkNewPage = (currentY: number, neededSpace: number): number => {
    if (currentY + neededSpace > pageHeight - 25) {
      pdf.addPage();

      let newY = addGradientHeader();
      newY += 4;

      return newY;
    }
    return currentY;
  };

  // Generate header
  yPos = addGradientHeader();

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
      const termsResponse = await fetch("/t.pdf");
      if (!termsResponse.ok) {
        console.warn("Could not load /terms.pdf – skipping append");
      } else {
        const termsArrayBuffer = await termsResponse.arrayBuffer();
        const termsPdfDoc = await PDFDocument.load(termsArrayBuffer);

        const mainPdfBytes = pdf.output("arraybuffer");
        const mainPdfDoc = await PDFDocument.load(mainPdfBytes);

        const copiedPages = await mainPdfDoc.copyPages(
          termsPdfDoc,
          termsPdfDoc.getPageIndices(),
        );

        copiedPages.forEach((page) => {
          mainPdfDoc.addPage(page);
        });

        const finalPdfBytes = await mainPdfDoc.save();
        return new Blob([finalPdfBytes], { type: "application/pdf" });
      }
    } catch (err) {
      console.error("Failed to append terms.pdf:", err);
    }
  }

  return pdf.output("blob");
}

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
    { label: "Customer", value: up(data.customer) },
    { label: "Detailer", value: up(data.detailer) },
    { label: "Car Reg", value: up(data.order_number) },
  ];

  let xPos = margin;
  basicFields.forEach((field) => {
    addField(field.label, field.value, xPos, yPos, colWidth);
    xPos += colWidth;
  });
  yPos += 10;

  xPos = margin;
  const vehicleFields = [
    { label: "Year", value: up(data.year) },
    { label: "Make", value: up(data.make) },
    { label: "Model", value: up(data.model) },
  ];
  vehicleFields.forEach((field) => {
    addField(field.label, field.value, xPos, yPos, colWidth);
    xPos += colWidth;
  });
  yPos += 10;

  // CONDITION CHECKLIST
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

  const tableWidth = pageWidth - margin * 2;
  const leftWidth = tableWidth * 0.48;
  const rightWidth = tableWidth * 0.48;
  const gap = tableWidth * 0.04;
  const col1 = leftWidth * 0.55;
  const col2 = (leftWidth - col1) / 3;

  pdf.setFillColor(...colors.primaryDark);
  pdf.rect(margin, yPos, tableWidth, 8, "F");
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");

  pdf.text("Item", margin + 3, yPos + 5.5);
  pdf.text("Good", margin + col1 + 5, yPos + 5.5);
  pdf.text("Moderate", margin + col1 + col2 + 5, yPos + 5.5);
  pdf.text("Poor", margin + col1 + col2 * 2 + 5, yPos + 5.5);

  pdf.text("Item", margin + leftWidth + gap + 3, yPos + 5.5);
  pdf.text("Good", margin + leftWidth + gap + col1 + 5, yPos + 5.5);
  pdf.text("Moderate", margin + leftWidth + gap + col1 + col2 + 5, yPos + 5.5);
  pdf.text("Poor", margin + leftWidth + gap + col1 + col2 * 2 + 5, yPos + 5.5);

  yPos += 10;

  for (let i = 0; i < 15; i++) {
    yPos = checkNewPage(yPos, 8);

    const rowColor: [number, number, number] =
      i % 2 === 0 ? [255, 255, 255] : [249, 250, 251];
    pdf.setFillColor(...rowColor);
    pdf.rect(margin, yPos - 1, tableWidth, 7, "F");

    pdf.setTextColor(...colors.darkText);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");

    const leftItem = checklistItems[i];
    const leftCondition = data[`condition_${i + 1}`];
    pdf.text(`${i + 1}. ${leftItem}`, margin + 3, yPos + 4);

    ["Good", "Moderate", "Poor"].forEach((cond, j) => {
      const xOffset = margin + col1 + col2 * j + 8;
      if (leftCondition === cond) {
        pdf.setFillColor(...conditionColors[cond]);
        pdf.circle(xOffset, yPos + 3, 2, "F");
      } else {
        pdf.setDrawColor(...colors.gray);
        pdf.setLineWidth(0.3);
        pdf.circle(xOffset, yPos + 3, 2, "S");
      }
    });

    const rightIdx = i + 15;
    const rightItem = checklistItems[rightIdx];
    const rightCondition = data[`condition_${rightIdx + 1}`];
    pdf.text(
      `${rightIdx + 1}. ${rightItem}`,
      margin + leftWidth + gap + 3,
      yPos + 4,
    );

    ["Good", "Moderate", "Poor"].forEach((cond, j) => {
      const xOffset = margin + leftWidth + gap + col1 + col2 * j + 8;
      if (rightCondition === cond) {
        pdf.setFillColor(...conditionColors[cond]);
        pdf.circle(xOffset, yPos + 3, 2, "F");
      } else {
        pdf.setDrawColor(...colors.gray);
        pdf.setLineWidth(0.3);
        pdf.circle(xOffset, yPos + 3, 2, "S");
      }
    });

    yPos += 7;
  }

  yPos += 3;

  // Notes & Recommendations
  yPos = addSectionHeader("NOTES & RECOMMENDATIONS", yPos);

  const notesWidth = (pageWidth - margin * 2 - 5) / 2;

  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin, yPos, notesWidth, 20, 1.5, 1.5, "F");
  pdf.setTextColor(...colors.gray);
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "normal");
  pdf.text("Notes:", margin + 2, yPos + 4);

  pdf.setTextColor(...colors.darkText);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  const notesLines = pdf.splitTextToSize(up(data.notes), notesWidth - 4);
  notesLines.forEach((line, idx) => {
    pdf.text(line, margin + 2, yPos + 7 + idx * 4);
  });

  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(margin + notesWidth + 5, yPos, notesWidth, 20, 1.5, 1.5, "F");
  pdf.setTextColor(...colors.gray);
  pdf.setFontSize(6);
  pdf.setFont("helvetica", "normal");
  pdf.text("Recommendations:", margin + notesWidth + 7, yPos + 4);

  pdf.setTextColor(...colors.darkText);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  const recLines = pdf.splitTextToSize(
    up(data.recommendations),
    notesWidth - 4,
  );
  recLines.forEach((line, idx) => {
    pdf.text(line, margin + notesWidth + 7, yPos + 7 + idx * 4);
  });

  yPos += 40;

  // Vehicle Image
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

  const sigWidth = ((pageWidth - margin * 2 - 10) / 2) * 0.7;
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
    yPos - 23,
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
  pdf.setFontSize(8);
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
  const statement = `I, ${up(data.name)}, hereby give notice that I wish to cancel my contract in respect of the storage and the hire agreement entered on.`;
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
  addField("Name", up(data.name), margin, yPos, colWidth);
  addField("Email", up(data.email), margin + colWidth, yPos, colWidth);
  yPos += 15;
  addField("Address", up(data.address), margin, yPos, colWidth);
  addField("Postcode", up(data.postcode), margin + colWidth, yPos, colWidth);
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
    (pageWidth - margin * 2) * 0.3,
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
  addField("Name", up(data.name), margin, yPos, colWidth);
  addField("Postcode", up(data.postcode), margin + colWidth, yPos, colWidth);
  yPos += 12;
  addField("Address", up(data.address1), margin, yPos, colWidth * 1.5);
  // addField(
  //   "Address Line 2",
  //   up(data.address2),
  //   margin + colWidth * 1.5,
  //   yPos,
  //   colWidth * 1.5,
  // );
  yPos += 14;

  // Vehicle Information
  yPos = checkNewPage(yPos, 30);
  yPos = addSectionHeader("VEHICLE INFORMATION", yPos);
  addField("Make", up(data.vehicle_make), margin, yPos, colWidth);
  addField("Model", up(data.vehicle_model), margin + colWidth, yPos, colWidth);
  addField(
    "Registration",
    up(data.registration_number),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 14;

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
  yPos += 12;
  addField("Number of Days", up(data.number_of_days), margin, yPos, colWidth);
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
  yPos += 14;

  // Invoice Summary
  yPos = checkNewPage(yPos, 40);
  yPos = addSectionHeader("INVOICE SUMMARY", yPos);

  const tableData = [
    ["Description", "Amount"],
    ["Recovery Charge", `£${data.recovery_charge || "0.00"}`],
    ["Total Storage Charge", `£${data.total_storage_charge || "0.00"}`],
    ["Subtotal", `£${data.subtotal || "0.00"}`],
    ["VAT (20%)", `£${data.vat_amount || "0.00"}`],
  ];

  const tableYStart = yPos;
  const tableWidth = pageWidth - margin * 2;
  const rowHeight = 6;

  tableData.forEach((row, i) => {
    const isHeader = i === 0;

    const bgColor: [number, number, number] = isHeader
      ? colors.primaryDark
      : [255, 255, 255];

    pdf.setFillColor(...bgColor);
    pdf.rect(margin, tableYStart + i * rowHeight, tableWidth, rowHeight, "F");

    pdf.setDrawColor(200);
    pdf.rect(margin, tableYStart + i * rowHeight, tableWidth, rowHeight);

    pdf.setFontSize(7);
    pdf.setFont("helvetica", isHeader ? "bold" : "normal");
    pdf.setTextColor(...(isHeader ? colors.white : colors.darkText));

    pdf.text(row[0], margin + 3, tableYStart + i * rowHeight + 4);
    pdf.text(row[1], pageWidth - margin - 3, tableYStart + i * rowHeight + 4, {
      align: "right",
    });
  });

  const totalY = tableYStart + tableData.length * rowHeight;
  pdf.setFillColor(...colors.primary);
  pdf.rect(margin, totalY, tableWidth, rowHeight, "F");
  pdf.setTextColor(...colors.white);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("INVOICE TOTAL", margin + 3, totalY + 4);
  pdf.text(
    `£${data.invoice_total || "0.00"}`,
    pageWidth - margin - 3,
    totalY + 4,
    { align: "right" },
  );

  yPos = totalY + rowHeight + 2;

  // Deferred Payment & Cancellation Terms
  yPos = addSectionHeader("DEFERRED PAYMENT & CANCELLATION TERMS", yPos);

  const termsText = `
• I understand the recovery and storage costs are on a deferred payment basis and will be due and owing from me on completion of storage and that invoices are payable by me to Go Green Car Hire Ltd in no more than one instalment beginning from the date of this agreement within a period of no more than 51 weeks beginning from the date of this agreement.
• It is my contractual obligation to pay the outstanding charges as provided by the deferred payment provision.
• I further understand that if I fail to co-operate in the pursuit of my claim for damages or appoint other solicitors to act on my behalf, then I understand and agree that the account for recovery and storage will be immediately due and payable by me to Go Green Car Hire Ltd.
• This contract constitutes all terms and conditions under this agreement.
• You have the right to cancel this agreement within 14 days starting from the date signed on this agreement. Written cancellation notice must be sent within 14 days either by post or email to the address stated above. I understand that any charges incurred will be liable to immediate payment by me.
`;

  const termsLines = pdf.splitTextToSize(termsText, pageWidth - margin * 2);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.darkText);

  termsLines.forEach((line) => {
    pdf.text(line, margin, yPos);
    yPos += 4.5;
  });

  yPos += 1;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...colors.darkText);
  pdf.text("Storage Location:", margin, yPos);
  yPos += 4;

  // Storage location mapping
  const storageLocations: Record<string, { name: string; city: string; postcode: string }> = {
    addr1: {
      name: "LITTLE BURTON EAST",
      city: "Burton-on-Trent, Staffordshire",
      postcode: "DE14 1PS",
    },
    addr2: {
      name: "Placeholder Location",
      city: "City, County",
      postcode: "XX00 0XX",
    },
  };

  const locationKey = data.storage_location_key || "addr1";
  const location = storageLocations[locationKey] || storageLocations["addr1"];

  const storageText = [
    location.name,
    location.city,
    location.postcode,
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...colors.darkText);

  storageText.forEach((line) => {
    if (line) {
      pdf.text(line, margin + 2, yPos);
      yPos += 4;
    }
  });

  yPos += 6;

  // Signatures
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
    yPos - 23,
    sigWidth,
  );
  return yPos;
}

// Rental Agreement PDF Generator
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

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB").toUpperCase();
  };

  // ─── Header ───────────────────────────────────────
  const headerStartY = y;

  pdf.setFontSize(6.5);
  pdf.setTextColor(107, 114, 128);

  pdf.text(`Claim ID: ${up(formData.claimId)}`, margin, y);

  y += 4;
  pdf.text(`Invoice ID: ${up(formData.claimId)}`, margin, y);

  const generatedDate = new Date();
  const formattedDate = generatedDate.toLocaleDateString("en-GB").toUpperCase();

  y += 4;
  pdf.text(`Generated: ${formattedDate}`, margin, y);

  pdf.setFontSize(6.5);
  pdf.setTextColor(107, 114, 128);

  // ─── Right Side (Only for "S" claims) ─────────────────
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

    // ─── Ref No (right side, below address) ─────────────────
    if (formData.refNo) {
      pdf.setFontSize(6);
      pdf.setFont(undefined, "bold");
      pdf.text(`Ref No: ${formData.refNo}`, rightX, rightY, { align: "right" });

      // reset font if needed later
      pdf.setFont(undefined, "normal");
    }
  }

  y += 6;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);

  y += 5;
    // ─── 1. Hirer's Details + 2. Hire Vehicle ───────────
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("1. Hirer's Details", margin, y);
  pdf.text("2. Hire Vehicle", margin + half + 8, y);
  y += 4;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);

  pdf.setTextColor(80, 80, 80);
  pdf.text("Title", margin, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(up(data.title), margin + 25, y);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Hirer's Name", margin, y + 3.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(up(data.hirer_name), margin + 25, y + 3.5);

  pdf.setTextColor(80, 80, 80);
  pdf.text("Reg", margin + half + 8, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(up(data.hire_vehicle_reg), margin + half + 30, y);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Make", margin + half + 65, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(up(data.hire_vehicle_make), margin + half + 80, y);

  pdf.setTextColor(80, 80, 80);
  pdf.text("Model", margin + half + 8, y + 3.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(up(data.hire_vehicle_model), margin + half + 30, y + 3.5);
  pdf.setTextColor(80, 80, 80);

  y += 9;

  pdf.setTextColor(80, 80, 80);
  pdf.text("Permanent Address:", margin, y);
  y += 3;
  pdf.setFontSize(6);
  pdf.setTextColor(0, 0, 0);
  const addrLines = pdf.splitTextToSize(
    up(data.permanent_address),
    half - 12,
  );
  pdf.text(addrLines, margin + 2, y);
  const addrHeight = addrLines.length * 3;

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
  pdf.text(up(data.hire_vehicle_fuel_out), margin + half + 30, y + 1);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Fuel In", margin + half + 65, y + 1);
  pdf.setTextColor(0, 0, 0);
  pdf.text(up(data.hire_vehicle_fuel_in), margin + half + 80, y + 1);

  pdf.setTextColor(80, 80, 80);
  pdf.text("Miles Out", margin + half + 8, y + 5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.hire_vehicle_miles_out || "", margin + half + 30, y + 5);

  pdf.setTextColor(80, 80, 80);
  pdf.text("Miles In", margin + half + 65, y + 5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.hire_vehicle_miles_in || "", margin + half + 80, y + 5);

  y += Math.max(addrHeight, 6) + 4;

  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── 3. Driver's Details ────────────────────────────
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
  pdf.text(up(data.new_licence_no), margin + 25, y);
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

  pdf.setDrawColor(100, 100, 100);
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

  // ─── 4. Additional Driver's Details ─────────────────
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("4. Additional Driver's Details", margin, y);
  y += 4;

  if (!hasAdditionalDriver) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(120, 120, 120);
    pdf.text("No additional driver", margin, y);
    y += 6;
  } else {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Name", margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(up(data.additional_driver_name), margin + 25, y);
    y += 3.5;

    pdf.setTextColor(80, 80, 80);
    pdf.text("Licence No", margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(up(data.licence_no), margin + 25, y);

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
    pdf.text(up(data.occupation), margin + col3 * 2 + 25, y);
    y += 5;
  }

  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── 5. Hire Agreement Terms ────────────────────────
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
  pdf.text(data.daily_rate ? `£${data.daily_rate}` : "—", margin + 30, y);

  pdf.setTextColor(80, 80, 80);
  pdf.text("Policy Excess", margin + half, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(
    data.policy_excess ? `£${data.policy_excess}` : "—",
    margin + half + 30,
    y,
  );
  y += 3.5;

  pdf.setTextColor(80, 80, 80);
  pdf.text("Deposit", margin, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.deposit ? `£${data.deposit}` : "—", margin + 30, y);

  pdf.setTextColor(80, 80, 80);
  pdf.text("Refuelling Charge", margin + half, y);
  pdf.setTextColor(0, 0, 0);
  pdf.text(
    data.refuelling_charge ? `£${data.refuelling_charge}` : "—",
    margin + half + 30,
    y,
  );
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

  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── 6. Hirer's Own Insurance ────────────────────────
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

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("6. Hirer's Own Insurance (if applicable)", margin, y);
  y += 4;

  if (!hasOwnInsurance) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(120, 120, 120);
    pdf.text("No own insurance provided", margin, y);
    y += 6;
  } else {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Insurance Company", margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(up(data.insurance_company), margin + 40, y);
    y += 3.5;

    pdf.setTextColor(80, 80, 80);
    pdf.text("Policy No", margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(up(data.policy_no), margin + 40, y);
    y += 3.5;

    pdf.setTextColor(80, 80, 80);
    pdf.text("Start & Expiry", margin, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(up(data.insurance_dates), margin + 40, y);
    y += 3.5;

    pdf.setTextColor(0, 0, 0);
    pdf.text(
      `Covered by own insurance: ${up(data.own_insurance_confirm)}`,
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
        half * 0.7,
      );
    }

    pdf.setTextColor(80, 80, 80);
    pdf.text("Date", pageWidth - margin - 40, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(formatDate(data.insurance_date), pageWidth - margin - 25, y);

    pdf.setTextColor(80, 80, 80);
    pdf.text("Time", margin + 50, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(up(data.insurance_time), margin + 65, y);
    y += 5;
  }

  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── 7. Insurance Proposal + 8. Medical ─────────────
  y = checkNewPage(y, 30);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text("7. Insurance Proposal", margin, y);
  pdf.text("8. Medical Declaration", margin + half + 8, y);
  y += 4;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);

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
    pdf.text(up(val), margin + 50, y);
    y += 3;
  });

  let rightY = leftY;
  pdf.setTextColor(0, 0, 0);
  const med1 = pdf.splitTextToSize(
    `Diabetes, fits, heart condition: ${up(data.medical_condition1)}`,
    half - 12,
  );
  pdf.text(med1, margin + half + 8, rightY);
  rightY += med1.length * 3 + 1.5;

  const med2 = pdf.splitTextToSize(
    `Other condition impairing driving: ${up(data.medical_condition2)}`,
    half - 12,
  );
  pdf.text(med2, margin + half + 8, rightY);
  rightY += med2.length * 3 + 1.5;

  if (data.medical_details?.trim()) {
    pdf.setTextColor(80, 80, 80);
    pdf.text("Details:", margin + half + 8, rightY);
    rightY += 2.5;
    pdf.setTextColor(0, 0, 0);
    const medDetails = pdf.splitTextToSize(up(data.medical_details), half - 12);
    pdf.text(medDetails, margin + half + 10, rightY);
    rightY += medDetails.length * 2.5;
  }

  y = Math.max(y, rightY) + 4;

  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ─── 9. Additional Driver Authorization ─────────────
  y = checkNewPage(y, 10);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("9. Additional Driver Authorization", margin, y);
  y += 3.5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.text(
    `Will any other person drive? ${up(data.additional_driver_auth)}`,
    margin,
    y,
  );
  y += 5;

  // VERY IMPORTANT Disclosure
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

  // 1984 Data Protection Act
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

  // ─── 10. Declaration ────────────────────────────────
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
      fullWidth * 0.3,
    );
  }
  y += 4;

  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  const changeVehicleHistory = Array.isArray(data.change_vehicle_history)
    ? data.change_vehicle_history
    : [];
  const hasChangeVehicle = changeVehicleHistory.length > 0;

  if (hasChangeVehicle) {
    y = checkNewPage(y, 15);

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("11. Change of Hire Vehicle", margin, y);
    y += 4;

    const multiple = changeVehicleHistory.length > 1;

    changeVehicleHistory.forEach((vehicle, index) => {
      y = checkNewPage(y, 10);

      // Heading for multiple changes
      if (multiple) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(0, 128, 0); // green heading
        pdf.text(`Vehicle ${index + 1}`, margin, y);
        y += 3;
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);

      pdf.setTextColor(80, 80, 80);
      pdf.text("Reg", margin, y);
      pdf.setTextColor(0, 0, 0);
      pdf.text(up(vehicle.vehicle_reg), margin + 20, y);

      pdf.setTextColor(80, 80, 80);
      pdf.text("Make", margin + col4, y);
      pdf.setTextColor(0, 0, 0);
      pdf.text(up(vehicle.vehicle_make), margin + col4 + 20, y);

      pdf.setTextColor(80, 80, 80);
      pdf.text("Model", margin + col4 * 2, y);
      pdf.setTextColor(0, 0, 0);
      pdf.text(up(vehicle.vehicle_model), margin + col4 * 2 + 20, y);

      pdf.setTextColor(80, 80, 80);
      pdf.text("Group", margin + col4 * 3, y);
      pdf.setTextColor(0, 0, 0);
      pdf.text(up(vehicle.vehicle_group), margin + col4 * 3 + 20, y);

      y += 3.5;

      pdf.setTextColor(80, 80, 80);
      pdf.text("Date Out", margin, y);
      pdf.setTextColor(0, 0, 0);
      pdf.text(formatDate(vehicle.date_out), margin + 25, y);

      pdf.setTextColor(80, 80, 80);
      pdf.text("Date In", margin + half, y);
      pdf.setTextColor(0, 0, 0);
      pdf.text(formatDate(vehicle.date_in), margin + half + 25, y);

      y += 3.5;

      pdf.setTextColor(80, 80, 80);
      pdf.text("Fuel Out", margin, y);
      pdf.setTextColor(0, 0, 0);
      pdf.text(up(vehicle.fuel_out), margin + 25, y);

      pdf.setTextColor(80, 80, 80);
      pdf.text("Fuel In", margin + half, y);
      pdf.setTextColor(0, 0, 0);
      pdf.text(up(vehicle.fuel_in), margin + half + 25, y);
      y += 2.5
      if (vehicle.miles_out) {
        pdf.setTextColor(80, 80, 80);
        pdf.text("Miles Out", margin, y);
        pdf.setTextColor(0, 0, 0);
        pdf.text(up(vehicle.miles_out), margin + 25, y);
      }

      if (vehicle.miles_in) {
        pdf.setTextColor(80, 80, 80);
        pdf.text("Miles In", margin + half, y);
        pdf.setTextColor(0, 0, 0);
        pdf.text(up(vehicle.miles_in), margin + half + 25, y);
      }

      y += 5;
    });
  }  // ─── 12. Charges Summary ────────────────────────────
  y = checkNewPage(y, 55);

  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.text("12. Charges Summary", margin, y);
  y += 5;

  // ─── Helper: calculate inclusive days between two date strings ───
  const calcInclusiveDays = (dateOut: string, dateIn: string): number => {
    if (!dateOut || !dateIn) return 0;
    try {
      const out = new Date(dateOut);
      const inDate = new Date(dateIn);
      if (isNaN(out.getTime()) || isNaN(inDate.getTime()) || inDate < out) return 0;
      const diffMs = inDate.getTime() - out.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    } catch {
      return 0;
    }
  };

  // ─── Vehicle Charges sub-header ───
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(4, 120, 87);
  pdf.text("Vehicle Charges", margin, y);
  y += 4;

  let totalVehicleCost = 0;
  const rowH = 6;

  // ─── Main hire vehicle row ───
  if (data.hire_vehicle_reg) {
    const mainDays = calcInclusiveDays(
      String(data.hire_vehicle_date_out || ""),
      String(data.hire_vehicle_date_in || "")
    );
    const mainRate = Number(data.hire_vehicle_rate_per_day || 0);
    const mainSubtotal = mainDays * mainRate;
    totalVehicleCost += mainSubtotal;

    y = checkNewPage(y, rowH + 2);

    pdf.setFillColor(240, 253, 244);
    pdf.rect(margin, y, fullWidth, rowH, "F");
    pdf.setDrawColor(209, 250, 229);
    pdf.rect(margin, y, fullWidth, rowH, "S");

    // Left: vehicle info
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(up(data.hire_vehicle_reg), margin + 3, y + rowH / 2 + 1);

    let infoX = margin + 3 + pdf.getTextWidth(up(data.hire_vehicle_reg)) + 3;
    if (data.hire_vehicle_make) {
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(107, 114, 128);
      const makeModel = `${data.hire_vehicle_make} ${data.hire_vehicle_model || ""}`.trim();
      pdf.text(up(makeModel), infoX, y + rowH / 2 + 1);
      infoX += pdf.getTextWidth(up(makeModel)) + 3;
    }

    if (mainDays > 0) {
      pdf.setFontSize(5.5);
      pdf.setTextColor(156, 163, 175);
      pdf.text(
        `(${mainDays} day${mainDays !== 1 ? "s" : ""} × £${mainRate.toFixed(2)}/day)`,
        infoX,
        y + rowH / 2 + 1
      );
    }

    // Right: subtotal
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(4, 120, 87);
    pdf.text(`£${mainSubtotal.toFixed(2)}`, pageWidth - margin - 4, y + rowH / 2 + 1, {
      align: "right",
    });

    y += rowH + 2;
  }

  // ─── Change vehicle rows ───
  const cvHistory = Array.isArray(data.change_vehicle_history)
    ? data.change_vehicle_history
    : [];

  cvHistory.forEach((v: any, i: number) => {
    const days = calcInclusiveDays(v.date_out, v.date_in);
    const rate = Number(v.rate_per_day || 0);
    const sub = days * rate;
    totalVehicleCost += sub;

    y = checkNewPage(y, rowH + 2);

    pdf.setFillColor(i % 2 === 0 ? 255 : 249, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 251);
    pdf.rect(margin, y, fullWidth, rowH, "F");
    pdf.setDrawColor(209, 250, 229);
    pdf.rect(margin, y, fullWidth, rowH, "S");

    // Left: vehicle info
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(0, 0, 0);
    const regLabel = v.vehicle_reg || `Vehicle ${i + 1}`;
    pdf.text(up(regLabel), margin + 3, y + rowH / 2 + 1);

    let infoX = margin + 3 + pdf.getTextWidth(up(regLabel)) + 3;
    if (v.vehicle_make) {
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(107, 114, 128);
      const makeModel = `${v.vehicle_make} ${v.vehicle_model || ""}`.trim();
      pdf.text(up(makeModel), infoX, y + rowH / 2 + 1);
      infoX += pdf.getTextWidth(up(makeModel)) + 3;
    }

    if (days > 0) {
      pdf.setFontSize(5.5);
      pdf.setTextColor(156, 163, 175);
      pdf.text(
        `(${days} day${days !== 1 ? "s" : ""} × £${rate.toFixed(2)}/day)`,
        infoX,
        y + rowH / 2 + 1
      );
    }

    // Right: subtotal
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(4, 120, 87);
    pdf.text(`£${sub.toFixed(2)}`, pageWidth - margin - 4, y + rowH / 2 + 1, {
      align: "right",
    });

    y += rowH + 2;
  });

  y += 2;

  // ─── Global charges table ───
  const cdwPerDay = Number(data.cdw_per_day || 0);
  const mainHireDays = calcInclusiveDays(
    String(data.hire_vehicle_date_out || ""),
    String(data.hire_vehicle_date_in || "")
  );
  const cdwCharge = mainHireDays * cdwPerDay;

  const globalChargesRows = [
    ["Admin Fee", `£${Number(data.admin_fee || 0).toFixed(2)}`],
    ["Delivery Charge", `£${Number(data.delivery_charge || 0).toFixed(2)}`],
    [
      `CDW (£${cdwPerDay.toFixed(2)}/day × ${mainHireDays} days)`,
      `£${cdwCharge.toFixed(2)}`,
    ],
    ["Refuelling", `£${Number(data.refuelling_total || 0).toFixed(2)}`],
  ];

  let ty = y;
  globalChargesRows.forEach((row, i) => {
    y = checkNewPage(y, 5);

    if (i % 2 === 0) {
      pdf.setFillColor(245, 245, 245);
    } else {
      pdf.setFillColor(255, 255, 255);
    }
    pdf.rect(margin, ty, fullWidth, 5, "F");

    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.text(row[0], margin + 4, ty + 3.5);
    pdf.text(row[1], pageWidth - margin - 4, ty + 3.5, { align: "right" });

    ty += 5;
  });

  y = ty + 2;

  // ─── Subtotal / VAT / Total rows ───
  const summaryRows = [
    ["Subtotal", `£${Number(data.subtotal || 0).toFixed(2)}`, false],
    ["VAT (20%)", `£${Number(data.vat || 0).toFixed(2)}`, false],
    ["TOTAL COST", `£${Number(data.total_cost || 0).toFixed(2)}`, true],
  ];

  summaryRows.forEach(([label, value, isTotal]) => {
    y = checkNewPage(y, 7);
    const sRowH = isTotal ? 7 : 5;

    if (isTotal) {
      pdf.setFillColor(34, 197, 94);
    } else {
      pdf.setFillColor(235, 235, 235);
    }
    pdf.rect(margin, y, fullWidth, sRowH, "F");

    pdf.setTextColor(isTotal ? 255 : 0, isTotal ? 255 : 0, isTotal ? 255 : 0);
    pdf.setFont("helvetica", isTotal ? "bold" : "normal");
    pdf.setFontSize(isTotal ? 8.5 : 6.5);
    pdf.text(String(label), margin + 4, y + sRowH / 2 + 1.5);
    pdf.text(String(value), pageWidth - margin - 4, y + sRowH / 2 + 1.5, {
      align: "right",
    });

    y += sRowH;
  });

  y += 4;

  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Parking Fines & Congestion Charges
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

  // ─── 13. Statement of Liability ─────────────────────
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
  pdf.text(up(data.liability_date) || "—", pageWidth - margin - 25, y);
  y += 3;

  pdf.setFontSize(5.5);
  const liabilityText =
    "I acknowledge that during the currency of this rental agreement for the purpose of s86 of the Road Traffic Offenders Act 1986 and schedule 6 Road Traffic Act 1991 (as amended or replaced by any new legislation) I will be liable as the owner of the vehicle hired in respect of any fixed penalty offence or parking charge incurred in respect of the vehicle.";
  const liabilityLines = pdf.splitTextToSize(liabilityText, fullWidth);
  pdf.text(liabilityLines, margin, y);
  y += liabilityLines.length * 2.5 + 3;

  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  if (sigs.liability_signature) {
    y = await addSignature(
      "Liability Signature",
      sigs.liability_signature,
      margin,
      y,
      fullWidth * 0.3,
    );
  }

  return y;
}


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
  yPos += 2;
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
  const spacing = 28;
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
  yPos += 4;

  // Date of Claim
  addField(
    "Date of Claim",
    formatDate(data.date_of_claim),
    margin,
    yPos,
    colWidth,
  );
  yPos += 12;

  // Vehicle Owner Details
  yPos = checkNewPage(yPos, 60);
  yPos = addSectionHeader("VEHICLE OWNER DETAILS", yPos);
  addField("Full Name", up(data.owner_full_name), margin, yPos, colWidth);
  addField("Email", up(data.owner_email), margin + colWidth, yPos, colWidth);
  addField(
    "Telephone",
    up(data.owner_telephone),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 12;
  addField("Address", up(data.owner_address), margin, yPos, colWidth * 2);
  addField(
    "Postcode",
    up(data.owner_postcode),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 12;
  addField("Date of Birth", formatDate(data.owner_dob), margin, yPos, colWidth);
  addField(
    "NI Number",
    up(data.owner_ni_number),
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Occupation",
    up(data.owner_occupation),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 14;

  // Driver Details
  yPos = checkNewPage(yPos, 80);
  yPos = addSectionHeader("DRIVER DETAILS", yPos);
  addField("Full Name", up(data.driver_full_name), margin, yPos, colWidth);
  addField("Email", up(data.driver_email), margin + colWidth, yPos, colWidth);
  addField(
    "Telephone",
    up(data.driver_telephone),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 12;
  addField("Address", up(data.driver_address), margin, yPos, colWidth * 2);
  addField(
    "Postcode",
    up(data.driver_postcode),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 12;
  addField(
    "Date of Birth",
    formatDate(data.driver_dob),
    margin,
    yPos,
    colWidth,
  );
  addField(
    "NI Number",
    up(data.driver_ni_number),
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Occupation",
    up(data.driver_occupation),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 14;

  // Client Vehicle Details
  yPos = checkNewPage(yPos, 40);
  yPos = addSectionHeader("CLIENT VEHICLE DETAILS", yPos);
  addField("Make", up(data.client_vehicle_make), margin, yPos, colWidth);
  addField(
    "Model",
    up(data.client_vehicle_model),
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Registration",
    up(data.client_registration),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 12;
  addField("Policy No", up(data.client_policy_no), margin, yPos, colWidth);
  addField(
    "Cover Type",
    up(data.client_cover_type),
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Policy Holder",
    up(data.client_policy_holder),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 14;

  // Third Party Details
  yPos = addSectionHeader("THIRD PARTY DETAILS", yPos);
  addField("Name", up(data.third_party_name), margin, yPos, colWidth);
  addField("Email", up(data.third_party_email), margin + colWidth, yPos, colWidth);
  addField(
    "Telephone",
    up(data.third_party_telephone),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 12;
  addField("Address", up(data.third_party_address), margin, yPos, colWidth * 2);
  addField(
    "Postcode",
    up(data.third_party_postcode),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 12;
  addField(
    "Date of Birth",
    formatDate(data.third_party_dob),
    margin,
    yPos,
    colWidth,
  );
  addField(
    "NI Number",
    up(data.third_party_ni_number),
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Occupation",
    up(data.third_party_occupation),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 12;
  addField(
    "Vehicle Make",
    up(data.third_party_vehicle_make),
    margin,
    yPos,
    colWidth,
  );
  addField(
    "Vehicle Model",
    up(data.third_party_vehicle_model),
    margin + colWidth,
    yPos,
    colWidth,
  );
  addField(
    "Registration",
    up(data.third_party_registration),
    margin + colWidth * 2,
    yPos,
    colWidth,
  );
  yPos += 12;
  addField("Policy No", up(data.third_party_policy_no), margin, yPos, colWidth);
  addField(
    "Policy Holder",
    up(data.third_party_policy_holder),
    margin + colWidth,
    yPos,
    colWidth * 2,
  );
  yPos += 14;

  // Accident Details
  yPos = checkNewPage(yPos, 30);
  yPos = addSectionHeader("ACCIDENT DETAILS", yPos);

  const dateTimeWidth = colWidth / 2;
  const locationWidth = colWidth * 2;

  addField("Date", formatDate(data.accident_date), margin, yPos, dateTimeWidth);
  addField(
    "Time",
    up(data.accident_time),
    margin + dateTimeWidth,
    yPos,
    dateTimeWidth,
  );
  addField(
    "Location",
    up(data.accident_location),
    margin + dateTimeWidth * 2,
    yPos,
    locationWidth,
  );
  yPos += 10;

  pdf.setTextColor(...colors.gray);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.text("Description:", margin, yPos);
  yPos += 3;

  pdf.setTextColor(...colors.darkText);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");

  const descLines = pdf.splitTextToSize(
    up(data.accident_description),
    pageWidth - margin * 2,
  );
  descLines.forEach((line) => {
    yPos = checkNewPage(yPos, 8);
    pdf.text(line, margin, yPos);
    yPos += 4;
  });

  yPos += 4;

  // Road & Weather Conditions
  yPos = addSectionHeader("ROAD & WEATHER CONDITIONS", yPos);
  addField(
    "Road Conditions",
    up(data.road_conditions),
    margin,
    yPos,
    colWidth * 1.5,
  );
  addField(
    "Weather Conditions",
    up(data.weather_conditions),
    margin + colWidth * 1.5,
    yPos,
    colWidth * 1.5,
  );
  yPos += 14;

  // Fault & Opinions
  yPos = addSectionHeader("FAULT OPINION & DETAILS", yPos);
  addField("Fault Opinion", up(data.fault_opinion), margin, yPos, colWidth * 1.5);
  addField(
    "Reason for Fault Opinion",
    up(data.fault_reason),
    margin + colWidth * 1.5,
    yPos,
    colWidth * 1.5,
  );
  yPos += 14;

  // Witnesses
  const hasWitness1 = !!data.witness1_name;
  const hasWitness2 = !!data.witness2_name;

  yPos = addSectionHeader("WITNESSES", yPos);

  if (hasWitness1 || hasWitness2) {
    const colWidthHalf = (pageWidth - margin * 2) / 2;
    const startX1 = margin;
    const startX2 = margin + colWidthHalf;

    if (hasWitness1)
      addField("Name", up(data.witness1_name), startX1, yPos, colWidthHalf);
    if (hasWitness2)
      addField("Name", up(data.witness2_name), startX2, yPos, colWidthHalf);
    yPos += 12;

    if (hasWitness1)
      addField("Address", up(data.witness1_address), startX1, yPos, colWidthHalf);
    if (hasWitness2)
      addField("Address", up(data.witness2_address), startX2, yPos, colWidthHalf);
    yPos += 12;

    if (hasWitness1)
      addField(
        "Postcode",
        up(data.witness1_postcode),
        startX1,
        yPos,
        colWidthHalf / 2,
      );
    if (hasWitness2)
      addField(
        "Postcode",
        up(data.witness2_postcode),
        startX2,
        yPos,
        colWidthHalf / 2,
      );

    if (hasWitness1)
      addField(
        "Telephone",
        up(data.witness1_telephone),
        startX1 + colWidthHalf / 2,
        yPos,
        colWidthHalf / 2,
      );
    if (hasWitness2)
      addField(
        "Telephone",
        up(data.witness2_telephone),
        startX2 + colWidthHalf / 2,
        yPos,
        colWidthHalf / 2,
      );

    yPos += 14;
  } else {
    yPos += 8;
  }

  // Loss of Earnings
  yPos = addSectionHeader("LOSS OF EARNINGS", yPos);
  addField(
    "Loss of Earnings Claimed",
    up(data.loss_of_earnings),
    margin,
    yPos,
    colWidth,
  );
  addField(
    "Employer Details",
    up(data.employer_details),
    margin + colWidth,
    yPos,
    colWidth * 2,
  );
  yPos += 14;

  const drawingWidth = (pageWidth - margin * 2 - 5) / 2;
  const drawingHeight = drawingWidth * (800 / 1200);

  if (
    formData.images?.direction_before_drawing ||
    formData.images?.direction_after_drawing
  ) {
    yPos = addSectionHeader("DIRECTION OF TRAVEL", yPos);

    const beforeY = yPos;

    yPos = await addImage(
      "Before Accident",
      formData.images?.direction_before_drawing || null,
      margin,
      yPos,
      drawingWidth,
      drawingHeight
    );

    await addImage(
      "After Accident",
      formData.images?.direction_after_drawing || null,
      margin + drawingWidth + 5,
      beforeY,
      drawingWidth,
      drawingHeight
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
  yPos = addSectionHeader("DECLARATION", yPos);
  addField(
    "Declared By",
    up(data.print_name),
    margin,
    yPos,
    pageWidth - margin * 2,
  );
  yPos += 10;
  addField("Declaration Date", up(data.declaration_date), margin, yPos, colWidth);
  yPos += 10;

  // Signature
  yPos = addSectionHeader("SIGNATURE", yPos);
  const signatureWidth = (pageWidth - margin * 2) * 0.3;

  yPos = await addSignature(
    "Client Signature",
    formData.signatures?.client || null,
    margin,
    yPos,
    signatureWidth,
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