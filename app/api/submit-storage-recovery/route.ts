// app/api/storage-recovery/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";

// Convert base64 string to Buffer
function base64ToBuffer(base64: string) {
  return Buffer.from(base64.replace(/^data:.*;base64,/, ""), "base64");
}

export async function POST(req: NextRequest) {
  try {
    const fullData = await req.json();

    // Helper to upload a single field to S3
    const uploadFieldToS3 = async (
      dataUrl: string | null,
      fieldName: string,
    ) => {
      if (!dataUrl || dataUrl === "") {
        return "";
      }

      // ✅ If already an S3 URL → don't touch it
      if (dataUrl.startsWith("http")) {
        return dataUrl;
      }

      // ✅ Only upload if it's base64
      if (!dataUrl.startsWith("data:")) {
        return dataUrl;
      }
      try {
        const buffer = base64ToBuffer(dataUrl);

        // Create a File object for your lib/s3.ts
        const file = new File([buffer], `${fieldName}.png`, {
          type: "image/png",
        });

        // Use ID from fullData or fallback
        const claimId = fullData.id || "general";

        const s3Url = await uploadToS3(file, claimId);
        return s3Url;
      } catch (err) {
        console.error(`S3 upload failed for ${fieldName}:`, err);
        return ""; // continue even if upload fails
      }
    };

    // Upload signatures
    if (fullData.client_signature) {
      fullData.client_signature = await uploadFieldToS3(
        fullData.client_signature,
        "client_signature",
      );
    }
    if (fullData.owner_signature) {
      fullData.owner_signature = await uploadFieldToS3(
        fullData.owner_signature,
        "owner_signature",
      );
    }

    // Normalize date and numeric fields
    const DATE_FIELDS = [
      "date_of_recovery",
      "storage_start_date",
      "storage_end_date",
      "client_date",
      "owner_date",
      "number_of_days",
      "charges_per_day",
      "total_storage_charge",
      "recovery_charge",
      "subtotal",
      "vat_amount",
      "invoice_total",
    ];

    DATE_FIELDS.forEach((field) => {
      if (!fullData[field] || fullData[field] === "") fullData[field] = null;
    });

    // Forward to external backend
    const EXTERNAL_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/post/storage-forms`;

    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullData),
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error("External API error:", externalResponse.status, errorText);
      throw new Error(
        `External backend failed: ${externalResponse.status} - ${errorText}`,
      );
    }

    const externalResult = await externalResponse.json();

    return NextResponse.json(
      {
        success: true,
        message: "Storage & recovery agreement submitted",
        data: externalResult, // optional: backend response
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error in /api/submit-storage-recovery:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error during submission",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
