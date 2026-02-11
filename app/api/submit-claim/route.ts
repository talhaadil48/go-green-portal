// app/api/accident-claims/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";

// Convert base64 string to Buffer
function base64ToBuffer(base64: string) {
  return Buffer.from(base64.replace(/^data:.*;base64,/, ""), "base64");
}

export async function POST(req: NextRequest) {
  try {
    const fullData = await req.json();

    const uploadFieldToS3 = async (dataUrl: string | null, fieldName: string) => {
      if (!dataUrl) return "";

      try {
        const buffer = base64ToBuffer(dataUrl);

        // Create a fake File object for uploadToS3
        const file = new File([buffer], `${fieldName}.png`, { type: "image/png" });

        // Use claim ID or default
        const claimId = fullData.claim_id || "general";

        const s3Url = await uploadToS3(file, claimId);
        return s3Url;
      } catch (err) {
        console.error(`S3 upload failed for ${fieldName}:`, err);
        return ""; // continue even if upload fails
      }
    };

    // Upload images to S3
    if (fullData.client_signature) {
      fullData.client_signature = await uploadFieldToS3(fullData.client_signature, "client_signature");
    }
    if (fullData.circumstance_drawing) {
      fullData.circumstance_drawing = await uploadFieldToS3(fullData.circumstance_drawing, "circumstance_drawing");
    }
    if (fullData.direction_before_drawing) {
      fullData.direction_before_drawing = await uploadFieldToS3(fullData.direction_before_drawing, "direction_before_drawing");
    }
    if (fullData.direction_after_drawing) {
      fullData.direction_after_drawing = await uploadFieldToS3(fullData.direction_after_drawing, "direction_after_drawing");
    }

    // Normalize date fields
    const DATE_FIELDS = [
      "date_of_claim",
      "accident_date",
      "owner_dob",
      "driver_dob",
      "third_party_dob",
      "declaration_date",
      "accident_time",
    ];

    const { "checklist_v.d": checklist_vd, ...rest } = fullData;
    const normalizedData = { ...rest, checklist_vd };

    DATE_FIELDS.forEach((field) => {
      if (normalizedData[field] === "") normalizedData[field] = null;
    });

    // Forward to external backend
    const EXTERNAL_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/post/accident-claims/${fullData.claim_id}`;

    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizedData),
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error("External API error:", externalResponse.status, errorText);
      throw new Error(`External backend failed: ${externalResponse.status} - ${errorText}`);
    }

    const externalResult = await externalResponse.json();

    return NextResponse.json(
      {
        success: true,
        message: "Claim processed and sent to backend successfully",
        claim_id: externalResult.claim_id || null,
        data: externalResult,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error processing submission:", error);
    return NextResponse.json(
      { success: false, message: "Submission failed", error: error.message },
      { status: 500 }
    );
  }
}